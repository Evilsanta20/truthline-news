import { useState, useEffect } from 'react'
import EnhancedPersonalizedFeed from '@/components/news/EnhancedPersonalizedFeed'
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
  X
} from 'lucide-react'

export default function ViewerPage() {
  const [userId, setUserId] = useState<string>('')
  const [activeSection, setActiveSection] = useState('home')
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  useEffect(() => {
    // Generate or get anonymous user ID
    let anonymousId = localStorage.getItem('anonymous_user_id')
    if (!anonymousId) {
      anonymousId = 'anonymous_' + Math.random().toString(36).substr(2, 9)
      localStorage.setItem('anonymous_user_id', anonymousId)
    }
    setUserId(anonymousId)
  }, [])

  const navItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'trending', label: 'Trending', icon: TrendingUp },
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
                    onClick={() => setActiveSection(item.id)}
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
      </header>

      {/* Enhanced Personalized Feed */}
      <EnhancedPersonalizedFeed userId={userId} />
    </div>
  )
}