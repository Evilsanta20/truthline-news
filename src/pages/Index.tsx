import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { RotateCcw, LogOut } from 'lucide-react'
import { EnhancedPersonalizedFeed } from '@/components/news/EnhancedPersonalizedFeed'
import { ArticleReels } from '@/components/reels/ArticleReels'
import { CategoryFeed } from '@/components/news/CategoryFeed'
import { useAuth } from '@/hooks/useAuth'
import { NewspaperMasthead } from '@/components/layout/NewspaperMasthead'
import LandingPage from '@/pages/LandingPage'

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

  // Show landing page if not logged in
  if (!user) {
    return <LandingPage />
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
            <TabsList className="grid w-full grid-cols-10 h-10 bg-transparent border-0 rounded-none">
              <TabsTrigger 
                value="home" 
                className="newspaper-byline text-xs data-[state=active]:bg-foreground data-[state=active]:text-background data-[state=active]:font-bold rounded-none border-r border-[hsl(var(--newspaper-border))]"
              >
                HOME
              </TabsTrigger>
              <TabsTrigger 
                value="politics" 
                className="newspaper-byline text-xs data-[state=active]:bg-foreground data-[state=active]:text-background data-[state=active]:font-bold rounded-none border-r border-[hsl(var(--newspaper-border))]"
              >
                POLITICS
              </TabsTrigger>
              <TabsTrigger 
                value="technology" 
                className="newspaper-byline text-xs data-[state=active]:bg-foreground data-[state=active]:text-background data-[state=active]:font-bold rounded-none border-r border-[hsl(var(--newspaper-border))]"
              >
                TECH
              </TabsTrigger>
              <TabsTrigger 
                value="business" 
                className="newspaper-byline text-xs data-[state=active]:bg-foreground data-[state=active]:text-background data-[state=active]:font-bold rounded-none border-r border-[hsl(var(--newspaper-border))]"
              >
                BUSINESS
              </TabsTrigger>
              <TabsTrigger 
                value="sports" 
                className="newspaper-byline text-xs data-[state=active]:bg-foreground data-[state=active]:text-background data-[state=active]:font-bold rounded-none border-r border-[hsl(var(--newspaper-border))]"
              >
                SPORTS
              </TabsTrigger>
              <TabsTrigger 
                value="entertainment" 
                className="newspaper-byline text-xs data-[state=active]:bg-foreground data-[state=active]:text-background data-[state=active]:font-bold rounded-none border-r border-[hsl(var(--newspaper-border))]"
              >
                ENTERTAINMENT
              </TabsTrigger>
              <TabsTrigger 
                value="health" 
                className="newspaper-byline text-xs data-[state=active]:bg-foreground data-[state=active]:text-background data-[state=active]:font-bold rounded-none border-r border-[hsl(var(--newspaper-border))]"
              >
                HEALTH
              </TabsTrigger>
              <TabsTrigger 
                value="science" 
                className="newspaper-byline text-xs data-[state=active]:bg-foreground data-[state=active]:text-background data-[state=active]:font-bold rounded-none border-r border-[hsl(var(--newspaper-border))]"
              >
                SCIENCE
              </TabsTrigger>
              <TabsTrigger 
                value="world" 
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

            <TabsContent value="home" className="mt-0 p-0">
              <EnhancedPersonalizedFeed userId={user.id} />
            </TabsContent>

            <TabsContent value="politics" className="mt-0 p-0">
              <CategoryFeed userId={user.id} categorySlug="politics" categoryName="Politics" />
            </TabsContent>

            <TabsContent value="technology" className="mt-0 p-0">
              <CategoryFeed userId={user.id} categorySlug="technology" categoryName="Technology" />
            </TabsContent>

            <TabsContent value="business" className="mt-0 p-0">
              <CategoryFeed userId={user.id} categorySlug="business" categoryName="Business" />
            </TabsContent>

            <TabsContent value="sports" className="mt-0 p-0">
              <CategoryFeed userId={user.id} categorySlug="sports" categoryName="Sports" />
            </TabsContent>

            <TabsContent value="entertainment" className="mt-0 p-0">
              <CategoryFeed userId={user.id} categorySlug="entertainment" categoryName="Entertainment" />
            </TabsContent>

            <TabsContent value="health" className="mt-0 p-0">
              <CategoryFeed userId={user.id} categorySlug="health" categoryName="Health" />
            </TabsContent>

            <TabsContent value="science" className="mt-0 p-0">
              <CategoryFeed userId={user.id} categorySlug="science" categoryName="Science" />
            </TabsContent>

            <TabsContent value="world" className="mt-0 p-0">
              <CategoryFeed userId={user.id} categorySlug="world" categoryName="World" />
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