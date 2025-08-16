import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/integrations/supabase/client'

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

  // Get AI recommendations
  const getRecommendations = useCallback(async (limit: number = 20) => {
    try {
      setLoading(true)
      
      const { data, error } = await supabase.functions.invoke('ai-recommendations', {
        body: { userId, limit }
      })

      if (error) {
        console.error('Error getting recommendations:', error)
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

  // Auto-refresh recommendations periodically
  useEffect(() => {
    const interval = setInterval(() => {
      getRecommendations()
    }, 5 * 60 * 1000) // Refresh every 5 minutes

    return () => clearInterval(interval)
  }, [getRecommendations])

  // Load initial data
  useEffect(() => {
    loadPreferences()
    getRecommendations()
  }, [loadPreferences, getRecommendations])

  return {
    preferences,
    recommendations,
    topicScores,
    loading,
    trackInteraction,
    updatePreferences,
    refreshRecommendations: getRecommendations
  }
}