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

interface EnhancedPersonalizedFeedProps {
  userId: string
}

export { EnhancedPersonalizedFeed }

const CATEGORIES = [
  { slug: 'all', name: 'All Categories', color: '#3B82F6' },
  { slug: 'politics', name: 'Politics', color: '#DC2626' },
  { slug: 'technology', name: 'Technology', color: '#059669' },
  { slug: 'sports', name: 'Sports', color: '#D97706' },
  { slug: 'entertainment', name: 'Entertainment', color: '#7C3AED' },
  { slug: 'business', name: 'Business', color: '#0891B2' },
  { slug: 'health', name: 'Health', color: '#DC2626' },
  { slug: 'science', name: 'Science', color: '#059669' },
  { slug: 'world', name: 'World', color: '#1D4ED8' },
]

export default function EnhancedPersonalizedFeed({ userId }: EnhancedPersonalizedFeedProps) {
  const { toast } = useToast()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [activeTab, setActiveTab] = useState('recommended')
  const [bookmarks, setBookmarks] = useState<Set<string>>(new Set())
  const [readingTimes, setReadingTimes] = useState<{[key: string]: number}>({})
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())
  const [balancedMode, setBalancedMode] = useState(true)
  const [exploreRatio, setExploreRatio] = useState(0.25)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [refreshInterval, setRefreshInterval] = useState(300)
  const [mutedTopics, setMutedTopics] = useState<string[]>([])
  const [blockedSources, setBlockedSources] = useState<string[]>([])
  const [generatingArticles, setGeneratingArticles] = useState(false)
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
    nextRefresh,
    formatCountdown,
    isAtTop,
    manualRefresh,
    applyPendingArticles,
    updateArticleLocally
  } = useAutoRefresh({
    userId,
    refreshInterval: autoRefresh ? refreshInterval : 0, // Disable if autoRefresh is off
    onNewArticles: (count) => {
      if (!isAtTop) {
        toast({
          title: `${count} new articles available`,
          description: "Click to load new stories",
          action: (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={applyPendingArticles}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <ArrowUp className="w-4 h-4 mr-1" />
              Load New
            </Button>
          ),
          duration: 10000, // Show for 10 seconds
        })
      }
    },
    onRefreshComplete: () => {
      setLastRefresh(new Date())
    }
  })

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
        if (target.isIntersecting && hasMore && !isLoadingMore && !loading) {
          loadMoreArticles()
        }
      },
      { threshold: 0.1 }
    )

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current)
    }

    return () => observer.disconnect()
  }, [hasMore, isLoadingMore, loading])

  const loadMoreArticles = useCallback(async () => {
    if (isLoadingMore) return
    
    setIsLoadingMore(true)
    
    // Simulate loading delay
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    setPage(prev => prev + 1)
    
    // Simulate reaching end of content after 3 pages
    if (page >= 3) {
      setHasMore(false)
    }
    
    setIsLoadingMore(false)
  }, [page, isLoadingMore])

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
      
      // Try Firecrawl first (more reliable), then fallback to regular APIs
      console.log('Fetching fresh news from real sources...')
      
      const categories = ['general', 'technology', 'business', 'health', 'sports', 'politics']
      let totalFetched = 0
      
      for (const category of categories) {
        try {
          // Try Firecrawl first
          const firecrawlResult = await fetchNewsWithFirecrawl(category, 12)
          if (firecrawlResult.articles_count > 0) {
            totalFetched += firecrawlResult.articles_count
            console.log(`Firecrawl fetched ${firecrawlResult.articles_count} articles for ${category}`)
            continue // Skip fallback if Firecrawl worked
          }
        } catch (error) {
          console.warn(`Firecrawl failed for ${category}, trying fallback:`, error)
        }
        
        // Fallback to enhanced news aggregator
        try {
          const result = await supabase.functions.invoke('enhanced-news-aggregator', {
            body: { 
              category, 
              limit: 15, 
              refresh: true,
              forceRefresh: true 
            }
          })
          
          if (result.data?.articles) {
            totalFetched += result.data.articles.length
          }
        } catch (error) {
          console.warn(`Failed to fetch ${category} news:`, error)
        }
      }
      
      toast({
        title: "Fresh News Loaded!",
        description: `Fetched ${totalFetched} real articles from news sources`,
      })
      
      // Refresh recommendations after fetching real articles
      manualRefresh()
    } catch (error) {
      console.error('Error fetching fresh news:', error)
      toast({
        title: "Error",
        description: "Failed to fetch fresh news. Please try again.",
        variant: "destructive"
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header with Personalization Stats */}
      <div className="mb-8 scroll-animation">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <Target className="w-8 h-8 text-primary" />
              <span className="gradient-text">Your Personalized Feed</span>
            </h1>
              <p className="text-muted-foreground mt-2 flex items-center gap-2">
                <Globe className="w-4 h-4" />
                {recommendations.length} articles tailored for you
                {autoRefresh && (
                  <span>• Next refresh in {formatCountdown(nextRefresh)}</span>
                )}
                {isConnected && (
                  <span className="flex items-center gap-1 text-accent">
                    <div className="w-2 h-2 bg-accent rounded-full animate-pulse" />
                    Live ({liveStats.activeUsers} active)
                  </span>
                )}
              </p>
          </div>
          <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
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
            <div className="text-xs text-muted-foreground">
              Last updated: {lastRefresh.toLocaleTimeString()}
            </div>
            {pendingCount > 0 && !isAtTop && (
              <Button 
                onClick={applyPendingArticles}
                variant="default" 
                size="sm" 
                className="hover-lift animate-pulse bg-primary text-primary-foreground"
              >
                <ArrowUp className="w-4 h-4 mr-1" />
                {pendingCount} New Article{pendingCount > 1 ? 's' : ''}
              </Button>
            )}
            <Button 
              onClick={() => {
                manualRefresh()
                toast({
                  title: "Feed refreshed",
                  description: "Latest articles loaded successfully"
                })
              }} 
              variant="outline" 
              size="sm" 
              className="hover-lift"
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Refreshing...' : 'Refresh Now'}
            </Button>
            <Button
              onClick={generateFreshArticles}
              variant="default"
              size="sm"
              className="hover-lift bg-accent text-accent-foreground hover:bg-accent/90"
              disabled={generatingArticles}
            >
              <Sparkles className={`w-4 h-4 mr-2 ${generatingArticles ? 'animate-spin' : ''}`} />
              {generatingArticles ? 'Fetching News...' : 'Get Fresh News'}
            </Button>
          </div>
            <Button
              onClick={() => window.location.reload()}
              variant="ghost"
              size="sm"
              className="hover-lift"
            >
              <Globe className="w-4 h-4 mr-1" />
              Force Reload
            </Button>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex flex-wrap gap-2 mt-6">
          {CATEGORIES.map((category) => (
            <button
              key={category.slug}
              onClick={() => setSelectedCategory(category.slug)}
              className={`category-pill ${
                selectedCategory === category.slug
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              }`}
            >
              {category.name}
            </button>
          ))}
        </div>

        {/* Topic Preferences */}
        {topicScores.length > 0 && (
          <Card className="mt-6 scroll-animation">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Your Interest Profile
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {topicScores.slice(0, 8).map(({ topic, score }) => (
                  <Badge 
                    key={topic} 
                    variant="secondary" 
                    className="capitalize cursor-pointer hover:scale-105 transition-transform"
                    onClick={() => toggleTopicPreference(topic, false)}
                  >
                    {topic} ({Math.round(score)})
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Search and Filters */}
      <div className="mb-8 space-y-4 scroll-animation">
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
              {CATEGORIES.map((category) => (
                <SelectItem key={category.slug} value={category.slug}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Trending Banner */}
      {trendingArticles.length > 0 && (
        <div className="mb-8 scroll-animation">
          <div className="flex items-center gap-2 mb-4">
            <Flame className="w-5 h-5 text-accent" />
            <h2 className="text-xl font-bold text-foreground">Trending Now</h2>
            <Zap className="w-4 h-4 text-accent" />
          </div>
          <div className="overflow-x-auto">
            <div className="flex gap-4 pb-4" style={{ minWidth: 'max-content' }}>
              {trendingArticles.slice(0, 5).map((article, index) => (
                <Card 
                  key={article.id} 
                  className="news-card news-card-trending min-w-[300px] cursor-pointer"
                  onClick={() => handleArticleClick(article)}
                >
                  <CardContent className="p-4">
                    <Badge className="bg-accent text-accent-foreground mb-2">
                      <TrendingUp className="w-3 h-3 mr-1" />
                      #{index + 1} Trending
                    </Badge>
                    <h3 className="font-semibold text-foreground mb-2 line-clamp-2">
                      {article.title}
                    </h3>
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                        <span className={liveEngagementScores[article.id] ? 'text-accent animate-pulse' : ''}>
                          {Math.round(article.engagement_score || 0)}
                        </span>
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatTimeAgo(article.created_at)}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="recommended">For You ({filteredRecommendations.length})</TabsTrigger>
          <TabsTrigger value="trending">Trending ({trendingArticles.length})</TabsTrigger>
          <TabsTrigger value="featured">Featured ({featuredArticles.length})</TabsTrigger>
          <TabsTrigger value="bookmarks">Saved ({bookmarkedArticles.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="recommended" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRecommendations.map((article, index) => (
              <Card key={article.id} className="news-card group scroll-animation" style={{ animationDelay: `${index * 0.1}s` }}>
                <CardContent className="p-0">
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <Badge variant="outline" style={{ borderColor: article.categories?.color }}>
                        {article.categories?.name}
                      </Badge>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <TrendingUp className="w-3 h-3" />
                        {Math.round(article.recommendation_score || 0)}
                      </div>
                    </div>
                    
                    <h3 
                      className="font-semibold text-foreground mb-2 line-clamp-2 cursor-pointer hover:text-primary transition-colors group-hover:text-primary"
                      onClick={() => handleArticleClick(article)}
                      onMouseEnter={() => startReadingTimer(article.id)}
                      onMouseLeave={() => endReadingTimer(article.id)}
                    >
                      {article.title}
                    </h3>
                    
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-3">
                      {article.description}
                    </p>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleLike(article.id)
                          }}
                          className="text-muted-foreground hover:text-red-600 hover:scale-110 transition-all"
                        >
                          <Heart className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleBookmark(article.id)
                          }}
                          className={`hover:scale-110 transition-all ${
                            bookmarks.has(article.id) ? 'text-accent' : 'text-muted-foreground hover:text-accent'
                          }`}
                        >
                          {bookmarks.has(article.id) ? (
                            <BookmarkCheck className="w-4 h-4" />
                          ) : (
                            <Bookmark className="w-4 h-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleShare(article.id)
                          }}
                          className="text-muted-foreground hover:text-primary hover:scale-110 transition-all"
                        >
                          <Share2 className="w-4 h-4" />
                        </Button>
                      </div>
                      
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        <span>{formatTimeAgo(article.created_at)}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          
          {/* Load More / Infinite Scroll */}
          <div ref={loadMoreRef} className="text-center py-8">
            {isLoadingMore ? (
              <div className="flex items-center justify-center gap-2">
                <Sparkles className="w-5 h-5 text-primary animate-spin" />
                <span className="text-muted-foreground">Loading more articles...</span>
              </div>
            ) : hasMore ? (
              <Button 
                onClick={loadMoreArticles}
                variant="outline"
                className="hover-lift"
              >
                Load More Articles
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <p className="text-muted-foreground">You've reached the end of your personalized feed</p>
            )}
          </div>
        </TabsContent>

        <TabsContent value="trending">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {trendingArticles.map((article) => (
              <Card key={article.id} className="news-card news-card-trending">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-4 h-4 text-accent" />
                    <Badge variant="outline" className="border-accent text-accent">
                      Trending
                    </Badge>
                  </div>
                  <h3 
                    className="font-semibold text-foreground mb-2 line-clamp-2 cursor-pointer hover:text-primary transition-colors"
                    onClick={() => handleArticleClick(article)}
                  >
                    {article.title}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                    {article.description}
                  </p>
                  <div className="flex items-center justify-between">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleBookmark(article.id)}
                      className={bookmarks.has(article.id) ? 'text-accent' : 'text-muted-foreground'}
                    >
                      {bookmarks.has(article.id) ? (
                        <BookmarkCheck className="w-4 h-4" />
                      ) : (
                        <Bookmark className="w-4 h-4" />
                      )}
                    </Button>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Eye className="w-3 h-3" />
                      <span>{article.engagement_score || 0}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="featured">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {featuredArticles.map((article) => (
              <Card key={article.id} className="news-card news-card-featured">
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <Star className="w-5 h-5 text-primary" />
                    <Badge className="bg-primary text-primary-foreground">Featured</Badge>
                  </div>
                  <h3 
                    className="text-xl font-bold text-foreground mb-3 cursor-pointer hover:text-primary transition-colors"
                    onClick={() => handleArticleClick(article)}
                  >
                    {article.title}
                  </h3>
                  <p className="text-muted-foreground mb-4 line-clamp-3">
                    {article.description}
                  </p>
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" style={{ borderColor: article.categories?.color }}>
                      {article.categories?.name}
                    </Badge>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleBookmark(article.id)}
                        className={bookmarks.has(article.id) ? 'text-accent' : 'text-muted-foreground'}
                      >
                        {bookmarks.has(article.id) ? (
                          <BookmarkCheck className="w-4 h-4" />
                        ) : (
                          <Bookmark className="w-4 h-4" />
                        )}
                      </Button>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Eye className="w-3 h-3" />
                        <span>{article.engagement_score || 0}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="bookmarks">
          {bookmarkedArticles.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Bookmark className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-foreground mb-2">No bookmarks yet</h3>
                <p className="text-muted-foreground">Start bookmarking articles to see them here.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {bookmarkedArticles.map((article) => (
                <Card key={article.id} className="news-card border-accent/20 bg-accent/5">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant="outline" className="border-accent text-accent">
                        {article.categories?.name}
                      </Badge>
                      <Clock className="w-4 h-4 text-accent" />
                    </div>
                    <h3 
                      className="font-semibold text-foreground mb-2 line-clamp-2 cursor-pointer hover:text-primary transition-colors"
                      onClick={() => handleArticleClick(article)}
                    >
                      {article.title}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                      {article.description}
                    </p>
                    <div className="flex items-center justify-between">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleBookmark(article.id)}
                        className="text-accent hover:text-accent/80"
                      >
                        <BookmarkCheck className="w-4 h-4" />
                      </Button>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <TrendingUp className="w-3 h-3" />
                        {Math.round(article.recommendation_score || 0)}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}