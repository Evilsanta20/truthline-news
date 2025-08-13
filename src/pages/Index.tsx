import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Eye, PenTool, Shield, Newspaper } from 'lucide-react'

export default function Index() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center h-16">
            <div className="flex items-center space-x-4">
              <Newspaper className="w-8 h-8 text-blue-600" />
              <h1 className="text-2xl font-bold text-black">NewsDigest Platform</h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-black mb-4">Choose Your Portal</h2>
          <p className="text-xl text-gray-600">Access your dedicated workspace</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Viewer Portal */}
          <Card className="border-2 border-blue-200 hover:border-blue-400 transition-colors cursor-pointer"
                onClick={() => window.location.href = '/viewer'}>
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <Eye className="w-8 h-8 text-blue-600" />
              </div>
              <CardTitle className="text-xl text-black">Viewer Portal</CardTitle>
              <CardDescription className="text-gray-600">
                Personalized news feed with filters and bookmarks
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                Enter Viewer Portal
              </Button>
              <ul className="mt-4 text-sm text-gray-600 space-y-1">
                <li>• Browse articles by category</li>
                <li>• Bookmark favorite articles</li>
                <li>• Search and filter content</li>
              </ul>
            </CardContent>
          </Card>

          {/* Editor Portal */}
          <Card className="border-2 border-blue-200 hover:border-blue-400 transition-colors cursor-pointer"
                onClick={() => window.location.href = '/editor'}>
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <PenTool className="w-8 h-8 text-blue-600" />
              </div>
              <CardTitle className="text-xl text-black">Editor Portal</CardTitle>
              <CardDescription className="text-gray-600">
                Create, edit, and manage articles
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                Enter Editor Portal
              </Button>
              <ul className="mt-4 text-sm text-gray-600 space-y-1">
                <li>• Create new articles</li>
                <li>• Edit existing content</li>
                <li>• Manage your publications</li>
              </ul>
            </CardContent>
          </Card>

          {/* Admin Portal */}
          <Card className="border-2 border-red-200 hover:border-red-400 transition-colors cursor-pointer"
                onClick={() => window.location.href = '/admin'}>
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <Shield className="w-8 h-8 text-red-600" />
              </div>
              <CardTitle className="text-xl text-black">Admin Portal</CardTitle>
              <CardDescription className="text-gray-600">
                Platform management and content moderation
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button className="w-full bg-red-600 hover:bg-red-700 text-white">
                Enter Admin Portal
              </Button>
              <ul className="mt-4 text-sm text-gray-600 space-y-1">
                <li>• Manage all articles</li>
                <li>• View platform statistics</li>
                <li>• Content moderation tools</li>
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Features Section */}
        <div className="mt-16 text-center">
          <h3 className="text-2xl font-bold text-black mb-6">Platform Features</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-lg mx-auto mb-3 flex items-center justify-center">
                <Newspaper className="w-6 h-6 text-blue-600" />
              </div>
              <h4 className="font-semibold text-black">Real News Data</h4>
              <p className="text-sm text-gray-600">Live news from trusted sources</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-lg mx-auto mb-3 flex items-center justify-center">
                <Eye className="w-6 h-6 text-blue-600" />
              </div>
              <h4 className="font-semibold text-black">Personalized Feed</h4>
              <p className="text-sm text-gray-600">Customized content filtering</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-lg mx-auto mb-3 flex items-center justify-center">
                <PenTool className="w-6 h-6 text-blue-600" />
              </div>
              <h4 className="font-semibold text-black">Content Creation</h4>
              <p className="text-sm text-gray-600">Easy article management</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-red-100 rounded-lg mx-auto mb-3 flex items-center justify-center">
                <Shield className="w-6 h-6 text-red-600" />
              </div>
              <h4 className="font-semibold text-black">Admin Control</h4>
              <p className="text-sm text-gray-600">Complete platform oversight</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
