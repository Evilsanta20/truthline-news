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

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text
    return text.slice(0, maxLength) + '...'
  }

  if (variant === 'compact') {
    return (
      <Card className="news-card hover:shadow-news transition-all duration-200">
        <CardContent className="p-4">
          <div className="flex gap-4">
            {article.url_to_image && (
              <div className="flex-shrink-0">
                <img
                  src={article.url_to_image}
                  alt={article.title}
                  className="w-20 h-20 object-cover rounded-md"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none'
                  }}
                />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between mb-2">
                <h3 className="text-sm font-semibold leading-snug line-clamp-2">
                  <Link 
                    to={`/article/${article.id}`}
                    onClick={incrementViewCount}
                    className="hover:text-primary transition-colors"
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
                    <BookmarkCheck className="w-4 h-4 text-primary" />
                  ) : (
                    <Bookmark className="w-4 h-4" />
                  )}
                </Button>
              </div>
              <div className="flex items-center text-xs text-muted-foreground space-x-2">
                <span>{article.source_name}</span>
                {article.published_at && (
                  <>
                    <span>•</span>
                    <span className="flex items-center">
                      <Clock className="w-3 h-3 mr-1" />
                      {formatDate(article.published_at)}
                    </span>
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
    <Card className={`news-card transition-all duration-200 ${
      article.is_featured ? 'news-card-featured' : ''
    }`}>
      <CardContent className="p-0">
        {article.url_to_image && (
          <div className="relative">
            <img
              src={article.url_to_image}
              alt={article.title}
              className="w-full h-48 object-cover"
              onError={(e) => {
                e.currentTarget.src = '/placeholder.svg'
              }}
            />
            {article.is_featured && (
              <Badge className="absolute top-2 left-2 bg-primary text-primary-foreground">
                Featured
              </Badge>
            )}
            {article.is_trending && (
              <Badge className="absolute top-2 right-2 bg-destructive text-destructive-foreground">
                Trending
              </Badge>
            )}
            {article.is_editors_pick && (
              <Badge className="absolute bottom-2 left-2 bg-accent text-accent-foreground">
                Editor's Pick
              </Badge>
            )}
          </div>
        )}
        
        <div className="p-6">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              {article.categories && (
                <Badge 
                  className="category-badge"
                  style={{ backgroundColor: article.categories.color + '20', color: article.categories.color }}
                >
                  {article.categories.name}
                </Badge>
              )}
              <span>{article.source_name}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBookmark}
                disabled={isBookmarking}
              >
                {isBookmarked ? (
                  <BookmarkCheck className="w-4 h-4 text-primary" />
                ) : (
                  <Bookmark className="w-4 h-4" />
                )}
              </Button>
              <a
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-primary transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>

          <h2 className="news-headline mb-3 line-clamp-3">
            <Link 
              to={`/article/${article.id}`}
              onClick={incrementViewCount}
              className="hover:text-primary transition-colors"
            >
              {article.title}
            </Link>
          </h2>

          {article.description && (
            <p className="news-description mb-4 line-clamp-3">
              {variant === 'featured' ? article.description : truncateText(article.description, 150)}
            </p>
          )}

          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div className="flex items-center space-x-4">
              {article.author && (
                <span>By {article.author}</span>
              )}
              {article.published_at && (
                <span className="flex items-center">
                  <Clock className="w-4 h-4 mr-1" />
                  {formatDate(article.published_at)}
                </span>
              )}
            </div>
            <div className="flex items-center">
              <Eye className="w-4 h-4 mr-1" />
              <span>{article.view_count} views</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}