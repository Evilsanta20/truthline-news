import { useState, useEffect } from 'react'
import EnhancedPersonalizedFeed from '@/components/news/EnhancedPersonalizedFeed'
import CategorizedNewsFeed from '@/components/news/CategorizedNewsFeed'
import MoodInput from '@/components/mood/MoodInput'
import MoodBasedFeed from '@/components/mood/MoodBasedFeed'
import BreakingNews from '@/components/news/BreakingNews'
import DailyDigest from '@/components/news/DailyDigest'
import { useMoodPersonalization } from '@/hooks/useMoodPersonalization'
import type { MoodData } from '@/components/mood/MoodInput'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Eye, 
  User, 
  Settings, 
  Home,
  TrendingUp,
  Bookmark,
  Globe,
  Search,
  Bell,
  Menu,
  X,
  Play,
  Grid3X3,
  List,
  Heart,
  Sparkles
} from 'lucide-react'
import { toast } from 'sonner'

type ViewMode = 'feed' | 'reels' | 'mood' | 'categories' | 'digest';

export default function ViewerPage() {
  const [userId, setUserId] = useState<string>('')
  const [activeSection, setActiveSection] = useState('home')
  const [viewMode, setViewMode] = useState<ViewMode>('feed')
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [showMoodInput, setShowMoodInput] = useState(false)

  const {
    currentMood,
    moodPresets,
    moodProfile,
    recommendations: moodRecommendations,
    loading: moodLoading,
    processMood,
    saveMoodPreset,
  } = useMoodPersonalization(userId)

  useEffect(() => {
    // Generate or get anonymous user ID
    let anonymousId = localStorage.getItem('anonymous_user_id')
    if (!anonymousId) {
      anonymousId = 'anonymous_' + Math.random().toString(36).substr(2, 9)
      localStorage.setItem('anonymous_user_id', anonymousId)
    }
    setUserId(anonymousId)
  }, [])

  const handleMoodSubmit = async (moodData: MoodData) => {
    const result = await processMood(moodData)
    
    if (result.success) {
      setShowMoodInput(false)
      setViewMode('mood')
      toast.success('Your mood has been processed! Here are your personalized recommendations.')
    } else {
      toast.error(`Failed to process mood: ${result.error}`)
    }
  }

  const handleSavePreset = async (name: string, moodData: MoodData) => {
    const result = await saveMoodPreset(name, moodData)
    
    if (result.success) {
      toast.success(`Mood preset "${name}" saved successfully!`)
    } else {
      toast.error(`Failed to save preset: ${result.error}`)
    }
  }

  // Capture viewMode early to avoid TypeScript narrowing issues
  const currentViewMode: ViewMode = viewMode;

  const navItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'trending', label: 'Trending', icon: TrendingUp },
    { id: 'digest', label: 'Daily Digest', icon: Sparkles },
    { id: 'bookmarks', label: 'Bookmarks', icon: Bookmark },
    { id: 'categories', label: 'Categories', icon: Globe },
  ]

  if (!userId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center scroll-animation">
          <User className="w-12 h-12 text-primary mx-auto animate-pulse" />
          <p className="text-foreground mt-2">Setting up your personalized experience...</p>
        </div>
      </div>
    )
  }

  // Render reels "Coming Soon" message
  if (viewMode === 'reels') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4 p-8">
          <Play className="w-24 h-24 text-primary mx-auto opacity-50" />
          <h2 className="text-4xl font-bold gradient-text">Coming Soon</h2>
          <p className="text-lg text-muted-foreground max-w-md">
            We're working on an amazing Reels experience. Stay tuned!
          </p>
          <Button
            onClick={() => setViewMode('feed')}
            variant="default"
            size="lg"
            className="mt-4"
          >
            <Home className="w-4 h-4 mr-2" />
            Back to Feed
          </Button>
        </div>
      </div>
    )
  }

  // Show mood input modal
  if (showMoodInput) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky-header">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center space-x-2">
                <Heart className="w-8 h-8 text-primary" />
                <h1 className="text-2xl font-bold gradient-text">Mood-Based News</h1>
              </div>
              <Button
                variant="ghost"
                onClick={() => setShowMoodInput(false)}
                className="hover-lift"
              >
                <X className="w-5 h-5 mr-2" />
                Cancel
              </Button>
            </div>
          </div>
        </header>
        <div className="max-w-4xl mx-auto p-6 space-y-6">
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center gap-2">
              <Sparkles className="w-8 h-8 text-primary" />
              <h2 className="text-3xl font-bold">How are you feeling?</h2>
            </div>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Tell us your current mood and get personalized news recommendations that match how you're feeling right now.
            </p>
          </div>
          <MoodInput
            onMoodSubmit={handleMoodSubmit}
            loading={moodLoading}
            showPresets={true}
            savedPresets={moodPresets}
            onSavePreset={handleSavePreset}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Enhanced Header */}
      <header className="sticky-header">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Eye className="w-8 h-8 text-primary" />
                <h1 className="text-2xl font-bold gradient-text">AI News Digest</h1>
              </div>
              <Badge variant="outline" className="hidden sm:inline-flex">
                <Globe className="w-3 h-3 mr-1" />
                Personalized
              </Badge>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center space-x-8">
              {navItems.map((item) => {
                const Icon = item.icon
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveSection(item.id)
                      if (item.id === 'digest') {
                        setViewMode('digest')
                      } else if (item.id === 'home') {
                        setViewMode('feed')
                      }
                    }}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-all duration-200 hover:bg-secondary ${
                      activeSection === item.id
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="font-medium">{item.label}</span>
                  </button>
                )
              })}
            </nav>

            {/* Right Side Actions */}
            <div className="flex items-center space-x-4">
              {/* Home Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setViewMode('feed')
                  setActiveSection('home')
                  window.scrollTo({ top: 0, behavior: 'smooth' })
                }}
                className="hover-lift hidden sm:flex"
              >
                <Home className="w-4 h-4 mr-1" />
                Home
              </Button>

              <Button variant="ghost" size="icon" className="relative hover-lift">
                <Search className="w-5 h-5" />
              </Button>
              <Button variant="ghost" size="icon" className="relative hover-lift">
                <Bell className="w-5 h-5" />
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-accent rounded-full"></span>
              </Button>
              
              {/* Portal Links */}
              <div className="hidden sm:flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.location.href = '/editor'}
                  className="hover-lift"
                >
                  Editor
                </Button>
                <Button
                  variant="outline" 
                  size="sm"
                  onClick={() => window.location.href = '/admin'}
                  className="hover-lift"
                >
                  Admin
                </Button>
              </div>

              {/* Mobile Menu Toggle */}
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              >
                {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </Button>
            </div>
          </div>

          {/* View Mode Toggle - Always Visible on All Screens */}
          <div className="border-t border-border bg-secondary/50">
            <div className="max-w-7xl mx-auto px-4">
              <div className="flex items-center justify-center gap-1 py-2">
                <Button
                  variant={currentViewMode === 'categories' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('categories')}
                  className="h-9 flex-1 sm:flex-none transition-all"
                >
                  <List className="w-4 h-4 sm:mr-1" />
                  <span className="hidden sm:inline">Categories</span>
                </Button>
                <Button
                  variant={currentViewMode === 'feed' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('feed')}
                  className="h-9 flex-1 sm:flex-none transition-all"
                >
                  <Grid3X3 className="w-4 h-4 sm:mr-1" />
                  <span className="hidden sm:inline">Feed</span>
                </Button>
                <Button
                  variant={currentViewMode === 'mood' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => {
                    if (currentMood) {
                      setViewMode('mood')
                    } else {
                      setShowMoodInput(true)
                    }
                  }}
                  className="h-9 flex-1 sm:flex-none transition-all relative"
                >
                  <Heart className="w-4 h-4 sm:mr-1" />
                  <span className="hidden sm:inline">Mood</span>
                  {currentMood && (
                    <Badge variant="secondary" className="ml-1 h-4 px-1 text-xs hidden sm:inline-flex">
                      Active
                    </Badge>
                  )}
                </Button>
                <Button
                  variant={currentViewMode === 'reels' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('reels')}
                  className="h-9 flex-1 sm:flex-none transition-all relative"
                >
                  <Play className="w-4 h-4 sm:mr-1" />
                  <span className="hidden sm:inline">Reels</span>
                  <Badge variant="secondary" className="ml-1 h-4 px-1 text-xs hidden sm:inline-flex">
                    Soon
                  </Badge>
                </Button>
              </div>
            </div>
          </div>

          {/* Mobile Navigation */}
          {isMobileMenuOpen && (
            <div className="lg:hidden border-t border-border bg-background/95 backdrop-blur-sm">
              <div className="px-4 py-4 space-y-2">
                {navItems.map((item) => {
                  const Icon = item.icon
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveSection(item.id)
                        setIsMobileMenuOpen(false)
                        if (item.id === 'digest') {
                          setViewMode('digest')
                        } else if (item.id === 'home') {
                          setViewMode('feed')
                        }
                      }}
                      className={`flex items-center space-x-3 w-full px-3 py-2 rounded-lg transition-all duration-200 ${
                        activeSection === item.id
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="font-medium">{item.label}</span>
                    </button>
                  )
                })}
                <div className="pt-4 border-t border-border">
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.location.href = '/editor'}
                      className="flex-1"
                    >
                      Editor Portal
                    </Button>
                    <Button
                      variant="outline"
                      size="sm" 
                      onClick={() => window.location.href = '/admin'}
                      className="flex-1"
                    >
                      Admin Portal
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Reels Feature Banner - Coming Soon */}
        {viewMode === 'feed' && (
          <div className="bg-gradient-to-r from-primary/10 via-accent/10 to-secondary/10 border-b border-border">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Play className="w-5 h-5 text-primary" />
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      🚀 Reels Experience Coming Soon!
                    </p>
                    <p className="text-xs text-muted-foreground">
                      We're building an amazing TikTok-style news experience
                    </p>
                  </div>
                </div>
                <Badge variant="secondary" className="text-xs">
                  Coming Soon
                </Badge>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Content Based on View Mode */}
      {viewMode === 'digest' ? (
        <div className="max-w-7xl mx-auto p-6">
          <DailyDigest userId={userId} />
        </div>
      ) : viewMode === 'categories' ? (
        <div>
          {/* Breaking News Banner at Top */}
          <div className="bg-background border-b border-border">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
              <BreakingNews />
            </div>
          </div>
          
          <CategorizedNewsFeed userId={userId} />
        </div>
      ) : viewMode === 'mood' && currentMood ? (
        <div className="max-w-7xl mx-auto p-6">
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Heart className="w-6 h-6 text-primary" />
              <div>
                <h2 className="text-2xl font-bold">Your Mood-Based Feed</h2>
                <p className="text-sm text-muted-foreground">
                  News personalized to match your current emotional state
                </p>
              </div>
            </div>
            <Button
              onClick={() => setShowMoodInput(true)}
              variant="outline"
              className="hover-lift"
            >
              <Heart className="w-4 h-4 mr-2" />
              Update Mood
            </Button>
          </div>
          
          {/* Breaking News Section */}
          <div className="mb-6">
            <BreakingNews />
          </div>

          <MoodBasedFeed
            userId={userId}
            moodProfile={moodProfile}
            initialMood={currentMood}
            initialRecommendations={moodRecommendations}
            className="w-full"
          />
        </div>
      ) : (
        <div>
          {/* Breaking News Banner at Top */}
          <div className="bg-background border-b border-border">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
              <BreakingNews />
            </div>
          </div>
          
          <EnhancedPersonalizedFeed userId={userId} />
        </div>
      )}
    </div>
  )
}