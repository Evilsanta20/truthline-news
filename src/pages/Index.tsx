import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Eye, PenTool, Shield, Newspaper } from 'lucide-react'

export default function Index() {
  return (
    <div className="min-h-screen bg-background">
      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-foreground mb-4">Choose Your Portal</h2>
          <p className="text-xl text-muted-foreground">Access your dedicated workspace</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Viewer Portal */}
          <Card className="news-card cursor-pointer"
                onClick={() => window.location.href = '/viewer'}>
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <Eye className="w-8 h-8 text-primary" />
              </div>
              <CardTitle className="text-xl text-card-foreground">Viewer Portal</CardTitle>
              <CardDescription>
                Personalized news feed with filters and bookmarks
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button className="w-full btn-news">
                Enter Viewer Portal
              </Button>
              <ul className="mt-4 text-sm text-muted-foreground space-y-1">
                <li>• Browse articles by category</li>
                <li>• Bookmark favorite articles</li>
                <li>• Search and filter content</li>
              </ul>
            </CardContent>
          </Card>

          {/* Editor Portal */}
          <Card className="news-card cursor-pointer"
                onClick={() => window.location.href = '/editor'}>
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <PenTool className="w-8 h-8 text-primary" />
              </div>
              <CardTitle className="text-xl text-card-foreground">Editor Portal</CardTitle>
              <CardDescription>
                Create, edit, and manage articles
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button className="w-full btn-news">
                Enter Editor Portal
              </Button>
              <ul className="mt-4 text-sm text-muted-foreground space-y-1">
                <li>• Create new articles</li>
                <li>• Edit existing content</li>
                <li>• Manage your publications</li>
              </ul>
            </CardContent>
          </Card>

          {/* Admin Portal */}
          <Card className="news-card cursor-pointer"
                onClick={() => window.location.href = '/admin'}>
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mb-4">
                <Shield className="w-8 h-8 text-accent" />
              </div>
              <CardTitle className="text-xl text-card-foreground">Admin Portal</CardTitle>
              <CardDescription>
                Platform management and content moderation
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button className="w-full btn-accent">
                Enter Admin Portal
              </Button>
              <ul className="mt-4 text-sm text-muted-foreground space-y-1">
                <li>• Manage all articles</li>
                <li>• View platform statistics</li>
                <li>• Content moderation tools</li>
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Features Section */}
        <div className="mt-16 text-center">
          <h3 className="text-2xl font-bold text-foreground mb-6">Platform Features</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-primary/10 rounded-lg mx-auto mb-3 flex items-center justify-center">
                <Newspaper className="w-6 h-6 text-primary" />
              </div>
              <h4 className="font-semibold text-card-foreground">Real News Data</h4>
              <p className="text-sm text-muted-foreground">Live news from trusted sources</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-primary/10 rounded-lg mx-auto mb-3 flex items-center justify-center">
                <Eye className="w-6 h-6 text-primary" />
              </div>
              <h4 className="font-semibold text-card-foreground">Personalized Feed</h4>
              <p className="text-sm text-muted-foreground">Customized content filtering</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-primary/10 rounded-lg mx-auto mb-3 flex items-center justify-center">
                <PenTool className="w-6 h-6 text-primary" />
              </div>
              <h4 className="font-semibold text-card-foreground">Content Creation</h4>
              <p className="text-sm text-muted-foreground">Easy article management</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-accent/10 rounded-lg mx-auto mb-3 flex items-center justify-center">
                <Shield className="w-6 h-6 text-accent" />
              </div>
              <h4 className="font-semibold text-card-foreground">Admin Control</h4>
              <p className="text-sm text-muted-foreground">Complete platform oversight</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
