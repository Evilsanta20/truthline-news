// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Reliable news sources with direct RSS/API access
const RELIABLE_SOURCES = [
  {
    name: 'BBC News',
    rss: 'http://feeds.bbci.co.uk/news/rss.xml',
    category: 'general'
  },
  {
    name: 'BBC Tech',
    rss: 'http://feeds.bbci.co.uk/news/technology/rss.xml',
    category: 'technology'
  },
  {
    name: 'BBC Business',
    rss: 'http://feeds.bbci.co.uk/news/business/rss.xml',
    category: 'business'
  },
  {
    name: 'CNN Top Stories',
    rss: 'http://rss.cnn.com/rss/edition.rss',
    category: 'general'
  },
  {
    name: 'TechCrunch',
    rss: 'https://techcrunch.com/feed/',
    category: 'technology'
  }
]

// No hardcoded articles - only fetch from real RSS sources
const IMMEDIATE_FRESH_ARTICLES: any[] = []

async function parseRSSFeed(rssText: string, sourceName: string): Promise<any[]> {
  try {
    // Simple RSS parsing for title, description, link, pubDate
    const items = rssText.match(/<item[^>]*>([\s\S]*?)<\/item>/gi) || []
    
    return items.map(item => {
      const title = item.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1') || ''
      const description = item.match(/<description[^>]*>([\s\S]*?)<\/description>/i)?.[1]?.replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1') || ''
      const link = item.match(/<link[^>]*>([\s\S]*?)<\/link>/i)?.[1] || ''
      const pubDate = item.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i)?.[1] || new Date().toISOString()
      
      return {
        title: title.trim(),
        description: description.trim().replace(/<[^>]*>/g, ''),
        url: link.trim(),
        sourceName,
        publishedAt: pubDate,
        content: description.trim().replace(/<[^>]*>/g, ''),
        category: 'general'
      }
    }).filter(article => article.title && article.url)
  } catch (error) {
    console.error('RSS parsing error:', error)
    return []
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('🔄 Reliable News Fetcher - Starting fresh news collection')

    let totalArticles = 0
    const startTime = Date.now()

    // First, add immediate fresh articles with proper categorization
    console.log('📰 Adding immediate fresh articles...')
    for (const article of IMMEDIATE_FRESH_ARTICLES) {
      try {
        // Determine category based on tags
        let categorySlug = 'general'
        if (article.tags.some(t => ['ai', 'technology', 'tech'].includes(t))) categorySlug = 'technology'
        else if (article.tags.some(t => ['medical', 'health', 'cure'].includes(t))) categorySlug = 'health'
        else if (article.tags.some(t => ['science', 'physics', 'research'].includes(t))) categorySlug = 'science'
        
        // Get category_id
        const { data: categoryData } = await supabaseClient
          .from('categories')
          .select('id')
          .eq('slug', categorySlug)
          .single()
        
        const { data: articleId, error: upsertError } = await supabaseClient.rpc('upsert_article', {
          p_title: article.title,
          p_url: article.url,
          p_description: article.description,
          p_content: article.content,
          p_url_to_image: null,
          p_source_name: article.source_name,
          p_author: article.author,
          p_published_at: new Date().toISOString(),
          p_topic_tags: article.tags,
          p_bias_score: 0.4 + Math.random() * 0.2,
          p_credibility_score: 0.8 + Math.random() * 0.2,
          p_sentiment_score: 0.4 + Math.random() * 0.4,
          p_content_quality_score: 0.8 + Math.random() * 0.2,
          p_engagement_score: Math.floor(Math.random() * 50) + 20
        })

        if (!upsertError && articleId) {
          // Update category_id if we found one
          if (categoryData?.id) {
            await supabaseClient
              .from('articles')
              .update({ category_id: categoryData.id })
              .eq('id', articleId)
          }
          totalArticles++
          console.log(`✅ Added to ${categorySlug}: ${article.title.substring(0, 50)}...`)
        }
      } catch (error) {
        console.warn('Failed to add article:', error)
      }
    }

    // Then try RSS feeds (with timeout and error handling)
    console.log('🔍 Fetching from RSS sources...')
    for (const source of RELIABLE_SOURCES) {
      try {
        console.log(`Fetching from ${source.name}...`)
        
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 5000) // 5 second timeout
        
        const response = await fetch(source.rss, {
          signal: controller.signal,
          headers: { 
            'User-Agent': 'Mozilla/5.0 (compatible; NewsBot/1.0)',
            'Accept': 'application/rss+xml, application/xml, text/xml'
          }
        })
        
        clearTimeout(timeoutId)
        
        if (response.ok) {
          const rssText = await response.text()
          const articles = await parseRSSFeed(rssText, source.name)
          
          console.log(`${source.name}: Retrieved ${articles.length} articles`)
          
          for (const article of articles.slice(0, 10)) {
            try {
              // Get category_id based on source category
              const { data: categoryData } = await supabaseClient
                .from('categories')
                .select('id')
                .eq('slug', source.category)
                .single()
              
              const { data: articleId, error: upsertError } = await supabaseClient.rpc('upsert_article', {
                p_title: article.title.substring(0, 500),
                p_url: article.url,
                p_description: article.description.substring(0, 1000),
                p_content: article.content,
                p_url_to_image: null,
                p_source_name: article.sourceName,
                p_author: article.author || null,
                p_published_at: new Date(article.publishedAt).toISOString(),
                p_topic_tags: [source.category],
                p_bias_score: 0.4 + Math.random() * 0.2,
                p_credibility_score: 0.7 + Math.random() * 0.3,
                p_sentiment_score: 0.3 + Math.random() * 0.4,
                p_content_quality_score: 0.7 + Math.random() * 0.3,
                p_engagement_score: Math.floor(Math.random() * 30) + 10
              })
              
              if (!upsertError && articleId) {
                if (categoryData?.id) {
                  await supabaseClient
                    .from('articles')
                    .update({ category_id: categoryData.id })
                    .eq('id', articleId)
                }
                totalArticles++
              }
            } catch (error) {
              console.warn('Failed to store article:', error)
            }
          }
        } else {
          console.warn(`${source.name} returned status ${response.status}`)
        }
      } catch (error) {
        console.warn(`${source.name} fetch failed:`, error.message)
      }
    }

    // Update freshness scores
    const { data: freshnessCount } = await supabaseClient.rpc('update_data_freshness')
    console.log(`📊 Updated freshness scores for ${freshnessCount || 0} articles`)

    const executionTime = Date.now() - startTime
    console.log(`✅ Reliable News Fetcher completed: ${totalArticles} articles in ${executionTime}ms`)

    return new Response(JSON.stringify({
      success: true,
      total_articles: totalArticles,
      execution_time_ms: executionTime,
      immediate_articles: IMMEDIATE_FRESH_ARTICLES.length,
      rss_sources_processed: RELIABLE_SOURCES.length,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('❌ Reliable News Fetcher failed:', error)
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})