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

    const { searchParams } = new URL(req.url)
    const category = searchParams.get('category') || 'general'
    const limit = parseInt(searchParams.get('limit') || '50')
    const forceRefresh = searchParams.get('refresh') === 'true'

    const newsApiKey = Deno.env.get('NEWS_API_KEY')
    if (!newsApiKey) {
      throw new Error('NEWS_API_KEY is not configured')
    }

    console.log(`Enhanced news aggregation: category=${category}, limit=${limit}, forceRefresh=${forceRefresh}`)

    const allArticles: AggregatedArticle[] = []

    // Fetch from multiple sources for the category
    const sources = NEWS_SOURCES[category as keyof typeof NEWS_SOURCES] || ['reuters', 'bbc-news', 'cnn']
    
    // Fetch from each source
    for (const source of sources.slice(0, 3)) { // Limit to 3 sources per category for performance
      try {
        const newsApiUrl = `https://newsapi.org/v2/top-headlines?apiKey=${newsApiKey}&sources=${source}&pageSize=10`
        
        console.log(`Fetching from source: ${source}`)
        const response = await fetch(newsApiUrl)
        
        if (response.ok) {
          const data = await response.json()
          
          if (data.articles) {
            for (const article of data.articles) {
              if (article.title && article.title !== '[Removed]' && article.url) {
                // Extract keywords for better tagging
                const tags = extractTags(article.title + ' ' + (article.description || ''))
                
                allArticles.push({
                  title: article.title,
                  description: article.description || '',
                  content: article.content || '',
                  url: article.url,
                  urlToImage: article.urlToImage,
                  sourceName: article.source?.name || source,
                  author: article.author,
                  category: category,
                  publishedAt: article.publishedAt,
                  tags: tags
                })
              }
            }
          }
        }
      } catch (error) {
        console.error(`Error fetching from ${source}:`, error)
        continue
      }
    }

    // Also fetch general trending news
    if (category === 'general' || category === 'trending') {
      try {
        const trendingUrl = `https://newsapi.org/v2/top-headlines?apiKey=${newsApiKey}&country=us&pageSize=15`
        const trendingResponse = await fetch(trendingUrl)
        
        if (trendingResponse.ok) {
          const trendingData = await trendingResponse.json()
          
          if (trendingData.articles) {
            for (const article of trendingData.articles) {
              if (article.title && article.title !== '[Removed]' && article.url) {
                const tags = extractTags(article.title + ' ' + (article.description || ''))
                
                allArticles.push({
                  title: article.title,
                  description: article.description || '',
                  content: article.content || '',
                  url: article.url,
                  urlToImage: article.urlToImage,
                  sourceName: article.source?.name || 'Trending News',
                  author: article.author,
                  category: 'trending',
                  publishedAt: article.publishedAt,
                  tags: tags
                })
              }
            }
          }
        }
      } catch (error) {
        console.error('Error fetching trending news:', error)
      }
    }

    // Remove duplicates based on URL
    const uniqueArticles = allArticles.filter((article, index, self) => 
      index === self.findIndex(a => a.url === article.url)
    )

    // Sort by publication date (newest first)
    uniqueArticles.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())

    // Store in database
    const processedArticles = []
    for (const article of uniqueArticles.slice(0, limit)) {
      try {
        // Check if article exists
        const { data: existingArticle } = await supabaseClient
          .from('articles')
          .select('id')
          .eq('url', article.url)
          .single()

        if (!existingArticle || forceRefresh) {
          // Get or create category
          const { data: categoryData } = await supabaseClient
            .from('categories')
            .select('id')
            .eq('slug', article.category)
            .single()

          // Get or create source
          let sourceId = null
          if (article.sourceName) {
            const { data: existingSource } = await supabaseClient
              .from('sources')
              .select('id')
              .eq('name', article.sourceName)
              .single()

            if (existingSource) {
              sourceId = existingSource.id
            } else {
              const { data: newSource } = await supabaseClient
                .from('sources')
                .insert({
                  name: article.sourceName,
                  url: new URL(article.url).origin,
                  category: article.category
                })
                .select('id')
                .single()
              
              sourceId = newSource?.id
            }
          }

          const articleData = {
            title: article.title,
            description: article.description,
            content: article.content,
            url: article.url,
            url_to_image: article.urlToImage,
            source_id: sourceId,
            source_name: article.sourceName,
            author: article.author,
            category_id: categoryData?.id,
            published_at: article.publishedAt,
            topic_tags: article.tags,
            is_trending: article.category === 'trending' || Math.random() > 0.7,
            is_editors_pick: Math.random() > 0.8,
            engagement_score: Math.floor(Math.random() * 1000) + 100
          }

          if (existingArticle) {
            // Update existing
            const { data: updatedArticle } = await supabaseClient
              .from('articles')
              .update(articleData)
              .eq('id', existingArticle.id)
              .select(`
                *,
                categories (name, slug, color),
                sources (name, url)
              `)
              .single()
              
            if (updatedArticle) processedArticles.push(updatedArticle)
          } else {
            // Insert new
            const { data: newArticle } = await supabaseClient
              .from('articles')
              .insert(articleData)
              .select(`
                *,
                categories (name, slug, color),
                sources (name, url)
              `)
              .single()
              
            if (newArticle) processedArticles.push(newArticle)
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
      total: processedArticles.length,
      sources: sources,
      category: category
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