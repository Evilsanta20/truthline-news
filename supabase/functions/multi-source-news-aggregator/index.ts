import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const newsApiKey = Deno.env.get('NEWS_API_KEY')!;
const guardianApiKey = Deno.env.get('GUARDIAN_API_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface NewsSource {
  name: string;
  fetchFunction: (category?: string, limit?: number) => Promise<any[]>;
}

interface ProcessedArticle {
  id: string;
  title: string;
  description: string;
  content: string;
  url: string;
  url_to_image: string;
  source_name: string;
  author: string;
  published_at: string;
  topic_tags: string[];
  entities: string[];
  lang: string;
  content_hash: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { sources = ['newsapi', 'guardian'], category = 'general', limit = 50, forceRefresh = false } = await req.json();

    console.log(`Starting multi-source aggregation: sources=${sources}, category=${category}, limit=${limit}`);

    let allArticles: any[] = [];
    const aggregationLogs: string[] = [];

    // Define news sources
    const newsSources: { [key: string]: NewsSource } = {
      newsapi: {
        name: 'NewsAPI',
        fetchFunction: (cat, lim) => fetchNewsAPI(cat, lim)
      },
      guardian: {
        name: 'The Guardian',
        fetchFunction: (cat, lim) => fetchGuardianNews(cat, lim)
      },
      // Add more sources here as needed
    };

    // Fetch from each requested source
    for (const sourceKey of sources) {
      if (newsSources[sourceKey]) {
        try {
          console.log(`Fetching from ${newsSources[sourceKey].name}...`);
          const articles = await newsSources[sourceKey].fetchFunction(category, Math.ceil(limit / sources.length));
          allArticles = allArticles.concat(articles);
          aggregationLogs.push(`✓ ${newsSources[sourceKey].name}: ${articles.length} articles`);
        } catch (error) {
          console.error(`Error fetching from ${newsSources[sourceKey].name}:`, error);
          aggregationLogs.push(`✗ ${newsSources[sourceKey].name}: ${error.message}`);
        }
      }
    }

    console.log(`Total raw articles fetched: ${allArticles.length}`);

    // Step 1: Normalize and deduplicate articles
    const normalizedArticles = normalizeArticles(allArticles);
    const deduplicatedArticles = await deduplicateArticles(normalizedArticles);

    console.log(`After normalization and deduplication: ${deduplicatedArticles.length} articles`);

    // Step 2: Process each article through content analyzer
    const processedArticles: any[] = [];
    const processingLogs: string[] = [];

    for (const article of deduplicatedArticles.slice(0, limit)) {
      try {
        // Analyze content quality
        const analysisResult = await supabase.functions.invoke('enhanced-content-analyzer', {
          body: {
            title: article.title,
            content: article.content,
            source_name: article.source_name,
            url: article.url,
            author: article.author
          }
        });

        if (analysisResult.error) {
          console.error('Content analysis error:', analysisResult.error);
          processingLogs.push(`✗ Analysis failed for: "${article.title}"`);
          continue;
        }

        const analysis = analysisResult.data;

        if (analysis.passes_quality_check) {
          // Add analysis results to article
          const enhancedArticle = {
            ...article,
            // Quality scores
            toxicity_score: analysis.scores.toxicity_score,
            bias_score: analysis.scores.bias_score,
            sensationalism_score: analysis.scores.sensationalism_score,
            political_polarity: analysis.scores.political_polarity,
            subjectivity: analysis.scores.subjectivity,
            factuality_score: analysis.scores.factuality_score,
            content_quality_score: analysis.scores.content_quality_score,
            credibility_score: analysis.scores.credibility_score,
            
            // AI-generated summaries
            ai_summary: analysis.summaries ? JSON.stringify(analysis.summaries) : null,
            
            // Processing metadata
            ai_processed_at: new Date().toISOString(),
            processing_notes: analysis.explanations ? analysis.explanations.join('; ') : null
          };

          processedArticles.push(enhancedArticle);
          processingLogs.push(`✓ Processed: "${article.title}" (Quality: ${(analysis.scores.content_quality_score * 100).toFixed(0)}%)`);
        } else {
          processingLogs.push(`✗ Rejected: "${article.title}" - ${analysis.rejection_reason}`);
        }
      } catch (error) {
        console.error(`Error processing article "${article.title}":`, error);
        processingLogs.push(`✗ Error processing: "${article.title}"`);
      }
    }

    console.log(`Final processed articles: ${processedArticles.length}`);

    // Step 3: Store processed articles in database
    const storedCount = await storeArticles(processedArticles);

    // Step 4: Log aggregation results
    await logAggregationResults({
      sources_requested: sources,
      category,
      total_fetched: allArticles.length,
      after_deduplication: deduplicatedArticles.length,
      final_stored: storedCount,
      aggregation_logs: aggregationLogs,
      processing_logs: processingLogs.slice(-20) // Keep last 20 for brevity
    });

    return new Response(
      JSON.stringify({
        success: true,
        total_fetched: allArticles.length,
        processed: processedArticles.length,
        stored: storedCount,
        logs: {
          aggregation: aggregationLogs,
          processing: processingLogs.slice(-10) // Return last 10 for API response
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in multi-source aggregator:', error);
    return new Response(
      JSON.stringify({ error: 'Aggregation failed', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function fetchNewsAPI(category = 'general', limit = 25) {
  const categoryMap: { [key: string]: string } = {
    'general': 'general',
    'politics': 'general', // NewsAPI doesn't have politics category
    'technology': 'technology',
    'business': 'business',
    'health': 'health',
    'sports': 'sports',
    'entertainment': 'entertainment',
    'science': 'science'
  };

  const mappedCategory = categoryMap[category] || 'general';
  
  const response = await fetch(
    `https://newsapi.org/v2/top-headlines?country=us&category=${mappedCategory}&pageSize=${limit}&apiKey=${newsApiKey}`
  );

  if (!response.ok) {
    throw new Error(`NewsAPI error: ${response.status}`);
  }

  const data = await response.json();
  return data.articles || [];
}

async function fetchGuardianNews(category = 'general', limit = 25) {
  const sectionMap: { [key: string]: string } = {
    'general': 'news',
    'politics': 'politics',
    'technology': 'technology',
    'business': 'business',
    'health': 'society', // Guardian uses 'society' for health-related news
    'sports': 'sport',
    'entertainment': 'culture',
    'science': 'science',
    'world': 'world'
  };

  const section = sectionMap[category] || 'news';
  
  const response = await fetch(
    `https://content.guardianapis.com/search?section=${section}&page-size=${limit}&show-fields=bodyText,thumbnail&api-key=${guardianApiKey}`
  );

  if (!response.ok) {
    throw new Error(`Guardian API error: ${response.status}`);
  }

  const data = await response.json();
  
  // Transform Guardian format to standard format
  return (data.response?.results || []).map((article: any) => ({
    title: article.webTitle,
    description: article.fields?.bodyText?.substring(0, 200) + '...' || '',
    content: article.fields?.bodyText || '',
    url: article.webUrl,
    urlToImage: article.fields?.thumbnail || null,
    source: { name: 'The Guardian' },
    author: 'The Guardian',
    publishedAt: article.webPublicationDate
  }));
}

function normalizeArticles(articles: any[]): ProcessedArticle[] {
  return articles.map(article => {
    // Extract image URL with fallbacks
    let imageUrl = article.urlToImage || article.url_to_image;
    if (!imageUrl && article.fields?.thumbnail) {
      imageUrl = article.fields.thumbnail;
    }
    
    // Generate content hash for deduplication
    const contentForHash = (article.title + article.description + article.content).replace(/\s+/g, ' ').trim();
    const contentHash = generateHash(contentForHash);

    // Extract topics and entities (basic implementation)
    const topicTags = extractTopics(article.title + ' ' + (article.description || ''));
    const entities = extractEntities(article.title + ' ' + (article.description || ''));

    return {
      id: generateHash(article.url), // Use URL hash as ID
      title: article.title || '',
      description: article.description || '',
      content: article.content || article.fields?.bodyText || article.description || '',
      url: article.url || '',
      url_to_image: imageUrl || '',
      source_name: article.source?.name || 'Unknown',
      author: article.author || 'Unknown',
      published_at: new Date(article.publishedAt || article.webPublicationDate || Date.now()).toISOString(),
      topic_tags: topicTags,
      entities: entities,
      lang: 'en', // Assuming English for now
      content_hash: contentHash
    };
  }).filter(article => article.title && article.content && article.url);
}

async function deduplicateArticles(articles: ProcessedArticle[]): Promise<ProcessedArticle[]> {
  const seenHashes = new Set();
  const seenUrls = new Set();
  const uniqueArticles: ProcessedArticle[] = [];

  // Check existing articles in database
  const { data: existingArticles } = await supabase
    .from('articles')
    .select('url, content_hash')
    .in('url', articles.map(a => a.url));

  const existingUrls = new Set((existingArticles || []).map((a: any) => a.url));
  const existingHashes = new Set((existingArticles || []).map((a: any) => a.content_hash));

  for (const article of articles) {
    if (!seenUrls.has(article.url) && 
        !seenHashes.has(article.content_hash) &&
        !existingUrls.has(article.url) &&
        !existingHashes.has(article.content_hash)) {
      
      seenUrls.add(article.url);
      seenHashes.add(article.content_hash);
      uniqueArticles.push(article);
    }
  }

  return uniqueArticles;
}

async function storeArticles(articles: any[]): Promise<number> {
  if (articles.length === 0) return 0;

  try {
    const { data, error } = await supabase
      .from('articles')
      .insert(articles)
      .select('id');

    if (error) {
      console.error('Error storing articles:', error);
      return 0;
    }

    return data?.length || 0;
  } catch (error) {
    console.error('Error in storeArticles:', error);
    return 0;
  }
}

async function logAggregationResults(results: any) {
  const logEntry = {
    source_function: 'multi-source-news-aggregator',
    execution_time: new Date().toISOString(),
    results: results,
    success_rate: results.final_stored / Math.max(results.total_fetched, 1),
    log_level: 'info'
  };

  // Store in logs table if it exists
  try {
    await supabase
      .from('aggregation_logs')
      .insert(logEntry);
  } catch (error) {
    console.log('Could not store aggregation log (table may not exist):', error.message);
  }
}

// Utility functions
function generateHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}

function extractTopics(text: string): string[] {
  const topicKeywords: { [key: string]: string[] } = {
    'politics': ['election', 'government', 'congress', 'senate', 'president', 'policy', 'vote', 'campaign'],
    'technology': ['ai', 'tech', 'software', 'internet', 'digital', 'cyber', 'app', 'platform'],
    'business': ['market', 'stock', 'economy', 'finance', 'company', 'corporate', 'investment'],
    'health': ['health', 'medical', 'disease', 'hospital', 'doctor', 'vaccine', 'medicine'],
    'sports': ['game', 'team', 'player', 'match', 'championship', 'league', 'score'],
    'entertainment': ['movie', 'music', 'celebrity', 'show', 'film', 'actor', 'entertainment'],
    'science': ['research', 'study', 'scientist', 'discovery', 'space', 'climate', 'environment']
  };

  const lowerText = text.toLowerCase();
  const topics: string[] = [];

  for (const [topic, keywords] of Object.entries(topicKeywords)) {
    if (keywords.some(keyword => lowerText.includes(keyword))) {
      topics.push(topic);
    }
  }

  return topics.length > 0 ? topics : ['general'];
}

function extractEntities(text: string): string[] {
  // Basic entity extraction (could be enhanced with NLP)
  const entities: string[] = [];
  
  // Extract capitalized words as potential entities
  const capitalizedWords = text.match(/\b[A-Z][a-z]{2,}\b/g) || [];
  
  // Filter common words and add unique entities
  const commonWords = ['The', 'This', 'That', 'These', 'Those', 'And', 'But', 'For', 'With'];
  const uniqueEntities = [...new Set(capitalizedWords)]
    .filter(word => !commonWords.includes(word))
    .slice(0, 10); // Limit to 10 entities

  return uniqueEntities;
}