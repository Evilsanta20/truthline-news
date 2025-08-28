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

    console.log(`Fresh news aggregation: category=${category}, limit=${limit}`);

    // Use RSS feeds and direct scraping for more reliable news
    const processedArticles: any[] = [];
    
    try {
      // Use NewsAPI as primary source - more reliable than crawling
      const newsApiKey = Deno.env.get('NEWS_API_KEY');
      if (newsApiKey) {
        console.log('Fetching from NewsAPI...');
        const newsApiUrl = `https://newsapi.org/v2/top-headlines?category=${category}&pageSize=${limit}&apiKey=${newsApiKey}`;
        
        const newsResponse = await fetch(newsApiUrl);
        if (newsResponse.ok) {
          const newsData = await newsResponse.json();
          if (newsData.articles?.length > 0) {
            const articles = await processNewsApiArticles(newsData.articles, supabase);
            processedArticles.push(...articles);
            console.log(`NewsAPI: Processed ${articles.length} articles`);
          }
        }
      }
    } catch (error) {
      console.warn('NewsAPI failed:', error);
    }

    // If NewsAPI didn't get enough articles, try RSS feeds
    if (processedArticles.length < limit / 2) {
      try {
        const rssFeeds = getRSSFeeds(category);
        for (const feed of rssFeeds.slice(0, 2)) {
          try {
            console.log(`Fetching RSS: ${feed.url}`);
            const rssResponse = await fetch(feed.url);
            if (rssResponse.ok) {
              const rssText = await rssResponse.text();
              const articles = await parseRSSFeed(rssText, feed.source, supabase);
              processedArticles.push(...articles.slice(0, 5)); // Limit per feed
              console.log(`RSS ${feed.source}: Processed ${articles.length} articles`);
            }
          } catch (error) {
            console.warn(`RSS feed ${feed.source} failed:`, error);
          }
        }
      } catch (error) {
        console.warn('RSS feeds failed:', error);
      }
    }

    // Fallback to Firecrawl only if we have very few articles
    if (processedArticles.length < 5) {
      const newsUrls = getNewsUrls(category, sources);
      for (const url of newsUrls.slice(0, 2)) { // Limit to avoid rate limits
        try {
          console.log(`Fallback crawling ${url}`);
          
          // Use simpler scrape instead of crawl to avoid rate limits
          const scrapeResponse = await fetch('https://api.firecrawl.dev/v0/scrape', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${firecrawlApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              url: url,
              pageOptions: {
                onlyMainContent: true,
                includeHtml: false,
              }
            }),
          });

          if (scrapeResponse.ok) {
            const scrapeData = await scrapeResponse.json();
            if (scrapeData.success && scrapeData.data) {
              const articles = await processScrapedContent(scrapeData.data, url, supabase);
              processedArticles.push(...articles);
              console.log(`Scraping ${url}: Got ${articles.length} articles`);
            }
          }
        } catch (error) {
          console.warn(`Scraping ${url} failed:`, error);
        }
      }
    }

    // Store aggregation log
    await supabase.from('aggregation_logs').insert({
      source_function: 'enhanced-news-aggregator',
      results: {
        total_processed: processedArticles.length,
        category,
        sources_used: ['NewsAPI', 'RSS', 'Firecrawl'],
        timestamp: new Date().toISOString()
      },
      success_rate: processedArticles.length > 0 ? 1.0 : 0.0,
      log_level: 'info'
    });

    console.log(`Enhanced news aggregation complete: ${processedArticles.length} fresh articles processed`);

    return new Response(JSON.stringify({
      success: true,
      articles: processedArticles,
      total_processed: processedArticles.length,
      message: `Successfully fetched ${processedArticles.length} fresh articles from real news sources`,
      timestamp: new Date().toISOString()
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

function getRSSFeeds(category: string) {
  const feeds = {
    general: [
      { url: 'https://feeds.reuters.com/reuters/topNews', source: 'Reuters' },
      { url: 'https://feeds.bbci.co.uk/news/rss.xml', source: 'BBC News' }
    ],
    technology: [
      { url: 'https://feeds.feedburner.com/TechCrunch', source: 'TechCrunch' },
      { url: 'https://www.theverge.com/rss/index.xml', source: 'The Verge' }
    ],
    business: [
      { url: 'https://feeds.bloomberg.com/markets/news.rss', source: 'Bloomberg' },
      { url: 'https://feeds.reuters.com/reuters/businessNews', source: 'Reuters Business' }
    ],
    sports: [
      { url: 'http://rss.espn.com/rss/news', source: 'ESPN' },
      { url: 'https://feeds.bbci.co.uk/sport/rss.xml', source: 'BBC Sport' }
    ],
    health: [
      { url: 'https://feeds.reuters.com/reuters/health', source: 'Reuters Health' },
      { url: 'https://feeds.bbci.co.uk/news/health/rss.xml', source: 'BBC Health' }
    ]
  };

  return feeds[category as keyof typeof feeds] || feeds.general;
}

async function processNewsApiArticles(articles: any[], supabase: any) {
  const processedArticles: any[] = [];
  
  for (const article of articles) {
    try {
      if (!article.title || !article.description) continue;
      
      const publishedAt = article.publishedAt ? new Date(article.publishedAt).toISOString() : new Date().toISOString();
      const contentHash = await generateContentHash(article.title + article.description);
      
      // Check if article already exists
      const { data: existingArticle } = await supabase
        .from('articles')
        .select('id')
        .eq('content_hash', contentHash)
        .single();
      
      if (existingArticle) continue;
      
      const topics = extractTopics(article.title + ' ' + article.description);
      const sourceName = article.source?.name || 'Unknown Source';
      
      const articleData = {
        title: article.title.substring(0, 500),
        content: article.content || article.description,
        description: article.description?.substring(0, 1000),
        url: article.url,
        url_to_image: article.urlToImage,
        published_at: publishedAt,
        source_name: sourceName,
        topic_tags: topics,
        content_hash: contentHash,
        reading_time_minutes: Math.max(1, Math.ceil((article.content || article.description).split(' ').length / 200)),
        content_quality_score: calculateQualityScore(article.title, article.content || article.description, article.description),
        sentiment_score: 0.5,
        credibility_score: getSourceCredibilityScore(article.source?.name || ''),
        engagement_score: 0
      };
      
      const { data: insertedArticle, error } = await supabase
        .from('articles')
        .insert(articleData)
        .select()
        .single();
      
      if (!error && insertedArticle) {
        processedArticles.push(insertedArticle);
      }
    } catch (error) {
      console.error('Error processing NewsAPI article:', error);
    }
  }
  
  return processedArticles;
}

async function parseRSSFeed(rssText: string, sourceName: string, supabase: any) {
  const articles: any[] = [];
  
  try {
    // Simple RSS parsing - extract items
    const itemMatches = rssText.match(/<item[^>]*>(.*?)<\/item>/gs);
    if (!itemMatches) return articles;
    
    for (const itemXml of itemMatches.slice(0, 10)) { // Limit to 10 per feed
      try {
        const title = itemXml.match(/<title[^>]*><!\[CDATA\[(.*?)\]\]><\/title>|<title[^>]*>(.*?)<\/title>/s)?.[1] || itemXml.match(/<title[^>]*>(.*?)<\/title>/s)?.[1];
        const description = itemXml.match(/<description[^>]*><!\[CDATA\[(.*?)\]\]><\/description>|<description[^>]*>(.*?)<\/description>/s)?.[1] || itemXml.match(/<description[^>]*>(.*?)<\/description>/s)?.[1];
        const link = itemXml.match(/<link[^>]*>(.*?)<\/link>/s)?.[1];
        const pubDate = itemXml.match(/<pubDate[^>]*>(.*?)<\/pubDate>/s)?.[1];
        
        if (!title || !description) continue;
        
        const cleanTitle = title.replace(/<[^>]*>/g, '').trim();
        const cleanDescription = description.replace(/<[^>]*>/g, '').trim();
        
        const publishedAt = pubDate ? new Date(pubDate).toISOString() : new Date().toISOString();
        const contentHash = await generateContentHash(cleanTitle + cleanDescription);
        
        // Check if article already exists
        const { data: existingArticle } = await supabase
          .from('articles')
          .select('id')
          .eq('content_hash', contentHash)
          .single();
        
        if (existingArticle) continue;
        
        const topics = extractTopics(cleanTitle + ' ' + cleanDescription);
        
        const articleData = {
          title: cleanTitle.substring(0, 500),
          content: cleanDescription,
          description: cleanDescription.substring(0, 1000),
          url: link,
          url_to_image: null,
          published_at: publishedAt,
          source_name: sourceName,
          topic_tags: topics,
          content_hash: contentHash,
          reading_time_minutes: Math.max(1, Math.ceil(cleanDescription.split(' ').length / 200)),
          content_quality_score: calculateQualityScore(cleanTitle, cleanDescription, cleanDescription),
          sentiment_score: 0.5,
          credibility_score: getSourceCredibilityScore(sourceName),
          engagement_score: 0
        };
        
        const { data: insertedArticle, error } = await supabase
          .from('articles')
          .insert(articleData)
          .select()
          .single();
        
        if (!error && insertedArticle) {
          articles.push(insertedArticle);
        }
      } catch (error) {
        console.error('Error parsing RSS item:', error);
      }
    }
  } catch (error) {
    console.error('Error parsing RSS feed:', error);
  }
  
  return articles;
}

async function processScrapedContent(scrapedData: any, sourceUrl: string, supabase: any) {
  const articles: any[] = [];
  
  try {
    if (!scrapedData.markdown) return articles;
    
    const content = scrapedData.markdown;
    const title = scrapedData.metadata?.title || 'Latest News';
    const description = scrapedData.metadata?.description || extractFirstParagraph(content);
    
    if (content.length < 100) return articles; // Skip if too short
    
    const contentHash = await generateContentHash(title + content);
    
    // Check if article already exists
    const { data: existingArticle } = await supabase
      .from('articles')
      .select('id')
      .eq('content_hash', contentHash)
      .single();
    
    if (existingArticle) return articles;
    
    const topics = extractTopics(title + ' ' + description);
    
    const articleData = {
      title: title.substring(0, 500),
      content,
      description: description?.substring(0, 1000),
      url: sourceUrl,
      url_to_image: scrapedData.metadata?.ogImage,
      published_at: new Date().toISOString(), // Current time since we don't have published date
      source_name: extractDomainName(sourceUrl),
      topic_tags: topics,
      content_hash: contentHash,
      reading_time_minutes: Math.max(1, Math.ceil(content.split(' ').length / 200)),
      content_quality_score: calculateQualityScore(title, content, description),
      sentiment_score: 0.5,
      credibility_score: getSourceCredibilityScore(sourceUrl),
      engagement_score: 0
    };
    
    const { data: insertedArticle, error } = await supabase
      .from('articles')
      .insert(articleData)
      .select()
      .single();
    
    if (!error && insertedArticle) {
      articles.push(insertedArticle);
    }
  } catch (error) {
    console.error('Error processing scraped content:', error);
  }
  
  return articles;
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