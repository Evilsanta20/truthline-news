import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Play, Sparkles, Home, TrendingUp, Bookmark, Globe, List, Video, RotateCcw, LogIn, User, LogOut } from 'lucide-react'
import { EnhancedPersonalizedFeed } from '@/components/news/EnhancedPersonalizedFeed'
import { ArticleReels } from '@/components/reels/ArticleReels'
import { MoodPage } from '@/pages/MoodPage'
import { useAuth } from '@/hooks/useAuth'
import { Link } from 'react-router-dom'
import { NewspaperMasthead } from '@/components/layout/NewspaperMasthead'

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
      <div className="min-h-screen bg-background">
        <NewspaperMasthead />
        <div className="max-w-4xl mx-auto px-4 py-16">
          <div className="text-center border-4 border-[hsl(var(--newspaper-divider))] p-12">
            <h1 className="font-headline font-black text-5xl mb-4 text-foreground">
              SUBSCRIBE TODAY
            </h1>
            <div className="newspaper-divider my-6"></div>
            <p className="font-body text-lg leading-relaxed mb-8 text-foreground/90">
              Get unlimited access to personalized news recommendations powered by 
              cutting-edge artificial intelligence. Track your reading habits and 
              discover content tailored exclusively for your interests.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 text-left">
              <div className="border-2 border-[hsl(var(--newspaper-border))] p-4">
                <h3 className="newspaper-headline text-lg mb-2">AI-POWERED</h3>
                <p className="newspaper-byline text-xs">Advanced algorithms curate your perfect news feed</p>
              </div>
              <div className="border-2 border-[hsl(var(--newspaper-border))] p-4">
                <h3 className="newspaper-headline text-lg mb-2">ANALYTICS</h3>
                <p className="newspaper-byline text-xs">Track reading habits with detailed insights</p>
              </div>
              <div className="border-2 border-[hsl(var(--newspaper-border))] p-4">
                <h3 className="newspaper-headline text-lg mb-2">BOOKMARKS</h3>
                <p className="newspaper-byline text-xs">Save and organize your favorite articles</p>
              </div>
            </div>
            <Link to="/auth">
              <Button className="btn-news text-sm px-8 py-6 rounded-none">
                <LogIn className="w-4 h-4 mr-2" />
                START YOUR SUBSCRIPTION
              </Button>
            </Link>
            <p className="newspaper-byline text-xs mt-6">
              NO CREDIT CARD REQUIRED • INSTANT ACCESS
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Newspaper Masthead */}
      <NewspaperMasthead />

      {/* Navigation Tabs - Newspaper Style */}
      <div className="border-b-4 border-[hsl(var(--newspaper-divider))] bg-background sticky top-14 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="flex items-center justify-between py-3 border-b-2 border-[hsl(var(--newspaper-border))]">
              <div className="newspaper-byline text-xs tracking-wider">
                SECTIONS
              </div>
              <div className="flex items-center gap-3">
                <div className="newspaper-byline text-xs">
                  SUBSCRIBER: {user.email?.split('@')[0].toUpperCase()}
                </div>
                <Button 
                  onClick={() => window.location.reload()}
                  variant="ghost" 
                  size="sm"
                  className="newspaper-byline text-xs hover:bg-muted rounded-none h-7 px-2"
                >
                  <RotateCcw className="w-3 h-3 mr-1" />
                  REFRESH
                </Button>
                <Button 
                  onClick={signOut}
                  variant="ghost" 
                  size="sm"
                  className="newspaper-byline text-xs hover:bg-muted rounded-none h-7 px-2"
                >
                  <LogOut className="w-3 h-3 mr-1" />
                  SIGN OUT
                </Button>
              </div>
            </div>
            <TabsList className="grid w-full grid-cols-8 h-10 bg-transparent border-0 rounded-none">
              <TabsTrigger 
                value="mood" 
                className="newspaper-byline text-xs data-[state=active]:bg-foreground data-[state=active]:text-background data-[state=active]:font-bold rounded-none border-r border-[hsl(var(--newspaper-border))]"
              >
                MOOD
              </TabsTrigger>
              <TabsTrigger 
                value="personalized" 
                className="newspaper-byline text-xs data-[state=active]:bg-foreground data-[state=active]:text-background data-[state=active]:font-bold rounded-none border-r border-[hsl(var(--newspaper-border))]"
              >
                PERSONALIZED
              </TabsTrigger>
              <TabsTrigger 
                value="home" 
                className="newspaper-byline text-xs data-[state=active]:bg-foreground data-[state=active]:text-background data-[state=active]:font-bold rounded-none border-r border-[hsl(var(--newspaper-border))]"
              >
                HOME
              </TabsTrigger>
              <TabsTrigger 
                value="trending" 
                className="newspaper-byline text-xs data-[state=active]:bg-foreground data-[state=active]:text-background data-[state=active]:font-bold rounded-none border-r border-[hsl(var(--newspaper-border))]"
              >
                TRENDING
              </TabsTrigger>
              <TabsTrigger 
                value="bookmarks" 
                className="newspaper-byline text-xs data-[state=active]:bg-foreground data-[state=active]:text-background data-[state=active]:font-bold rounded-none border-r border-[hsl(var(--newspaper-border))]"
              >
                BOOKMARKS
              </TabsTrigger>
              <TabsTrigger 
                value="categories" 
                className="newspaper-byline text-xs data-[state=active]:bg-foreground data-[state=active]:text-background data-[state=active]:font-bold rounded-none border-r border-[hsl(var(--newspaper-border))]"
              >
                CATEGORIES
              </TabsTrigger>
              <TabsTrigger 
                value="feed" 
                className="newspaper-byline text-xs data-[state=active]:bg-foreground data-[state=active]:text-background data-[state=active]:font-bold rounded-none border-r border-[hsl(var(--newspaper-border))]"
              >
                WORLD
              </TabsTrigger>
              <TabsTrigger 
                value="reels" 
                className="newspaper-byline text-xs data-[state=active]:bg-foreground data-[state=active]:text-background data-[state=active]:font-bold rounded-none"
              >
                MULTIMEDIA
              </TabsTrigger>
            </TabsList>

            <TabsContent value="mood" className="mt-0 p-0">
              <MoodPage userId={user.id} />
            </TabsContent>

            <TabsContent value="personalized" className="mt-0 p-0">
              <EnhancedPersonalizedFeed userId={user.id} />
            </TabsContent>

            <TabsContent value="home" className="mt-0 p-0">
              <EnhancedPersonalizedFeed userId={user.id} />
            </TabsContent>

            <TabsContent value="trending" className="mt-0 p-0">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center border-4 border-[hsl(var(--newspaper-divider))] m-8">
                <h3 className="newspaper-headline text-4xl mb-4">TRENDING NEWS</h3>
                <div className="newspaper-divider my-4"></div>
                <p className="newspaper-byline">MOST POPULAR STORIES FROM ALL SECTIONS</p>
              </div>
            </TabsContent>

            <TabsContent value="bookmarks" className="mt-0 p-0">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center border-4 border-[hsl(var(--newspaper-divider))] m-8">
                <h3 className="newspaper-headline text-4xl mb-4">YOUR SAVED ARTICLES</h3>
                <div className="newspaper-divider my-4"></div>
                <p className="newspaper-byline">ACCESS YOUR PERSONAL ARCHIVE</p>
              </div>
            </TabsContent>

            <TabsContent value="categories" className="mt-0 p-0">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center border-4 border-[hsl(var(--newspaper-divider))] m-8">
                <h3 className="newspaper-headline text-4xl mb-4">BROWSE BY SECTION</h3>
                <div className="newspaper-divider my-4"></div>
                <p className="newspaper-byline">EXPLORE ALL DEPARTMENTS</p>
              </div>
            </TabsContent>

            <TabsContent value="feed" className="mt-0 p-0">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center border-4 border-[hsl(var(--newspaper-divider))] m-8">
                <h3 className="newspaper-headline text-4xl mb-4">WORLD NEWS</h3>
                <div className="newspaper-divider my-4"></div>
                <p className="newspaper-byline">INTERNATIONAL COVERAGE FROM OUR CORRESPONDENTS</p>
              </div>
            </TabsContent>

            <TabsContent value="reels" className="mt-0 p-0">
              <ArticleReels />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}