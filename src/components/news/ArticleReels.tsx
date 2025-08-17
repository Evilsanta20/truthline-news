import { useState, useEffect, useRef, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
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
  TrendingUp,
  Play,
  Pause,
  Volume2,
  VolumeX,
  RotateCcw,
  Star,
  Flame
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface ArticleReelsProps {
  userId: string
}

export default function ArticleReels({ userId }: ArticleReelsProps) {
  const { toast } = useToast()
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(true)
  const [isMuted, setIsMuted] = useState(false)
  const [bookmarks, setBookmarks] = useState<Set<string>>(new Set())
  const [readingProgress, setReadingProgress] = useState(0)
  const reelsContainerRef = useRef<HTMLDivElement>(null)
  const progressIntervalRef = useRef<NodeJS.Timeout>()
  
  const {
    recommendations,
    loading,
    trackInteraction,
    refreshRecommendations
  } = usePersonalization(userId)

  // Load bookmarks from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(`bookmarks_${userId}`)
    if (saved) {
      setBookmarks(new Set(JSON.parse(saved)))
    }
  }, [userId])

  // Auto-play functionality
  useEffect(() => {
    if (isPlaying && recommendations.length > 0) {
      progressIntervalRef.current = setInterval(() => {
        setReadingProgress(prev => {
          if (prev >= 100) {
            nextReel()
            return 0
          }
          return prev + 1
        })
      }, 80) // 8 seconds total (100 * 80ms)
    } else {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current)
      }
    }

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current)
      }
    }
  }, [isPlaying, currentIndex, recommendations.length])

  // Track view when reel changes
  useEffect(() => {
    if (recommendations[currentIndex]) {
      trackInteraction(recommendations[currentIndex].id, 'view')
      setReadingProgress(0)
    }
  }, [currentIndex, recommendations, trackInteraction])

  // Keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault()
          previousReel()
          break
        case 'ArrowDown':
          e.preventDefault()
          nextReel()
          break
        case ' ':
          e.preventDefault()
          setIsPlaying(!isPlaying)
          break
        case 'Escape':
          setIsPlaying(false)
          break
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [isPlaying])

  const nextReel = useCallback(() => {
    setCurrentIndex(prev => (prev + 1) % recommendations.length)
    setReadingProgress(0)
  }, [recommendations.length])

  const previousReel = useCallback(() => {
    setCurrentIndex(prev => prev === 0 ? recommendations.length - 1 : prev - 1)
    setReadingProgress(0)
  }, [recommendations.length])

  const toggleBookmark = (articleId: string) => {
    const newBookmarks = new Set(bookmarks)
    if (newBookmarks.has(articleId)) {
      newBookmarks.delete(articleId)
      trackInteraction(articleId, 'bookmark', -1)
      toast({
        title: "Bookmark removed",
        description: "Article removed from bookmarks"
      })
    } else {
      newBookmarks.add(articleId)
      trackInteraction(articleId, 'bookmark', 1)
      toast({
        title: "Bookmark added", 
        description: "Article saved to bookmarks"
      })
    }
    setBookmarks(newBookmarks)
    localStorage.setItem(`bookmarks_${userId}`, JSON.stringify([...newBookmarks]))
  }

  const handleLike = (articleId: string) => {
    trackInteraction(articleId, 'like')
    toast({
      title: "Article liked",
      description: "This will improve your recommendations"
    })
  }

  const handleShare = (articleId: string) => {
    trackInteraction(articleId, 'share')
    navigator.clipboard.writeText(window.location.origin + '/article/' + articleId)
    toast({
      title: "Link copied",
      description: "Article link copied to clipboard"
    })
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

  return (
    <div className="fixed inset-0 bg-black z-50 overflow-hidden" ref={reelsContainerRef}>
      {/* Progress Indicators */}
      <div className="absolute top-4 left-4 right-4 z-20 flex space-x-1">
        {recommendations.slice(0, 5).map((_, index) => (
          <div
            key={index}
            className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden"
          >
            <div
              className="h-full bg-white transition-all duration-100 ease-linear"
              style={{
                width: index < currentIndex ? '100%' : 
                       index === currentIndex ? `${readingProgress}%` : '0%'
              }}
            />
          </div>
        ))}
      </div>

      {/* Main Content */}
      <div className="relative h-full">
        <Card className="h-full bg-gradient-to-b from-black/20 via-transparent to-black/60 border-0 rounded-none">
          <CardContent className="h-full p-0 relative">
            {/* Background Article Image/Gradient */}
            <div 
              className="absolute inset-0 bg-gradient-to-br from-primary/20 via-accent/10 to-background/80"
              style={{
                background: `linear-gradient(135deg, ${currentArticle.categories?.color || '#1D4ED8'}20, rgba(0,0,0,0.8))`
              }}
            />

            {/* Article Content */}
            <div className="relative h-full flex flex-col justify-end p-6 text-white">
              {/* Category and Time */}
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <Badge 
                    className="bg-white/20 text-white border-white/30 backdrop-blur-sm"
                    style={{ backgroundColor: `${currentArticle.categories?.color}40` }}
                  >
                    {currentArticle.categories?.name}
                  </Badge>
                  {currentArticle.is_trending && (
                    <Badge className="bg-accent/80 text-white">
                      <Flame className="w-3 h-3 mr-1" />
                      Trending
                    </Badge>
                  )}
                  {currentArticle.is_featured && (
                    <Badge className="bg-primary/80 text-white">
                      <Star className="w-3 h-3 mr-1" />
                      Featured
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 text-white/80 text-sm">
                  <Clock className="w-4 h-4" />
                  <span>{formatTimeAgo(currentArticle.created_at)}</span>
                  <Eye className="w-4 h-4 ml-2" />
                  <span>{currentArticle.engagement_score || 0}</span>
                </div>
              </div>

              {/* Article Title */}
              <h1 className="text-2xl md:text-3xl font-bold mb-3 leading-tight">
                {currentArticle.title}
              </h1>

              {/* Article Description */}
              <p className="text-white/90 text-base mb-4 line-clamp-3 leading-relaxed">
                {currentArticle.description}
              </p>

              {/* Source */}
              <div className="flex items-center gap-2 mb-6 text-white/70 text-sm">
                <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center">
                  <span className="text-xs font-bold">
                    {currentArticle.source_name?.charAt(0) || 'N'}
                  </span>
                </div>
                <span>{currentArticle.source_name}</span>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Button
                    variant="ghost"
                    size="lg"
                    onClick={() => handleLike(currentArticle.id)}
                    className="text-white hover:text-red-400 hover:bg-white/10 transition-all"
                  >
                    <Heart className="w-6 h-6" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="lg"
                    onClick={() => toggleBookmark(currentArticle.id)}
                    className={`transition-all hover:bg-white/10 ${
                      bookmarks.has(currentArticle.id) ? 'text-accent' : 'text-white hover:text-accent'
                    }`}
                  >
                    {bookmarks.has(currentArticle.id) ? (
                      <BookmarkCheck className="w-6 h-6" />
                    ) : (
                      <Bookmark className="w-6 h-6" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="lg"
                    onClick={() => handleShare(currentArticle.id)}
                    className="text-white hover:text-primary hover:bg-white/10 transition-all"
                  >
                    <Share2 className="w-6 h-6" />
                  </Button>
                </div>

                <Button
                  onClick={() => handleReadMore(currentArticle)}
                  className="bg-white text-black hover:bg-white/90 font-semibold"
                >
                  Read Full Article
                  <ExternalLink className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Navigation Controls */}
      <div className="absolute right-4 top-1/2 transform -translate-y-1/2 z-20 flex flex-col gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={previousReel}
          className="text-white bg-black/30 hover:bg-black/50 backdrop-blur-sm"
          disabled={currentIndex === 0}
        >
          <ChevronUp className="w-6 h-6" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsPlaying(!isPlaying)}
          className="text-white bg-black/30 hover:bg-black/50 backdrop-blur-sm"
        >
          {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={nextReel}
          className="text-white bg-black/30 hover:bg-black/50 backdrop-blur-sm"
          disabled={currentIndex === recommendations.length - 1}
        >
          <ChevronDown className="w-6 h-6" />
        </Button>
      </div>

      {/* Article Counter */}
      <div className="absolute left-4 bottom-4 z-20 text-white/80 text-sm bg-black/30 px-3 py-1 rounded-full backdrop-blur-sm">
        {currentIndex + 1} / {recommendations.length}
      </div>

      {/* Recommendation Score */}
      <div className="absolute right-4 bottom-4 z-20 flex items-center gap-1 text-white/80 text-sm bg-black/30 px-3 py-1 rounded-full backdrop-blur-sm">
        <TrendingUp className="w-4 h-4" />
        <span>{Math.round(currentArticle.recommendation_score || 0)}</span>
      </div>

      {/* Click Areas for Navigation */}
      <div 
        className="absolute left-0 top-0 w-1/3 h-full z-10 cursor-pointer"
        onClick={previousReel}
      />
      <div 
        className="absolute right-0 top-0 w-1/3 h-full z-10 cursor-pointer"
        onClick={nextReel}
      />
      <div 
        className="absolute center top-0 w-1/3 h-full z-10 cursor-pointer"
        onClick={() => setIsPlaying(!isPlaying)}
      />
    </div>
  )
}