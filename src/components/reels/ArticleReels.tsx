import { ReelFeed } from './Feed'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ArrowLeft, User } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ArticleReelsProps {
  onBackToFeed?: () => void
  className?: string
}

export const ArticleReels = ({ onBackToFeed, className }: ArticleReelsProps) => {
  const { user } = useAuth()

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
                <User className="w-8 h-8 text-muted-foreground" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">Sign In Required</h3>
                <p className="text-sm text-muted-foreground">
                  You need to sign in to access personalized article reels.
                </p>
              </div>
              <Button onClick={() => window.location.href = '/auth'} className="w-full">
                Sign In
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className={cn("min-h-screen bg-gradient-to-br from-background to-muted/10", className)}>
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              {onBackToFeed && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onBackToFeed}
                  className="hover:bg-muted"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Feed
                </Button>
              )}
              <div>
                <h1 className="text-xl font-semibold">Article Reels</h1>
                <p className="text-sm text-muted-foreground">
                  Discover news in an engaging, visual format
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <div className="text-sm text-muted-foreground">
                Welcome, {user.user_metadata?.full_name || user.email}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        <ReelFeed userId={user.id} />
      </div>
    </div>
  )
}