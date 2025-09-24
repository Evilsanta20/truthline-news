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

interface ProcessedArticle {
  title: string
  content: string
  source: string
  url: string
  timestamp: string
  category: string
  content_hash: string
  source_api: string
}

// News API implementations
class IndiaToday {
  static async fetch(category: string, limit: number): Promise<any[]> {
    try {
      // Using RSS feed for India Today since they don't have a public API
      const rssUrl = `https://www.indiatoday.in/rss/${category === 'general' ? 'home' : category}`
      const response = await fetch(rssUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; NewsAggregator/1.0)' }
      })
      
      if (!response.ok) return []
      
      const rssText = await response.text()
      const articles = parseRSSFeed(rssText, 'India Today')
      return articles.slice(0, limit)
    } catch (error) {
      console.warn('India Today fetch failed:', error)
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

class FirecrawlAPI {
  static async fetch(category: string, limit: number): Promise<any[]> {
    const apiKey = Deno.env.get('FIRECRAWL_API_KEY')
    if (!apiKey) return []
    
    try {
      const sources = getFirecrawlSources(category)
      const articles: any[] = []
      
      for (const source of sources.slice(0, 2)) {
        try {
          const response = await fetch('https://api.firecrawl.dev/v0/scrape', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              url: source.url,
              pageOptions: {
                onlyMainContent: true
              },
              extractorOptions: {
                mode: 'llm-extraction',
                extractionPrompt: 'Extract news articles with title, content, and publication date'
              }
            })
          })
          
          if (response.ok) {
            const data = await response.json()
            if (data.data?.content) {
              articles.push({
                title: `Breaking News from ${source.name}`,
                content: data.data.content.substring(0, 2000),
                url: source.url,
                sourceName: source.name,
                publishedAt: new Date().toISOString(),
                category: category
              })
            }
          }
        } catch (error) {
          console.warn(`Firecrawl ${source.name} failed:`, error)
        }
      }
      
      return articles.slice(0, Math.min(limit, 5))
    } catch (error) {
      console.warn('Firecrawl fetch failed:', error)
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
      { name: 'Reuters', priority: 2, fetch: Reuters.fetch },
      { name: 'India Today', priority: 3, fetch: IndiaToday.fetch },
      { name: 'Firecrawl', priority: 4, fetch: FirecrawlAPI.fetch }
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
            const stored = await this.storeArticles(articles, api.name, category, useSmartUpsert)
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
  
  private async storeArticles(articles: any[], sourceAPI: string, category: string, useSmartUpsert = false): Promise<number> {
    let stored = 0
    
    for (const article of articles) {
      try {
        if (useSmartUpsert) {
          // Use the new smart upsert function for persistence and deduplication
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
        } else {
          // Legacy storage method
          const contentHash = await this.generateContentHash(article.title + (article.url || ''))
          
          // Check for duplicates by title + URL
          const { data: existing } = await this.supabase
            .from('articles')
            .select('id')
            .or(`content_hash.eq.${contentHash},and(title.eq."${article.title.replace(/"/g, '\\"')}",url.eq."${article.url}")`)
            .single()
          
          if (existing) {
            console.log(`Duplicate found: ${article.title.substring(0, 50)}...`)
            continue
          }
          
          // Prepare article data
          const articleData = {
            title: article.title.substring(0, 500),
            description: (article.description || article.content || '').substring(0, 1000),
            content: article.content || article.description || '',
            url: article.url,
            url_to_image: article.urlToImage || null,
            source_name: article.sourceName || sourceAPI,
          author: article.author || null,
          published_at: article.publishedAt || new Date().toISOString(),
          topic_tags: this.extractTags(article.title + ' ' + (article.content || '')),
          content_hash: contentHash,
          reading_time_minutes: Math.max(1, Math.ceil((article.content || article.description || '').split(' ').length / 200)),
          content_quality_score: this.calculateQualityScore(article.title, article.content || ''),
          sentiment_score: 0.5,
          credibility_score: this.getSourceCredibilityScore(article.sourceName || sourceAPI),
          engagement_score: Math.floor(Math.random() * 50) + 50,
          is_trending: Math.random() > 0.8,
          is_featured: Math.random() > 0.9,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
        
        // Insert new article
        const { error } = await this.supabase
          .from('articles')
          .insert(articleData)
        
        if (!error) {
          stored++
          console.log(`✓ Stored: ${article.title.substring(0, 50)}...`)
        } else {
          console.warn(`✗ Failed to store: ${error.message}`)
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
  
  private async generateContentHash(content: string): Promise<string> {
    const encoder = new TextEncoder()
    const data = encoder.encode(content)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 16)
  }
  
  private extractTags(text: string): string[] {
    const commonTags = [
      'breaking', 'exclusive', 'update', 'analysis', 'india', 'world',
      'politics', 'economy', 'technology', 'health', 'sports', 'business'
    ]
    
    const lowerText = text.toLowerCase()
    return commonTags.filter(tag => lowerText.includes(tag)).slice(0, 5)
  }
  
  private calculateQualityScore(title: string, content: string): number {
    let score = 0.5
    
    if (content && content.length > 500) score += 0.2
    if (title && title.length > 20 && title.length < 100) score += 0.1
    if (content && content.includes('according to')) score += 0.1
    if (!title.includes('BREAKING') && !title.includes('!!!')) score += 0.1
    
    return Math.min(1.0, score)
  }
  
  private getSourceCredibilityScore(sourceName: string): number {
    const highCredibility = ['Reuters', 'Associated Press', 'BBC', 'NPR', 'India Today']
    const mediumCredibility = ['NewsAPI', 'Firecrawl', 'CNN', 'Bloomberg']
    
    const source = sourceName.toLowerCase()
    
    if (highCredibility.some(s => source.includes(s.toLowerCase()))) return 0.9
    if (mediumCredibility.some(s => source.includes(s.toLowerCase()))) return 0.7
    return 0.5
  }
  
  async getLatestArticles(limit: number = 30): Promise<any[]> {
    const { data: articles } = await this.supabase
      .from('articles')
      .select(`
        *,
        categories (name, color, slug)
      `)
      .order('published_at', { ascending: false })
      .limit(limit)
    
    return articles || []
  }
  
  async getFetchLogs(limit: number = 50): Promise<any[]> {
    const { data: logs } = await this.supabase
      .from('news_fetch_logs')
      .select('*')
      .order('fetch_timestamp', { ascending: false })
      .limit(limit)
    
    return logs || []
  }
}

// Utility functions
function parseRSSFeed(rssText: string, sourceName: string): any[] {
  const articles: any[] = []
  
  try {
    // Basic RSS parsing - extract items
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

function getFirecrawlSources(category: string): { name: string, url: string }[] {
  const sources = {
    general: [
      { name: 'Times of India', url: 'https://timesofindia.indiatimes.com' },
      { name: 'Hindustan Times', url: 'https://www.hindustantimes.com' }
    ],
    technology: [
      { name: 'TechCrunch', url: 'https://techcrunch.com' },
      { name: 'The Verge', url: 'https://www.theverge.com' }
    ],
    business: [
      { name: 'Business Standard', url: 'https://www.business-standard.com' },
      { name: 'Economic Times', url: 'https://economictimes.indiatimes.com' }
    ]
  }
  
  return sources[category as keyof typeof sources] || sources.general
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
    
    switch (action) {
      case 'refresh':
        await newsSystem.fetchLiveArticles(categories, limit)
        const articles = await newsSystem.getLatestArticles(30)
        
        return new Response(JSON.stringify({
          success: true,
          message: 'News refresh completed',
          articles: articles,
          total_articles: articles.length,
          timestamp: new Date().toISOString(),
          categories_processed: categories
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
        
      case 'get_latest':
        const latestArticles = await newsSystem.getLatestArticles(limit)
        
        return new Response(JSON.stringify({
          success: true,
          articles: latestArticles,
          total: latestArticles.length,
          timestamp: new Date().toISOString()
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
        
      case 'get_logs':
        const logs = await newsSystem.getFetchLogs(50)
        
        return new Response(JSON.stringify({
          success: true,
          logs: logs,
          total: logs.length
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
        
      default:
        return new Response(JSON.stringify({
          error: 'Invalid action. Use: refresh, get_latest, or get_logs'
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
    }

  } catch (error) {
    console.error('Error in cybotic-news-system:', error)
    return new Response(JSON.stringify({
      error: error.message,
      success: false
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})