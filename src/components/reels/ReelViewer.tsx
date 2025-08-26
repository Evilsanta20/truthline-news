import { useState, useEffect, useCallback } from 'react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import {
  X,
  ChevronLeft,
  ChevronRight,
  Heart,
  Bookmark,
  BookmarkCheck,
  Share2,
  ExternalLink,
  Clock,
  Eye,
  VolumeX,
  MoreHorizontal,
  ArrowLeft,
  ArrowRight
} from 'lucide-react'
import { PersonalizedArticle } from '@/hooks/usePersonalization'

interface ReelViewerProps {
  article: PersonalizedArticle
  articles: PersonalizedArticle[]
  onClose: () => void
  onLike: (id: string, liked?: boolean) => void
  onBookmark: (id: string, bookmarked?: boolean) => void
  onMuteTopic: (topic: string) => void
  onNext: (article: PersonalizedArticle) => void
  onPrevious: (article: PersonalizedArticle) => void
}

const FALLBACK_IMAGE = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAwIiBoZWlnaHQ9IjQ1MCIgdmlld0JveD0iMCAwIDgwMCA0NTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI4MDAiIGhlaWdodD0iNDUwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0zNzUgMjI1TDQwMCAxNzVMNDI1IDIyNUw0MDAgMjc1TDM3NSAyMjVaIiBmaWxsPSIjOUM5Q0E0Ii8+CjwvdXZnPgo='

export const ReelViewer = ({
  article,
  articles,
  onClose,
  onLike,
  onBookmark,
  onMuteTopic,
  onNext,
  onPrevious
}: ReelViewerProps) => {
  const [imageError, setImageError] = useState(false)
  const [liked, setLiked] = useState(false)
  const [bookmarked, setBookmarked] = useState(false)
  const [readingProgress, setReadingProgress] = useState(0)

  const currentIndex = articles.findIndex(a => a.id === article.id)
  const hasNext = currentIndex < articles.length - 1
  const hasPrevious = currentIndex > 0

  // Keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          e.preventDefault()
          onClose()
          break
        case 'ArrowRight':
        case 'j':
          e.preventDefault()
          if (hasNext) {
            onNext(articles[currentIndex + 1])
          }
          break
        case 'ArrowLeft':
        case 'k':
          e.preventDefault()
          if (hasPrevious) {
            onPrevious(articles[currentIndex - 1])
          }
          break
        case 'l':
          e.preventDefault()
          handleLike()
          break
        case 's':
          e.preventDefault()
          handleBookmark()
          break
        default:
          break
      }
    }

    document.addEventListener('keydown', handleKeyPress)
    return () => document.removeEventListener('keydown', handleKeyPress)
  }, [hasNext, hasPrevious, currentIndex, articles, onNext, onPrevious, onClose])

  // Reading progress tracking
  useEffect(() => {
    const handleScroll = (e: Event) => {
      const target = e.target as HTMLElement
      const scrollTop = target.scrollTop
      const scrollHeight = target.scrollHeight - target.clientHeight
      const progress = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0
      setReadingProgress(Math.min(progress, 100))
    }

    const scrollArea = document.querySelector('[data-radix-scroll-area-viewport]')
    if (scrollArea) {
      scrollArea.addEventListener('scroll', handleScroll)
      return () => scrollArea.removeEventListener('scroll', handleScroll)
    }
  }, [])

  const handleLike = () => {
    const newLiked = !liked
    setLiked(newLiked)
    onLike(article.id, newLiked)
  }

  const handleBookmark = () => {
    const newBookmarked = !bookmarked
    setBookmarked(newBookmarked)
    onBookmark(article.id, newBookmarked)
  }

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: article.title,
          text: article.description,
          url: article.url
        })
      } catch (error) {
        console.log('Share cancelled')
      }
    } else {
      // Fallback to clipboard
      await navigator.clipboard.writeText(article.url)
    }
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

  const imageUrl = article.url_to_image || FALLBACK_IMAGE

  return (
    <Dialog open={true} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-4xl h-[90vh] p-0 gap-0 bg-background">
        {/* Progress bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-muted z-50">
          <div 
            className="h-full bg-primary transition-all duration-150 ease-out"
            style={{ width: `${readingProgress}%` }}
          />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-background/95 backdrop-blur-sm sticky top-0 z-40">
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="hover:bg-muted"
            >
              <X className="w-4 h-4" />
            </Button>
            <span className="text-sm text-muted-foreground">
              {currentIndex + 1} of {articles.length}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => hasPrevious && onPrevious(articles[currentIndex - 1])}
              disabled={!hasPrevious}
              className="hover:bg-muted"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => hasNext && onNext(articles[currentIndex + 1])}
              disabled={!hasNext}
              className="hover:bg-muted"
            >
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Image Section */}
          <div className="w-1/2 relative bg-muted flex items-center justify-center">
            <img
              src={imageError ? FALLBACK_IMAGE : imageUrl}
              alt={article.title}
              className="max-w-full max-h-full object-contain"
              onError={() => setImageError(true)}
            />
            
            {/* Navigation overlays */}
            {hasPrevious && (
              <Button
                variant="ghost"
                size="lg"
                className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/20 hover:bg-black/40 text-white"
                onClick={() => onPrevious(articles[currentIndex - 1])}
              >
                <ChevronLeft className="w-6 h-6" />
              </Button>
            )}
            
            {hasNext && (
              <Button
                variant="ghost"
                size="lg"
                className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/20 hover:bg-black/40 text-white"
                onClick={() => onNext(articles[currentIndex + 1])}
              >
                <ChevronRight className="w-6 h-6" />
              </Button>
            )}

            {/* Image overlays */}
            <div className="absolute top-4 left-4 flex gap-2">
              {article.is_featured && (
                <Badge className="bg-yellow-500/90 text-white">
                  Featured
                </Badge>
              )}
              {article.is_trending && (
                <Badge className="bg-red-500/90 text-white">
                  Trending
                </Badge>
              )}
            </div>

            <div className="absolute bottom-4 right-4">
              <Badge className="bg-black/70 text-white">
                <Clock className="w-3 h-3 mr-1" />
                {article.reading_time_minutes || 3}m read
              </Badge>
            </div>
          </div>

          {/* Content Section */}
          <div className="w-1/2 flex flex-col">
            <ScrollArea className="flex-1 p-6">
              <div className="space-y-4">
                {/* Header info */}
                <div className="flex items-center justify-between text-sm text-muted-foreground">
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

                {/* Title */}
                <h1 className="text-2xl font-bold text-foreground leading-tight">
                  {article.title}
                </h1>

                {/* Topics */}
                {article.topic_tags && article.topic_tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {article.topic_tags.map((topic) => (
                      <Badge
                        key={topic}
                        variant="outline"
                        className="cursor-pointer hover:bg-muted transition-colors group"
                        onClick={() => onMuteTopic(topic)}
                      >
                        {topic}
                        <VolumeX className="w-3 h-3 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </Badge>
                    ))}
                  </div>
                )}

                <Separator />

                {/* Content */}
                <div className="prose prose-sm max-w-none">
                  <p className="text-base text-muted-foreground leading-relaxed">
                    {article.description}
                  </p>
                  
                  {article.content && (
                    <div className="mt-4 space-y-3 text-foreground">
                      {article.content.split('\n\n').map((paragraph, index) => (
                        <p key={index} className="leading-relaxed">
                          {paragraph}
                        </p>
                      ))}
                    </div>
                  )}
                </div>

                {/* AI Summary */}
                {article.ai_summary && (
                  <div className="bg-muted/50 rounded-lg p-4 border-l-4 border-primary">
                    <h3 className="font-semibold text-sm text-foreground mb-2">
                      AI Summary
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {article.ai_summary}
                    </p>
                  </div>
                )}

                {/* Quality indicators */}
                <div className="grid grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg">
                  <div className="text-center">
                    <div className="text-lg font-semibold text-green-600">
                      {Math.round((article.credibility_score || 0.7) * 100)}%
                    </div>
                    <div className="text-xs text-muted-foreground">Credibility</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold text-blue-600">
                      {Math.round((article.content_quality_score || 0.7) * 100)}%
                    </div>
                    <div className="text-xs text-muted-foreground">Quality</div>
                  </div>
                </div>

                <div className="h-20" /> {/* Bottom padding for actions */}
              </div>
            </ScrollArea>

            {/* Actions footer */}
            <div className="border-t p-4 bg-background/95 backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Button
                    variant={liked ? "default" : "outline"}
                    size="sm"
                    onClick={handleLike}
                    className={cn(
                      "hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors",
                      liked && "bg-red-600 text-white hover:bg-red-700"
                    )}
                  >
                    <Heart className={cn("w-4 h-4 mr-2", liked && "fill-current")} />
                    Like
                  </Button>

                  <Button
                    variant={bookmarked ? "default" : "outline"}
                    size="sm"
                    onClick={handleBookmark}
                    className={cn(
                      "hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-colors",
                      bookmarked && "bg-blue-600 text-white hover:bg-blue-700"
                    )}
                  >
                    {bookmarked ? (
                      <BookmarkCheck className="w-4 h-4 mr-2 fill-current" />
                    ) : (
                      <Bookmark className="w-4 h-4 mr-2" />
                    )}
                    Save
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleShare}
                    className="hover:bg-green-50 hover:text-green-600 hover:border-green-200 transition-colors"
                  >
                    <Share2 className="w-4 h-4 mr-2" />
                    Share
                  </Button>
                </div>

                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(article.url, '_blank', 'noopener,noreferrer')}
                    className="hover:bg-muted transition-colors"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Read Full Article
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    className="hover:bg-muted transition-colors"
                  >
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Keyboard shortcuts hint */}
              <div className="mt-3 text-xs text-muted-foreground text-center">
                Use ← → or J/K to navigate • L to like • S to save • Esc to close
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}