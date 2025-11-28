import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Shield, Users, FileText, Eye, Trash2, CheckCircle, XCircle, TrendingUp, Star, Tag } from 'lucide-react'
import { CategoryManagement } from '@/components/admin/CategoryManagement'

export default function AdminPage() {
  const { toast } = useToast()
  const [articles, setArticles] = useState<any[]>([])
  const [stats, setStats] = useState({
    totalArticles: 0,
    featuredArticles: 0,
    trendingArticles: 0,
    editorsPickArticles: 0,
    totalViews: 0
  })

  useEffect(() => {
    fetchArticles()
    fetchStats()
  }, [])

  const fetchArticles = async () => {
    try {
      const { data, error } = await supabase
        .from('articles')
        .select(`
          *,
          categories(name)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      setArticles(data || [])
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch articles",
        variant: "destructive"
      })
    }
  }

  const fetchStats = async () => {
    try {
      const [articlesRes, featuredRes, trendingRes, editorsPickRes] = await Promise.all([
        supabase.from('articles').select('view_count', { count: 'exact' }),
        supabase.from('articles').select('id', { count: 'exact' }).eq('is_featured', true),
        supabase.from('articles').select('id', { count: 'exact' }).eq('is_trending', true),
        supabase.from('articles').select('id', { count: 'exact' }).eq('is_editors_pick', true)
      ])

      const totalViews = articlesRes.data?.reduce((sum, article) => sum + (article.view_count || 0), 0) || 0

      setStats({
        totalArticles: articlesRes.count || 0,
        featuredArticles: featuredRes.count || 0,
        trendingArticles: trendingRes.count || 0,
        editorsPickArticles: editorsPickRes.count || 0,
        totalViews
      })
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch statistics",
        variant: "destructive"
      })
    }
  }

  const toggleArticleFeature = async (articleId: string, field: 'is_featured' | 'is_trending' | 'is_editors_pick', currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('articles')
        .update({ [field]: !currentStatus })
        .eq('id', articleId)

      if (error) throw error

      const fieldNames = {
        is_featured: 'featured',
        is_trending: 'trending',
        is_editors_pick: "editor's pick"
      }

      toast({
        title: "Success",
        description: `Article ${!currentStatus ? 'marked as' : 'removed from'} ${fieldNames[field]}`
      })
      
      fetchArticles()
      fetchStats()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      })
    }
  }

  const deleteArticle = async (articleId: string) => {
    if (!confirm('Are you sure you want to delete this article?')) return

    try {
      const { error } = await supabase
        .from('articles')
        .delete()
        .eq('id', articleId)

      if (error) throw error

      toast({
        title: "Success",
        description: "Article deleted successfully"
      })
      fetchArticles()
      fetchStats()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      })
    }
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Shield className="w-8 h-8 text-blue-600" />
              <h1 className="text-2xl font-bold text-black">Admin Portal</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                className="text-black border-gray-300 hover:bg-gray-50"
                onClick={() => window.location.href = '/viewer'}
              >
                Viewer Portal
              </Button>
              <Button
                variant="outline"
                className="text-black border-gray-300 hover:bg-gray-50"
                onClick={() => window.location.href = '/editor'}
              >
                Editor Portal
              </Button>
            </div>
          </div>
        </div>
      </header>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <p className="text-gray-600 mt-2">Manage content and platform settings</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
          <Card className="border-gray-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Articles</p>
                  <p className="text-2xl font-bold text-black">{stats.totalArticles}</p>
                </div>
                <FileText className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-gray-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Featured</p>
                  <p className="text-2xl font-bold text-black">{stats.featuredArticles}</p>
                </div>
                <Star className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-gray-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Trending</p>
                  <p className="text-2xl font-bold text-black">{stats.trendingArticles}</p>
                </div>
                <TrendingUp className="w-8 h-8 text-red-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-gray-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Editor's Pick</p>
                  <p className="text-2xl font-bold text-black">{stats.editorsPickArticles}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-red-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-gray-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Views</p>
                  <p className="text-2xl font-bold text-black">{stats.totalViews.toLocaleString()}</p>
                </div>
                <Eye className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="articles" className="space-y-6">
          <TabsList className="bg-gray-100">
            <TabsTrigger value="articles" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              <FileText className="w-4 h-4 mr-2" />
              Article Management
            </TabsTrigger>
            <TabsTrigger value="categories" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              <Tag className="w-4 h-4 mr-2" />
              Categories
            </TabsTrigger>
          </TabsList>

          <TabsContent value="articles">
            <Card className="border-gray-200">
              <CardHeader>
                <CardTitle className="text-black">Article Management</CardTitle>
                <CardDescription className="text-gray-600">
                  Review and manage all articles on the platform
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-black">Title</TableHead>
                        <TableHead className="text-black">Source</TableHead>
                        <TableHead className="text-black">Category</TableHead>
                        <TableHead className="text-black">Status</TableHead>
                        <TableHead className="text-black">Views</TableHead>
                        <TableHead className="text-black">Created</TableHead>
                        <TableHead className="text-black">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {articles.map((article) => (
                        <TableRow key={article.id}>
                          <TableCell className="font-medium text-black max-w-xs">
                            <div className="truncate" title={article.title}>
                              {article.title}
                            </div>
                          </TableCell>
                          <TableCell className="text-black">{article.source_name || 'Unknown'}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="border-blue-600 text-blue-600">
                              {article.categories?.name}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {article.is_featured && (
                                <Badge className="bg-blue-600 text-white text-xs">Featured</Badge>
                              )}
                              {article.is_trending && (
                                <Badge className="bg-red-600 text-white text-xs">Trending</Badge>
                              )}
                              {article.is_editors_pick && (
                                <Badge className="bg-red-600 text-white text-xs">Editor's Pick</Badge>
                              )}
                              {!article.is_featured && !article.is_trending && !article.is_editors_pick && (
                                <Badge variant="outline" className="text-xs">Regular</Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-black">{article.view_count || 0}</TableCell>
                          <TableCell className="text-black">{new Date(article.created_at).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => toggleArticleFeature(article.id, 'is_featured', article.is_featured)}
                                className={article.is_featured ? 'border-blue-600 bg-blue-50 text-blue-600' : 'border-gray-300 text-gray-600'}
                                title="Toggle Featured"
                              >
                                <Star className="w-3 h-3" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => toggleArticleFeature(article.id, 'is_trending', article.is_trending)}
                                className={article.is_trending ? 'border-red-600 bg-red-50 text-red-600' : 'border-gray-300 text-gray-600'}
                                title="Toggle Trending"
                              >
                                <TrendingUp className="w-3 h-3" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => toggleArticleFeature(article.id, 'is_editors_pick', article.is_editors_pick)}
                                className={article.is_editors_pick ? 'border-red-600 bg-red-50 text-red-600' : 'border-gray-300 text-gray-600'}
                                title="Toggle Editor's Pick"
                              >
                                <CheckCircle className="w-3 h-3" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => deleteArticle(article.id)}
                                className="border-red-600 text-red-600 hover:bg-red-50"
                                title="Delete Article"
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="categories">
            <CategoryManagement />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}