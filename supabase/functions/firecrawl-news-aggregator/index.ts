import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CrawlResult {
  success: boolean;
  data?: Array<{
    markdown: string;
    html: string;
    rawHtml: string;
    metadata: {
      title: string;
      description: string;
      language: string;
      sourceURL: string;
      [key: string]: any;
    };
  }>;
  error?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { category = 'general', limit = 20, sources } = await req.json();
    
    const firecrawlApiKey = Deno.env.get('FIRECRAWL_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!firecrawlApiKey) {
      throw new Error('Firecrawl API key not configured');
    }

    const supabase = createClient(supabaseUrl!, supabaseKey!);

    console.log(`Firecrawl news aggregation: category=${category}, limit=${limit}`);

    // Top news websites to crawl based on category
    const newsUrls = getNewsUrls(category, sources);
    const processedArticles: any[] = [];

    for (const url of newsUrls.slice(0, 3)) { // Limit to 3 sources to avoid timeouts
      try {
        console.log(`Crawling ${url}`);
        
        const crawlResponse = await fetch('https://api.firecrawl.dev/v0/crawl', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${firecrawlApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            url: url,
            crawlerOptions: {
              includes: ['**/news/**', '**/article/**', '**/story/**'],
              excludes: ['**/video/**', '**/gallery/**', '**/opinion/**'],
              limit: Math.ceil(limit / 3), // Distribute limit across sources
            },
            pageOptions: {
              onlyMainContent: true,
              includeHtml: false,
              waitFor: 1000
            }
          }),
        });

        if (!crawlResponse.ok) {
          console.error(`Failed to crawl ${url}: ${crawlResponse.status}`);
          continue;
        }

        const crawlData = await crawlResponse.json();
        
        if (crawlData.success && crawlData.data) {
          const articles = await processNewsArticles(crawlData.data, url, supabase);
          processedArticles.push(...articles);
          console.log(`Processed ${articles.length} articles from ${url}`);
        }
      } catch (error) {
        console.error(`Error crawling ${url}:`, error);
        continue;
      }
    }

    // Store aggregation log
    await supabase.from('aggregation_logs').insert({
      source_function: 'firecrawl-news-aggregator',
      results: {
        total_processed: processedArticles.length,
        category,
        sources_crawled: newsUrls.slice(0, 3),
        timestamp: new Date().toISOString()
      },
      success_rate: processedArticles.length > 0 ? 1.0 : 0.0,
      log_level: 'info'
    });

    console.log(`Firecrawl aggregation complete: ${processedArticles.length} articles processed`);

    return new Response(JSON.stringify({
      success: true,
      articles: processedArticles,
      total_processed: processedArticles.length,
      message: `Successfully aggregated ${processedArticles.length} articles using Firecrawl`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in firecrawl-news-aggregator:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      articles: []
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function getNewsUrls(category: string, customSources?: string[]): string[] {
  if (customSources && customSources.length > 0) {
    return customSources;
  }

  const baseUrls = {
    general: [
      'https://www.reuters.com',
      'https://apnews.com',
      'https://www.bbc.com/news'
    ],
    technology: [
      'https://techcrunch.com',
      'https://www.theverge.com',
      'https://arstechnica.com'
    ],
    business: [
      'https://www.bloomberg.com',
      'https://www.cnbc.com',
      'https://www.wsj.com'
    ],
    science: [
      'https://www.nature.com/news',
      'https://www.sciencemag.org/news',
      'https://www.newscientist.com'
    ],
    sports: [
      'https://www.espn.com',
      'https://www.bbc.com/sport',
      'https://www.reuters.com/sports'
    ],
    entertainment: [
      'https://variety.com',
      'https://www.hollywoodreporter.com',
      'https://entertainment.cnn.com'
    ]
  };

  return baseUrls[category as keyof typeof baseUrls] || baseUrls.general;
}

async function processNewsArticles(crawledData: any[], sourceUrl: string, supabase: any) {
  const articles: any[] = [];
  
  for (const item of crawledData) {
    try {
      if (!item.metadata?.title || !item.markdown) continue;
      
      const title = item.metadata.title;
      const content = item.markdown;
      const description = item.metadata.description || extractFirstParagraph(content);
      const publishedAt = item.metadata.publishedTime || new Date().toISOString();
      const imageUrl = item.metadata.ogImage || item.metadata.image;
      const articleUrl = item.metadata.sourceURL || sourceUrl;
      
      // Generate content hash to avoid duplicates
      const contentHash = await generateContentHash(title + content);
      
      // Check if article already exists
      const { data: existingArticle } = await supabase
        .from('articles')
        .select('id')
        .eq('content_hash', contentHash)
        .single();
      
      if (existingArticle) {
        console.log(`Article already exists: ${title}`);
        continue;
      }
      
      // Extract topics from content
      const topics = extractTopics(title + ' ' + description);
      
      const articleData = {
        title: title.substring(0, 500),
        content,
        description: description?.substring(0, 1000),
        url: articleUrl,
        url_to_image: imageUrl,
        published_at: publishedAt,
        source_name: extractDomainName(sourceUrl),
        topic_tags: topics,
        content_hash: contentHash,
        reading_time_minutes: Math.max(1, Math.ceil(content.split(' ').length / 200)),
        content_quality_score: calculateQualityScore(title, content, description),
        sentiment_score: 0.5, // Neutral default
        credibility_score: getSourceCredibilityScore(sourceUrl),
        engagement_score: 0
      };
      
      const { data: insertedArticle, error } = await supabase
        .from('articles')
        .insert(articleData)
        .select()
        .single();
      
      if (error) {
        console.error('Error inserting article:', error);
        continue;
      }
      
      articles.push(insertedArticle);
      
    } catch (error) {
      console.error('Error processing article:', error);
      continue;
    }
  }
  
  return articles;
}

function extractFirstParagraph(markdown: string): string {
  const lines = markdown.split('\n').filter(line => line.trim());
  for (const line of lines) {
    if (line.length > 50 && !line.startsWith('#') && !line.startsWith('*')) {
      return line.substring(0, 300);
    }
  }
  return '';
}

function extractTopics(text: string): string[] {
  const commonTopics = [
    'technology', 'business', 'politics', 'science', 'health', 'sports',
    'entertainment', 'world news', 'climate', 'finance', 'ai', 'cybersecurity',
    'innovation', 'research', 'economy', 'government', 'international'
  ];
  
  const textLower = text.toLowerCase();
  const foundTopics = commonTopics.filter(topic => 
    textLower.includes(topic) || textLower.includes(topic.replace(/\s+/g, ''))
  );
  
  return foundTopics.slice(0, 5);
}

function calculateQualityScore(title: string, content: string, description: string): number {
  let score = 0.5; // Base score
  
  // Length factors
  if (content.length > 500) score += 0.1;
  if (content.length > 1500) score += 0.1;
  if (title.length > 20 && title.length < 100) score += 0.1;
  
  // Content quality indicators
  if (description && description.length > 50) score += 0.1;
  if (content.includes('According to') || content.includes('reported')) score += 0.1;
  if (!title.includes('BREAKING') && !title.includes('!!!')) score += 0.1;
  
  return Math.min(1.0, score);
}

function getSourceCredibilityScore(sourceUrl: string): number {
  const highCredibility = ['reuters.com', 'apnews.com', 'bbc.com', 'wsj.com', 'bloomberg.com'];
  const mediumCredibility = ['cnn.com', 'cnbc.com', 'techcrunch.com', 'theverge.com'];
  
  const domain = extractDomainName(sourceUrl);
  
  if (highCredibility.some(d => domain.includes(d))) return 0.9;
  if (mediumCredibility.some(d => domain.includes(d))) return 0.7;
  return 0.5;
}

function extractDomainName(url: string): string {
  try {
    const domain = new URL(url).hostname;
    return domain.replace('www.', '');
  } catch {
    return 'unknown';
  }
}

async function generateContentHash(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 16);
}