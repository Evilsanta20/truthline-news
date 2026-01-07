// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Guardian API categories mapping
const GUARDIAN_SECTIONS = [
  { section: 'world', category: 'general' },
  { section: 'technology', category: 'technology' },
  { section: 'business', category: 'business' },
  { section: 'sport', category: 'sports' },
  { section: 'culture', category: 'entertainment' },
  { section: 'science', category: 'science' }
]

// RSS sources as fallback
const RSS_SOURCES = [
  { name: 'BBC World', rss: 'https://feeds.bbci.co.uk/news/world/rss.xml', category: 'general' },
  { name: 'BBC Tech', rss: 'https://feeds.bbci.co.uk/news/technology/rss.xml', category: 'technology' },
  { name: 'NPR News', rss: 'https://feeds.npr.org/1001/rss.xml', category: 'general' },
  { name: 'ESPN Sports', rss: 'https://www.espn.com/espn/rss/news', category: 'sports' }
]

async function fetchGuardianNews(apiKey: string, section: string): Promise<any[]> {
  try {
    const url = `https://content.guardianapis.com/search?section=${section}&show-fields=headline,trailText,body,thumbnail,byline&page-size=15&api-key=${apiKey}`
    
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 8000)
    
    const response = await fetch(url, { signal: controller.signal })
    clearTimeout(timeoutId)
    
    if (!response.ok) {
      console.warn(`Guardian API error for ${section}: ${response.status}`)
      return []
    }
    
    const data = await response.json()
    const results = data.response?.results || []
    
    return results.map((item: any) => ({
      title: item.fields?.headline || item.webTitle,
      description: item.fields?.trailText || '',
      content: item.fields?.body?.replace(/<[^>]*>/g, '').substring(0, 2000) || item.fields?.trailText || '',
      url: item.webUrl,
      urlToImage: item.fields?.thumbnail || null,
      author: item.fields?.byline || 'The Guardian',
      publishedAt: item.webPublicationDate,
      sourceName: 'The Guardian'
    }))
  } catch (error) {
    console.warn(`Guardian fetch failed for ${section}:`, error.message)
    return []
  }
}

async function parseRSSFeed(rssText: string, sourceName: string): Promise<any[]> {
  try {
    const items = rssText.match(/<item[^>]*>([\s\S]*?)<\/item>/gi) || []
    
    return items.map(item => {
      const title = item.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1') || ''
      const description = item.match(/<description[^>]*>([\s\S]*?)<\/description>/i)?.[1]?.replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1') || ''
      const link = item.match(/<link[^>]*>([\s\S]*?)<\/link>/i)?.[1] || ''
      const pubDate = item.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i)?.[1] || new Date().toISOString()
      const mediaContent = item.match(/<media:content[^>]*url="([^"]+)"/i)?.[1] || null
      
      return {
        title: title.trim(),
        description: description.trim().replace(/<[^>]*>/g, ''),
        url: link.trim(),
        urlToImage: mediaContent,
        sourceName,
        publishedAt: pubDate,
        content: description.trim().replace(/<[^>]*>/g, ''),
        author: null
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

    const GUARDIAN_API_KEY = Deno.env.get('GUARDIAN_API_KEY')

    console.log('🔄 Reliable News Fetcher - Starting fresh news collection')
    console.log(`📰 Guardian API Key configured: ${!!GUARDIAN_API_KEY}`)

    let totalArticles = 0
    let guardianArticles = 0
    let rssArticles = 0
    const startTime = Date.now()

    // Priority 1: Fetch from Guardian API (most reliable, high-quality content)
    if (GUARDIAN_API_KEY) {
      console.log('🗞️ Fetching from The Guardian API...')
      
      for (const { section, category } of GUARDIAN_SECTIONS) {
        try {
          const articles = await fetchGuardianNews(GUARDIAN_API_KEY, section)
          console.log(`Guardian ${section}: Retrieved ${articles.length} articles`)
          
          const { data: categoryData } = await supabaseClient
            .from('categories')
            .select('id')
            .eq('slug', category)
            .single()
          
          for (const article of articles) {
            try {
              const { data: articleId, error: upsertError } = await supabaseClient.rpc('upsert_article', {
                p_title: article.title.substring(0, 500),
                p_url: article.url,
                p_description: article.description.substring(0, 1000),
                p_content: article.content,
                p_url_to_image: article.urlToImage,
                p_source_name: article.sourceName,
                p_author: article.author,
                p_published_at: new Date(article.publishedAt).toISOString(),
                p_topic_tags: [category, section],
                p_bias_score: 0.45 + Math.random() * 0.1,
                p_credibility_score: 0.85 + Math.random() * 0.15,
                p_sentiment_score: 0.4 + Math.random() * 0.3,
                p_content_quality_score: 0.85 + Math.random() * 0.15,
                p_engagement_score: Math.floor(Math.random() * 40) + 20
              })
              
              if (!upsertError && articleId) {
                if (categoryData?.id) {
                  await supabaseClient
                    .from('articles')
                    .update({ category_id: categoryData.id })
                    .eq('id', articleId)
                }
                guardianArticles++
                totalArticles++
              }
            } catch (error) {
              console.warn('Failed to store Guardian article:', error)
            }
          }
        } catch (error) {
          console.warn(`Guardian ${section} failed:`, error.message)
        }
      }
      console.log(`✅ Guardian API: Added ${guardianArticles} articles`)
    } else {
      console.warn('⚠️ GUARDIAN_API_KEY not configured, skipping Guardian API')
    }

    // Priority 2: Fetch from RSS feeds as supplementary sources
    console.log('🔍 Fetching from RSS sources...')
    for (const source of RSS_SOURCES) {
      try {
        console.log(`Fetching from ${source.name}...`)
        
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 5000)
        
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
          
          const { data: categoryData } = await supabaseClient
            .from('categories')
            .select('id')
            .eq('slug', source.category)
            .single()
          
          for (const article of articles.slice(0, 10)) {
            try {
              const { data: articleId, error: upsertError } = await supabaseClient.rpc('upsert_article', {
                p_title: article.title.substring(0, 500),
                p_url: article.url,
                p_description: article.description.substring(0, 1000),
                p_content: article.content,
                p_url_to_image: article.urlToImage,
                p_source_name: article.sourceName,
                p_author: article.author,
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
                rssArticles++
                totalArticles++
              }
            } catch (error) {
              console.warn('Failed to store RSS article:', error)
            }
          }
        } else {
          console.warn(`${source.name} returned status ${response.status}`)
        }
      } catch (error) {
        console.warn(`${source.name} fetch failed:`, error.message)
      }
    }
    console.log(`✅ RSS Sources: Added ${rssArticles} articles`)

    // Update freshness scores
    const { data: freshnessCount } = await supabaseClient.rpc('update_data_freshness')
    console.log(`📊 Updated freshness scores for ${freshnessCount || 0} articles`)

    const executionTime = Date.now() - startTime
    console.log(`✅ Reliable News Fetcher completed: ${totalArticles} articles in ${executionTime}ms`)

    return new Response(JSON.stringify({
      success: true,
      total_articles: totalArticles,
      guardian_articles: guardianArticles,
      rss_articles: rssArticles,
      execution_time_ms: executionTime,
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