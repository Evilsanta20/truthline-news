import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/integrations/supabase/client'

interface UseAutoRefreshOptions {
  userId: string
  refreshInterval?: number // in seconds, default 300 (5 minutes)
  onNewArticles?: (count: number) => void
  onRefreshComplete?: () => void
  enableDeduplication?: boolean // Track and exclude shown articles
}

interface Article {
  id: string
  title: string
  description: string
  url: string
  published_at: string
  created_at: string
  recommendation_score: number
  [key: string]: any
}

export const useAutoRefresh = ({
  userId,
  refreshInterval = 300,
  onNewArticles,
  onRefreshComplete,
  enableDeduplication = true
}: UseAutoRefreshOptions) => {
  const [articles, setArticles] = useState<Article[]>([])
  const [latestTimestamp, setLatestTimestamp] = useState<string | null>(null)
  const [pendingArticles, setPendingArticles] = useState<Article[]>([])
  const [isAtTop, setIsAtTop] = useState(true)
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [nextRefresh, setNextRefresh] = useState(refreshInterval)
  const [shownArticleIds, setShownArticleIds] = useState<Set<string>>(new Set())
  const [hasMore, setHasMore] = useState(true)
  
  const scrollListenerRef = useRef<() => void>()

  // Load shown article IDs from localStorage
  useEffect(() => {
    if (enableDeduplication) {
      const saved = localStorage.getItem(`shown_articles_${userId}`)
      if (saved) {
        try {
          setShownArticleIds(new Set(JSON.parse(saved)))
        } catch (e) {
          console.error('Error loading shown articles:', e)
        }
      }
    }
  }, [userId, enableDeduplication])

  // Save shown article IDs to localStorage
  const saveShownArticles = useCallback((ids: Set<string>) => {
    if (enableDeduplication) {
      localStorage.setItem(`shown_articles_${userId}`, JSON.stringify([...ids]))
    }
  }, [userId, enableDeduplication])

  // Filter out already shown articles
  const filterNewArticles = useCallback((articleList: Article[]) => {
    if (!enableDeduplication) return articleList
    return articleList.filter(article => !shownArticleIds.has(article.id))
  }, [shownArticleIds, enableDeduplication])

  // Mark articles as shown
  const markArticlesAsShown = useCallback((articleList: Article[]) => {
    if (!enableDeduplication) return
    
    const newIds = new Set(shownArticleIds)
    articleList.forEach(article => newIds.add(article.id))
    setShownArticleIds(newIds)
    saveShownArticles(newIds)
  }, [shownArticleIds, saveShownArticles, enableDeduplication])

  // Track scroll position to determine if user is at top
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop
      setIsAtTop(scrollTop < 100) // Consider "at top" if within 100px
    }

    scrollListenerRef.current = handleScroll
    window.addEventListener('scroll', handleScroll, { passive: true })
    
    return () => {
      window.removeEventListener('scroll', handleScroll)
    }
  }, [])

  // Fetch new articles using the since parameter
  const fetchNewArticles = useCallback(async () => {
    if (loading) return

    try {
      setLoading(true)
      
      const { data, error } = await supabase.functions.invoke('ai-personalized-recommendations', {
        body: { 
          userId, 
          limit: 30,
          since: latestTimestamp, // Only get articles since last fetch
          balancedMode: true,
          exploreRatio: 0.25
        }
      })

      if (error) {
        console.error('Error fetching new articles:', error)
        return
      }

      let newArticles = data?.articles || []
      
      // Filter out already shown articles
      newArticles = filterNewArticles(newArticles)
      
      if (newArticles.length > 0) {
        // Mark new articles as shown
        markArticlesAsShown(newArticles)
        // If newest published article is too old, use DB latest instead
        const newestPub = newArticles
          .map((a: any) => a.published_at || a.created_at)
          .filter(Boolean)
          .sort((a: string, b: string) => new Date(b).getTime() - new Date(a).getTime())[0]
        const hoursOld = newestPub ? (Date.now() - new Date(newestPub).getTime()) / 36e5 : 24
        if (hoursOld > 12) {
          const recentCutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
          const { data: dbLatest } = await supabase
            .from('articles')
            .select('*')
            .gte('published_at', recentCutoff)
            .order('last_verified_at', { ascending: false })
            .order('published_at', { ascending: false })
            .limit(30)
          const mapped = (dbLatest as any[] || []).map(a => ({ ...a, recommendation_score: a.recommendation_score ?? Math.random() * 100 }))
          if (isAtTop) {
            setArticles(prev => [...mapped, ...prev])
            setPendingArticles([])
          } else {
            setPendingArticles(prev => [...mapped, ...prev])
            onNewArticles?.(mapped.length)
          }
          setLatestTimestamp(new Date().toISOString())
        } else {
          // Update latest timestamp
          setLatestTimestamp(data.latest_timestamp)
          
          if (isAtTop) {
            setArticles(prev => [...newArticles, ...prev])
            setPendingArticles([])
          } else {
            setPendingArticles(prev => [...newArticles, ...prev])
            onNewArticles?.(newArticles.length)
          }
        }
      } else {
        // Fallback A: DB since last_verified_at > latestTimestamp
        if (latestTimestamp) {
          const recentCutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
          const { data: dbNew } = await supabase
            .from('articles')
            .select('*')
            .gt('last_verified_at', latestTimestamp)
            .gte('published_at', recentCutoff)
            .order('last_verified_at', { ascending: false })
            .limit(30)
          if ((dbNew?.length || 0) > 0) {
            const mapped = (dbNew as any[]).map(a => ({ ...a, recommendation_score: a.recommendation_score ?? Math.random() * 100 }))
            if (isAtTop) {
              setArticles(prev => [...mapped, ...prev])
              setPendingArticles([])
            } else {
              setPendingArticles(prev => [...mapped, ...prev])
              onNewArticles?.(mapped.length)
            }
            setLatestTimestamp(new Date().toISOString())
          } else {
            // Fallback B: Just take the latest verified/published items
            const recentCutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
            const { data: dbLatest } = await supabase
              .from('articles')
              .select('*')
              .gte('published_at', recentCutoff)
              .order('last_verified_at', { ascending: false })
              .order('published_at', { ascending: false })
              .limit(30)
            const mapped = (dbLatest as any[] || []).map(a => ({ ...a, recommendation_score: a.recommendation_score ?? Math.random() * 100 }))
            if (isAtTop) {
              setArticles(prev => [...mapped, ...prev])
              setPendingArticles([])
            } else {
              setPendingArticles(prev => [...mapped, ...prev])
              onNewArticles?.(mapped.length)
            }
            setLatestTimestamp(new Date().toISOString())
          }
        }
      }

      onRefreshComplete?.()
    } catch (error) {
      console.error('Error in fetchNewArticles:', error)
    } finally {
      setLoading(false)
    }
  }, [userId, latestTimestamp, isAtTop, loading, onNewArticles, onRefreshComplete])

  // Auto-refresh countdown timer with proper restart handling
  useEffect(() => {
    // Initialize countdown if not set
    if (nextRefresh === 0) {
      setNextRefresh(refreshInterval)
    }

    const interval = setInterval(() => {
      setNextRefresh(prev => {
        if (prev <= 1) {
          fetchNewArticles()
          return refreshInterval // Reset timer
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [refreshInterval, fetchNewArticles])

  // Reset timer when component mounts or userId changes
  useEffect(() => {
    setNextRefresh(refreshInterval)
  }, [userId, refreshInterval])

  // Format countdown display - use useCallback to ensure stability
  const formatCountdown = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }, [])

  // Initial load of articles
  const loadInitialArticles = useCallback(async () => {
    try {
      setLoading(true)
      
      const { data, error } = await supabase.functions.invoke('ai-personalized-recommendations', {
        body: { 
          userId, 
          limit: 30,
          balancedMode: true,
          exploreRatio: 0.25
        }
      })

      if (error) {
        console.error('Error loading initial articles:', error)
        return
      }

      let initialArticles = data?.articles || []
      
      // Filter out already shown articles
      initialArticles = filterNewArticles(initialArticles)
      
      if (initialArticles.length > 0) {
        // Mark initial articles as shown
        markArticlesAsShown(initialArticles)
        // If newest published article is too old, fall back to DB latest
        const newestPub = initialArticles
          .map((a: any) => a.published_at || a.created_at)
          .filter(Boolean)
          .sort((a: string, b: string) => new Date(b).getTime() - new Date(a).getTime())[0]
        const hoursOld = newestPub ? (Date.now() - new Date(newestPub).getTime()) / 36e5 : 24
        if (hoursOld > 12) {
          const recentCutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
          const { data: dbInitial } = await supabase
            .from('articles')
            .select('*')
            .gte('published_at', recentCutoff)
            .order('last_verified_at', { ascending: false })
            .order('published_at', { ascending: false })
            .limit(30)
          const mapped = (dbInitial as any[] || []).map(a => ({ ...a, recommendation_score: a.recommendation_score ?? Math.random() * 100 }))
          setArticles(mapped)
          setLatestTimestamp(new Date().toISOString())
        } else {
          setArticles(initialArticles)
          setLatestTimestamp(data?.latest_timestamp || new Date().toISOString())
        }
      } else {
        // Fallback: load recent articles directly from DB
        const recentCutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
        const { data: dbInitial, error: dbErr } = await supabase
          .from('articles')
          .select('*')
          .gte('published_at', recentCutoff)
          .order('last_verified_at', { ascending: false })
          .order('published_at', { ascending: false })
          .limit(30)
        if (!dbErr) {
          const mapped = (dbInitial as any[] || []).map(a => ({ ...a, recommendation_score: a.recommendation_score ?? Math.random() * 100 }))
          setArticles(mapped)
          setLatestTimestamp(new Date().toISOString())
        }
      }
      
    } catch (error) {
      console.error('Error in loadInitialArticles:', error)
    } finally {
      setLoading(false)
    }
  }, [userId])

  // Manually refresh all articles
  const manualRefresh = useCallback(async () => {
    setLatestTimestamp(null) // Reset timestamp to get all articles
    setPendingArticles([])
    await loadInitialArticles()
    setNextRefresh(refreshInterval) // Reset countdown
  }, [loadInitialArticles, refreshInterval])

  // Apply pending articles (when user clicks "show new articles")
  const applyPendingArticles = useCallback(() => {
    if (pendingArticles.length > 0) {
      setArticles(prev => [...pendingArticles, ...prev])
      setPendingArticles([])
    }
  }, [pendingArticles])

  // Track user interactions locally to persist during refresh
  const updateArticleLocally = useCallback((articleId: string, updates: Partial<Article>) => {
    setArticles(prev => 
      prev.map(article => 
        article.id === articleId 
          ? { ...article, ...updates }
          : article
      )
    )
    
    setPendingArticles(prev => 
      prev.map(article => 
        article.id === articleId 
          ? { ...article, ...updates }
          : article
      )
    )
  }, [])

  // Load more articles (for infinite scroll)
  const loadMoreArticles = useCallback(async () => {
    if (loadingMore || !hasMore) return
    
    try {
      setLoadingMore(true)
      
      // Get more articles excluding already shown ones
      const { data, error } = await supabase
        .from('articles')
        .select('*')
        .not('id', 'in', `(${[...shownArticleIds].join(',') || 'null'})`)
        .gte('published_at', new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString())
        .order('published_at', { ascending: false })
        .limit(20)
      
      if (error) {
        console.error('Error loading more articles:', error)
        return
      }
      
      const moreArticles = (data || []).map(a => ({ 
        ...a, 
        recommendation_score: a.engagement_score || Math.random() * 100 
      }))
      
      if (moreArticles.length === 0) {
        setHasMore(false)
        return
      }
      
      // Mark new articles as shown
      markArticlesAsShown(moreArticles)
      
      // Append to existing articles
      setArticles(prev => [...prev, ...moreArticles])
      
    } catch (error) {
      console.error('Error in loadMoreArticles:', error)
    } finally {
      setLoadingMore(false)
    }
  }, [loadingMore, hasMore, shownArticleIds, markArticlesAsShown])

  // Load initial articles on mount with retry mechanism
  useEffect(() => {
    let retryCount = 0
    const maxRetries = 3
    
    const loadWithRetry = async () => {
      try {
        await loadInitialArticles()
      } catch (error) {
        console.error(`Failed to load initial articles (attempt ${retryCount + 1}):`, error)
        if (retryCount < maxRetries) {
          retryCount++
          setTimeout(loadWithRetry, 2000 * retryCount) // Exponential backoff
        }
      }
    }
    
    if (userId) {
      loadWithRetry()
    }
  }, [userId]) // Remove loadInitialArticles to prevent recreation

  return {
    articles,
    pendingArticles,
    pendingCount: pendingArticles.length,
    loading,
    loadingMore,
    hasMore,
    nextRefresh,
    formatCountdown,
    isAtTop,
    fetchNewArticles,
    manualRefresh,
    applyPendingArticles,
    updateArticleLocally,
    loadMoreArticles,
    shownArticleCount: shownArticleIds.size
  }
}