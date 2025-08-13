import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { Navbar } from '@/components/layout/Navbar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { PenTool, Eye, Edit, Trash2, Plus } from 'lucide-react'
import { Navigate } from 'react-router-dom'

export default function EditorDashboard() {
  const { user, profile, hasRole, loading } = useAuth()
  const { toast } = useToast()
  const [articles, setArticles] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [editingArticle, setEditingArticle] = useState<any>(null)
  
  const [articleForm, setArticleForm] = useState({
    title: '',
    content: '',
    excerpt: '',
    category_id: '',
    source_name: 'Editor',
    image_url: ''
  })

  // Redirect if not editor/admin
  if (!loading && (!user || !hasRole('editor'))) {
    return <Navigate to="/auth" replace />
  }

  useEffect(() => {
    if (user && hasRole('editor')) {
      fetchArticles()
      fetchCategories()
    }
  }, [user, profile])

  const fetchArticles = async () => {
    try {
      const { data, error } = await supabase
        .from('articles')
        .select(`
          *,
          categories(name),
          profiles(full_name)
        `)
        .eq('author', user?.id)
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
        description: articleForm.excerpt,
        category_id: articleForm.category_id,
        url: `#article-${Date.now()}`, // Generate URL
        author: user?.id,
        source_name: articleForm.source_name,
        image_url: articleForm.image_url || null,
        is_featured: false,
        is_trending: false,
        is_editors_pick: true,
        view_count: 0,
        credibility_score: 8.5
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
        excerpt: '',
        category_id: '',
        source_name: 'Editor',
        image_url: ''
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
      excerpt: article.excerpt || '',
      category_id: article.category_id,
      source_name: article.source_name,
      image_url: article.image_url || ''
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

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <PenTool className="w-12 h-12 text-primary mx-auto animate-pulse" />
            <p className="text-muted-foreground mt-2">Loading editor dashboard...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <PenTool className="w-8 h-8 text-primary" />
            Editor Dashboard
          </h1>
          <p className="text-muted-foreground mt-2">Create and manage your articles</p>
        </div>

        <Tabs defaultValue="create" className="space-y-6">
          <TabsList>
            <TabsTrigger value="create">
              <Plus className="w-4 h-4 mr-2" />
              {editingArticle ? 'Edit Article' : 'Create Article'}
            </TabsTrigger>
            <TabsTrigger value="manage">
              <Eye className="w-4 h-4 mr-2" />
              My Articles ({articles.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="create">
            <Card>
              <CardHeader>
                <CardTitle>{editingArticle ? 'Edit Article' : 'Create New Article'}</CardTitle>
                <CardDescription>
                  {editingArticle ? 'Update your article details' : 'Write a new article for the platform'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Title</Label>
                    <Input
                      id="title"
                      value={articleForm.title}
                      onChange={(e) => setArticleForm({...articleForm, title: e.target.value})}
                      placeholder="Enter article title"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="excerpt">Excerpt</Label>
                    <Textarea
                      id="excerpt"
                      value={articleForm.excerpt}
                      onChange={(e) => setArticleForm({...articleForm, excerpt: e.target.value})}
                      placeholder="Brief description of the article"
                      rows={2}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <Select 
                      value={articleForm.category_id} 
                      onValueChange={(value) => setArticleForm({...articleForm, category_id: value})}
                    >
                      <SelectTrigger>
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
                    <Label htmlFor="image_url">Image URL (optional)</Label>
                    <Input
                      id="image_url"
                      value={articleForm.image_url}
                      onChange={(e) => setArticleForm({...articleForm, image_url: e.target.value})}
                      placeholder="https://example.com/image.jpg"
                      type="url"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="content">Content</Label>
                    <Textarea
                      id="content"
                      value={articleForm.content}
                      onChange={(e) => setArticleForm({...articleForm, content: e.target.value})}
                      placeholder="Write your article content here..."
                      rows={12}
                      required
                    />
                  </div>

                  <div className="flex gap-4">
                    <Button type="submit" className="btn-news" disabled={isSubmitting}>
                      {isSubmitting ? 'Saving...' : (editingArticle ? 'Update Article' : 'Publish Article')}
                    </Button>
                    {editingArticle && (
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => {
                          setEditingArticle(null)
                          setArticleForm({
                            title: '',
                            content: '',
                            excerpt: '',
                            category_id: '',
                            source_name: 'Editor',
                            image_url: ''
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
                <Card>
                  <CardContent className="text-center py-8">
                    <PenTool className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No articles yet. Create your first article!</p>
                  </CardContent>
                </Card>
              ) : (
                articles.map((article) => (
                  <Card key={article.id}>
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-foreground mb-2">{article.title}</h3>
                          <p className="text-muted-foreground text-sm mb-3 line-clamp-2">{article.excerpt}</p>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <Badge variant="outline">{article.categories?.name}</Badge>
                            <span>Views: {article.view_count || 0}</span>
                            <span>Published: {new Date(article.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <div className="flex gap-2 ml-4">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(article)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(article.id)}
                            className="text-destructive hover:text-destructive"
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