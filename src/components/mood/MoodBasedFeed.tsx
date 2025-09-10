import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { ArticleCard } from '@/components/news/ArticleCard'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Heart, Sparkles, RefreshCw, ThumbsUp, ThumbsDown, Info } from 'lucide-react'
import { toast } from 'sonner'
import type { PersonalizedArticle } from '@/hooks/usePersonalization'

interface MoodBasedFeedProps {
  userId: string
  moodProfile?: any
  className?: string
}

interface MoodRecommendation extends PersonalizedArticle {
  mood_recommendation_score: number
  mood_match_reasons: string[]
  estimated_read_time?: number
  mood_positivity_score?: number
  mood_depth_score?: number
}

export default function MoodBasedFeed({ userId, moodProfile, className }: MoodBasedFeedProps) {
  const [recommendations, setRecommendations] = useState<MoodRecommendation[]>([])
  const [loading, setLoading] = useState(false)
  const [currentMood, setCurrentMood] = useState<any>(null)
  const [activeSection, setActiveSection] = useState<'for-you' | 'brief' | 'deep-dive' | 'positive'>('for-you')

  // Load current mood and recommendations
  useEffect(() => {
    loadMoodAndRecommendations()
  }, [userId, moodProfile])

  const loadMoodAndRecommendations = async () => {
    try {
      setLoading(true)

      // Get current mood from user preferences
      const { data: prefs } = await supabase
        .from('user_preferences')
        .select('current_mood, mood_last_updated')
        .eq('user_id', userId)
        .single()

      if (prefs?.current_mood) {
        setCurrentMood(prefs.current_mood)
      }

      // Get mood-based recommendations
      const { data: moodRecs, error } = await supabase.functions.invoke('mood-processor', {
        body: { 
          action: 'getMoodRecommendations',
          userId: userId
        }
      })

      if (error) {
        console.error('Error loading mood recommendations:', error)
        return
      }

      setRecommendations(moodRecs.recommendations || [])

    } catch (error) {
      console.error('Error in loadMoodAndRecommendations:', error)
    } finally {
      setLoading(false)
    }
  }

  const refreshRecommendations = async () => {
    if (!currentMood?.profile) {
      toast.info('Please set your mood first to get personalized recommendations')
      return
    }

    try {
      setLoading(true)
      
      const { data, error } = await supabase.functions.invoke('mood-processor', {
        body: { 
          action: 'processMood',
          userId: userId,
          moodText: currentMood.text,
          emoji: currentMood.emoji,
          contextTags: currentMood.context_tags
        }
      })

      if (error) throw error

      setRecommendations(data.recommendations || [])
      toast.success('Fresh recommendations based on your mood!')

    } catch (error) {
      console.error('Error refreshing recommendations:', error)
      toast.error('Failed to refresh recommendations')
    } finally {
      setLoading(false)
    }
  }

  const handleArticleFeedback = async (articleId: string, liked: boolean) => {
    try {
      // Track the feedback
      await supabase
        .from('mood_recommendations')
        .update({ 
          feedback_score: liked ? 1 : -1,
          clicked: true
        })
        .eq('user_id', userId)
        .eq('article_id', articleId)

      toast.success(liked ? 'Thanks for the positive feedback!' : 'We\'ll improve our recommendations')
    } catch (error) {
      console.error('Error saving feedback:', error)
    }
  }

  const filterRecommendationsBySection = (section: string) => {
    switch (section) {
      case 'brief':
        return recommendations.filter(r => (r.estimated_read_time || 3) <= 3)
      case 'deep-dive':
        return recommendations.filter(r => (r.estimated_read_time || 3) >= 8)
      case 'positive':
        return recommendations.filter(r => (r.mood_positivity_score || 0.5) >= 0.7)
      default:
        return recommendations
    }
  }

  const getSectionTitle = (section: string) => {
    switch (section) {
      case 'brief': return 'Quick Reads'
      case 'deep-dive': return 'Deep Analysis'
      case 'positive': return 'Uplifting News'
      default: return 'For You'
    }
  }

  if (!currentMood) {
    return (
      <div className={`space-y-6 ${className}`}>
        <Card>
          <CardContent className="text-center py-8">
            <Heart className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Set Your Mood First</h3>
            <p className="text-muted-foreground">
              Tell us how you're feeling to get personalized news recommendations
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const filteredRecommendations = filterRecommendationsBySection(activeSection)

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Current Mood Display */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-primary" />
            Your Current Mood
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-4">
            <span className="text-2xl">{currentMood.emoji}</span>
            <div className="flex-1">
              <p className="font-medium">{currentMood.text}</p>
              <p className="text-sm text-muted-foreground">
                Updated {new Date(currentMood.timestamp).toLocaleString()}
              </p>
            </div>
            <Button
              onClick={refreshRecommendations}
              disabled={loading}
              variant="outline"
              size="sm"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
          
          {currentMood.context_tags && currentMood.context_tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {currentMood.context_tags.map((tag: string, index: number) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Mood-Based Sections */}
      <Tabs value={activeSection} onValueChange={(value: any) => setActiveSection(value)}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="for-you" className="flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            For You
          </TabsTrigger>
          <TabsTrigger value="brief" className="flex items-center gap-2">
            Brief
          </TabsTrigger>
          <TabsTrigger value="deep-dive" className="flex items-center gap-2">
            Deep Dive
          </TabsTrigger>
          <TabsTrigger value="positive" className="flex items-center gap-2">
            Uplifting
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeSection} className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">
              {getSectionTitle(activeSection)} ({filteredRecommendations.length})
            </h3>
          </div>

          <div className="grid gap-4">
            {loading ? (
              // Loading skeletons
              Array.from({ length: 3 }).map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-4">
                    <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-muted rounded w-1/2"></div>
                  </CardContent>
                </Card>
              ))
            ) : filteredRecommendations.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <Info className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">
                    No articles match your current mood and preferences in this section.
                  </p>
                </CardContent>
              </Card>
            ) : (
              filteredRecommendations.map((article) => (
                <div key={article.id} className="space-y-2">
                  <ArticleCard
                    article={{
                      ...article,
                      description: article.description || article.ai_summary || 'No description available',
                      url_to_image: article.url_to_image || '',
                      source_name: article.source_name || 'Unknown Source',
                      author: article.author || 'Unknown Author',
                      published_at: article.published_at || article.created_at,
                      is_featured: article.is_featured || false
                    } as any}
                    onLike={() => handleArticleFeedback(article.id, true)}
                    onBookmark={() => {}}
                    onView={() => {}}
                    showEngagement={true}
                  />
                  
                  {/* Mood Match Reasons */}
                  {article.mood_match_reasons && article.mood_match_reasons.length > 0 && (
                    <Card className="bg-primary/5 border-primary/20">
                      <CardContent className="p-3">
                        <div className="flex items-start gap-2">
                          <Sparkles className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-primary mb-1">
                              Why this matches your mood:
                            </p>
                            <ul className="text-xs text-muted-foreground space-y-1">
                              {article.mood_match_reasons.map((reason, index) => (
                                <li key={index}>• {reason}</li>
                              ))}
                            </ul>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleArticleFeedback(article.id, true)}
                              className="h-6 w-6 p-0 hover:bg-green-100 hover:text-green-600"
                            >
                              <ThumbsUp className="w-3 h-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleArticleFeedback(article.id, false)}
                              className="h-6 w-6 p-0 hover:bg-red-100 hover:text-red-600"
                            >
                              <ThumbsDown className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}