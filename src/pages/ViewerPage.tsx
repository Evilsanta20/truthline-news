import { useState, useEffect } from 'react'
import PersonalizedFeed from '@/components/news/PersonalizedFeed'
import { Button } from '@/components/ui/button'
import { Eye, User, Settings } from 'lucide-react'

export default function ViewerPage() {
  const [userId, setUserId] = useState<string>('')

  useEffect(() => {
    // Generate or get anonymous user ID
    let anonymousId = localStorage.getItem('anonymous_user_id')
    if (!anonymousId) {
      anonymousId = 'anonymous_' + Math.random().toString(36).substr(2, 9)
      localStorage.setItem('anonymous_user_id', anonymousId)
    }
    setUserId(anonymousId)
  }, [])

  if (!userId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <User className="w-12 h-12 text-primary mx-auto animate-pulse" />
          <p className="text-foreground mt-2">Setting up your personalized experience...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-background sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Eye className="w-8 h-8 text-primary" />
              <h1 className="text-2xl font-bold text-foreground">AI News Digest</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                onClick={() => window.location.href = '/editor'}
              >
                Editor Portal
              </Button>
              <Button
                variant="outline"
                onClick={() => window.location.href = '/admin'}
              >
                Admin Portal
              </Button>
              <Button variant="ghost" size="sm">
                <Settings className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Personalized Feed */}
      <PersonalizedFeed userId={userId} />
    </div>
  )
}