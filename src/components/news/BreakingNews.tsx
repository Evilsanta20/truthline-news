import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Zap, Clock, ExternalLink, TrendingUp } from 'lucide-react'
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'

interface BreakingArticle {
  id: string
  title: string
  description: string
  url: string
  url_to_image: string | null
  source_name: string
  published_at: string
  credibility_score: number | null
  category_id: string | null
  categories: {
    name: string
    color: string
  } | null
}

interface BreakingNewsProps {
  className?: string
}

export default function BreakingNews({ className }: BreakingNewsProps) {
  const [articles, setArticles] = useState<BreakingArticle[]>([])
  const [loading, setLoading] = useState(true)
  const [newArticleCount, setNewArticleCount] = useState(0)

  const fetchBreakingNews = async () => {
    try {
      const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString()
      
      const { data, error } = await supabase
        .from('articles')
        .select(`
          id,
          title,
          description,
          url,
          url_to_image,
          source_name,
          published_at,
          credibility_score,
          category_id,
          categories (
            name,
            color
          )
        `)
        .gte('published_at', sixHoursAgo)
        .gte('credibility_score', 0.5) // Higher threshold for breaking news
        .order('published_at', { ascending: false })
        .limit(10)

      if (error) throw error

      setArticles(data || [])
    } catch (error) {
      console.error('Error fetching breaking news:', error)
      toast.error('Failed to load breaking news')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBreakingNews()

    // Set up real-time subscription for new articles
    const channel = supabase
      .channel('breaking-news-updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'articles'
        },
        (payload) => {
          const newArticle = payload.new as any
          
          // Check if article is within 6 hours and has good credibility
          const sixHoursAgo = Date.now() - 6 * 60 * 60 * 1000
          const articleTime = new Date(newArticle.published_at).getTime()
          
          if (articleTime >= sixHoursAgo && (newArticle.credibility_score || 0) >= 0.5) {
            console.log('🔴 Breaking: New article received', newArticle.title)
            
            // Increment counter for user notification
            setNewArticleCount(prev => prev + 1)
            
            // Add to articles list
            setArticles(prev => [newArticle, ...prev].slice(0, 10))
            
            // Show toast notification
            toast.info('Breaking News Alert!', {
              description: newArticle.title.substring(0, 80) + '...',
              action: {
                label: 'View',
                onClick: () => window.open(newArticle.url, '_blank')
              }
            })
          }
        }
      )
      .subscribe()

    // Refresh every 5 minutes
    const refreshInterval = setInterval(() => {
      fetchBreakingNews()
    }, 5 * 60 * 1000)

    return () => {
      supabase.removeChannel(channel)
      clearInterval(refreshInterval)
    }
  }, [])

  const clearNewCount = () => {
    setNewArticleCount(0)
  }

  const getTimeAgo = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true })
    } catch {
      return 'recently'
    }
  }

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-red-500 animate-pulse" />
            Breaking News
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (articles.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-red-500" />
            Breaking News
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            No breaking news in the last 6 hours. Check back soon!
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={className}>
      <Card className="border-red-500/30 bg-gradient-to-br from-red-50 via-orange-50/50 to-amber-50 dark:from-red-950/30 dark:via-orange-950/20 dark:to-amber-950/20 shadow-lg">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-xl">
              <Zap className="w-6 h-6 text-red-600 animate-pulse" />
              <span className="bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent font-bold">
                Today's Headlines
              </span>
              <Badge variant="destructive" className="ml-2 animate-pulse">
                LIVE
              </Badge>
            </CardTitle>
            {newArticleCount > 0 && (
              <Badge 
                variant="secondary" 
                className="cursor-pointer animate-bounce bg-green-500 text-white hover:bg-green-600"
                onClick={clearNewCount}
              >
                +{newArticleCount} new
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
            <Clock className="w-3 h-3" />
            Last 6 hours • Real-time updates • High credibility sources
          </p>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid gap-3">
            {articles.map((article, index) => (
              <div
                key={article.id}
                className={`group relative rounded-lg border transition-all duration-200 hover:shadow-md p-3 ${
                  index === 0 
                    ? 'bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-950/40 dark:to-orange-950/40 border-red-300 dark:border-red-700' 
                    : 'bg-card hover:bg-accent/50 border-border'
                }`}
              >
                <div className="flex gap-3">
                  {article.url_to_image && (
                    <div className="flex-shrink-0 w-24 h-24 rounded-md overflow-hidden border border-border/50">
                      <img
                        src={article.url_to_image}
                        alt={article.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        {index === 0 && (
                          <Badge variant="destructive" className="text-xs font-bold animate-pulse">
                            🔥 BREAKING
                          </Badge>
                        )}
                        {article.source_name && (
                          <Badge variant="outline" className="text-xs font-medium">
                            {article.source_name}
                          </Badge>
                        )}
                        {article.credibility_score && article.credibility_score >= 0.8 && (
                          <Badge variant="secondary" className="text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                            ✓ Verified
                          </Badge>
                        )}
                      </div>
                    </div>
                    <h4 className="font-bold text-base leading-tight mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                      <a 
                        href={article.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="hover:underline"
                      >
                        {article.title}
                      </a>
                    </h4>
                    {article.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                        {article.description.replace(/<[^>]*>/g, '').substring(0, 150)}...
                      </p>
                    )}
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1 font-medium">
                        <Clock className="w-3 h-3" />
                        {getTimeAgo(article.published_at)}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs"
                        onClick={() => window.open(article.url, '_blank')}
                      >
                        Read More
                        <ExternalLink className="w-3 h-3 ml-1" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
