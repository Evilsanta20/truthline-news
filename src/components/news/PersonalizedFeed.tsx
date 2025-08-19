import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { usePersonalization } from '@/hooks/usePersonalization'
import { 
  TrendingUp, 
  Star, 
  Eye, 
  Bookmark, 
  BookmarkCheck, 
  Heart, 
  Share2, 
  Clock,
  Filter,
  Search,
  Sparkles,
  Target,
  BarChart3
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface PersonalizedFeedProps {
  userId: string
}

export default function PersonalizedFeed({ userId }: PersonalizedFeedProps) {
  const { toast } = useToast()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [activeTab, setActiveTab] = useState('recommended')
  const [bookmarks, setBookmarks] = useState<Set<string>>(new Set())
  const [readingTimes, setReadingTimes] = useState<{[key: string]: number}>({})
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())
  const [nextRefresh, setNextRefresh] = useState<number>(300) // 5 minutes in seconds
  
  const {
    preferences,
    recommendations,
    topicScores,
    loading,
    trackInteraction,
    updatePreferences,
    refreshRecommendations
  } = usePersonalization(userId)

  // Load bookmarks from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(`bookmarks_${userId}`)
    if (saved) {
      setBookmarks(new Set(JSON.parse(saved)))
    }
  }, [userId])

  // Auto-refresh countdown timer
  useEffect(() => {
    const countdownInterval = setInterval(() => {
      setNextRefresh(prev => {
        if (prev <= 1) {
          setLastRefresh(new Date())
          return 300 // Reset to 5 minutes
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(countdownInterval)
  }, [])

  // Update last refresh when recommendations change
  useEffect(() => {
    if (recommendations.length > 0) {
      setLastRefresh(new Date())
      setNextRefresh(300)
    }
  }, [recommendations])

  // Format countdown time
  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

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
    
    // Open article in new tab after short delay to track view
    setTimeout(() => {
      if (article.url) {
        window.open(article.url, '_blank')
      }
    }, 100)
  }

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

  if (loading && recommendations.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Sparkles className="w-12 h-12 text-primary mx-auto animate-pulse" />
          <p className="text-foreground mt-2">Loading personalized feed...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header with Personalization Stats */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <Target className="w-8 h-8 text-primary" />
              Your Personalized Feed
            </h1>
            <p className="text-muted-foreground mt-2">
              {recommendations.length} articles tailored for you • Next refresh in {formatCountdown(nextRefresh)}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <div className="text-xs text-muted-foreground">
              Last updated: {lastRefresh.toLocaleTimeString()}
            </div>
            <Button 
              onClick={() => {
                refreshRecommendations(true)
                setNextRefresh(300) // Reset countdown when manually refreshed
                toast({
                  title: "Feed refreshed",
                  description: "Latest articles loaded successfully"
                })
              }} 
              variant="outline" 
              size="sm"
              disabled={loading}
            >
              <Sparkles className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Refreshing...' : 'Refresh Now'}
            </Button>
          </div>
        </div>

        {/* Topic Preferences */}
        {topicScores.length > 0 && (
          <Card className="mt-6">
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
                    className="capitalize cursor-pointer"
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
      <div className="mb-8 space-y-4">
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
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="politics">Politics</SelectItem>
              <SelectItem value="technology">Technology</SelectItem>
              <SelectItem value="sports">Sports</SelectItem>
              <SelectItem value="entertainment">Entertainment</SelectItem>
              <SelectItem value="business">Business</SelectItem>
              <SelectItem value="health">Health</SelectItem>
              <SelectItem value="science">Science</SelectItem>
              <SelectItem value="world">World</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

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
              <Card key={article.id} className="hover:shadow-lg transition-all duration-200 group">
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
                      className="font-semibold text-foreground mb-2 line-clamp-2 cursor-pointer hover:text-primary transition-colors"
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
                      <div className="flex items-center gap-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleLike(article.id)}
                          className="text-muted-foreground hover:text-red-600"
                        >
                          <Heart className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleBookmark(article.id)}
                          className={bookmarks.has(article.id) ? 'text-red-600' : 'text-muted-foreground'}
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
                          onClick={() => handleShare(article.id)}
                          className="text-muted-foreground hover:text-primary"
                        >
                          <Share2 className="w-4 h-4" />
                        </Button>
                      </div>
                      
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
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

        <TabsContent value="trending">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {trendingArticles.map((article) => (
              <Card key={article.id} className="border-amber-200 bg-amber-50 hover:shadow-lg transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-4 h-4 text-amber-600" />
                    <Badge variant="outline" className="border-amber-600 text-amber-600">
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
                      className={bookmarks.has(article.id) ? 'text-red-600' : 'text-muted-foreground'}
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
              <Card key={article.id} className="border-primary/20 bg-primary/5 hover:shadow-lg transition-shadow">
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
                        className={bookmarks.has(article.id) ? 'text-red-600' : 'text-muted-foreground'}
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
                <Card key={article.id} className="border-red-200 bg-red-50 hover:shadow-lg transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant="outline" className="border-red-600 text-red-600">
                        {article.categories?.name}
                      </Badge>
                      <Clock className="w-4 h-4 text-red-600" />
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
                        className="text-red-600 hover:text-red-700"
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