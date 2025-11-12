import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { usePersonalization, PersonalizedArticle } from './usePersonalization'
import { fetchNewsWithFirecrawl } from '@/utils/seedArticles'
import { FeedSettings } from '@/components/reels/SettingsDrawer'

export interface UseFeedOptions {
  initialLimit?: number
  refreshInterval?: number
}

export interface UseFeedReturn {
  articles: PersonalizedArticle[]
  loading: boolean
  error: Error | null
  hasMore: boolean
  settings: Partial<FeedSettings>
  loadMore: () => Promise<void>
  refresh: () => Promise<void>
  updateSettings: (settings: Partial<FeedSettings>) => Promise<void>
  likeArticle: (id: string, liked?: boolean) => Promise<void>
  bookmarkArticle: (id: string, bookmarked?: boolean) => Promise<void>
  muteSource: (source: string) => Promise<void>
  muteTopic: (topic: string) => Promise<void>
  trackView: (articleId: string) => Promise<void>
  generateFresh: () => Promise<{ success: boolean; articles_processed: number; categories: string[]; timestamp?: string }>
}

const DEFAULT_SETTINGS: Partial<FeedSettings> = {
  balancedMode: true,
  exploreRatio: 0.25,
  preferredTopics: [],
  mutedTopics: [],
  mutedSources: [],
  qualityThreshold: 0.4,
  credibilityThreshold: 0.3,
  biasThreshold: 0.8,
  autoRefresh: true,
  refreshInterval: 300,
  showNSFW: false,
}

export const useFeed = (
  userId: string,
  options: UseFeedOptions = {}
): UseFeedReturn => {
  const { initialLimit = 30, refreshInterval = 300000 } = options
  
  const [articles, setArticles] = useState<PersonalizedArticle[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [settings, setSettings] = useState<Partial<FeedSettings>>(DEFAULT_SETTINGS)
  const [lastFetch, setLastFetch] = useState<Date | null>(null)
  
  const refreshTimeoutRef = useRef<NodeJS.Timeout>()
  const abortControllerRef = useRef<AbortController>()

  const {
    recommendations,
    preferences,
    trackInteraction,
    updatePreferences,
    refreshRecommendations,
    loading: personalizationLoading
  } = usePersonalization(userId)

  // Load initial settings from preferences
  useEffect(() => {
    if (preferences) {
      setSettings(prev => ({
        ...prev,
        preferredTopics: preferences.preferred_topics || [],
        mutedTopics: preferences.blocked_topics || [],
        mutedSources: preferences.blocked_sources || [],
      }))
    }
  }, [preferences])

  // Fetch articles with current settings
  const fetchArticles = useCallback(async (append = false, useSettings = settings) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    
    abortControllerRef.current = new AbortController()
    
    try {
      setLoading(true)
      setError(null)

      // Use personalized recommendations first
      if (recommendations && recommendations.length > 0) {
        // Removed strict freshness filter to show existing articles
        const filteredArticles = recommendations.filter(article => {

          // Freshness filter: keep only articles from last 72 hours
          const hoursOld = article.published_at
            ? (Date.now() - new Date(article.published_at as any).getTime()) / 36e5
            : Infinity
          if (hoursOld > 72) {
            return false
          }

          // Apply muted topics filter
          if (useSettings.mutedTopics?.length) {
            const hasBlockedTopic = article.topic_tags?.some(tag => 
              useSettings.mutedTopics!.includes(tag)
            )
            if (hasBlockedTopic) return false
          }

          // Apply muted sources filter
          if (useSettings.mutedSources?.length) {
            if (useSettings.mutedSources.includes(article.source_name)) {
              return false
            }
          }

          // Apply quality thresholds
          if (article.content_quality_score && article.content_quality_score < (useSettings.qualityThreshold || 0.4)) {
            return false
          }
          if (article.credibility_score && article.credibility_score < (useSettings.credibilityThreshold || 0.3)) {
            return false
          }
          if (article.bias_score && article.bias_score > (useSettings.biasThreshold || 0.8)) {
            return false
          }

          return true
        })

        if (append) {
          setArticles(prev => {
            const existingIds = new Set(prev.map(a => a.id))
            const newArticles = filteredArticles.filter(a => !existingIds.has(a.id))
            return [...prev, ...newArticles]
          })
          setHasMore(filteredArticles.length >= initialLimit)
          setLastFetch(new Date())
          return
        } else if (filteredArticles.length > 0) {
          setArticles(filteredArticles)
          setHasMore(filteredArticles.length >= initialLimit)
          setLastFetch(new Date())
          return
        }
        // If no fresh recommended articles, fall back to DB query
      }

      // Fallback to direct database query if no recommendations
      console.log('📝 Fetching articles from database directly')
      // Removed freshness cutoff to show all available articles
      let query = supabase
        .from('articles')
        .select(`
          *,
          categories (name, color, slug)
        `)
        .order('published_at', { ascending: false })
        .order('last_verified_at', { ascending: false })

      // Apply quality filters
      query = query
        .gte('content_quality_score', useSettings.qualityThreshold || 0.4)
        .gte('credibility_score', useSettings.credibilityThreshold || 0.3)
        .lte('bias_score', useSettings.biasThreshold || 0.8)

      // Apply topic filters
      if (useSettings.mutedTopics?.length) {
        query = query.not('topic_tags', 'cs', `{${useSettings.mutedTopics.join(',')}}`)
      }

      // Apply source filters
      if (useSettings.mutedSources?.length) {
        query = query.not('source_name', 'in', `(${useSettings.mutedSources.map(s => `"${s}"`).join(',')})`)
      }

      const { data: fetchedArticles, error: fetchError } = await query
        .range(append ? articles.length : 0, (append ? articles.length : 0) + initialLimit - 1)

      if (fetchError) throw fetchError

      const processedArticles = (fetchedArticles || []).map(article => ({
        ...article,
        recommendation_score: Math.random() * 100, // Fallback scoring
        match_reasons: []
      }))

      if (append) {
        setArticles(prev => [...prev, ...processedArticles])
      } else {
        setArticles(processedArticles)
      }
      
      setHasMore((fetchedArticles || []).length >= initialLimit)
      setLastFetch(new Date())

    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('Error fetching articles:', err)
        setError(err)
      }
    } finally {
      setLoading(false)
    }
  }, [initialLimit, recommendations, settings])

  // Initial load with proper restart handling and dynamic recovery
  useEffect(() => {
    if (userId && !loading) {
      console.log('🔄 Loading initial articles for user:', userId)
      
      // Reset state on restart
      setArticles([])
      setError(null)
      setHasMore(true)
      
      const init = async () => {
        try {
          // First, fetch fresh headlines via Enhanced News Aggregator (real sources)
          console.log('🛰️ Fetching fresh headlines via enhanced-news-aggregator...')
          await supabase.functions.invoke('enhanced-news-aggregator', {
            body: { category: 'general', limit: 100, forceRefresh: true }
          })
          
          // Short delay to allow DB update
          await new Promise(resolve => setTimeout(resolve, 1000))
          
        } catch (e) {
          console.error('Initialization error:', e)
        } finally {
          await fetchArticles(false)
        }
      }
      init()
    }
  }, [userId]) // Remove fetchArticles from deps to prevent infinite loop

  // Force refresh when recommendations change
  useEffect(() => {
    if (recommendations && recommendations.length > 0) {
      console.log('📊 New recommendations received, updating feed...')
      setArticles(recommendations)
    }
  }, [recommendations])

  // Auto refresh with proper restart handling
  useEffect(() => {
    if (!settings.autoRefresh || !userId || loading) return

    // Clear any existing timeout
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current)
    }

    const interval = (settings.refreshInterval || refreshInterval) * 1000
    
    refreshTimeoutRef.current = setTimeout(() => {
      console.log('🔄 Auto-refresh triggered')
      refresh()
    }, interval)

    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current)
      }
    }
  }, [settings.autoRefresh, settings.refreshInterval, refreshInterval, userId, loading]) // Add loading to prevent overlapping calls

  const loadMore = useCallback(async () => {
    if (!hasMore || loading) return
    await fetchArticles(true)
  }, [hasMore, loading, fetchArticles])

  const refresh = useCallback(async () => {
    try {
      console.log('🔄 Manual refresh triggered with dynamic system check')
      setError(null)
      
      // Import refresh service inline to avoid circular dependencies
      const { refreshService } = await import('@/utils/refreshService')
      
      // Perform health check and auto-recovery
      await refreshService.performHealthCheckAndRecover()

      // If still stale, force a stronger fetch via Fresh Article Enhancer
      try {
        const { data: latest } = await supabase
          .from('articles')
          .select('created_at')
          .order('created_at', { ascending: false })
          .limit(1)
          .single()
        const hoursOld = latest?.created_at
          ? (Date.now() - new Date(latest.created_at as any).getTime()) / 36e5
          : 24
        if (hoursOld > 2) {
          console.warn('⚠️ Data still stale after recovery, invoking Fresh Article Enhancer...')
          await supabase.functions.invoke('fresh-article-enhancer', {
            body: { action: 'refresh_and_enhance', limit: 150 }
          })
        }
      } catch (e) {
        console.warn('Staleness check/enhancer fallback error:', (e as Error).message)
      }
      
      // Reset recommendations first
      await refreshRecommendations()
      
      // Clear current articles and refetch
      setArticles([])
      await fetchArticles(false)
      
      console.log('✅ Dynamic refresh completed')
    } catch (error) {
      console.error('Refresh failed:', error)
      setError(error as Error)
      throw error
    }
  }, [fetchArticles, refreshRecommendations])

  const updateSettings = useCallback(async (newSettings: Partial<FeedSettings>) => {
    const updatedSettings = { ...settings, ...newSettings }
    setSettings(updatedSettings)

    // Update user preferences in database
    if (newSettings.preferredTopics || newSettings.mutedTopics || newSettings.mutedSources) {
      await updatePreferences({
        preferred_topics: updatedSettings.preferredTopics || [],
        blocked_topics: updatedSettings.mutedTopics || [],
        blocked_sources: updatedSettings.mutedSources || [],
      })
    }

    // Re-fetch with new settings
    await fetchArticles(false, updatedSettings)
  }, [settings, updatePreferences, fetchArticles])

  const likeArticle = useCallback(async (id: string, liked = true) => {
    // Optimistic update
    setArticles(prev => 
      prev.map(article => 
        article.id === id 
          ? { 
              ...article, 
              engagement_score: (article.engagement_score || 0) + (liked ? 1 : -1)
            }
          : article
      )
    )

    await trackInteraction(id, 'like', liked ? 1 : 0)
  }, [trackInteraction])

  const bookmarkArticle = useCallback(async (id: string, bookmarked = true) => {
    await trackInteraction(id, 'bookmark', bookmarked ? 1 : 0)
  }, [trackInteraction])

  const muteSource = useCallback(async (source: string) => {
    await updateSettings({
      mutedSources: [...(settings.mutedSources || []), source]
    })
  }, [settings.mutedSources, updateSettings])

  const muteTopic = useCallback(async (topic: string) => {
    await updateSettings({
      mutedTopics: [...(settings.mutedTopics || []), topic]
    })
  }, [settings.mutedTopics, updateSettings])

  const trackView = useCallback(async (articleId: string) => {
    await trackInteraction(articleId, 'view', 1)
  }, [trackInteraction])

  const generateFresh = useCallback(async () => {
    try {
      setLoading(true)
      
      console.log('🚀 Fetching live headlines via Enhanced News Aggregator...')
      
      const result = await supabase.functions.invoke('enhanced-news-aggregator', {
        body: { 
          category: 'general',
          limit: 100,
          forceRefresh: true
        }
      })
      
      if (result.error) {
        console.error('Enhanced News Aggregator error:', result.error)
        throw new Error(result.error.message)
      }
      
      const totalFetched = result.data?.total_articles || result.data?.inserted || 0
      console.log(`✅ Enhanced News Aggregator: ${totalFetched} fresh articles processed`)
      
      // Refresh recommendations after fetching
      await refresh()
      
      return {
        success: true,
        articles_processed: totalFetched,
        categories: result.data?.categories_processed || [],
        timestamp: result.data?.timestamp
      }
    } catch (err: any) {
      console.error('Error in generateFresh:', err)
      setError(err)
      throw err
    } finally {
      setLoading(false)
    }
  }, [refresh, supabase])

  // Cleanup
  useEffect(() => {
    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current)
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  return {
    articles,
    loading: loading || personalizationLoading,
    error,
    hasMore,
    settings,
    loadMore,
    refresh,
    updateSettings,
    likeArticle,
    bookmarkArticle,
    muteSource,
    muteTopic,
    trackView,
    generateFresh
  }
}