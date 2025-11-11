import { useState, useCallback } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { toast } from 'sonner'

interface FreshArticleOptions {
  onProgress?: (message: string) => void
  onComplete?: (result: any) => void
  onError?: (error: Error) => void
}

export const useFreshArticleSystem = (options: FreshArticleOptions = {}) => {
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState<string | null>(null)

  const updateProgress = useCallback((message: string) => {
    setProgress(message)
    options.onProgress?.(message)
  }, [options])

  // Force refresh all articles with AI enhancement
  const refreshAndEnhanceArticles = useCallback(async () => {
    if (loading) return

    try {
      setLoading(true)
      updateProgress('🚀 Starting comprehensive article refresh...')

      toast.info('🔄 Refreshing articles with AI enhancement...', {
        description: 'This may take a few minutes to complete',
        duration: 5000
      })

      const { data, error } = await supabase.functions.invoke('fresh-article-enhancer', {
        body: { 
          action: 'refresh_and_enhance',
          categories: ['general', 'technology', 'business'] // keep it light to avoid timeouts
        }
      })

      let result = data || {}

      if (error || !result) {
        console.warn('fresh-article-enhancer failed, falling back to cybotic-news-system:', error?.message)
        updateProgress('🛰️ Falling back to direct fresh fetch...')

        const fallback = await supabase.functions.invoke('enhanced-news-aggregator', {
          body: {
            category: 'general',
            limit: 100,
            forceRefresh: true
          }
        })

        if (fallback.error) {
          throw new Error(fallback.error.message || 'Failed to fetch fresh articles')
        }

        result = {
          new_articles_fetched: fallback.data?.total_articles || 0,
          articles_enhanced: 0,
          via: 'fallback-cybotic'
        }
      }

      updateProgress('✅ Article refresh completed successfully!')

      toast.success(`🎉 Articles refreshed and enhanced!`, {
        description: `${result.new_articles_fetched || 0} new articles fetched${result.articles_enhanced ? ", " + result.articles_enhanced + " enhanced" : ''}`,
        duration: 10000
      })

      options.onComplete?.(result)
      return result

    } catch (error: any) {
      console.error('Fresh article system error:', error)
      updateProgress(`❌ Error: ${error.message}`)
      
      toast.error('Failed to refresh articles', {
        description: error.message,
        duration: 10000
      })

      options.onError?.(error)
      throw error
    } finally {
      setLoading(false)
      setTimeout(() => setProgress(null), 3000)
    }
  }, [loading, updateProgress, options])

  // Enhance existing articles only
  const enhanceExistingArticles = useCallback(async () => {
    if (loading) return

    try {
      setLoading(true)
      updateProgress('🤖 Enhancing existing articles with AI...')

      toast.info('🎨 Enhancing articles with AI...', {
        description: 'Making your articles more engaging and perfect',
        duration: 5000
      })

      const { data, error } = await supabase.functions.invoke('fresh-article-enhancer', {
        body: { action: 'enhance_only' }
      })

      if (error) {
        throw new Error(error.message || 'Failed to enhance articles')
      }

      const result = data || {}
      updateProgress('✅ Article enhancement completed!')

      toast.success(`✨ Articles enhanced successfully!`, {
        description: `${result.articles_enhanced || 0} articles enhanced with AI`,
        duration: 8000
      })

      options.onComplete?.(result)
      return result

    } catch (error: any) {
      console.error('Article enhancement error:', error)
      updateProgress(`❌ Error: ${error.message}`)
      
      toast.error('Failed to enhance articles', {
        description: error.message,
        duration: 8000
      })

      options.onError?.(error)
      throw error
    } finally {
      setLoading(false)
      setTimeout(() => setProgress(null), 3000)
    }
  }, [loading, updateProgress, options])

  // Get fresh articles from news APIs only
  const fetchFreshArticles = useCallback(async () => {
    if (loading) return

    try {
      setLoading(true)
      updateProgress('📰 Fetching fresh articles from news sources...')

      toast.info('📡 Fetching latest news...', {
        description: 'Getting fresh articles from multiple sources',
        duration: 5000
      })

      const { data, error } = await supabase.functions.invoke('fresh-article-enhancer', {
        body: { action: 'refresh_only' }
      })

      if (error) {
        throw new Error(error.message || 'Failed to fetch fresh articles')
      }

      const result = data || {}
      updateProgress('✅ Fresh articles fetched successfully!')

      toast.success(`📰 Fresh articles loaded!`, {
        description: `${result.new_articles_fetched || 0} new articles added`,
        duration: 8000
      })

      options.onComplete?.(result)
      return result

    } catch (error: any) {
      console.error('Fresh articles fetch error:', error)
      updateProgress(`❌ Error: ${error.message}`)
      
      toast.error('Failed to fetch fresh articles', {
        description: error.message,
        duration: 8000
      })

      options.onError?.(error)
      throw error
    } finally {
      setLoading(false)
      setTimeout(() => setProgress(null), 3000)
    }
  }, [loading, updateProgress, options])

  // Check article freshness status
  const checkArticleFreshness = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('articles')
        .select('created_at, data_freshness_score')
        .order('created_at', { ascending: false })
        .limit(1)

      if (error) throw error

      const latestArticle = data?.[0]
      const daysSinceLatest = latestArticle 
        ? Math.floor((Date.now() - new Date(latestArticle.created_at).getTime()) / (1000 * 60 * 60 * 24))
        : Infinity

      return {
        latest_article_age_days: daysSinceLatest,
        needs_refresh: daysSinceLatest > 1,
        freshness_score: latestArticle?.data_freshness_score || 0
      }
    } catch (error) {
      console.error('Error checking article freshness:', error)
      return {
        latest_article_age_days: Infinity,
        needs_refresh: true,
        freshness_score: 0
      }
    }
  }, [])

  return {
    loading,
    progress,
    refreshAndEnhanceArticles,
    enhanceExistingArticles,
    fetchFreshArticles,
    checkArticleFreshness
  }
}