import { useState, useEffect, useCallback, useRef } from 'react'
import { ReelCard } from './Card'
import { ReelViewer } from './ReelViewer'
import { ReelSettingsDrawer } from './SettingsDrawer'
import { useFeed } from '@/hooks/useFeed'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import {
  Search,
  Settings,
  RefreshCw,
  AlertCircle,
  ImageOff,
  Sparkles
} from 'lucide-react'
import { PersonalizedArticle } from '@/hooks/usePersonalization'

interface ReelFeedProps {
  userId: string
  className?: string
}

const SkeletonCard = () => (
  <div className="space-y-3 p-4 border rounded-lg">
    <Skeleton className="aspect-video w-full rounded" />
    <div className="space-y-2">
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-3 w-1/2" />
    </div>
    <div className="flex gap-2">
      <Skeleton className="h-6 w-16 rounded-full" />
      <Skeleton className="h-6 w-20 rounded-full" />
    </div>
    <div className="flex justify-between">
      <Skeleton className="h-8 w-24" />
      <Skeleton className="h-8 w-8" />
    </div>
  </div>
)

export const ReelFeed = ({ userId, className }: ReelFeedProps) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedArticle, setSelectedArticle] = useState<PersonalizedArticle | null>(null)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [viewMode, setViewMode] = useState<'grid' | 'masonry'>('masonry')
  
  const feedContainerRef = useRef<HTMLDivElement>(null)
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
  } = useFeed(userId)

  // Infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          loadMore()
        }
      },
      { threshold: 0.1, rootMargin: '100px' }
    )

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current)
    }

    return () => observer.disconnect()
  }, [hasMore, loading, loadMore])

  // Keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (selectedArticle) return // Let ReelViewer handle keys when open

      switch (e.key.toLowerCase()) {
        case 'j':
          e.preventDefault()
          setSelectedIndex(prev => Math.min(prev + 1, filteredArticles.length - 1))
          break
        case 'k':
          e.preventDefault()
          setSelectedIndex(prev => Math.max(prev - 1, 0))
          break
        case 'l':
          e.preventDefault()
          if (selectedIndex >= 0 && filteredArticles[selectedIndex]) {
            handleLike(filteredArticles[selectedIndex].id)
          }
          break
        case 's':
          e.preventDefault()
          if (selectedIndex >= 0 && filteredArticles[selectedIndex]) {
            handleBookmark(filteredArticles[selectedIndex].id)
          }
          break
        case 'enter':
          e.preventDefault()
          if (selectedIndex >= 0 && filteredArticles[selectedIndex]) {
            setSelectedArticle(filteredArticles[selectedIndex])
          }
          break
        case 'escape':
          e.preventDefault()
          setSelectedIndex(-1)
          break
        case '/':
          e.preventDefault()
          document.getElementById('search-input')?.focus()
          break
      }
    }

    document.addEventListener('keydown', handleKeyPress)
    return () => document.removeEventListener('keydown', handleKeyPress)
  }, [selectedIndex, selectedArticle])

  // Filter articles based on search
  const filteredArticles = articles.filter(article =>
    searchQuery === '' ||
    article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    article.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    article.topic_tags?.some(tag => 
      tag.toLowerCase().includes(searchQuery.toLowerCase())
    )
  )

  const handleLike = useCallback(async (id: string, liked?: boolean) => {
    try {
      await likeArticle(id, liked)
      toast({
        title: liked !== false ? "Liked!" : "Unliked",
        description: "Your preference has been saved",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update like status",
        variant: "destructive"
      })
    }
  }, [likeArticle, toast])

  const handleBookmark = useCallback(async (id: string, bookmarked?: boolean) => {
    try {
      await bookmarkArticle(id, bookmarked)
      toast({
        title: bookmarked !== false ? "Bookmarked!" : "Removed bookmark",
        description: "Article saved to your reading list",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to bookmark article",
        variant: "destructive"
      })
    }
  }, [bookmarkArticle, toast])

  const handleMuteTopic = useCallback(async (topic: string) => {
    try {
      await muteTopic(topic)
      toast({
        title: "Topic muted",
        description: `You'll see fewer articles about "${topic}"`,
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
    if (article.topic_tags && article.topic_tags.length > 0) {
      const topTopic = article.topic_tags[0]
      await updateSettings({
        preferredTopics: [...(settings.preferredTopics || []), topTopic]
      })
      toast({
        title: "Preference updated",
        description: `You'll see more articles about "${topTopic}"`,
      })
      refresh()
    }
  }, [updateSettings, settings.preferredTopics, toast, refresh])

  const handleView = useCallback(async (article: PersonalizedArticle) => {
    await trackView(article.id)
  }, [trackView])

  const handleRefresh = useCallback(async () => {
    try {
      await refresh()
      toast({
        title: "Feed refreshed",
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
      await generateFresh()
      toast({
        title: "Fresh articles generated!",
        description: "New content has been created for you"
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate fresh articles",
        variant: "destructive"
      })
    }
  }, [generateFresh, toast])

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <AlertCircle className="w-16 h-16 text-muted-foreground" />
        <div className="text-center space-y-2">
          <h3 className="text-lg font-semibold">Failed to load articles</h3>
          <p className="text-muted-foreground">
            {error.message || "Something went wrong. Please try again."}
          </p>
          <Button onClick={handleRefresh} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              id="search-input"
              placeholder="Search articles... (Press / to focus)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={loading}
            className="hover-lift"
          >
            <RefreshCw className={cn("w-4 h-4 mr-2", loading && "animate-spin")} />
            Refresh
          </Button>
          
          <Button
            variant="default"
            size="sm"
            onClick={handleGenerateFresh}
            className="hover-lift bg-gradient-to-r from-primary to-primary/80"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Generate Fresh
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSettingsOpen(true)}
            className="hover-lift"
          >
            <Settings className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {filteredArticles.length} article{filteredArticles.length !== 1 ? 's' : ''}
          {searchQuery && ` matching "${searchQuery}"`}
        </span>
        <div className="flex items-center space-x-4">
          <span>Press J/K to navigate, L to like, S to save</span>
        </div>
      </div>

      {/* Articles Grid */}
      <div 
        ref={feedContainerRef}
        className={cn(
          "transition-all duration-300",
          viewMode === 'masonry' 
            ? "columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-6 space-y-6"
            : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
        )}
      >
        {filteredArticles.map((article, index) => (
          <div 
            key={article.id} 
            className={cn(
              "break-inside-avoid",
              viewMode === 'masonry' && "mb-6"
            )}
          >
            <ReelCard
              article={article}
              isSelected={selectedIndex === index}
              onSelect={setSelectedArticle}
              onLike={(id, liked) => handleLike(id, liked)}
              onBookmark={(id, bookmarked) => handleBookmark(id, bookmarked)}
              onMuteTopic={handleMuteTopic}
              onMoreLikeThis={handleMoreLikeThis}
              onView={handleView}
              tabIndex={selectedIndex === index ? 0 : -1}
              className="hover-scale"
            />
          </div>
        ))}

        {/* Loading skeletons */}
        {loading && (
          <>
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={`skeleton-${i}`} className="break-inside-avoid mb-6">
                <SkeletonCard />
              </div>
            ))}
          </>
        )}
      </div>

      {/* Empty state */}
      {!loading && filteredArticles.length === 0 && (
        <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
          <ImageOff className="w-16 h-16 text-muted-foreground" />
          <div className="text-center space-y-2">
            <h3 className="text-lg font-semibold">No articles found</h3>
            <p className="text-muted-foreground">
              {searchQuery 
                ? `No articles match "${searchQuery}". Try a different search term.`
                : "No articles available. Try refreshing or generating fresh content."
              }
            </p>
            {!searchQuery && (
              <div className="flex gap-2 justify-center">
                <Button onClick={handleRefresh} variant="outline">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh Feed
                </Button>
                <Button onClick={handleGenerateFresh}>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate Articles
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Load more trigger */}
      <div ref={loadMoreRef} className="h-4" />

      {/* Full-screen viewer */}
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

      {/* Settings drawer */}
      <ReelSettingsDrawer
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        settings={settings}
        onSettingsChange={updateSettings}
      />
    </div>
  )
}