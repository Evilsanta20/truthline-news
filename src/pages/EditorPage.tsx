import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PenTool, Plus, Edit, Trash2, Eye } from 'lucide-react'

export default function EditorPage() {
  const { toast } = useToast()
  const [articles, setArticles] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [editingArticle, setEditingArticle] = useState<any>(null)
  
  const [articleForm, setArticleForm] = useState({
    title: '',
    content: '',
    description: '',
    category_id: '',
    source_name: 'Editor',
    image_url: '',
    url: ''
  })

  useEffect(() => {
    fetchArticles()
    fetchCategories()
  }, [])

  const fetchArticles = async () => {
    try {
      const { data, error } = await supabase
        .from('articles')
        .select(`
          *,
          categories(name)
        `)
        .eq('source_name', 'Editor')
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

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name')

      if (error) throw error
      setCategories(data || [])
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch categories",
        variant: "destructive"
      })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const articleData = {
        title: articleForm.title,
        content: articleForm.content,
        description: articleForm.description,
        category_id: articleForm.category_id,
        url: articleForm.url || `#article-${Date.now()}`,
        source_name: 'Editor',
        image_url: articleForm.image_url || null,
        is_featured: false,
        is_trending: false,
        is_editors_pick: true,
        view_count: 0,
        credibility_score: 9.0
      }

      let result
      if (editingArticle) {
        result = await supabase
          .from('articles')
          .update(articleData)
          .eq('id', editingArticle.id)
      } else {
        result = await supabase
          .from('articles')
          .insert([articleData])
      }

      if (result.error) throw result.error

      toast({
        title: "Success",
        description: editingArticle ? "Article updated successfully" : "Article created successfully"
      })

      // Reset form
      setArticleForm({
        title: '',
        content: '',
        description: '',
        category_id: '',
        source_name: 'Editor',
        image_url: '',
        url: ''
      })
      setEditingArticle(null)
      fetchArticles()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEdit = (article: any) => {
    setEditingArticle(article)
    setArticleForm({
      title: article.title,
      content: article.content,
      description: article.description || '',
      category_id: article.category_id,
      source_name: article.source_name,
      image_url: article.image_url || '',
      url: article.url || ''
    })
  }

  const handleDelete = async (articleId: string) => {
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
              <PenTool className="w-8 h-8 text-blue-600" />
              <h1 className="text-2xl font-bold text-black">Editor Portal</h1>
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
                onClick={() => window.location.href = '/admin'}
              >
                Admin Portal
              </Button>
            </div>
          </div>
        </div>
      </header>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <p className="text-gray-600 mt-2">Create and manage articles</p>
        </div>

        <Tabs defaultValue="create" className="space-y-6">
          <TabsList className="bg-gray-100">
            <TabsTrigger value="create" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              <Plus className="w-4 h-4 mr-2" />
              {editingArticle ? 'Edit Article' : 'Create Article'}
            </TabsTrigger>
            <TabsTrigger value="manage" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              <Eye className="w-4 h-4 mr-2" />
              My Articles ({articles.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="create">
            <Card className="border-gray-200">
              <CardHeader>
                <CardTitle className="text-black">{editingArticle ? 'Edit Article' : 'Create New Article'}</CardTitle>
                <CardDescription className="text-gray-600">
                  {editingArticle ? 'Update your article details' : 'Write a new article for the platform'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="title" className="text-black">Title</Label>
                    <Input
                      id="title"
                      value={articleForm.title}
                      onChange={(e) => setArticleForm({...articleForm, title: e.target.value})}
                      placeholder="Enter article title"
                      className="border-gray-300 text-black"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description" className="text-black">Description</Label>
                    <Textarea
                      id="description"
                      value={articleForm.description}
                      onChange={(e) => setArticleForm({...articleForm, description: e.target.value})}
                      placeholder="Brief description of the article"
                      className="border-gray-300 text-black"
                      rows={2}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="category" className="text-black">Category</Label>
                      <Select 
                        value={articleForm.category_id} 
                        onValueChange={(value) => setArticleForm({...articleForm, category_id: value})}
                      >
                        <SelectTrigger className="border-gray-300 text-black">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((category) => (
                            <SelectItem key={category.id} value={category.id}>
                              {category.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="url" className="text-black">Article URL</Label>
                      <Input
                        id="url"
                        value={articleForm.url}
                        onChange={(e) => setArticleForm({...articleForm, url: e.target.value})}
                        placeholder="https://example.com/article"
                        className="border-gray-300 text-black"
                        type="url"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="image_url" className="text-black">Image URL (optional)</Label>
                    <Input
                      id="image_url"
                      value={articleForm.image_url}
                      onChange={(e) => setArticleForm({...articleForm, image_url: e.target.value})}
                      placeholder="https://example.com/image.jpg"
                      className="border-gray-300 text-black"
                      type="url"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="content" className="text-black">Content</Label>
                    <Textarea
                      id="content"
                      value={articleForm.content}
                      onChange={(e) => setArticleForm({...articleForm, content: e.target.value})}
                      placeholder="Write your article content here..."
                      className="border-gray-300 text-black"
                      rows={12}
                      required
                    />
                  </div>

                  <div className="flex gap-4">
                    <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white" disabled={isSubmitting}>
                      {isSubmitting ? 'Saving...' : (editingArticle ? 'Update Article' : 'Publish Article')}
                    </Button>
                    {editingArticle && (
                      <Button 
                        type="button" 
                        variant="outline" 
                        className="border-gray-300 text-black hover:bg-gray-50"
                        onClick={() => {
                          setEditingArticle(null)
                          setArticleForm({
                            title: '',
                            content: '',
                            description: '',
                            category_id: '',
                            source_name: 'Editor',
                            image_url: '',
                            url: ''
                          })
                        }}
                      >
                        Cancel Edit
                      </Button>
                    )}
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="manage">
            <div className="space-y-4">
              {articles.length === 0 ? (
                <Card className="border-gray-200">
                  <CardContent className="text-center py-8">
                    <PenTool className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No articles yet. Create your first article!</p>
                  </CardContent>
                </Card>
              ) : (
                articles.map((article) => (
                  <Card key={article.id} className="border-gray-200">
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-black mb-2">{article.title}</h3>
                          <p className="text-gray-600 text-sm mb-3 line-clamp-2">{article.description}</p>
                          <div className="flex items-center gap-4 text-sm text-gray-500">
                            <Badge variant="outline" className="border-blue-600 text-blue-600">
                              {article.categories?.name}
                            </Badge>
                            <span>Views: {article.view_count || 0}</span>
                            <span>Published: {new Date(article.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <div className="flex gap-2 ml-4">
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-blue-600 text-blue-600 hover:bg-blue-50"
                            onClick={() => handleEdit(article)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(article.id)}
                            className="border-red-600 text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}