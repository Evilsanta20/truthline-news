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

      // Get today's interactions from the database
      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)

      const { data: interactions, error: interactionsError } = await supabase
        .from('article_interactions')
        .select('article_id')
        .eq('user_id', userId)
        .gte('created_at', todayStart.toISOString())
        .order('created_at', { ascending: false })

      if (interactionsError) {
        console.error('Error fetching interactions:', interactionsError)
        throw new Error('Failed to fetch your reading history')
      }

      // Get unique article IDs
      const articleIds = [...new Set(interactions?.map(i => i.article_id) || [])]

      // Call edge function to generate digest (it will handle empty articleIds)
      const { data, error: functionError } = await supabase.functions.invoke('generate-daily-digest', {
        body: { 
          userId,
          articleIds: articleIds.slice(0, 30) // Last 30 interactions
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
    <div className={`${className} flex items-center gap-3 px-4 py-2 bg-gradient-to-r from-primary/5 to-accent/5 border border-border/50 rounded-full shadow-sm`}>
      {loading && !digest ? (
        <>
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-24" />
        </>
      ) : error ? (
        <>
          <Sparkles className="w-5 h-5 text-destructive" />
          <span className="text-sm text-destructive">{error}</span>
          <Button size="sm" variant="ghost" onClick={generateDigest} className="ml-auto h-7 text-xs">
            Retry
          </Button>
        </>
      ) : digest ? (
        <>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <span className="text-sm font-semibold">Daily Digest</span>
          </div>
          
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <BookOpen className="w-3.5 h-3.5" />
            <span className="font-medium">{digest.articleCount}</span>
            <span>articles</span>
          </div>
          
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <TrendingUp className="w-3.5 h-3.5" />
            <span className="font-medium">{digest.topics.length}</span>
            <span>topics</span>
          </div>
          
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Newspaper className="w-3.5 h-3.5" />
            <span className="font-medium">{digest.sources.length}</span>
            <span>sources</span>
          </div>
          
          <div className="hidden sm:block h-4 w-px bg-border mx-1" />
          
          <p className="hidden md:block text-xs text-muted-foreground flex-1 truncate max-w-md">
            {digest.summary}
          </p>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={generateDigest}
            disabled={loading}
            className="ml-auto h-7 w-7 p-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </>
      ) : null}
    </div>
  )
}