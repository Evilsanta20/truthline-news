import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface NewsSource {
  name: string
  url: string
  category: string
}

interface AggregatedArticle {
  title: string
  description: string
  content: string
  url: string
  urlToImage: string | null
  sourceName: string
  author: string | null
  category: string
  publishedAt: string
  tags: string[]
}

// AI-powered categorization function
async function categorizeWithAI(title: string, content: string): Promise<string> {
  const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
  if (!openAIApiKey) {
    return 'general';
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-mini-2025-04-14',
        messages: [
          { 
            role: 'system', 
            content: 'Categorize this news article into one of: politics, technology, business, sports, entertainment, health, science, general. Respond with only the category name in lowercase.' 
          },
          { 
            role: 'user', 
            content: `Title: ${title}\nContent: ${content.substring(0, 500)}...` 
          }
        ],
        max_completion_tokens: 10
      }),
    });

    if (response.ok) {
      const data = await response.json();
      return data.choices[0].message.content.trim().toLowerCase();
    }
  } catch (error) {
    console.error('Error in AI categorization:', error);
  }
  
  return 'general';
}

// Enhanced tag extraction with AI
async function extractTagsWithAI(title: string, content: string): Promise<string[]> {
  const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
  if (!openAIApiKey) {
    return extractTags(title + ' ' + content);
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-mini-2025-04-14',
        messages: [
          { 
            role: 'system', 
            content: 'Extract 3-5 key topics/tags from this article. Return as comma-separated values in lowercase.' 
          },
          { 
            role: 'user', 
            content: `Title: ${title}\nContent: ${content.substring(0, 1000)}...` 
          }
        ],
        max_completion_tokens: 50
      }),
    });

    if (response.ok) {
      const data = await response.json();
      const tags = data.choices[0].message.content
        .split(',')
        .map((tag: string) => tag.trim().toLowerCase())
        .filter((tag: string) => tag.length > 2);
      
      return tags.slice(0, 5);
    }
  } catch (error) {
    console.error('Error in AI tag extraction:', error);
  }
  
  // Fallback to basic extraction
  return extractTags(title + ' ' + content);
}

// Multiple news sources for better diversity
const NEWS_SOURCES = {
  politics: [
    'reuters', 'bbc-news', 'cnn', 'politico', 'the-hill', 'associated-press'
  ],
  technology: [
    'techcrunch', 'ars-technica', 'wired', 'the-verge', 'engadget', 'recode'
  ],
  business: [
    'bloomberg', 'fortune', 'financial-times', 'business-insider', 'cnbc', 'reuters'
  ],
  health: [
    'medical-news-today', 'reuters', 'bbc-news', 'cnn', 'associated-press'
  ],
  sports: [
    'espn', 'bbc-sport', 'bleacher-report', 'fox-sports', 'sports-illustrated'
  ],
  entertainment: [
    'entertainment-weekly', 'the-hollywood-reporter', 'variety', 'people', 'us-weekly'
  ]
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    let requestBody: any = {};
    if (req.method === 'POST') {
      requestBody = await req.json();
    }
    
    const category = requestBody.category || 'general'
    const limit = parseInt(requestBody.limit || '50')
    const forceRefresh = requestBody.forceRefresh || false

    const newsApiKey = Deno.env.get('NEWS_API_KEY')
    const guardianApiKey = Deno.env.get('GUARDIAN_API_KEY')

    console.log(`Enhanced news aggregation: category=${category}, limit=${limit}, forceRefresh=${forceRefresh}`)

    const allArticles: AggregatedArticle[] = []

    // 1. Try NewsAPI first (most reliable)
    if (newsApiKey) {
      try {
        const newsApiCategory = mapCategoryToNewsApi(category);
        const newsApiUrl = `https://newsapi.org/v2/top-headlines?apiKey=${newsApiKey}&category=${newsApiCategory}&pageSize=${Math.min(limit, 50)}&language=en&sortBy=publishedAt`
        
        console.log(`Fetching from NewsAPI: ${newsApiCategory}`)
        const response = await fetch(newsApiUrl)
        
        if (response.ok) {
          const data = await response.json()
          
          if (data.articles) {
            for (const article of data.articles) {
              if (article.title && article.title !== '[Removed]' && article.url && article.description) {
                const content = article.content || article.description || '';
                const [aiCategory, aiTags] = await Promise.all([
                  categorizeWithAI(article.title, content),
                  extractTagsWithAI(article.title, content)
                ]);
                
                allArticles.push({
                  title: article.title,
                  description: article.description || '',
                  content: content,
                  url: article.url,
                  urlToImage: article.urlToImage,
                  sourceName: article.source?.name || 'NewsAPI',
                  author: article.author,
                  category: aiCategory,
                  publishedAt: article.publishedAt || new Date().toISOString(),
                  tags: aiTags
                })
              }
            }
            console.log(`NewsAPI: Retrieved ${allArticles.length} articles`)
          }
        } else {
          console.warn(`NewsAPI error: ${response.status} - ${await response.text()}`)
        }
      } catch (error) {
        console.error('NewsAPI failed:', error)
      }
    }

    // 2. Try Guardian API as fallback
    if (guardianApiKey && allArticles.length < limit / 2) {
      try {
        const guardianSection = mapCategoryToGuardian(category);
        const guardianUrl = `https://content.guardianapis.com/search?api-key=${guardianApiKey}&section=${guardianSection}&page-size=${Math.min(20, limit)}&show-fields=headline,byline,thumbnail,short-url,body&order-by=newest`
        
        console.log(`Fetching from Guardian: ${guardianSection}`)
        const response = await fetch(guardianUrl)
        
        if (response.ok) {
          const data = await response.json()
          
          if (data.response?.results) {
            for (const article of data.response.results) {
              if (article.webTitle && article.webUrl) {
                const content = article.fields?.body || article.fields?.headline || '';
                const [aiCategory, aiTags] = await Promise.all([
                  categorizeWithAI(article.webTitle, content),
                  extractTagsWithAI(article.webTitle, content)
                ]);
                
                allArticles.push({
                  title: article.webTitle,
                  description: content.substring(0, 300) + '...',
                  content: content,
                  url: article.webUrl,
                  urlToImage: article.fields?.thumbnail,
                  sourceName: 'The Guardian',
                  author: article.fields?.byline,
                  category: aiCategory,
                  publishedAt: article.webPublicationDate || new Date().toISOString(),
                  tags: aiTags
                })
              }
            }
            console.log(`Guardian: Retrieved ${data.response.results.length} additional articles`)
          }
        } else {
          console.warn(`Guardian API error: ${response.status}`)
        }
      } catch (error) {
        console.error('Guardian API failed:', error)
      }
    }

    // 3. Try RSS feeds as final fallback
    if (allArticles.length < 10) {
      try {
        const rssFeeds = getRSSFeeds(category);
        for (const feed of rssFeeds.slice(0, 2)) {
          try {
            console.log(`Fetching RSS: ${feed.source}`)
            const rssResponse = await fetch(feed.url, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; NewsAggregator/1.0)'
              }
            });
            
            if (rssResponse.ok) {
              const rssText = await rssResponse.text();
              const rssArticles = await parseRSSFeed(rssText, feed.source);
              allArticles.push(...rssArticles.slice(0, 8));
              console.log(`RSS ${feed.source}: Retrieved ${rssArticles.length} articles`)
            }
          } catch (error) {
            console.warn(`RSS ${feed.source} failed:`, error)
          }
        }
      } catch (error) {
        console.warn('RSS feeds failed:', error)
      }
    }

    // Also fetch general trending news if needed
    if ((category === 'general' || category === 'trending') && newsApiKey && allArticles.length < limit) {
      try {
        const trendingUrl = `https://newsapi.org/v2/top-headlines?apiKey=${newsApiKey}&country=us&pageSize=15`
        const trendingResponse = await fetch(trendingUrl)
        
        if (trendingResponse.ok) {
          const trendingData = await trendingResponse.json()
          
          if (trendingData.articles) {
            for (const article of trendingData.articles) {
              if (article.title && article.title !== '[Removed]' && article.url) {
                const content = article.content || article.description || '';
                const [aiCategory, aiTags] = await Promise.all([
                  categorizeWithAI(article.title, content),
                  extractTagsWithAI(article.title, content)
                ]);
                
                allArticles.push({
                  title: article.title,
                  description: article.description || '',
                  content: content,
                  url: article.url,
                  urlToImage: article.urlToImage,
                  sourceName: article.source?.name || 'Trending News',
                  author: article.author,
                  category: aiCategory,
                  publishedAt: article.publishedAt,
                  tags: aiTags
                })
              }
            }
          }
        }
      } catch (error) {
        console.error('Error fetching trending news:', error)
      }
    }

    // Remove duplicates and sort by freshness (publication date)
    const uniqueArticles = allArticles.filter((article, index, self) => 
      index === self.findIndex(a => a.url === article.url)
    ).sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())

    console.log(`Total unique articles collected: ${uniqueArticles.length}`)

    // Store fresh articles in database
    const processedArticles = []
    for (const article of uniqueArticles.slice(0, limit)) {
      try {
        // Generate content hash for duplicate detection
        const contentHash = await generateContentHash(article.title + article.description);
        
        // Check if article already exists by content hash
        const { data: existingArticle } = await supabaseClient
          .from('articles')
          .select('id')
          .eq('content_hash', contentHash)
          .single()

        if (!existingArticle || forceRefresh) {
          const articleData = {
            title: article.title.substring(0, 500),
            description: article.description?.substring(0, 1000),
            content: article.content,
            url: article.url,
            url_to_image: article.urlToImage,
            source_name: article.sourceName,
            author: article.author,
            published_at: article.publishedAt,
            topic_tags: article.tags,
            content_hash: contentHash,
            reading_time_minutes: Math.max(1, Math.ceil((article.content || article.description || '').split(' ').length / 200)),
            content_quality_score: calculateQualityScore(article.title, article.content, article.description),
            sentiment_score: 0.5,
            credibility_score: getSourceCredibilityScore(article.sourceName),
            engagement_score: Math.floor(Math.random() * 100) + 50,
            is_trending: Math.random() > 0.8,
            is_featured: Math.random() > 0.9
          }

          if (existingArticle && forceRefresh) {
            // Update existing article
            const { data: updatedArticle, error } = await supabaseClient
              .from('articles')
              .update(articleData)
              .eq('id', existingArticle.id)
              .select()
              .single()
            
            if (!error && updatedArticle) {
              processedArticles.push(updatedArticle)
            }
          } else if (!existingArticle) {
            // Insert new article
            const { data: newArticle, error } = await supabaseClient
              .from('articles')
              .insert(articleData)
              .select()
              .single()
            
            if (!error && newArticle) {
              processedArticles.push(newArticle)
            }
          }
        }
      } catch (error) {
        console.error('Error processing article:', error)
        continue
      }
    }

    console.log(`Enhanced aggregation complete: ${processedArticles.length} articles processed`)

    return new Response(JSON.stringify({
      success: true,
      articles: processedArticles,
      total_processed: processedArticles.length,
      sources: ['NewsAPI', 'Guardian API', 'RSS', 'Firecrawl'],
      category: category,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('Error in enhanced-news-aggregator:', error)
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false,
      articles: [],
      total: 0 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

function calculateQualityScore(title: string, content: string, description?: string): number {
  let score = 0.5; // Base score
  
  // Length factors - reward substantial content
  if (content && content.length > 500) score += 0.1;
  if (content && content.length > 1500) score += 0.1;
  if (title && title.length > 20 && title.length < 100) score += 0.1;
  
  // Content quality indicators
  if (description && description.length > 50) score += 0.1;
  if (content && (content.includes('According to') || content.includes('reported'))) score += 0.1;
  if (title && !title.includes('BREAKING') && !title.includes('!!!')) score += 0.1;
  
  // Freshness bonus for real-time content
  score += 0.15;
  
  return Math.min(1.0, score);
}

function getSourceCredibilityScore(sourceName: string): number {
  const highCredibility = ['Reuters', 'Associated Press', 'BBC', 'NPR', 'PBS', 'Wall Street Journal', 'Financial Times', 'The Guardian'];
  const mediumCredibility = ['CNN', 'CNBC', 'Bloomberg', 'TechCrunch', 'The Verge', 'ESPN', 'Medical News Today', 'NewsAPI'];
  
  const source = sourceName.toLowerCase();
  
  if (highCredibility.some(s => source.includes(s.toLowerCase()))) return 0.9;
  if (mediumCredibility.some(s => source.includes(s.toLowerCase()))) return 0.7;
  return 0.5;
}

async function generateContentHash(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 16);
}

// Helper function to extract relevant tags from text
function extractTags(text: string): string[] {
  const commonTags = [
    'breaking', 'exclusive', 'update', 'analysis', 'opinion', 'report',
    'election', 'economy', 'climate', 'covid', 'ukraine', 'china', 'biden',
    'trump', 'ai', 'technology', 'startup', 'crypto', 'stock', 'market',
    'health', 'vaccine', 'treatment', 'study', 'research', 'sports',
    'olympics', 'world cup', 'nfl', 'nba', 'entertainment', 'movie',
    'music', 'celebrity', 'award', 'festival'
  ]
  
  const lowerText = text.toLowerCase()
  return commonTags.filter(tag => lowerText.includes(tag))
}

function mapCategoryToNewsApi(category: string): string {
  const mapping: { [key: string]: string } = {
    'general': 'general',
    'technology': 'technology', 
    'business': 'business',
    'health': 'health',
    'sports': 'sports',
    'entertainment': 'entertainment',
    'science': 'science',
    'politics': 'general'
  };
  
  return mapping[category] || 'general';
}

function mapCategoryToGuardian(category: string): string {
  const mapping: { [key: string]: string } = {
    'general': 'world',
    'technology': 'technology',
    'business': 'business',
    'health': 'society',
    'sports': 'sport',
    'entertainment': 'culture',
    'science': 'science',
    'politics': 'politics'
  };
  
  return mapping[category] || 'world';
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
      { url: 'https://feeds.reuters.com/reuters/businessNews', source: 'Reuters Business' }
    ],
    sports: [
      { url: 'https://feeds.bbci.co.uk/sport/rss.xml', source: 'BBC Sport' }
    ],
    health: [
      { url: 'https://feeds.reuters.com/reuters/health', source: 'Reuters Health' }
    ]
  };

  return feeds[category as keyof typeof feeds] || feeds.general;
}

async function parseRSSFeed(rssText: string, sourceName: string) {
  const articles: AggregatedArticle[] = [];
  
  try {
    const itemMatches = rssText.match(/<item[^>]*>(.*?)<\/item>/gs);
    if (!itemMatches) return articles;
    
    for (const itemXml of itemMatches.slice(0, 10)) {
      try {
        const title = itemXml.match(/<title[^>]*><!\[CDATA\[(.*?)\]\]><\/title>|<title[^>]*>(.*?)<\/title>/s)?.[1] || itemXml.match(/<title[^>]*>(.*?)<\/title>/s)?.[1];
        const description = itemXml.match(/<description[^>]*><!\[CDATA\[(.*?)\]\]><\/description>|<description[^>]*>(.*?)<\/description>/s)?.[1] || itemXml.match(/<description[^>]*>(.*?)<\/description>/s)?.[1];
        const link = itemXml.match(/<link[^>]*>(.*?)<\/link>/s)?.[1];
        const pubDate = itemXml.match(/<pubDate[^>]*>(.*?)<\/pubDate>/s)?.[1];
        
        if (!title || !description) continue;
        
        const cleanTitle = title.replace(/<[^>]*>/g, '').trim();
        const cleanDescription = description.replace(/<[^>]*>/g, '').trim();
        
        if (cleanTitle.length < 10 || cleanDescription.length < 50) continue;
        
        const publishedAt = pubDate ? new Date(pubDate).toISOString() : new Date().toISOString();
        
        const [aiCategory, aiTags] = await Promise.all([
          categorizeWithAI(cleanTitle, cleanDescription),
          extractTagsWithAI(cleanTitle, cleanDescription)
        ]);
        
        articles.push({
          title: cleanTitle,
          description: cleanDescription,
          content: cleanDescription,
          url: link || '',
          urlToImage: null,
          sourceName: sourceName,
          author: null,
          category: aiCategory,
          publishedAt: publishedAt,
          tags: aiTags
        });
      } catch (error) {
        console.error('Error parsing RSS item:', error);
      }
    }
  } catch (error) {
    console.error('Error parsing RSS feed:', error);
  }
  
  return articles;
}