import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Eye, Bookmark, BookmarkCheck, Filter, Search, Heart } from 'lucide-react'

export default function ViewerPage() {
  const { toast } = useToast()
  const [articles, setArticles] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [bookmarks, setBookmarks] = useState<Set<string>>(new Set())
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchArticles()
    fetchCategories()
    loadBookmarks()
  }, [])

  const fetchArticles = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('articles')
        .select(`
          *,
          categories(name)
        `)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) throw error
      setArticles(data || [])
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch articles",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name')

      if (error) throw error
      setCategories(data || [])
    } catch (error: any) {
      console.error('Error fetching categories:', error)
    }
  }

  const loadBookmarks = () => {
    const saved = localStorage.getItem('viewerBookmarks')
    if (saved) {
      setBookmarks(new Set(JSON.parse(saved)))
    }
  }

  const toggleBookmark = (articleId: string) => {
    const newBookmarks = new Set(bookmarks)
    if (newBookmarks.has(articleId)) {
      newBookmarks.delete(articleId)
      toast({
        title: "Bookmark removed",
        description: "Article removed from bookmarks"
      })
    } else {
      newBookmarks.add(articleId)
      toast({
        title: "Bookmark added",
        description: "Article saved to bookmarks"
      })
    }
    setBookmarks(newBookmarks)
    localStorage.setItem('viewerBookmarks', JSON.stringify([...newBookmarks]))
  }

  const incrementViewCount = async (articleId: string) => {
    try {
      const { data: article } = await supabase.from('articles').select('view_count').eq('id', articleId).single()
      if (article) {
        await supabase.from('articles').update({ view_count: (article.view_count || 0) + 1 }).eq('id', articleId)
      }
    } catch (error) {
      console.error('Error incrementing view count:', error)
    }
  }

  const filteredArticles = articles.filter(article => {
    const matchesCategory = selectedCategory === 'all' || article.category_id === selectedCategory
    const matchesSearch = searchQuery === '' || 
      article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.description?.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  const bookmarkedArticles = articles.filter(article => bookmarks.has(article.id))

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Eye className="w-12 h-12 text-blue-600 mx-auto animate-pulse" />
            <p className="text-black mt-2">Loading articles...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Eye className="w-8 h-8 text-blue-600" />
              <h1 className="text-2xl font-bold text-black">NewsViewer</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                className="text-black border-gray-300 hover:bg-gray-50"
                onClick={() => window.location.href = '/editor'}
              >
                Editor Portal
              </Button>
              <Button
                variant="outline"
                className="text-black border-gray-300 hover:bg-gray-50"
                onClick={() => window.location.href = '/admin'}
              >
                Admin Portal
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <div className="mb-8 space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search articles..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 border-gray-300 text-black"
                />
              </div>
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-full sm:w-48 border-gray-300 text-black">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <span>{filteredArticles.length} articles</span>
            <span>•</span>
            <span>{bookmarkedArticles.length} bookmarked</span>
          </div>
        </div>

        {/* Bookmarks Section */}
        {bookmarkedArticles.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-bold text-black mb-4 flex items-center gap-2">
              <Heart className="w-5 h-5 text-red-600" />
              Your Bookmarks
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {bookmarkedArticles.slice(0, 3).map((article) => (
                <Card key={`bookmark-${article.id}`} className="border-red-200 bg-red-50">
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-black mb-2 line-clamp-2">{article.title}</h3>
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">{article.description}</p>
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="text-xs border-red-600 text-red-600">
                        {article.categories?.name}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleBookmark(article.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <BookmarkCheck className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Articles Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredArticles.map((article) => (
            <Card key={article.id} className="border-gray-200 hover:shadow-lg transition-shadow">
              <CardContent className="p-0">
                {article.image_url && (
                  <img
                    src={article.image_url}
                    alt={article.title}
                    className="w-full h-48 object-cover rounded-t-lg"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none'
                    }}
                  />
                )}
                <div className="p-4">
                  <h3 className="font-semibold text-black mb-2 line-clamp-2">{article.title}</h3>
                  <p className="text-sm text-gray-600 mb-3 line-clamp-3">{article.description}</p>
                  
                  <div className="flex items-center justify-between mb-3">
                    <Badge variant="outline" className="text-xs border-blue-600 text-blue-600">
                      {article.categories?.name}
                    </Badge>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Eye className="w-3 h-3" />
                      <span>{article.view_count || 0}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-blue-600 text-blue-600 hover:bg-blue-50"
                      onClick={() => {
                        incrementViewCount(article.id)
                        if (article.url) {
                          window.open(article.url, '_blank')
                        }
                      }}
                    >
                      Read More
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleBookmark(article.id)}
                      className={bookmarks.has(article.id) ? 'text-red-600' : 'text-gray-400'}
                    >
                      {bookmarks.has(article.id) ? (
                        <BookmarkCheck className="w-4 h-4" />
                      ) : (
                        <Bookmark className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredArticles.length === 0 && (
          <Card className="border-gray-200">
            <CardContent className="text-center py-12">
              <Eye className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-black mb-2">No articles found</h3>
              <p className="text-gray-600">Try adjusting your search or filter criteria.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}