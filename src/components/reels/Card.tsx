import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card as UICard, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import {
  Heart,
  Bookmark,
  BookmarkCheck,
  VolumeX,
  MoreHorizontal,
  ExternalLink,
  Clock,
  Eye,
  Sparkles
} from 'lucide-react'
import { PersonalizedArticle } from '@/hooks/usePersonalization'

interface ReelCardProps {
  article: PersonalizedArticle
  isSelected?: boolean
  onSelect?: (article: PersonalizedArticle) => void
  onLike?: (id: string, liked: boolean) => void
  onBookmark?: (id: string, bookmarked: boolean) => void
  onMuteTopic?: (topic: string) => void
  onMoreLikeThis?: (article: PersonalizedArticle) => void
  onView?: (article: PersonalizedArticle) => void
  className?: string
  tabIndex?: number
  'aria-label'?: string
}

const FALLBACK_IMAGE = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjIyNSIgdmlld0JveD0iMCAwIDQwMCAyMjUiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI0MDAiIGhlaWdodD0iMjI1IiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0xNzUgMTEyLjVMMjAwIDg3LjVMMjI1IDExMi41TDIwMCAxMzcuNUwxNzUgMTEyLjVaIiBmaWxsPSIjOTCA5NEE0Ii8+CjwvdXZnPgo='

export const ReelCard = ({
  article,
  isSelected = false,
  onSelect,
  onLike,
  onBookmark,
  onMuteTopic,
  onMoreLikeThis,
  onView,
  className,
  tabIndex,
  'aria-label': ariaLabel,
}: ReelCardProps) => {
  const [imageError, setImageError] = useState(false)
  const [imageLoading, setImageLoading] = useState(true)
  const [liked, setLiked] = useState(false)
  const [bookmarked, setBookmarked] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  const handleImageLoad = () => {
    setImageLoading(false)
  }

  const handleImageError = () => {
    setImageError(true)
    setImageLoading(false)
  }

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation()
    const newLiked = !liked
    setLiked(newLiked) // Optimistic UI
    onLike?.(article.id, newLiked)
  }

  const handleBookmark = (e: React.MouseEvent) => {
    e.stopPropagation()
    const newBookmarked = !bookmarked
    setBookmarked(newBookmarked) // Optimistic UI
    onBookmark?.(article.id, newBookmarked)
  }

  const handleMuteTopic = (e: React.MouseEvent, topic: string) => {
    e.stopPropagation()
    onMuteTopic?.(topic)
  }

  const handleCardClick = () => {
    // Extract article ID from URL for navigation
    const articleId = article.url?.split('/').pop();
    if (articleId) {
      navigate(`/article/${articleId}`);
    } else {
      // Fallback navigation using article id
      navigate(`/article/${article.id}`);
    }
    
    onSelect?.(article)
    onView?.(article)
  }

  const formatTimeAgo = (dateString: string) => {
    const now = new Date()
    const date = new Date(dateString)
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
    
    if (diffInHours < 1) return 'Just now'
    if (diffInHours < 24) return `${diffInHours}h ago`
    const diffInDays = Math.floor(diffInHours / 24)
    if (diffInDays < 7) return `${diffInDays}d ago`
    return `${Math.floor(diffInDays / 7)}w ago`
  }

  // Focus management for keyboard navigation
  useEffect(() => {
    if (isSelected && cardRef.current) {
      cardRef.current.focus()
    }
  }, [isSelected])

  const imageUrl = article.url_to_image || FALLBACK_IMAGE

  return (
    <UICard
      ref={cardRef}
      className={cn(
        "group cursor-pointer transition-all duration-300 hover:shadow-lg hover:-translate-y-1",
        "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
        "animate-fade-in",
        isSelected && "ring-2 ring-primary ring-offset-2",
        className
      )}
      onClick={handleCardClick}
      tabIndex={tabIndex}
      role="button"
      aria-label={ariaLabel || `Article: ${article.title}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          handleCardClick()
        }
      }}
    >
      <CardContent className="p-0">
        {/* Image Container */}
        <div className="relative aspect-video overflow-hidden rounded-t-lg bg-muted">
          {imageLoading && (
            <div className="absolute inset-0 bg-muted animate-pulse flex items-center justify-center">
              <div className="w-12 h-12 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          )}
          
          <img
            src={imageError ? FALLBACK_IMAGE : imageUrl}
            alt={article.title}
            className={cn(
              "w-full h-full object-cover transition-opacity duration-300",
              imageLoading ? "opacity-0" : "opacity-100"
            )}
            onLoad={handleImageLoad}
            onError={handleImageError}
            loading="lazy"
          />
          
          {/* Overlay indicators */}
          <div className="absolute top-2 left-2 flex gap-1">
            {article.is_featured && (
              <Badge variant="secondary" className="text-xs bg-yellow-500/90 text-white">
                Featured
              </Badge>
            )}
            {article.is_trending && (
              <Badge variant="secondary" className="text-xs bg-red-500/90 text-white">
                Trending
              </Badge>
            )}
          </div>

          {/* Reading time indicator */}
          <div className="absolute bottom-2 right-2">
            <Badge variant="secondary" className="text-xs bg-black/70 text-white">
              <Clock className="w-3 h-3 mr-1" />
              {article.reading_time_minutes || 3}m
            </Badge>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-3">
          {/* Title */}
          <h3 className="font-semibold text-foreground leading-tight line-clamp-2 group-hover:text-primary transition-colors">
            {article.title}
          </h3>

          {/* Description */}
          <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
            {article.description}
          </p>

          {/* Sentiment badge for lovable reels */}
          {(article as any).sentiment && (article as any).isLovableReel && (
            <div className="flex items-center gap-1">
              <Badge variant="outline" className="text-xs border-pink-300 text-pink-600 bg-pink-50">
                {(article as any).sentiment}
              </Badge>
            </div>
          )}

          {/* Topics */}
          {article.topic_tags && article.topic_tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {article.topic_tags.slice(0, 3).map((topic) => (
                <Badge
                  key={topic}
                  variant="outline"
                  className="text-xs cursor-pointer hover:bg-muted transition-colors group"
                  onClick={(e) => handleMuteTopic(e, topic)}
                  role="button"
                  tabIndex={-1}
                  aria-label={`Mute topic: ${topic}`}
                >
                  {topic}
                  <VolumeX className="w-3 h-3 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                </Badge>
              ))}
              {article.topic_tags.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{article.topic_tags.length - 3}
                </Badge>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
            <div className="flex items-center space-x-2">
              <span className="font-medium">{article.source_name}</span>
              <span>•</span>
              <span>{formatTimeAgo(article.published_at || article.created_at)}</span>
            </div>
            <div className="flex items-center space-x-1">
              <Eye className="w-3 h-3" />
              <span>{article.engagement_score || 0}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLike}
                className={cn(
                  "h-8 px-2 hover:bg-red-50 hover:text-red-600 transition-colors",
                  liked && "text-red-600 bg-red-50"
                )}
                aria-label={liked ? "Unlike article" : "Like article"}
              >
                <Heart className={cn("w-4 h-4", liked && "fill-current")} />
                <span className="ml-1 text-xs">
                  {(article.engagement_score || 0) + (liked ? 1 : 0)}
                </span>
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleBookmark}
                className={cn(
                  "h-8 px-2 hover:bg-blue-50 hover:text-blue-600 transition-colors",
                  bookmarked && "text-blue-600 bg-blue-50"
                )}
                aria-label={bookmarked ? "Remove bookmark" : "Bookmark article"}
              >
                {bookmarked ? (
                  <BookmarkCheck className="w-4 h-4 fill-current" />
                ) : (
                  <Bookmark className="w-4 h-4" />
                )}
              </Button>
            </div>

            <div className="flex items-center space-x-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  onMoreLikeThis?.(article)
                }}
                className="h-8 px-2 text-xs hover:bg-green-50 hover:text-green-600 transition-colors"
                aria-label="Show more like this"
              >
                More like this
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  window.open(article.url, '_blank', 'noopener,noreferrer')
                }}
                className="h-8 px-2 hover:bg-muted transition-colors"
                aria-label="Open article in new tab"
              >
                <ExternalLink className="w-4 h-4" />
              </Button>

              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2 hover:bg-muted transition-colors"
                aria-label="More options"
              >
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </UICard>
  )
}