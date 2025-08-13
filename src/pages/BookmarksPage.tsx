import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { Navbar } from '@/components/layout/Navbar'
import { ArticleCard } from '@/components/news/ArticleCard'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { Bookmark, Trash2 } from 'lucide-react'
import { Navigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export default function BookmarksPage() {
  const { user, loading } = useAuth()
  const { toast } = useToast()
  const [bookmarkedArticles, setBookmarkedArticles] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Redirect if not authenticated
  if (!loading && !user) {
    return <Navigate to="/auth" replace />
  }

  useEffect(() => {
    if (user) {
      fetchBookmarkedArticles()
    }
  }, [user])

  const fetchBookmarkedArticles = async () => {
    try {
      setIsLoading(true)
      const { data, error } = await supabase
        .from('bookmarks')
        .select(`
          id,
          articles (
            id,
            title,
            excerpt,
            content,
            source_name,
            source_url,
            image_url,
            published_at,
            view_count,
            credibility_score,
            categories (
              id,
              name
            ),
            profiles (
              full_name
            )
          )
        `)
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })

      if (error) throw error

      setBookmarkedArticles(data || [])
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch bookmarked articles",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const removeBookmark = async (bookmarkId: string) => {
    try {
      const { error } = await supabase
        .from('bookmarks')
        .delete()
        .eq('id', bookmarkId)

      if (error) throw error

      toast({
        title: "Bookmark removed",
        description: "Article removed from bookmarks"
      })

      // Remove from local state
      setBookmarkedArticles(prev => prev.filter(b => b.id !== bookmarkId))
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to remove bookmark",
        variant: "destructive"
      })
    }
  }

  const clearAllBookmarks = async () => {
    if (!confirm('Are you sure you want to remove all bookmarks?')) return

    try {
      const { error } = await supabase
        .from('bookmarks')
        .delete()
        .eq('user_id', user?.id)

      if (error) throw error

      toast({
        title: "All bookmarks cleared",
        description: "All bookmarks have been removed"
      })

      setBookmarkedArticles([])
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to clear bookmarks",
        variant: "destructive"
      })
    }
  }

  if (loading || isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Bookmark className="w-12 h-12 text-primary mx-auto animate-pulse" />
            <p className="text-muted-foreground mt-2">Loading bookmarks...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <Bookmark className="w-8 h-8 text-primary" />
              Your Bookmarks
            </h1>
            <p className="text-muted-foreground mt-2">
              {bookmarkedArticles.length} article{bookmarkedArticles.length !== 1 ? 's' : ''} saved
            </p>
          </div>
          
          {bookmarkedArticles.length > 0 && (
            <Button
              variant="outline"
              onClick={clearAllBookmarks}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Clear All
            </Button>
          )}
        </div>

        {bookmarkedArticles.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Bookmark className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">No bookmarks yet</h3>
              <p className="text-muted-foreground mb-4">
                Bookmark articles you want to read later by clicking the bookmark icon on any article.
              </p>
              <Button variant="outline" onClick={() => window.location.href = '/'}>
                Browse Articles
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {bookmarkedArticles.map((bookmark) => {
              const article = bookmark.articles
              if (!article) return null

              return (
                <div key={bookmark.id} className="relative">
                  <ArticleCard
                    article={article}
                    variant="default"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute top-2 right-2 bg-background/80 backdrop-blur-sm hover:bg-background"
                    onClick={() => removeBookmark(bookmark.id)}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}