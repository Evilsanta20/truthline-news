import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import { Loader2 } from 'lucide-react'

interface Category {
  id: string
  name: string
  slug: string
}

interface ArticleEditorProps {
  article?: any
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function ArticleEditor({ article, open, onOpenChange, onSuccess }: ArticleEditorProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    content: '',
    url: '',
    url_to_image: '',
    source_name: '',
    author: '',
    category_id: '',
    is_featured: false,
    is_trending: false,
    is_editors_pick: false
  })

  useEffect(() => {
    fetchCategories()
  }, [])

  useEffect(() => {
    if (article) {
      setFormData({
        title: article.title || '',
        description: article.description || '',
        content: article.content || '',
        url: article.url || '',
        url_to_image: article.url_to_image || '',
        source_name: article.source_name || '',
        author: article.author || '',
        category_id: article.category_id || '',
        is_featured: article.is_featured || false,
        is_trending: article.is_trending || false,
        is_editors_pick: article.is_editors_pick || false
      })
    } else {
      setFormData({
        title: '',
        description: '',
        content: '',
        url: '',
        url_to_image: '',
        source_name: '',
        author: '',
        category_id: '',
        is_featured: false,
        is_trending: false,
        is_editors_pick: false
      })
    }
  }, [article])

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('id, name, slug')
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
    setLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      const articleData = {
        ...formData,
        created_by: article ? article.created_by : user?.id,
        published_at: article ? article.published_at : new Date().toISOString()
      }

      let error
      if (article) {
        // Update existing article
        const result = await supabase
          .from('articles')
          .update(articleData)
          .eq('id', article.id)
        error = result.error
      } else {
        // Create new article
        const result = await supabase
          .from('articles')
          .insert([articleData])
        error = result.error
      }

      if (error) throw error

      toast({
        title: "Success",
        description: article ? "Article updated successfully" : "Article created successfully"
      })
      
      onSuccess()
      onOpenChange(false)
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{article ? 'Edit Article' : 'Create New Article'}</DialogTitle>
          <DialogDescription>
            {article ? 'Update article details and settings' : 'Add a new article to the platform'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
                placeholder="Enter article title"
              />
            </div>

            <div className="col-span-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of the article"
                rows={3}
              />
            </div>

            <div className="col-span-2">
              <Label htmlFor="content">Content</Label>
              <Textarea
                id="content"
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="Full article content"
                rows={8}
              />
            </div>

            <div className="col-span-2">
              <Label htmlFor="url">Article URL *</Label>
              <Input
                id="url"
                type="url"
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                required
                placeholder="https://example.com/article"
              />
            </div>

            <div className="col-span-2">
              <Label htmlFor="url_to_image">Image URL</Label>
              <Input
                id="url_to_image"
                type="url"
                value={formData.url_to_image}
                onChange={(e) => setFormData({ ...formData, url_to_image: e.target.value })}
                placeholder="https://example.com/image.jpg"
              />
            </div>

            <div>
              <Label htmlFor="source_name">Source Name</Label>
              <Input
                id="source_name"
                value={formData.source_name}
                onChange={(e) => setFormData({ ...formData, source_name: e.target.value })}
                placeholder="e.g., BBC News"
              />
            </div>

            <div>
              <Label htmlFor="author">Author</Label>
              <Input
                id="author"
                value={formData.author}
                onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                placeholder="Author name"
              />
            </div>

            <div className="col-span-2">
              <Label htmlFor="category">Category</Label>
              <Select
                value={formData.category_id}
                onValueChange={(value) => setFormData({ ...formData, category_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
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

            <div className="col-span-2 space-y-4 pt-4 border-t">
              <div className="flex items-center justify-between">
                <Label htmlFor="is_featured">Featured Article</Label>
                <Switch
                  id="is_featured"
                  checked={formData.is_featured}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_featured: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="is_trending">Trending Article</Label>
                <Switch
                  id="is_trending"
                  checked={formData.is_trending}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_trending: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="is_editors_pick">Editor's Pick</Label>
                <Switch
                  id="is_editors_pick"
                  checked={formData.is_editors_pick}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_editors_pick: checked })}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {article ? 'Update Article' : 'Create Article'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
