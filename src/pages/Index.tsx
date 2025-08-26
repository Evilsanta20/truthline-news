import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Play, Sparkles, Home, TrendingUp, Bookmark, Globe, List, Video, RotateCcw, LogIn, User, LogOut } from 'lucide-react'
import { EnhancedPersonalizedFeed } from '@/components/news/EnhancedPersonalizedFeed'
import { useAuth } from '@/hooks/useAuth'
import { Link } from 'react-router-dom'

export default function Index() {
  const [activeTab, setActiveTab] = useState('home')
  const { user, loading, signOut } = useAuth()

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your personalized feed...</p>
        </div>
      </div>
    )
  }

  // Show auth prompt if not logged in
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
        <div className="text-center max-w-2xl mx-auto">
          <div className="mx-auto w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-6">
            <Globe className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-4xl font-bold text-foreground mb-4">Welcome to NewsDigest AI</h1>
          <p className="text-xl text-muted-foreground mb-8">
            Get personalized news recommendations powered by AI. 
            Track your reading habits and discover content tailored just for you.
          </p>
          <div className="flex gap-4 justify-center">
            <Link to="/auth">
              <Button className="bg-primary hover:bg-primary/90" size="lg">
                <LogIn className="w-5 h-5 mr-2" />
                Sign In / Sign Up
              </Button>
            </Link>
          </div>
          <div className="mt-8 text-sm text-muted-foreground">
            <p>✨ AI-powered recommendations</p>
            <p>📊 Reading analytics & insights</p>
            <p>🔖 Bookmark your favorite articles</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Banner */}
      <div className="bg-gradient-to-r from-primary/10 to-accent/10 border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Play className="w-6 h-6 text-primary" />
              <div>
                <h3 className="font-semibold text-foreground">Try the new Reels experience!</h3>
                <p className="text-sm text-muted-foreground">Swipe through trending news in a TikTok-style format</p>
              </div>
            </div>
            <Button variant="outline" className="hover-lift">
              Try Reels
            </Button>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-16 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="flex items-center justify-between mb-3 pt-3">
              <div className="flex items-center gap-3">
                <img 
                  src="/lovable-uploads/e524adb8-0ef1-4971-84c5-016ea92d2d35.png" 
                  alt="AI News Digest Logo" 
                  className="w-7 h-7 object-contain"
                />
                <h2 className="text-lg font-semibold text-foreground">AI News Digest</h2>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <User className="w-4 h-4" />
                  <span>{user.email}</span>
                </div>
                <Button 
                  onClick={signOut}
                  variant="ghost" 
                  size="sm"
                  className="text-muted-foreground hover:text-foreground"
                >
                  <LogOut className="w-4 h-4 mr-1" />
                  Sign Out
                </Button>
                <Button 
                  onClick={() => window.location.reload()}
                  variant="ghost" 
                  size="sm"
                  className="text-muted-foreground hover:text-foreground"
                >
                  <RotateCcw className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <TabsList className="grid w-full grid-cols-7 h-12 bg-transparent border-0 rounded-none">
              <TabsTrigger 
                value="personalized" 
                className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Personalized
              </TabsTrigger>
              <TabsTrigger 
                value="home" 
                className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
              >
                <Home className="w-4 h-4 mr-2" />
                Home
              </TabsTrigger>
              <TabsTrigger 
                value="trending" 
                className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
              >
                <TrendingUp className="w-4 h-4 mr-2" />
                Trending
              </TabsTrigger>
              <TabsTrigger 
                value="bookmarks" 
                className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
              >
                <Bookmark className="w-4 h-4 mr-2" />
                Bookmarks
              </TabsTrigger>
              <TabsTrigger 
                value="categories" 
                className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
              >
                <List className="w-4 h-4 mr-2" />
                Categories
              </TabsTrigger>
              <TabsTrigger 
                value="feed" 
                className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
              >
                <Globe className="w-4 h-4 mr-2" />
                Feed
              </TabsTrigger>
              <TabsTrigger 
                value="reels" 
                className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
              >
                <Video className="w-4 h-4 mr-2" />
                Reels
                <Badge className="ml-2 bg-accent text-accent-foreground text-xs">New</Badge>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="personalized" className="mt-0 p-0">
              <EnhancedPersonalizedFeed userId={user.id} />
            </TabsContent>

            <TabsContent value="home" className="mt-0 p-0">
              <EnhancedPersonalizedFeed userId={user.id} />
            </TabsContent>

            <TabsContent value="trending" className="mt-0 p-0">
              <div className="p-8 text-center">
                <TrendingUp className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-foreground mb-2">Trending News</h3>
                <p className="text-muted-foreground">Discover what's trending across all categories</p>
              </div>
            </TabsContent>

            <TabsContent value="bookmarks" className="mt-0 p-0">
              <div className="p-8 text-center">
                <Bookmark className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-foreground mb-2">Your Bookmarks</h3>
                <p className="text-muted-foreground">Access your saved articles here</p>
              </div>
            </TabsContent>

            <TabsContent value="categories" className="mt-0 p-0">
              <div className="p-8 text-center">
                <List className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-foreground mb-2">Browse Categories</h3>
                <p className="text-muted-foreground">Explore news by category</p>
              </div>
            </TabsContent>

            <TabsContent value="feed" className="mt-0 p-0">
              <div className="p-8 text-center">
                <Globe className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-foreground mb-2">Global Feed</h3>
                <p className="text-muted-foreground">Latest news from around the world</p>
              </div>
            </TabsContent>

            <TabsContent value="reels" className="mt-0 p-0">
              <div className="p-8 text-center">
                <Video className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-foreground mb-2">News Reels</h3>
                <p className="text-muted-foregreen">TikTok-style news experience - Coming Soon!</p>
                <Badge className="mt-2 bg-accent text-accent-foreground">New Feature</Badge>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}