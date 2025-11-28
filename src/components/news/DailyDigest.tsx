import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { supabase } from '@/integrations/supabase/client'
import { 
  Sparkles, 
  Calendar, 
  TrendingUp, 
  BookOpen, 
  RefreshCw,
  ChevronRight,
  Newspaper
} from 'lucide-react'
import { toast } from 'sonner'

interface DailyDigestProps {
  userId: string
  className?: string
}

interface DigestData {
  summary: string
  highlights: string[]
  topics: string[]
  sources: string[]
  articleCount: number
  generatedAt: string
}

export default function DailyDigest({ userId, className }: DailyDigestProps) {
  const [digest, setDigest] = useState<DigestData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const generateDigest = async () => {
    try {
      setLoading(true)
      setError(null)

      // Get today's read articles from localStorage
      const today = new Date().toDateString()
      const readToday: string[] = []
      
      // Check interaction history from localStorage
      const shownArticles = localStorage.getItem(`reels_shown_${userId}`)
      const feedShown = localStorage.getItem(`shown_articles_${userId}`)
      
      if (shownArticles) {
        const shown = JSON.parse(shownArticles)
        readToday.push(...shown)
      }
      
      if (feedShown) {
        const shown = JSON.parse(feedShown)
        readToday.push(...shown)
      }

      // Remove duplicates
      const uniqueArticleIds = [...new Set(readToday)]

      if (uniqueArticleIds.length === 0) {
        setDigest({
          summary: "You haven't read any articles today yet. Start exploring to build your daily digest!",
          highlights: [],
          topics: [],
          sources: [],
          articleCount: 0,
          generatedAt: new Date().toISOString()
        })
        setLoading(false)
        return
      }

      // Call edge function to generate digest
      const { data, error: functionError } = await supabase.functions.invoke('generate-daily-digest', {
        body: { 
          userId,
          articleIds: uniqueArticleIds.slice(-20) // Last 20 articles
        }
      })

      if (functionError) {
        if (functionError.message?.includes('429')) {
          throw new Error('Rate limit exceeded. Please try again in a moment.')
        }
        if (functionError.message?.includes('402')) {
          throw new Error('AI credits depleted. Please contact support.')
        }
        throw new Error(functionError.message || 'Failed to generate digest')
      }

      setDigest(data)
      toast.success('Daily digest generated!')
    } catch (err) {
      console.error('Error generating digest:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate digest'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Auto-generate on mount
    generateDigest()
  }, [userId])

  const formatDate = () => {
    return new Date().toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })
  }

  return (
    <Card className={`${className} border-2 border-primary/20 shadow-lg`}>
      <CardHeader className="border-b bg-gradient-to-r from-primary/5 to-accent/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold flex items-center gap-2">
                Your Daily Digest
              </CardTitle>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                <Calendar className="w-4 h-4" />
                {formatDate()}
              </div>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={generateDigest}
            disabled={loading}
            className="gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>

      <CardContent className="pt-6 space-y-6">
        {loading && !digest ? (
          <div className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <p className="text-destructive mb-4">{error}</p>
            <Button onClick={generateDigest}>Try Again</Button>
          </div>
        ) : digest ? (
          <>
            {/* Stats Bar */}
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-3 bg-muted rounded-lg">
                <BookOpen className="w-5 h-5 mx-auto mb-1 text-primary" />
                <div className="text-2xl font-bold">{digest.articleCount}</div>
                <div className="text-xs text-muted-foreground">Articles Read</div>
              </div>
              <div className="text-center p-3 bg-muted rounded-lg">
                <TrendingUp className="w-5 h-5 mx-auto mb-1 text-primary" />
                <div className="text-2xl font-bold">{digest.topics.length}</div>
                <div className="text-xs text-muted-foreground">Topics</div>
              </div>
              <div className="text-center p-3 bg-muted rounded-lg">
                <Newspaper className="w-5 h-5 mx-auto mb-1 text-primary" />
                <div className="text-2xl font-bold">{digest.sources.length}</div>
                <div className="text-xs text-muted-foreground">Sources</div>
              </div>
            </div>

            {/* Summary */}
            <div className="space-y-2">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                Today's Overview
              </h3>
              <p className="text-muted-foreground leading-relaxed bg-muted/50 p-4 rounded-lg">
                {digest.summary}
              </p>
            </div>

            {/* Key Highlights */}
            {digest.highlights.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-semibold text-lg">Key Highlights</h3>
                <div className="space-y-2">
                  {digest.highlights.map((highlight, index) => (
                    <div 
                      key={index}
                      className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
                    >
                      <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <ChevronRight className="w-4 h-4 text-primary" />
                      </div>
                      <p className="text-sm flex-1">{highlight}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Main Topics */}
            {digest.topics.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-semibold text-lg">Main Topics Covered</h3>
                <div className="flex flex-wrap gap-2">
                  {digest.topics.map((topic, index) => (
                    <Badge 
                      key={index}
                      variant="secondary"
                      className="text-sm px-3 py-1"
                    >
                      {topic}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Sources */}
            {digest.sources.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-semibold text-lg">Sources You Read</h3>
                <div className="flex flex-wrap gap-2">
                  {digest.sources.map((source, index) => (
                    <Badge 
                      key={index}
                      variant="outline"
                      className="text-sm px-3 py-1"
                    >
                      {source}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Generated timestamp */}
            <div className="text-xs text-muted-foreground text-center pt-4 border-t">
              Generated at {new Date(digest.generatedAt).toLocaleTimeString()}
            </div>
          </>
        ) : null}
      </CardContent>
    </Card>
  )
}