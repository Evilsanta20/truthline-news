import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/integrations/supabase/client'
import type { MoodData, MoodPreset } from '@/components/mood/MoodInput'

export interface MoodProfile {
  want_depth: number
  positivity_pref: number
  length_tolerance: number
  topic_biases: Record<string, number>
  tone_words: string[]
  energy_level: number
  curiosity_level: number
}

export interface MoodRecommendation {
  id: string
  title: string
  description: string // Make required to match Article interface
  content?: string
  url: string
  source_name?: string
  author?: string
  url_to_image?: string
  published_at?: string
  topic_tags?: string[]
  engagement_score?: number  
  mood_recommendation_score: number
  mood_match_reasons: string[]
  estimated_read_time?: number
  mood_positivity_score?: number
  mood_depth_score?: number
  categories?: {
    name: string
    slug: string
    color: string
  }
  is_featured?: boolean
  is_trending?: boolean
  is_editors_pick?: boolean
  view_count?: number
  created_by?: string
  created_at: string
  updated_at?: string
  reading_time_minutes?: number
  content_quality_score?: number
  credibility_score?: number
  bias_score?: number
  sentiment_score?: number
  polarization_score?: number
  ai_summary?: string
  ai_processed_at?: string
  content_embedding?: any
  content_hash?: string
  processing_notes?: string
  match_reasons?: string[]
}

export const useMoodPersonalization = (userId: string) => {
  const [currentMood, setCurrentMood] = useState<any>(null)
  const [moodPresets, setMoodPresets] = useState<MoodPreset[]>([])
  const [recommendations, setRecommendations] = useState<MoodRecommendation[]>([])
  const [loading, setLoading] = useState(false)
  const [moodProfile, setMoodProfile] = useState<MoodProfile | null>(null)

  // Load user's mood preferences and presets
  const loadMoodData = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('current_mood, mood_presets, mood_last_updated')
        .eq('user_id', userId)
        .single()

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading mood data:', error)
        return
      }

      if (data) {
        setCurrentMood(data.current_mood)
        // Safely handle mood_presets JSON
        try {
          const presets = data.mood_presets
          if (Array.isArray(presets)) {
            setMoodPresets(presets as unknown as MoodPreset[])
          }
        } catch (e) {
          console.warn('Error parsing mood presets:', e)
          setMoodPresets([])
        }
        
        // Safely handle current_mood JSON
        try {
          const mood = data.current_mood
          if (mood && typeof mood === 'object' && !Array.isArray(mood) && 'profile' in mood) {
            setMoodProfile(mood.profile as unknown as MoodProfile)
          }
        } catch (e) {
          console.warn('Error parsing current mood:', e)
        }
      }
    } catch (error) {
      console.error('Error in loadMoodData:', error)
    }
  }, [userId])

  // Process mood input and get recommendations
  const processMood = useCallback(async (moodData: MoodData) => {
    try {
      setLoading(true)
      
      const { data, error } = await supabase.functions.invoke('mood-processor', {
        body: {
          action: 'processMood',
          userId: userId,
          moodText: moodData.text,
          emoji: moodData.emoji,
          contextTags: moodData.contextTags
        }
      })

      if (error) {
        console.error('Error processing mood:', error)
        throw error
      }

      // Update local state
      setCurrentMood(data.moodEntry)
      setMoodProfile(data.moodProfile)
      setRecommendations(data.recommendations || [])

      return {
        success: true,
        moodProfile: data.moodProfile,
        recommendations: data.recommendations || []
      }

    } catch (error) {
      console.error('Error in processMood:', error)
      return {
        success: false,
        error: error.message
      }
    } finally {
      setLoading(false)
    }
  }, [userId])

  // Save mood preset
  const saveMoodPreset = useCallback(async (name: string, moodData: MoodData) => {
    try {
      // First process the mood to get the profile
      const result = await processMood(moodData)
      if (!result.success || !result.moodProfile) {
        throw new Error('Failed to process mood for preset')
      }

      const { data, error } = await supabase.functions.invoke('mood-processor', {
        body: {
          action: 'saveMoodPreset',
          userId: userId,
          name: name,
          moodProfile: result.moodProfile
        }
      })

      if (error) throw error

      setMoodPresets(Array.isArray(data.presets) ? data.presets : [])
      return { success: true }

    } catch (error) {
      console.error('Error saving mood preset:', error)
      return { success: false, error: error.message }
    }
  }, [userId, processMood])

  // Get fresh mood-based recommendations
  const refreshRecommendations = useCallback(async () => {
    if (!currentMood?.profile) return []

    try {
      setLoading(true)
      
      const { data, error } = await supabase.functions.invoke('mood-processor', {
        body: {
          action: 'getMoodRecommendations',
          userId: userId
        }
      })

      if (error) throw error

      setRecommendations(data.recommendations || [])
      return data.recommendations || []

    } catch (error) {
      console.error('Error refreshing recommendations:', error)
      return []
    } finally {
      setLoading(false)
    }
  }, [userId, currentMood])

  // Track mood-based interaction
  const trackMoodInteraction = useCallback(async (
    articleId: string,
    interactionType: 'view' | 'like' | 'bookmark' | 'feedback',
    value: number = 1
  ) => {
    try {
      // Track regular interaction
      await supabase
        .from('article_interactions')
        .insert({
          user_id: userId,
          article_id: articleId,
          interaction_type: interactionType,
          interaction_value: value,
          mood_context: currentMood
        })

      // Update mood recommendation if it exists
      if (interactionType === 'like' || interactionType === 'feedback') {
        await supabase
          .from('mood_recommendations')
          .update({
            clicked: true,
            feedback_score: value > 0 ? 1 : -1
          })
          .eq('user_id', userId)
          .eq('article_id', articleId)
      }

    } catch (error) {
      console.error('Error tracking mood interaction:', error)
    }
  }, [userId, currentMood])

  // Load initial data
  useEffect(() => {
    if (userId) {
      loadMoodData()
    }
  }, [userId, loadMoodData])

  return {
    currentMood,
    moodPresets,
    recommendations,
    moodProfile,
    loading,
    processMood,
    saveMoodPreset,
    refreshRecommendations,
    trackMoodInteraction,
    loadMoodData
  }
}