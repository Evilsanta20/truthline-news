import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface NewsAPI {
  name: string
  priority: number
  fetch: (category: string, limit: number) => Promise<any[]>
}

// News API implementations
class NewsAPISource {
  static async fetch(category: string, limit: number): Promise<any[]> {
    const apiKey = Deno.env.get('NEWS_API_KEY')
    if (!apiKey) return []
    
    try {
      const newsApiCategory = mapCategoryToNewsApi(category)
      const url = `https://newsapi.org/v2/top-headlines?apiKey=${apiKey}&category=${newsApiCategory}&pageSize=${Math.min(limit, 50)}&language=en&sortBy=publishedAt`
      
      const response = await fetch(url)
      if (!response.ok) return []
      
      const data = await response.json()
      
      if (data.articles) {
        return data.articles
          .filter((article: any) => article.title && article.title !== '[Removed]' && article.url)
          .map((article: any) => ({
            title: article.title,
            content: article.content || article.description || '',
            description: article.description,
            url: article.url,
            urlToImage: article.urlToImage,
            sourceName: article.source?.name || 'NewsAPI',
            author: article.author,
            publishedAt: article.publishedAt,
            category: category
          }))
          .slice(0, limit)
      }
      return []
    } catch (error) {
      console.warn('NewsAPI fetch failed:', error)
      return []
    }
  }
}

class Reuters {
  static async fetch(category: string, limit: number): Promise<any[]> {
    try {
      const rssUrl = `https://feeds.reuters.com/reuters/${category === 'general' ? 'world' : category}News`
      const response = await fetch(rssUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; NewsAggregator/1.0)' }
      })
      
      if (!response.ok) return []
      
      const rssText = await response.text()
      const articles = parseRSSFeed(rssText, 'Reuters')
      return articles.slice(0, limit)
    } catch (error) {
      console.warn('Reuters fetch failed:', error)
      return []
    }
  }
}

// Main news system class
class CyboticNewsSystem {
  private supabase: any
  private newsAPIs: NewsAPI[]
  
  constructor(supabaseClient: any) {
    this.supabase = supabaseClient
    this.newsAPIs = [
      { name: 'NewsAPI', priority: 1, fetch: NewsAPISource.fetch },
      { name: 'Reuters', priority: 2, fetch: Reuters.fetch }
    ]
  }
  
  async fetchLiveArticles(categories: string[] = ['general'], limit: number = 50): Promise<void> {
    const startTime = Date.now()
    let totalFetched = 0
    let totalStored = 0
    
    console.log(`Starting news fetch for categories: ${categories.join(', ')}`)
    
    for (const category of categories) {
      console.log(`\n=== Processing category: ${category} ===`)
      
      for (const api of this.newsAPIs) {
        try {
          console.log(`Fetching from ${api.name}...`)
          const apiStartTime = Date.now()
          
          const articles = await api.fetch(category, Math.ceil(limit / categories.length / this.newsAPIs.length) + 5)
          const apiExecutionTime = Date.now() - apiStartTime
          
          console.log(`${api.name}: Retrieved ${articles.length} articles in ${apiExecutionTime}ms`)
          
          if (articles.length > 0) {
            const stored = await this.storeArticles(articles, api.name, category)
            totalFetched += articles.length
            totalStored += stored
            
            // Log this API fetch
            await this.logFetch(api.name, category, articles.length, stored, 'success', null, apiExecutionTime)
          } else {
            await this.logFetch(api.name, category, 0, 0, 'no_data', 'No articles returned', apiExecutionTime)
          }
        } catch (error) {
          console.error(`${api.name} failed for ${category}:`, error)
          await this.logFetch(api.name, category, 0, 0, 'error', error.message, Date.now() - startTime)
        }
      }
    }
    
    const totalExecutionTime = Date.now() - startTime
    console.log(`\n=== News fetch complete ===`)
    console.log(`Total articles fetched: ${totalFetched}`)
    console.log(`Total articles stored: ${totalStored}`)
    console.log(`Total execution time: ${totalExecutionTime}ms`)
    
    // Log overall execution
    await this.logFetch('SYSTEM', 'ALL', totalFetched, totalStored, 'success', null, totalExecutionTime)
  }
  
  private async storeArticles(articles: any[], sourceAPI: string, category: string): Promise<number> {
    let stored = 0
    
    for (const article of articles) {
      try {
        // Use the smart upsert function
        const { data: articleId, error: upsertError } = await this.supabase.rpc('upsert_article', {
          p_title: article.title?.substring(0, 500) || 'Untitled',
          p_url: article.url || `#${Date.now()}`,
          p_description: (article.description || article.content || '').substring(0, 1000),
          p_content: article.content || article.description || '',
          p_url_to_image: article.urlToImage || null,
          p_source_name: article.sourceName || sourceAPI,
          p_author: article.author || null,
          p_published_at: article.publishedAt ? new Date(article.publishedAt).toISOString() : null,
          p_topic_tags: this.extractTopicTags(article.title, article.description),
          p_bias_score: Math.random() * 0.4 + 0.3, // Random between 0.3-0.7
          p_credibility_score: Math.random() * 0.3 + 0.6, // Random between 0.6-0.9
          p_sentiment_score: Math.random() * 0.6 + 0.2, // Random between 0.2-0.8
          p_content_quality_score: this.calculateContentQuality(article),
          p_engagement_score: 0
        })
        
        if (upsertError) {
          console.error('Upsert error:', upsertError)
          continue
        }
        
        if (articleId) {
          stored++
          console.log(`✅ Upserted: ${article.title.substring(0, 50)}...`)
        }
      } catch (error) {
        console.error('Error storing article:', error)
      }
    }
    
    return stored
  }
  
  private async logFetch(apiSource: string, category: string, fetched: number, stored: number, status: string, errorMessage: string | null, executionTime: number): Promise<void> {
    try {
      await this.supabase
        .from('news_fetch_logs')
        .insert({
          api_source: apiSource,
          category: category,
          articles_fetched: fetched,
          articles_stored: stored,
          api_status: status,
          error_message: errorMessage,
          execution_time_ms: executionTime,
          fetch_timestamp: new Date().toISOString()
        })
    } catch (error) {
      console.error('Failed to log fetch:', error)
    }
  }
  
  private extractTopicTags(title: string, description: string): string[] {
    const commonTopics = [
      'breaking', 'exclusive', 'update', 'analysis', 'politics', 'economy', 
      'technology', 'health', 'sports', 'business', 'science', 'world'
    ]
    
    const text = ((title || '') + ' ' + (description || '')).toLowerCase()
    return commonTopics.filter(topic => text.includes(topic)).slice(0, 5)
  }
  
  private calculateContentQuality(article: any): number {
    let score = 0.5
    
    const content = article.content || article.description || ''
    const title = article.title || ''
    
    if (content.length > 500) score += 0.2
    if (title.length > 20 && title.length < 100) score += 0.1
    if (content.includes('according to')) score += 0.1
    if (!title.toUpperCase().includes('BREAKING') && !title.includes('!!!')) score += 0.1
    
    return Math.min(1.0, score)
  }
}

// Utility functions
function parseRSSFeed(rssText: string, sourceName: string): any[] {
  const articles: any[] = []
  
  try {
    const itemRegex = /<item[^>]*>([\s\S]*?)<\/item>/g
    let match
    
    while ((match = itemRegex.exec(rssText)) !== null) {
      const itemContent = match[1]
      
      const title = extractXMLContent(itemContent, 'title')
      const link = extractXMLContent(itemContent, 'link')
      const description = extractXMLContent(itemContent, 'description')
      const pubDate = extractXMLContent(itemContent, 'pubDate')
      
      if (title && link) {
        articles.push({
          title: title,
          content: description || '',
          description: description || '',
          url: link,
          sourceName: sourceName,
          publishedAt: pubDate || new Date().toISOString(),
        })
      }
    }
  } catch (error) {
    console.warn(`RSS parsing failed for ${sourceName}:`, error)
  }
  
  return articles
}

function extractXMLContent(xml: string, tag: string): string {
  const regex = new RegExp(`<${tag}[^>]*>([^<]*)<\/${tag}>`, 'i')
  const match = xml.match(regex)
  return match ? match[1].trim() : ''
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
  }
  
  return mapping[category] || 'general'
}

// Main edge function
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const newsSystem = new CyboticNewsSystem(supabaseClient)
    
    let requestBody: any = {}
    if (req.method === 'POST') {
      requestBody = await req.json()
    }
    
    const action = requestBody.action || 'refresh'
    const categories = requestBody.categories || ['general', 'technology', 'business', 'health', 'sports']
    const limit = parseInt(requestBody.limit || '100')
    
    console.log(`Cybotic News System: action=${action}, categories=${categories.join(',')}, limit=${limit}`)
    
    if (action === 'refresh') {
      await newsSystem.fetchLiveArticles(categories, limit)
      
      return new Response(JSON.stringify({
        success: true,
        action: 'refresh',
        total_articles: limit,
        categories_processed: categories,
        timestamp: new Date().toISOString()
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
    
    return new Response(JSON.stringify({
      success: false,
      error: 'Unknown action'
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Cybotic News System error:', error)
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})