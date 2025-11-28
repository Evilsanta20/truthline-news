import { Link } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Bookmark, BookmarkCheck, Eye, Clock, ExternalLink } from 'lucide-react'
import { useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { stripHtml, truncateText } from '@/utils/textUtils'

interface Article {
  id: string
  title: string
  description: string | null
  url: string
  url_to_image: string | null
  source_name: string | null
  author: string | null
  published_at: string | null
  is_featured: boolean
  is_trending: boolean
  is_editors_pick: boolean
  view_count: number
  categories?: { name: string; slug: string; color: string }
  sources?: { name: string; url: string }
}

interface ArticleCardProps {
  article: Article
  variant?: 'default' | 'featured' | 'compact'
  onBookmarkChange?: () => void
}

export const ArticleCard = ({ article, variant = 'default', onBookmarkChange }: ArticleCardProps) => {
  const { user } = useAuth()
  const { toast } = useToast()
  const [isBookmarked, setIsBookmarked] = useState(false)
  const [isBookmarking, setIsBookmarking] = useState(false)

  // Check if article is bookmarked
  const checkBookmarkStatus = async () => {
    if (!user) return

    try {
      const { data } = await supabase
        .from('bookmarks')
        .select('id')
        .eq('user_id', user.id)
        .eq('article_id', article.id)
        .single()
      
      setIsBookmarked(!!data)
    } catch (error) {
      // Not bookmarked
      setIsBookmarked(false)
    }
  }

  // Initialize bookmark status
  useState(() => {
    checkBookmarkStatus()
  })

  const handleBookmark = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to bookmark articles.",
        variant: "destructive"
      })
      return
    }

    setIsBookmarking(true)

    try {
      if (isBookmarked) {
        // Remove bookmark
        const { error } = await supabase
          .from('bookmarks')
          .delete()
          .eq('user_id', user.id)
          .eq('article_id', article.id)

        if (error) throw error

        setIsBookmarked(false)
        toast({ title: "Bookmark removed" })
      } else {
        // Add bookmark
        const { error } = await supabase
          .from('bookmarks')
          .insert({ user_id: user.id, article_id: article.id })

        if (error) throw error

        setIsBookmarked(true)
        toast({ title: "Article bookmarked" })
      }

      onBookmarkChange?.()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      })
    } finally {
      setIsBookmarking(false)
    }
  }

  const incrementViewCount = async () => {
    try {
      await supabase
        .from('articles')
        .update({ view_count: article.view_count + 1 })
        .eq('id', article.id)
    } catch (error) {
      console.error('Error updating view count:', error)
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Unknown date'
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true })
    } catch {
      return 'Unknown date'
    }
  }

  const getCleanDescription = () => {
    if (!article.description) return ''
    const cleanText = stripHtml(article.description)
    return variant === 'featured' ? cleanText : truncateText(cleanText, 150)
  }

  if (variant === 'compact') {
    return (
      <Card className="news-card">
        <CardContent className="p-4">
          <div className="flex gap-4">
            {article.url_to_image && (
              <div className="flex-shrink-0">
                <img
                  src={article.url_to_image}
                  alt={article.title}
                  className="w-24 h-24 object-cover grayscale hover:grayscale-0 transition-all duration-300"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none'
                  }}
                />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between mb-2">
                <h3 className="newspaper-headline text-base leading-tight line-clamp-3">
                  <Link 
                    to={`/article/${article.id}`}
                    onClick={incrementViewCount}
                    className="hover:underline decoration-2 underline-offset-2"
                  >
                    {article.title}
                  </Link>
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleBookmark}
                  disabled={isBookmarking}
                  className="flex-shrink-0 ml-2"
                >
                  {isBookmarked ? (
                    <BookmarkCheck className="w-4 h-4" />
                  ) : (
                    <Bookmark className="w-4 h-4" />
                  )}
                </Button>
              </div>
              <div className="newspaper-byline text-xs space-x-2">
                <span>{article.source_name}</span>
                {article.published_at && (
                  <>
                    <span>•</span>
                    <span>{formatDate(article.published_at)}</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={`news-card ${
      article.is_featured ? 'news-card-featured' : ''
    } ${article.is_trending ? 'news-card-trending' : ''}`}>
      <CardContent className="p-0">
        {article.url_to_image && (
          <div className="relative overflow-hidden">
            <img
              src={article.url_to_image}
              alt={article.title}
              className="w-full h-64 object-cover grayscale hover:grayscale-0 transition-all duration-500"
              onError={(e) => {
                e.currentTarget.src = '/placeholder.svg'
              }}
            />
            <div className="absolute top-0 right-0 flex flex-col gap-1 p-2">
              {article.is_featured && (
                <Badge className="bg-primary text-primary-foreground font-headline uppercase text-xs tracking-wider border-2 border-background">
                  Featured
                </Badge>
              )}
              {article.is_trending && (
                <Badge className="bg-accent text-accent-foreground font-headline uppercase text-xs tracking-wider border-2 border-background">
                  Trending
                </Badge>
              )}
              {article.is_editors_pick && (
                <Badge className="bg-foreground text-background font-headline uppercase text-xs tracking-wider border-2 border-background">
                  Editor's Pick
                </Badge>
              )}
            </div>
          </div>
        )}
        
        <div className="p-6">
          <div className="flex items-start justify-between mb-4 pb-3 border-b border-[hsl(var(--newspaper-border))]">
            <div className="flex items-center gap-3 newspaper-byline">
              {article.categories && (
                <span className="category-pill">
                  {article.categories.name}
                </span>
              )}
              <span className="font-semibold">{article.source_name}</span>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBookmark}
                disabled={isBookmarking}
                className="hover:bg-muted"
              >
                {isBookmarked ? (
                  <BookmarkCheck className="w-4 h-4" />
                ) : (
                  <Bookmark className="w-4 h-4" />
                )}
              </Button>
              <a
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 hover:bg-muted rounded transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>

          <h2 className="newspaper-headline text-2xl mb-3 line-clamp-3">
            <Link 
              to={`/article/${article.id}`}
              onClick={incrementViewCount}
              className="hover:underline decoration-2 underline-offset-4"
            >
              {article.title}
            </Link>
          </h2>

          {article.description && (
            <p className="font-body text-base leading-relaxed mb-4 line-clamp-3 text-foreground/90">
              {getCleanDescription()}
            </p>
          )}

          <div className="newspaper-divider"></div>

          <div className="flex items-center justify-between newspaper-byline pt-3">
            <div className="flex items-center gap-4">
              {article.author && (
                <span className="font-semibold">By {article.author}</span>
              )}
              {article.published_at && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formatDate(article.published_at)}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <Eye className="w-3 h-3" />
              <span>{article.view_count}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}