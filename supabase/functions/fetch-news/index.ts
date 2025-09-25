// @ts-nocheck
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface NewsApiArticle {
  source: { id: string | null; name: string }
  author: string | null
  title: string
  description: string | null
  url: string
  urlToImage: string | null
  publishedAt: string
  content: string | null
}

interface NewsApiResponse {
  status: string
  totalResults: number
  articles: NewsApiArticle[]
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
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
    const country = searchParams.get('country') || 'us'
    const query = searchParams.get('q') || ''
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '20')

    const newsApiKey = Deno.env.get('NEWS_API_KEY')
    if (!newsApiKey) {
      throw new Error('NEWS_API_KEY is not configured')
    }

    console.log(`Fetching news: category=${category}, country=${country}, query=${query}, page=${page}`)

    // Build News API URL
    let newsApiUrl = `https://newsapi.org/v2/top-headlines?apiKey=${newsApiKey}&pageSize=${pageSize}&page=${page}`
    
    if (query) {
      newsApiUrl += `&q=${encodeURIComponent(query)}`
    } else {
      newsApiUrl += `&country=${country}`
      if (category !== 'general') {
        newsApiUrl += `&category=${category}`
      }
    }

    console.log('Fetching from News API:', newsApiUrl.replace(newsApiKey, '[API_KEY]'))

    // Fetch from News API
    const newsResponse = await fetch(newsApiUrl)
    
    if (!newsResponse.ok) {
      const errorText = await newsResponse.text()
      console.error('News API error:', errorText)
      throw new Error(`News API error: ${newsResponse.status} ${errorText}`)
    }

    const newsData: NewsApiResponse = await newsResponse.json()
    console.log(`Fetched ${newsData.articles?.length || 0} articles from News API`)

    if (!newsData.articles) {
      return new Response(JSON.stringify({ articles: [], total: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Get or create category
    const { data: categoryData } = await supabaseClient
      .from('categories')
      .select('id')
      .eq('slug', category)
      .single()

    // Process and store articles
    const processedArticles = []
    
    for (const article of newsData.articles) {
      try {
        // Skip articles with incomplete data
        if (!article.title || !article.url || article.title === '[Removed]') {
          continue
        }

        // Check if source exists, create if not
        let sourceId = null
        if (article.source?.name) {
          const { data: existingSource } = await supabaseClient
            .from('sources')
            .select('id')
            .eq('name', article.source.name)
            .single()

          if (existingSource) {
            sourceId = existingSource.id
          } else {
            const { data: newSource } = await supabaseClient
              .from('sources')
              .insert({
                name: article.source.name,
                url: article.url.split('/').slice(0, 3).join('/'),
                api_id: article.source.id,
                category: category
              })
              .select('id')
              .single()
            
            sourceId = newSource?.id
          }
        }

        // Check if article already exists
        const { data: existingArticle } = await supabaseClient
          .from('articles')
          .select('id')
          .eq('url', article.url)
          .single()

        if (!existingArticle) {
          // Insert new article
          const { data: newArticle, error: insertError } = await supabaseClient
            .from('articles')
            .insert({
              title: article.title,
              description: article.description,
              content: article.content,
              url: article.url,
              url_to_image: article.urlToImage,
              source_id: sourceId,
              source_name: article.source?.name,
              author: article.author,
              category_id: categoryData?.id,
              published_at: article.publishedAt,
              is_trending: Math.random() > 0.8, // Random trending
              is_editors_pick: Math.random() > 0.9 // Random editor's pick
            })
            .select()
            .single()

          if (insertError) {
            console.error('Error inserting article:', insertError)
            continue
          }

          processedArticles.push(newArticle)
        } else {
          // Return existing article
          const { data: existingFullArticle } = await supabaseClient
            .from('articles')
            .select(`
              *,
              categories (name, slug, color),
              sources (name, url)
            `)
            .eq('id', existingArticle.id)
            .single()

          if (existingFullArticle) {
            processedArticles.push(existingFullArticle)
          }
        }
      } catch (error) {
        console.error('Error processing article:', error)
        continue
      }
    }

    console.log(`Processed ${processedArticles.length} articles`)

    return new Response(JSON.stringify({
      articles: processedArticles,
      total: newsData.totalResults,
      page,
      pageSize
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('Error in fetch-news function:', error)
    return new Response(JSON.stringify({ 
      error: error.message,
      articles: [],
      total: 0 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})