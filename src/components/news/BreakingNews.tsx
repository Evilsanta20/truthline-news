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
    <Card className={`border-red-200 bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-950/20 dark:to-orange-950/20 ${className}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-red-500 animate-pulse" />
            Breaking News
            <Badge variant="destructive" className="ml-2">
              Live
            </Badge>
          </CardTitle>
          {newArticleCount > 0 && (
            <Badge 
              variant="secondary" 
              className="cursor-pointer animate-bounce"
              onClick={clearNewCount}
            >
              {newArticleCount} new
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Last 6 hours • Updated in real-time
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {articles.map((article, index) => (
            <div
              key={article.id}
              className="group relative border-b border-border/50 last:border-0 pb-4 last:pb-0"
            >
              <div className="flex gap-3">
                {article.url_to_image && (
                  <div className="flex-shrink-0 w-20 h-20 rounded overflow-hidden">
                    <img
                      src={article.url_to_image}
                      alt={article.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    {article.categories && (
                      <Badge 
                        variant="outline" 
                        style={{ 
                          borderColor: article.categories.color,
                          color: article.categories.color 
                        }}
                        className="text-xs"
                      >
                        {article.categories.name}
                      </Badge>
                    )}
                    {index === 0 && (
                      <Badge variant="destructive" className="text-xs">
                        Latest
                      </Badge>
                    )}
                  </div>
                  <h4 className="font-semibold text-sm leading-tight mb-1 line-clamp-2 group-hover:text-primary transition-colors">
                    <a 
                      href={article.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="hover:underline"
                    >
                      {article.title}
                    </a>
                  </h4>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {getTimeAgo(article.published_at)}
                    </span>
                    {article.source_name && (
                      <span className="truncate">{article.source_name}</span>
                    )}
                    {article.credibility_score && article.credibility_score >= 0.7 && (
                      <Badge variant="secondary" className="text-xs">
                        <TrendingUp className="w-3 h-3 mr-1" />
                        Verified
                      </Badge>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => window.open(article.url, '_blank')}
                >
                  <ExternalLink className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
