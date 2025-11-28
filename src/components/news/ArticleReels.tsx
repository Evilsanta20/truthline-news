import { useState, useEffect, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { usePersonalization } from '@/hooks/usePersonalization'
import { 
  Heart, 
  Bookmark, 
  BookmarkCheck, 
  Share2, 
  Eye,
  ChevronUp,
  ChevronDown,
  ExternalLink,
  Clock,
  Star,
  Flame,
  X
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=1200&h=1600&fit=crop'

interface ArticleReelsProps {
  userId: string
}

export default function ArticleReels({ userId }: ArticleReelsProps) {
  const { toast } = useToast()
  const [currentIndex, setCurrentIndex] = useState(0)
  const [bookmarks, setBookmarks] = useState<Set<string>>(new Set())
  const [likes, setLikes] = useState<Set<string>>(new Set())
  const [touchStart, setTouchStart] = useState(0)
  const [touchEnd, setTouchEnd] = useState(0)
  const [imageError, setImageError] = useState<Set<string>>(new Set())
  const reelsContainerRef = useRef<HTMLDivElement>(null)
  
  const {
    recommendations,
    loading,
    trackInteraction,
    refreshRecommendations
  } = usePersonalization(userId)

  // Load bookmarks and likes from localStorage
  useEffect(() => {
    const savedBookmarks = localStorage.getItem(`bookmarks_${userId}`)
    const savedLikes = localStorage.getItem(`likes_${userId}`)
    if (savedBookmarks) setBookmarks(new Set(JSON.parse(savedBookmarks)))
    if (savedLikes) setLikes(new Set(JSON.parse(savedLikes)))
  }, [userId])

  // Track view when reel changes
  useEffect(() => {
    if (recommendations[currentIndex]) {
      trackInteraction(recommendations[currentIndex].id, 'view')
    }
  }, [currentIndex, recommendations, trackInteraction])

  // Keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowUp':
        case 'w':
          e.preventDefault()
          previousReel()
          break
        case 'ArrowDown':
        case 's':
          e.preventDefault()
          nextReel()
          break
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [currentIndex, recommendations.length])

  // Touch handlers for swipe gestures
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientY)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientY)
  }

  const handleTouchEnd = () => {
    if (touchStart - touchEnd > 75) {
      // Swiped up
      nextReel()
    }

    if (touchStart - touchEnd < -75) {
      // Swiped down
      previousReel()
    }
  }

  const nextReel = useCallback(() => {
    if (currentIndex < recommendations.length - 1) {
      setCurrentIndex(prev => prev + 1)
    }
  }, [currentIndex, recommendations.length])

  const previousReel = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1)
    }
  }, [currentIndex])

  const toggleBookmark = (articleId: string) => {
    const newBookmarks = new Set(bookmarks)
    if (newBookmarks.has(articleId)) {
      newBookmarks.delete(articleId)
      trackInteraction(articleId, 'bookmark', -1)
      toast({ title: "Bookmark removed" })
    } else {
      newBookmarks.add(articleId)
      trackInteraction(articleId, 'bookmark', 1)
      toast({ title: "Bookmark added" })
    }
    setBookmarks(newBookmarks)
    localStorage.setItem(`bookmarks_${userId}`, JSON.stringify([...newBookmarks]))
  }

  const toggleLike = (articleId: string) => {
    const newLikes = new Set(likes)
    if (newLikes.has(articleId)) {
      newLikes.delete(articleId)
      trackInteraction(articleId, 'like', -1)
      toast({ title: "Like removed" })
    } else {
      newLikes.add(articleId)
      trackInteraction(articleId, 'like', 1)
      toast({ title: "Article liked" })
    }
    setLikes(newLikes)
    localStorage.setItem(`likes_${userId}`, JSON.stringify([...newLikes]))
  }

  const handleShare = (article: any) => {
    trackInteraction(article.id, 'share')
    if (navigator.share) {
      navigator.share({
        title: article.title,
        text: article.description,
        url: article.url
      }).catch(() => {})
    } else {
      navigator.clipboard.writeText(article.url)
      toast({ title: "Link copied to clipboard" })
    }
  }

  const handleReadMore = (article: any) => {
    trackInteraction(article.id, 'view')
    if (article.url) {
      window.open(article.url, '_blank')
    }
  }

  const formatTimeAgo = (dateString: string) => {
    const now = new Date()
    const date = new Date(dateString)
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
    
    if (diffInHours < 1) return 'Just now'
    if (diffInHours < 24) return `${diffInHours}h ago`
    return `${Math.floor(diffInHours / 24)}d ago`
  }

  const handleImageError = (articleId: string) => {
    setImageError(prev => new Set([...prev, articleId]))
  }

  if (loading || recommendations.length === 0) {
    return (
      <div className="fixed inset-0 bg-background flex items-center justify-center z-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-foreground">Loading reels...</p>
        </div>
      </div>
    )
  }

  const currentArticle = recommendations[currentIndex]
  const articleImage = imageError.has(currentArticle.id) ? FALLBACK_IMAGE : (currentArticle.url_to_image || FALLBACK_IMAGE)

  return (
    <div 
      className="fixed inset-0 bg-black z-50 overflow-hidden" 
      ref={reelsContainerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Progress Indicators */}
      <div className="absolute top-4 left-4 right-4 z-30 flex space-x-1">
        {recommendations.slice(0, Math.min(10, recommendations.length)).map((_, index) => (
          <div
            key={index}
            className={cn(
              "flex-1 h-1 rounded-full transition-all",
              index < currentIndex ? "bg-white" : index === currentIndex ? "bg-white/60" : "bg-white/20"
            )}
          />
        ))}
      </div>

      {/* Close Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => window.history.back()}
        className="absolute top-4 right-4 z-30 text-white bg-black/30 hover:bg-black/50 backdrop-blur-sm"
      >
        <X className="w-5 h-5" />
      </Button>

      {/* Main Reel Content */}
      <div className="relative h-full w-full">
        {/* Background Image */}
        <div className="absolute inset-0">
          <img
            src={articleImage}
            alt={currentArticle.title}
            className="w-full h-full object-cover"
            onError={() => handleImageError(currentArticle.id)}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/80" />
        </div>

        {/* Content Overlay */}
        <div className="relative h-full flex flex-col justify-end p-6 md:p-8 text-white z-10">
          {/* Category Badges */}
          <div className="mb-4 flex flex-wrap items-center gap-2">
            {currentArticle.categories && (
              <Badge 
                className="bg-white/20 text-white border-white/30 backdrop-blur-md"
                style={{ backgroundColor: `${currentArticle.categories.color}60` }}
              >
                {currentArticle.categories.name}
              </Badge>
            )}
            {currentArticle.is_trending && (
              <Badge className="bg-red-500/80 text-white backdrop-blur-md">
                <Flame className="w-3 h-3 mr-1" />
                Trending
              </Badge>
            )}
            {currentArticle.is_featured && (
              <Badge className="bg-yellow-500/80 text-white backdrop-blur-md">
                <Star className="w-3 h-3 mr-1" />
                Featured
              </Badge>
            )}
          </div>

          {/* Metadata */}
          <div className="flex items-center gap-3 text-white/80 text-sm mb-3">
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              <span>{formatTimeAgo(currentArticle.published_at || currentArticle.created_at)}</span>
            </div>
            <span>•</span>
            <div className="flex items-center gap-1">
              <Eye className="w-4 h-4" />
              <span>{currentArticle.engagement_score || 0}</span>
            </div>
            <span>•</span>
            <span>{currentArticle.reading_time_minutes || 3}m read</span>
          </div>

          {/* Article Title */}
          <h1 className="text-2xl md:text-4xl font-bold mb-3 leading-tight line-clamp-3">
            {currentArticle.title}
          </h1>

          {/* Article Description */}
          <p className="text-white/90 text-base md:text-lg mb-4 line-clamp-2 leading-relaxed">
            {currentArticle.description}
          </p>

          {/* Source */}
          <div className="flex items-center gap-2 mb-6 text-white/80">
            <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
              <span className="text-sm font-bold">
                {currentArticle.source_name?.charAt(0) || 'N'}
              </span>
            </div>
            <span className="text-sm">{currentArticle.source_name}</span>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="lg"
                onClick={() => toggleLike(currentArticle.id)}
                className={cn(
                  "text-white hover:bg-white/10 transition-all rounded-full",
                  likes.has(currentArticle.id) && "text-red-500"
                )}
              >
                <Heart className={cn("w-7 h-7", likes.has(currentArticle.id) && "fill-current")} />
              </Button>
              <Button
                variant="ghost"
                size="lg"
                onClick={() => toggleBookmark(currentArticle.id)}
                className={cn(
                  "text-white hover:bg-white/10 transition-all rounded-full",
                  bookmarks.has(currentArticle.id) && "text-blue-400"
                )}
              >
                {bookmarks.has(currentArticle.id) ? (
                  <BookmarkCheck className="w-7 h-7 fill-current" />
                ) : (
                  <Bookmark className="w-7 h-7" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="lg"
                onClick={() => handleShare(currentArticle)}
                className="text-white hover:bg-white/10 transition-all rounded-full"
              >
                <Share2 className="w-7 h-7" />
              </Button>
            </div>

            <Button
              onClick={() => handleReadMore(currentArticle)}
              className="bg-white text-black hover:bg-white/90 font-semibold px-6"
              size="lg"
            >
              Read More
              <ExternalLink className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </div>

      {/* Navigation Controls */}
      <div className="absolute right-4 top-1/2 transform -translate-y-1/2 z-20 flex flex-col gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={previousReel}
          className="text-white bg-black/30 hover:bg-black/50 backdrop-blur-sm rounded-full w-12 h-12"
          disabled={currentIndex === 0}
        >
          <ChevronUp className="w-6 h-6" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={nextReel}
          className="text-white bg-black/30 hover:bg-black/50 backdrop-blur-sm rounded-full w-12 h-12"
          disabled={currentIndex === recommendations.length - 1}
        >
          <ChevronDown className="w-6 h-6" />
        </Button>
      </div>

      {/* Article Counter */}
      <div className="absolute left-4 bottom-4 z-20 text-white text-sm bg-black/40 px-4 py-2 rounded-full backdrop-blur-md font-medium">
        {currentIndex + 1} / {recommendations.length}
      </div>

      {/* Swipe Hint (shows briefly) */}
      {currentIndex === 0 && (
        <div className="absolute bottom-32 left-1/2 transform -translate-x-1/2 z-20 text-white/60 text-sm animate-bounce">
          <div className="flex flex-col items-center gap-2">
            <ChevronUp className="w-6 h-6" />
            <span>Swipe up for next</span>
          </div>
        </div>
      )}
    </div>
  )
}