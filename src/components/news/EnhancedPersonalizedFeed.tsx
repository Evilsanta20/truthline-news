import { useState, useEffect, useCallback, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { usePersonalization } from '@/hooks/usePersonalization'
import { useLiveUserActivity } from '@/hooks/useLiveUserActivity'
import { useAutoRefresh } from '@/hooks/useAutoRefresh'
import { fetchNewsWithFirecrawl } from '@/utils/seedArticles'
import { supabase } from '@/integrations/supabase/client'
import FeedSettingsDrawer from './FeedSettingsDrawer'
import { NewspaperSection } from '@/components/layout/NewspaperSection'
import { 
  TrendingUp, 
  Star, 
  Eye, 
  Bookmark, 
  BookmarkCheck, 
  Heart, 
  Share2,
  Filter,
  Search,
  Sparkles,
  Target,
  BarChart3,
  Clock,
  ChevronRight,
  Flame,
  Zap,
  Globe,
  Calendar,
  ExternalLink,
  ArrowUp,
  RefreshCw
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { RefreshButton } from './RefreshButton'

interface EnhancedPersonalizedFeedProps {
  userId: string
}

export { EnhancedPersonalizedFeed }

export default function EnhancedPersonalizedFeed({ userId }: EnhancedPersonalizedFeedProps) {
  const { toast } = useToast()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [activeTab, setActiveTab] = useState('recommended')
  const [bookmarks, setBookmarks] = useState<Set<string>>(new Set())
  const [readingTimes, setReadingTimes] = useState<{[key: string]: number}>({})
  const [page, setPage] = useState(1)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())
  const [balancedMode, setBalancedMode] = useState(true)
  const [exploreRatio, setExploreRatio] = useState(0.25)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [refreshInterval, setRefreshInterval] = useState(300)
  const [mutedTopics, setMutedTopics] = useState<string[]>([])
  const [blockedSources, setBlockedSources] = useState<string[]>([])
  const [generatingArticles, setGeneratingArticles] = useState(false)
  const [categories, setCategories] = useState<Array<{ slug: string; name: string; color: string }>>([])
  const loadMoreRef = useRef<HTMLDivElement>(null)
  
  const {
    preferences,
    topicScores,
    trackInteraction,
    updatePreferences,
    liveEngagementScores,
    realTimeUpdates
  } = usePersonalization(userId)
  
  const { liveStats, isConnected, broadcastActivity } = useLiveUserActivity()
  
  // Use auto-refresh hook for smart article loading
  const {
    articles: recommendations,
    pendingCount,
    loading,
    loadingMore,
    hasMore,
    nextRefresh,
    formatCountdown,
    isAtTop,
    manualRefresh,
    applyPendingArticles,
    updateArticleLocally,
    loadMoreArticles,
    shownArticleCount
  } = useAutoRefresh({
    userId,
    refreshInterval: autoRefresh ? refreshInterval : 0, // Disable if autoRefresh is off
    onNewArticles: (count) => {
      // Simple toast notification without custom button
      toast({
        title: `${count} new articles available`,
        description: "Scroll to top or refresh to see new stories",
        duration: 5000,
      })
    },
    onRefreshComplete: () => {
      setLastRefresh(new Date())
    }
  })

  // Load categories from database - only show categories with articles
  useEffect(() => {
    const loadCategories = async () => {
      // Get categories with article counts
      const { data: categoriesData } = await supabase
        .from('categories')
        .select('id, slug, name, color')
        .order('name')
      
      if (categoriesData) {
        // Count articles for each category
        const categoriesWithCounts = await Promise.all(
          categoriesData.map(async (cat) => {
            const { count } = await supabase
              .from('articles')
              .select('*', { count: 'exact', head: true })
              .eq('category_id', cat.id)
            
            return { ...cat, articleCount: count || 0 }
          })
        )
        
        // Only include categories that have articles
        const nonEmptyCategories = categoriesWithCounts.filter(cat => cat.articleCount > 0)
        
        setCategories([
          { slug: 'all', name: 'All Categories', color: '#3B82F6' },
          ...nonEmptyCategories
        ])
      }
    }
    loadCategories()
  }, [])

  // Load bookmarks from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(`bookmarks_${userId}`)
    if (saved) {
      setBookmarks(new Set(JSON.parse(saved)))
    }
  }, [userId])


  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const target = entries[0]
        if (target.isIntersecting && hasMore && !loadingMore && !loading) {
          loadMoreArticles()
        }
      },
      { threshold: 0.1 }
    )

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current)
    }

    return () => observer.disconnect()
  }, [hasMore, loadingMore, loading, loadMoreArticles])

  // Track reading time for articles
  const startReadingTimer = (articleId: string) => {
    setReadingTimes(prev => ({
      ...prev,
      [articleId]: Date.now()
    }))
  }

  const endReadingTimer = (articleId: string) => {
    const startTime = readingTimes[articleId]
    if (startTime) {
      const readTime = (Date.now() - startTime) / 1000 // seconds
      if (readTime > 5) { // Only track if read for more than 5 seconds
        trackInteraction(articleId, 'read_time', readTime)
      }
      setReadingTimes(prev => {
        const newTimes = { ...prev }
        delete newTimes[articleId]
        return newTimes
      })
    }
  }

  const handleArticleClick = (article: any) => {
    trackInteraction(article.id, 'view')
    startReadingTimer(article.id)
    broadcastActivity(userId, article.id, 'viewing')
    
    // Update article locally to persist interaction during refresh
    updateArticleLocally(article.id, { 
      engagement_score: (article.engagement_score || 0) + 1 
    })
    
    // Open article in new tab after short delay to track view
    setTimeout(() => {
      if (article.url) {
        window.open(article.url, '_blank')
      }
    }, 100)
  }

  const toggleBookmark = (articleId: string) => {
    const newBookmarks = new Set(bookmarks)
    const isBookmarked = newBookmarks.has(articleId)
    
    if (isBookmarked) {
      newBookmarks.delete(articleId)
      trackInteraction(articleId, 'bookmark', -1)
      updateArticleLocally(articleId, { bookmarked: false })
      toast({
        title: "Bookmark removed",
        description: "Article removed from bookmarks"
      })
    } else {
      newBookmarks.add(articleId)
      trackInteraction(articleId, 'bookmark', 1)
      broadcastActivity(userId, articleId, 'bookmarking')
      updateArticleLocally(articleId, { 
        bookmarked: true,
        engagement_score: (recommendations.find(a => a.id === articleId)?.engagement_score || 0) + 3 
      })
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
    updateArticleLocally(articleId, { 
      liked: true,
      engagement_score: (recommendations.find(a => a.id === articleId)?.engagement_score || 0) + 2 
    })
    toast({
      title: "Article liked",
      description: "This will improve your recommendations"
    })
  }

  const handleShare = (articleId: string) => {
    trackInteraction(articleId, 'share')
    broadcastActivity(userId, articleId, 'sharing')
    updateArticleLocally(articleId, { 
      shared: true,
      engagement_score: (recommendations.find(a => a.id === articleId)?.engagement_score || 0) + 5 
    })
    // Copy URL to clipboard
    navigator.clipboard.writeText(window.location.origin + '/article/' + articleId)
    toast({
      title: "Link copied",
      description: "Article link copied to clipboard"
    })
  }

  const toggleTopicPreference = (topic: string, isPreferred: boolean) => {
    if (!preferences) return

    if (isPreferred) {
      updatePreferences({
        preferred_topics: [...(preferences.preferred_topics || []), topic]
      })
    } else {
      updatePreferences({
        blocked_topics: [...(preferences.blocked_topics || []), topic]
      })
    }
  }

  const generateFreshArticles = async () => {
    try {
      setGeneratingArticles(true)
      
      console.log('🚀 Fetching live headlines via Enhanced News Aggregator...')
      
      const result = await supabase.functions.invoke('enhanced-news-aggregator', {
        body: { 
          category: 'general',
          limit: 80,
          forceRefresh: true
        }
      })
      
      if (result.error) {
        console.error('Enhanced News Aggregator error:', result.error)
        throw new Error(result.error.message)
      }
      
      const totalFetched = result.data?.total_articles || result.data?.inserted || 0
      console.log(`✅ Enhanced News Aggregator: ${totalFetched} fresh articles processed`)
      
      toast({
        title: 'Fresh News Generated!',
        description: `Loaded ${totalFetched} live articles`
      })
      
      // Refresh recommendations after fetching
      manualRefresh()
    } catch (error) {
      console.error('Error fetching fresh news:', error)
      toast({
        title: 'Error',
        description: `Failed to fetch fresh news: ${error.message}`,
        variant: 'destructive'
      })
    } finally {
      setGeneratingArticles(false)
    }
  }

  const filteredRecommendations = recommendations.filter(article => {
    const matchesSearch = searchQuery === '' || 
      article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.description?.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesCategory = selectedCategory === 'all' || 
      article.categories?.slug === selectedCategory
    
    return matchesSearch && matchesCategory
  })

  const trendingArticles = filteredRecommendations.filter(a => a.is_trending).slice(0, 6)
  const featuredArticles = filteredRecommendations.filter(a => a.is_featured).slice(0, 4)
  const bookmarkedArticles = filteredRecommendations.filter(a => bookmarks.has(a.id))

  const formatTimeAgo = (dateString: string) => {
    const now = new Date()
    const date = new Date(dateString)
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
    
    if (diffInHours < 1) return 'Just now'
    if (diffInHours < 24) return `${diffInHours}h ago`
    return `${Math.floor(diffInHours / 24)}d ago`
  }

  if (loading && recommendations.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center scroll-animation">
          <Sparkles className="w-12 h-12 text-primary mx-auto animate-pulse" />
          <p className="text-foreground mt-2">Loading personalized feed...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 bg-background">
      {/* Floating "Load New" Banner */}
      {pendingCount > 0 && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 animate-in slide-in-from-top duration-300">
          <div className="bg-foreground text-background px-6 py-3 border-4 border-[hsl(var(--newspaper-divider))] shadow-lg">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-background animate-pulse" />
                <span className="font-headline font-bold uppercase tracking-wide text-sm">{pendingCount} NEW STORIES</span>
              </div>
              <Button
                onClick={applyPendingArticles}
                size="sm"
                variant="secondary"
                className="bg-background text-foreground hover:bg-background/90 h-8 px-3 rounded-none font-headline uppercase text-xs"
              >
                <ArrowUp className="w-4 h-4 mr-1" />
                READ NOW
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Header - Newspaper Style */}
      <NewspaperSection title="Your Edition">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="newspaper-column border-r-2 border-[hsl(var(--newspaper-border))]">
            <h3 className="newspaper-byline mb-2">SUBSCRIPTION STATUS</h3>
            <p className="font-body text-sm">{recommendations.length} articles loaded</p>
            <p className="newspaper-byline text-xs mt-1">{shownArticleCount} unique articles seen</p>
            {autoRefresh && (
              <p className="newspaper-byline text-xs mt-1">Next update: {formatCountdown(nextRefresh)}</p>
            )}
          </div>
          <div className="newspaper-column border-r-2 border-[hsl(var(--newspaper-border))] md:border-r-0">
            <h3 className="newspaper-byline mb-2">LAST EDITION</h3>
            <p className="font-body text-sm">{lastRefresh.toLocaleTimeString()}</p>
          </div>
          <div className="flex items-center justify-center gap-2">
            <FeedSettingsDrawer
              balancedMode={balancedMode}
              onBalancedModeChange={setBalancedMode}
              exploreRatio={exploreRatio}
              onExploreRatioChange={setExploreRatio}
              autoRefresh={autoRefresh}
              onAutoRefreshChange={setAutoRefresh}
              refreshInterval={refreshInterval}
              onRefreshIntervalChange={setRefreshInterval}
              mutedTopics={mutedTopics}
              onMutedTopicsChange={setMutedTopics}
              blockedSources={blockedSources}
              onBlockedSourcesChange={setBlockedSources}
            />
            <RefreshButton
              onRefresh={async () => {
                manualRefresh()
                toast({
                  title: "Edition refreshed",
                  description: "Latest stories loaded"
                })
              }}
              onGenerateFresh={async () => {
                try {
                  setGeneratingArticles(true)
                  
                  const result = await supabase.functions.invoke('enhanced-news-aggregator', {
                    body: { 
                      category: 'general',
                      limit: 80,
                      forceRefresh: true
                    }
                  })
                  
                  if (result.error) throw new Error(result.error.message || 'Failed to generate fresh news')
                  
                  manualRefresh()
                  
                  return {
                    success: true,
                    articles_processed: result.data?.total_articles || result.data?.inserted || 0,
                    categories: ['general']
                  }
                } catch (error) {
                  return { success: false, articles_processed: 0, categories: [] }
                } finally {
                  setGeneratingArticles(false)
                }
              }}
              loading={loading || generatingArticles}
              className="flex-wrap"
              userId={userId}
            />
          </div>
        </div>
      </NewspaperSection>

        {/* Category Pills */}
        <div className="flex flex-wrap gap-2 mt-6">
          {categories.map((category) => (
            <button
              key={category.slug}
              onClick={() => setSelectedCategory(category.slug)}
              className={`category-pill ${
                selectedCategory === category.slug
                  ? 'bg-foreground text-background font-bold'
                  : 'bg-muted text-foreground hover:bg-muted/80'
              }`}
            >
              {category.name}
            </button>
          ))}
        </div>

        {/* Topic Preferences */}
        {topicScores.length > 0 && (
          <Card className="mt-6 scroll-animation news-card">
            <CardHeader className="border-b-2 border-[hsl(var(--newspaper-border))]">
              <CardTitle className="newspaper-headline text-xl flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                YOUR INTERESTS
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="flex flex-wrap gap-2">
                {topicScores.slice(0, 8).map(({ topic, score }) => (
                  <Badge 
                    key={topic} 
                    className="category-pill capitalize cursor-pointer"
                    onClick={() => toggleTopicPreference(topic, false)}
                  >
                    {topic} ({Math.round(score)})
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

      {/* Search and Filters */}
      <div className="mb-8 space-y-4 scroll-animation mt-8">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search your personalized articles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-full sm:w-48">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((category) => (
                <SelectItem key={category.slug} value={category.slug}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>


      {/* Newspaper-Style Content Layout */}
      <NewspaperSection title="Today's Headlines">
        {filteredRecommendations.length === 0 ? (
          <div className="text-center py-12">
            <p className="newspaper-byline">No articles available. Please click the refresh button to load fresh news.</p>
          </div>
        ) : (
          <>
            {/* Lead Story */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8 pb-8 border-b-4 border-[hsl(var(--newspaper-divider))]">
              {/* Main Story - Takes up 2 columns */}
              <div className="lg:col-span-2 border-r-2 border-[hsl(var(--newspaper-border))] pr-8">
                <Card key={filteredRecommendations[0].id} className="news-card border-0 shadow-none">
                  {filteredRecommendations[0].url_to_image && (
                    <img
                      src={filteredRecommendations[0].url_to_image}
                      alt={filteredRecommendations[0].title}
                      className="w-full h-96 object-cover grayscale hover:grayscale-0 transition-all duration-500 mb-4"
                      onError={(e) => e.currentTarget.style.display = 'none'}
                    />
                  )}
                  <h2 className="newspaper-headline text-5xl mb-4 leading-tight cursor-pointer hover:underline" onClick={() => handleArticleClick(filteredRecommendations[0])}>
                    {filteredRecommendations[0].title}
                  </h2>
                  <p className="font-body text-lg leading-relaxed mb-4">
                    {filteredRecommendations[0].description}
                  </p>
                  <div className="newspaper-divider my-4"></div>
                  <div className="flex items-center justify-between newspaper-byline">
                    <div className="flex items-center gap-4">
                      <span className="font-semibold">{filteredRecommendations[0].source_name || 'Unknown Source'}</span>
                      <span>•</span>
                      <span>{formatTimeAgo(filteredRecommendations[0].created_at)}</span>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); toggleBookmark(filteredRecommendations[0].id) }}>
                        {bookmarks.has(filteredRecommendations[0].id) ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleShare(filteredRecommendations[0].id) }}>
                        <Share2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Side Stories */}
              <div className="space-y-6">
                {filteredRecommendations.slice(1, 4).map((article) => (
                  <div key={article.id} className="pb-6 border-b border-[hsl(var(--newspaper-border))] last:border-0">
                    <h3 className="newspaper-headline text-xl mb-2 cursor-pointer hover:underline" onClick={() => handleArticleClick(article)}>
                      {article.title}
                    </h3>
                    <p className="font-body text-sm leading-relaxed line-clamp-3 mb-2">
                      {article.description}
                    </p>
                    <div className="newspaper-byline text-xs flex items-center justify-between">
                      <span>{article.source_name || 'Unknown'} • {formatTimeAgo(article.created_at)}</span>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={(e) => { e.stopPropagation(); toggleBookmark(article.id) }}>
                        {bookmarks.has(article.id) ? <BookmarkCheck className="w-3 h-3" /> : <Bookmark className="w-3 h-3" />}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Three Column News Layout */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {filteredRecommendations.slice(4).map((article, index) => (
                <div key={article.id} className="newspaper-column pb-6 border-b-2 border-[hsl(var(--newspaper-border))]">
                  {article.url_to_image && (
                    <img
                      src={article.url_to_image}
                      alt={article.title}
                      className="w-full h-48 object-cover grayscale hover:grayscale-0 transition-all duration-300 mb-3"
                      onError={(e) => e.currentTarget.style.display = 'none'}
                    />
                  )}
                  <h3 className="newspaper-headline text-2xl mb-2 cursor-pointer hover:underline" onClick={() => handleArticleClick(article)}>
                    {article.title}
                  </h3>
                  <p className="font-body text-sm leading-relaxed line-clamp-4 mb-3">
                    {article.description}
                  </p>
                  <div className="newspaper-divider my-3"></div>
                  <div className="flex items-center justify-between newspaper-byline text-xs">
                    <span>{article.source_name || 'Unknown'} • {formatTimeAgo(article.created_at)}</span>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={(e) => { e.stopPropagation(); handleLike(article.id) }}>
                        <Heart className="w-3 h-3" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={(e) => { e.stopPropagation(); toggleBookmark(article.id) }}>
                        {bookmarks.has(article.id) ? <BookmarkCheck className="w-3 h-3" /> : <Bookmark className="w-3 h-3" />}
                      </Button>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={(e) => { e.stopPropagation(); handleShare(article.id) }}>
                        <Share2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Load More / End of Edition */}
            <div ref={loadMoreRef} className="text-center py-8 mt-8 border-t-4 border-[hsl(var(--newspaper-divider))]">
              <div className="newspaper-divider mb-4"></div>
              {loadingMore ? (
                <div className="flex items-center justify-center gap-2">
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <p className="newspaper-byline uppercase tracking-wider">Loading More Stories...</p>
                </div>
              ) : hasMore ? (
                <div>
                  <p className="newspaper-byline uppercase tracking-wider mb-3">More Stories Available</p>
                  <Button
                    onClick={loadMoreArticles}
                    variant="outline"
                    className="font-headline uppercase text-xs"
                  >
                    Load More Articles
                  </Button>
                </div>
              ) : (
                <p className="newspaper-byline uppercase tracking-wider">End of Edition • All Caught Up</p>
              )}
            </div>
          </>
        )}
      </NewspaperSection>

      {/* Additional Sections */}
      {selectedCategory === 'all' && trendingArticles.length > 0 && (
        <NewspaperSection title="Trending Stories">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {trendingArticles.map((article) => (
              <div key={article.id} className="newspaper-column pb-4 border-b border-[hsl(var(--newspaper-border))]">
                <Badge className="bg-accent text-accent-foreground font-headline uppercase text-xs mb-2">Trending</Badge>
                <h3 className="newspaper-headline text-xl mb-2 cursor-pointer hover:underline" onClick={() => handleArticleClick(article)}>
                  {article.title}
                </h3>
                <p className="font-body text-sm line-clamp-3 mb-2">{article.description}</p>
                <div className="newspaper-byline text-xs">
                  {article.source_name || 'Unknown'} • {formatTimeAgo(article.created_at)}
                </div>
              </div>
            ))}
          </div>
        </NewspaperSection>
      )}
    </div>
  )
}