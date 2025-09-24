import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/integrations/supabase/client'

interface UseAutoRefreshOptions {
  userId: string
  refreshInterval?: number // in seconds, default 300 (5 minutes)
  onNewArticles?: (count: number) => void
  onRefreshComplete?: () => void
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
  onRefreshComplete
}: UseAutoRefreshOptions) => {
  const [articles, setArticles] = useState<Article[]>([])
  const [latestTimestamp, setLatestTimestamp] = useState<string | null>(null)
  const [pendingArticles, setPendingArticles] = useState<Article[]>([])
  const [isAtTop, setIsAtTop] = useState(true)
  const [loading, setLoading] = useState(false)
  const [nextRefresh, setNextRefresh] = useState(refreshInterval)
  
  const scrollListenerRef = useRef<() => void>()

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

      const newArticles = data?.articles || []
      
      if (newArticles.length > 0) {
        // Update latest timestamp
        setLatestTimestamp(data.latest_timestamp)
        
        if (isAtTop) {
          // User is at top - insert new articles directly
          setArticles(prev => [...newArticles, ...prev])
          setPendingArticles([])
        } else {
          // User is scrolled down - add to pending queue
          setPendingArticles(prev => [...newArticles, ...prev])
          onNewArticles?.(newArticles.length)
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

      const initialArticles = data?.articles || []
      setArticles(initialArticles)
      setLatestTimestamp(data?.latest_timestamp || new Date().toISOString())
      
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
    nextRefresh,
    formatCountdown,
    isAtTop,
    fetchNewArticles,
    manualRefresh,
    applyPendingArticles,
    updateArticleLocally
  }
}