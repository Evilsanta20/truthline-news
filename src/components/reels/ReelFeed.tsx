import { useState, useEffect, useCallback, useRef } from 'react'
import { ReelCard } from './Card'
import { ReelViewer } from './ReelViewer'
import { ReelSettingsDrawer } from './SettingsDrawer'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useFeed } from '@/hooks/useFeed'
import { useToast } from '@/hooks/use-toast'
import {
  Search,
  Settings,
  RefreshCw,
  Sparkles,
  AlertCircle,
  TrendingUp,
  Play
} from 'lucide-react'
import { PersonalizedArticle } from '@/hooks/usePersonalization'

interface ReelFeedProps {
  userId: string;
  className?: string;
}

interface SkeletonCardProps {
  className?: string;
}

const SkeletonCard = ({ className }: SkeletonCardProps) => (
  <Card className={className}>
    <CardContent className="p-0">
      <Skeleton className="aspect-video w-full rounded-t-lg" />
      <div className="p-4 space-y-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <div className="flex gap-2">
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-6 w-20" />
        </div>
        <div className="flex justify-between items-center pt-2">
          <Skeleton className="h-8 w-24" />
          <div className="flex gap-2">
            <Skeleton className="h-8 w-8" />
            <Skeleton className="h-8 w-8" />
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
)

export const ReelFeed = ({ userId, className }: ReelFeedProps) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedArticle, setSelectedArticle] = useState<PersonalizedArticle | null>(null)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const loadMoreRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()

  const {
    articles,
    loading,
    error,
    hasMore,
    settings,
    loadMore,
    refresh,
    updateSettings,
    likeArticle,
    bookmarkArticle,
    muteSource,
    muteTopic,
    trackView,
    generateFresh
  } = useFeed(userId, { initialLimit: 30 })

  // Filter articles based on search query
  const filteredArticles = articles.filter(article =>
    !searchQuery || 
    article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    article.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    article.topic_tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  // Infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          loadMore()
        }
      },
      { threshold: 0.1 }
    )

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current)
    }

    return () => observer.disconnect()
  }, [hasMore, loading, loadMore])

  // Keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (selectedArticle) return // Let ReelViewer handle navigation

      switch (e.key) {
        case 'ArrowUp':
        case 'k':
          e.preventDefault()
          setSelectedIndex(prev => Math.max(0, prev - 1))
          break
        case 'ArrowDown':
        case 'j':
          e.preventDefault()
          setSelectedIndex(prev => Math.min(filteredArticles.length - 1, prev + 1))
          break
        case 'Enter':
        case ' ':
          e.preventDefault()
          if (filteredArticles[selectedIndex]) {
            setSelectedArticle(filteredArticles[selectedIndex])
          }
          break
        case '/':
          e.preventDefault()
          document.getElementById('reel-search')?.focus()
          break
        default:
          break
      }
    }

    document.addEventListener('keydown', handleKeyPress)
    return () => document.removeEventListener('keydown', handleKeyPress)
  }, [selectedArticle, selectedIndex, filteredArticles])

  const handleLike = useCallback(async (id: string, liked: boolean = true) => {
    try {
      await likeArticle(id, liked)
      toast({
        title: liked ? "Article liked!" : "Like removed",
        description: liked ? "Added to your preferences" : "Removed from preferences"
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update like status",
        variant: "destructive"
      })
    }
  }, [likeArticle, toast])

  const handleBookmark = useCallback(async (id: string, bookmarked: boolean = true) => {
    try {
      await bookmarkArticle(id, bookmarked)
      toast({
        title: bookmarked ? "Article saved!" : "Bookmark removed",
        description: bookmarked ? "Added to your bookmarks" : "Removed from bookmarks"
      })
    } catch (error) {
      toast({
        title: "Error", 
        description: "Failed to update bookmark status",
        variant: "destructive"
      })
    }
  }, [bookmarkArticle, toast])

  const handleMuteTopic = useCallback(async (topic: string) => {
    try {
      await muteTopic(topic)
      toast({
        title: "Topic muted",
        description: `You'll see fewer articles about "${topic}"`
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to mute topic", 
        variant: "destructive"
      })
    }
  }, [muteTopic, toast])

  const handleMoreLikeThis = useCallback(async (article: PersonalizedArticle) => {
    const tags = article.topic_tags || []
    if (tags.length > 0) {
      await updateSettings({
        preferredTopics: [...(settings.preferredTopics || []), ...tags.slice(0, 2)]
      })
      toast({
        title: "Preferences updated!",
        description: `You'll see more articles like "${article.title}"`
      })
    }
  }, [updateSettings, settings.preferredTopics, toast])

  const handleView = useCallback(async (article: PersonalizedArticle) => {
    await trackView(article.id)
  }, [trackView])

  const handleRefresh = useCallback(async () => {
    try {
      await refresh()
      toast({
        title: "Feed refreshed!",
        description: "Latest articles loaded"
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to refresh feed",
        variant: "destructive"
      })
    }
  }, [refresh, toast])

  const handleGenerateFresh = useCallback(async () => {
    try {
      const result = await generateFresh()
      toast({
        title: "Fresh news generated!",
        description: `${result.articles_processed} new articles from live sources`
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate fresh news",
        variant: "destructive"
      })
    }
  }, [generateFresh, toast])

  if (error) {
    return (
      <div className={`space-y-6 ${className}`}>
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2 text-destructive">
              <AlertCircle className="w-5 h-5" />
              <span className="font-medium">Failed to load news feed</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Please try refreshing the page or check your connection.
            </p>
            <Button onClick={handleRefresh} className="mt-4" variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex items-center gap-2">
          <Play className="w-6 h-6 text-primary" />
          <div>
            <h2 className="text-xl font-semibold">News Reels</h2>
            <p className="text-sm text-muted-foreground">TikTok-style news discovery</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleRefresh} variant="outline" size="sm">
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={() => setSettingsOpen(true)} variant="outline" size="sm">
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </Button>
          <Button onClick={handleGenerateFresh} variant="default" size="sm">
            <TrendingUp className="w-4 h-4 mr-2" />
            Generate Fresh
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
        <Input
          id="reel-search"
          placeholder="Search articles..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 pr-4"
        />
      </div>

      {/* Stats */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>{filteredArticles.length} articles</span>
          {searchQuery && (
            <Badge variant="secondary">
              Filtered by: "{searchQuery}"
            </Badge>
          )}
        </div>
        <div className="text-xs text-muted-foreground hidden md:block">
          Use ↑↓ or J/K to navigate • Enter to open • / to search
        </div>
      </div>

      {/* Articles Grid - Vertical TikTok-style layout */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredArticles.map((article, index) => (
          <ReelCard
            key={article.id}
            article={article}
            isSelected={index === selectedIndex}
            onSelect={setSelectedArticle}
            onLike={handleLike}
            onBookmark={handleBookmark}
            onMuteTopic={handleMuteTopic}
            onMoreLikeThis={handleMoreLikeThis}
            onView={handleView}
            tabIndex={index === selectedIndex ? 0 : -1}
            className="animate-fade-in reel-card-hover"
          />
        ))}

        {/* Loading skeletons */}
        {loading && (
          <>
            {Array.from({ length: 8 }).map((_, i) => (
              <SkeletonCard key={`skeleton-${i}`} className="animate-pulse" />
            ))}
          </>
        )}
      </div>

      {/* Empty state */}
      {!loading && filteredArticles.length === 0 && (
        <Card>
          <CardContent className="pt-12 pb-12 text-center">
            <div className="space-y-4">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
                <Play className="w-8 h-8 text-muted-foreground" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">No reels available</h3>
                <p className="text-muted-foreground max-w-md mx-auto">
                  {searchQuery
                    ? `No articles match your search for "${searchQuery}"`
                    : "No articles available. Try generating fresh content or adjusting your preferences."
                  }
                </p>
              </div>
              <div className="flex gap-2 justify-center">
                {searchQuery && (
                  <Button onClick={() => setSearchQuery('')} variant="outline">
                    Clear Search
                  </Button>
                )}
                <Button onClick={handleGenerateFresh} variant="default">
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate Fresh News
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Load more trigger */}
      {hasMore && (
        <div ref={loadMoreRef} className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      )}

      {/* Article Viewer Modal */}
      {selectedArticle && (
        <ReelViewer
          article={selectedArticle}
          articles={filteredArticles}
          onClose={() => setSelectedArticle(null)}
          onLike={handleLike}
          onBookmark={handleBookmark}
          onMuteTopic={handleMuteTopic}
          onNext={(article) => setSelectedArticle(article)}
          onPrevious={(article) => setSelectedArticle(article)}
        />
      )}

      {/* Settings Drawer */}
      <ReelSettingsDrawer
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        settings={settings}
        onSettingsChange={updateSettings}
      />
    </div>
  )
}