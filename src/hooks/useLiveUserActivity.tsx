import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'

interface UserActivity {
  userId: string
  articleId: string
  activity: 'viewing' | 'reading' | 'bookmarking' | 'sharing'
  timestamp: Date
}

interface LiveStats {
  activeUsers: number
  totalViews: number
  recentActivities: UserActivity[]
  trendingArticles: { articleId: string; views: number }[]
}

export const useLiveUserActivity = () => {
  const [liveStats, setLiveStats] = useState<LiveStats>({
    activeUsers: 0,
    totalViews: 0,
    recentActivities: [],
    trendingArticles: []
  })
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    // Create a presence channel for real-time user activity
    const activityChannel = supabase.channel('user-activity', {
      config: {
        presence: {
          key: 'user-activity'
        }
      }
    })

    // Track user presence
    activityChannel
      .on('presence', { event: 'sync' }, () => {
        const presenceState = activityChannel.presenceState()
        const activeUsers = Object.keys(presenceState).length
        setLiveStats(prev => ({ ...prev, activeUsers }))
        setIsConnected(true)
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log('User joined:', key, newPresences)
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log('User left:', key, leftPresences)
      })
      .on('broadcast', { event: 'user-activity' }, ({ payload }) => {
        const activity: UserActivity = {
          userId: payload.userId,
          articleId: payload.articleId,
          activity: payload.activity,
          timestamp: new Date(payload.timestamp)
        }
        
        setLiveStats(prev => ({
          ...prev,
          totalViews: prev.totalViews + (activity.activity === 'viewing' ? 1 : 0),
          recentActivities: [activity, ...prev.recentActivities.slice(0, 9)] // Keep last 10
        }))
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          // Send initial presence
          await activityChannel.track({
            user_id: 'demo-user',
            online_at: new Date().toISOString(),
            status: 'active'
          })
        }
      })

    // Listen to real-time article interactions for trending calculation
    const interactionsChannel = supabase
      .channel('live-interactions')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'article_interactions'
        },
        (payload) => {
          const articleId = payload.new.article_id
          const interactionType = payload.new.interaction_type
          
          // Update trending articles based on interactions
          setLiveStats(prev => {
            const existing = prev.trendingArticles.find(t => t.articleId === articleId)
            const increment = interactionType === 'view' ? 1 : 
                            interactionType === 'like' ? 2 :
                            interactionType === 'share' ? 3 : 1
            
            if (existing) {
              return {
                ...prev,
                trendingArticles: prev.trendingArticles
                  .map(t => t.articleId === articleId 
                    ? { ...t, views: t.views + increment }
                    : t
                  )
                  .sort((a, b) => b.views - a.views)
                  .slice(0, 10)
              }
            } else {
              return {
                ...prev,
                trendingArticles: [
                  { articleId, views: increment },
                  ...prev.trendingArticles
                ]
                  .sort((a, b) => b.views - a.views)
                  .slice(0, 10)
              }
            }
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(activityChannel)
      supabase.removeChannel(interactionsChannel)
    }
  }, [])

  const broadcastActivity = async (userId: string, articleId: string, activity: UserActivity['activity']) => {
    const activityChannel = supabase.channel('user-activity')
    
    await activityChannel.send({
      type: 'broadcast',
      event: 'user-activity',
      payload: {
        userId,
        articleId,
        activity,
        timestamp: new Date().toISOString()
      }
    })
  }

  return {
    liveStats,
    isConnected,
    broadcastActivity
  }
}