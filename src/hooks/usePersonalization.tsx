import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/integrations/supabase/client'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'

export interface UserPreferences {
  id?: string
  user_id: string
  preferred_topics: string[]
  blocked_topics: string[]
  preferred_sources: string[]
  blocked_sources: string[]
  reading_history: any
  interaction_scores: any
}

export interface PersonalizedArticle {
  id: string
  title: string
  description: string
  content: string
  category_id: string
  source_name: string
  url: string
  topic_tags: string[]
  engagement_score: number
  recommendation_score: number
  categories: {
    name: string
    slug: string
    color: string
  }
  is_featured: boolean
  is_trending: boolean
  created_at: string
}

export const usePersonalization = (userId: string) => {
  const [preferences, setPreferences] = useState<UserPreferences | null>(null)
  const [recommendations, setRecommendations] = useState<PersonalizedArticle[]>([])
  const [loading, setLoading] = useState(false)
  const [topicScores, setTopicScores] = useState<Array<{topic: string, score: number}>>([])
  const [liveEngagementScores, setLiveEngagementScores] = useState<{[key: string]: number}>({})
  const [realTimeUpdates, setRealTimeUpdates] = useState(0) // Counter to trigger re-renders

  // Load user preferences
  const loadPreferences = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading preferences:', error)
        return
      }

      if (data) {
        setPreferences(data)
      } else {
        // Create default preferences
        const defaultPrefs: Omit<UserPreferences, 'id'> = {
          user_id: userId,
          preferred_topics: [],
          blocked_topics: [],
          preferred_sources: [],
          blocked_sources: [],
          reading_history: {},
          interaction_scores: {}
        }
        
        const { data: newPrefs, error: createError } = await supabase
          .from('user_preferences')
          .insert(defaultPrefs)
          .select()
          .single()

        if (createError) {
          console.error('Error creating preferences:', createError)
        } else {
          setPreferences(newPrefs)
        }
      }
    } catch (error) {
      console.error('Error in loadPreferences:', error)
    }
  }, [userId])

  // Track user interaction
  const trackInteraction = useCallback(async (
    articleId: string, 
    interactionType: 'view' | 'bookmark' | 'like' | 'share' | 'read_time',
    value: number = 1
  ) => {
    try {
      await supabase
        .from('article_interactions')
        .insert({
          user_id: userId,
          article_id: articleId,
          interaction_type: interactionType,
          interaction_value: value
        })
      
      // Refresh recommendations after tracking interaction
      if (interactionType !== 'view') {
        getRecommendations()
      }
    } catch (error) {
      console.error('Error tracking interaction:', error)
    }
  }, [userId])

  // Get AI recommendations with enhanced news aggregation
  const getRecommendations = useCallback(async (limit: number = 20, forceRefresh: boolean = false) => {
    try {
      setLoading(true)
      
      // First, refresh news from multiple sources if needed
      if (forceRefresh) {
        console.log('Refreshing news from multiple sources...')
        
        // Fetch from enhanced aggregator for different categories
        const categories = ['politics', 'technology', 'business', 'health', 'sports', 'entertainment']
        
        for (const category of categories) {
          try {
            await supabase.functions.invoke('enhanced-news-aggregator', {
              body: { category, limit: 10, refresh: true }
            })
          } catch (error) {
            console.warn(`Failed to refresh ${category} news:`, error)
          }
        }
      }
      
      const { data, error } = await supabase.functions.invoke('ai-recommendations', {
        body: { userId, limit }
      })

      if (error) {
        console.error('Error getting recommendations:', error)
        // Fallback to direct database query if AI function fails
        const { data: fallbackArticles } = await supabase
          .from('articles')
          .select(`
            *,
            categories (name, slug, color)
          `)
          .order('created_at', { ascending: false })
          .limit(limit)
        
        if (fallbackArticles) {
          // Add missing recommendation_score for TypeScript compatibility
          const articlesWithScore = fallbackArticles.map(article => ({
            ...article,
            recommendation_score: article.engagement_score || 50
          }))
          setRecommendations(articlesWithScore)
        }
        return
      }

      setRecommendations(data.recommendations || [])
      setTopicScores(data.userTopics || [])
      
    } catch (error) {
      console.error('Error in getRecommendations:', error)
    } finally {
      setLoading(false)
    }
  }, [userId])

  // Update preferences
  const updatePreferences = useCallback(async (updates: Partial<UserPreferences>) => {
    if (!preferences) return

    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .update(updates)
        .eq('id', preferences.id)
        .select()
        .single()

      if (error) {
        console.error('Error updating preferences:', error)
        return
      }

      setPreferences(data)
      // Refresh recommendations when preferences change
      getRecommendations()
    } catch (error) {
      console.error('Error in updatePreferences:', error)
    }
  }, [preferences, getRecommendations])

  // Set up real-time subscriptions for dynamic updates
  useEffect(() => {
    // Subscribe to new articles
    const articlesChannel = supabase
      .channel('articles-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'articles'
        },
        (payload: RealtimePostgresChangesPayload<any>) => {
          console.log('New article added:', payload.new)
          // Refresh recommendations when new articles arrive
          getRecommendations(20, false)
          setRealTimeUpdates(prev => prev + 1)
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'articles'
        },
        (payload: RealtimePostgresChangesPayload<any>) => {
          console.log('Article updated:', payload.new)
          // Update specific article in recommendations
          setRecommendations(prev => 
            prev.map(article => 
              article.id === payload.new.id 
                ? { ...article, ...payload.new }
                : article
            )
          )
          setRealTimeUpdates(prev => prev + 1)
        }
      )
      .subscribe()

    // Subscribe to article interactions for live engagement tracking
    const interactionsChannel = supabase
      .channel('interactions-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'article_interactions'
        },
        (payload: RealtimePostgresChangesPayload<any>) => {
          console.log('New interaction:', payload.new)
          const articleId = payload.new.article_id
          const interactionType = payload.new.interaction_type
          const value = payload.new.interaction_value || 1
          
          // Update live engagement scores
          setLiveEngagementScores(prev => ({
            ...prev,
            [articleId]: (prev[articleId] || 0) + (
              interactionType === 'view' ? 1 :
              interactionType === 'like' ? 2 :
              interactionType === 'bookmark' ? 3 :
              interactionType === 'share' ? 5 :
              interactionType === 'read_time' ? Math.floor(value / 60) :
              1
            )
          }))
          
          // Update engagement score in recommendations
          setRecommendations(prev => 
            prev.map(article => 
              article.id === articleId
                ? { 
                    ...article, 
                    engagement_score: (article.engagement_score || 0) + (
                      interactionType === 'view' ? 1 :
                      interactionType === 'like' ? 2 :
                      interactionType === 'bookmark' ? 3 :
                      interactionType === 'share' ? 5 :
                      interactionType === 'read_time' ? Math.floor(value / 60) :
                      1
                    )
                  }
                : article
            )
          )
          setRealTimeUpdates(prev => prev + 1)
        }
      )
      .subscribe()

    // Subscribe to user preferences changes
    const preferencesChannel = supabase
      .channel('preferences-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'user_preferences',
          filter: `user_id=eq.${userId}`
        },
        (payload: RealtimePostgresChangesPayload<any>) => {
          console.log('Preferences updated:', payload.new)
          setPreferences(payload.new)
          setRealTimeUpdates(prev => prev + 1)
        }
      )
      .subscribe()

    // Auto-refresh recommendations periodically (reduced frequency due to real-time updates)
    const interval = setInterval(() => {
      getRecommendations(20, false)
    }, 10 * 60 * 1000) // Refresh every 10 minutes (increased from 5)

    return () => {
      clearInterval(interval)
      supabase.removeChannel(articlesChannel)
      supabase.removeChannel(interactionsChannel)
      supabase.removeChannel(preferencesChannel)
    }
  }, [getRecommendations, userId])

  // Load initial data
  useEffect(() => {
    loadPreferences()
    getRecommendations()
  }, [loadPreferences, getRecommendations])

  return {
    preferences,
    recommendations: recommendations.map(article => ({
      ...article,
      engagement_score: liveEngagementScores[article.id] || article.engagement_score
    })),
    topicScores,
    loading,
    trackInteraction,
    updatePreferences,
    refreshRecommendations: (forceRefresh?: boolean) => getRecommendations(20, forceRefresh || false),
    liveEngagementScores,
    realTimeUpdates
  }
}