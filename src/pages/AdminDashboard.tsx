import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { Navbar } from '@/components/layout/Navbar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { Shield, Users, FileText, Eye, Edit, Trash2, CheckCircle, XCircle } from 'lucide-react'
import { Navigate } from 'react-router-dom'

export default function AdminDashboard() {
  const { user, loading, hasRole, profile } = useAuth()
  const { toast } = useToast()
  const [users, setUsers] = useState<any[]>([])
  const [articles, setArticles] = useState<any[]>([])
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalArticles: 0,
    publishedArticles: 0,
    pendingArticles: 0
  })

  // Redirect if not admin
  if (!loading && (!user || !hasRole('admin'))) {
    return <Navigate to="/auth" replace />
  }

  useEffect(() => {
    if (user && hasRole('admin')) {
      fetchUsers()
      fetchArticles()
      fetchStats()
    }
  }, [user, profile])

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setUsers(data || [])
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch users",
        variant: "destructive"
      })
    }
  }

  const fetchArticles = async () => {
    try {
      const { data, error } = await supabase
        .from('articles')
        .select(`
          *,
          categories(name),
          profiles(full_name)
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
      const [usersRes, articlesRes, publishedRes] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact' }),
        supabase.from('articles').select('id', { count: 'exact' }),
        supabase.from('articles').select('id', { count: 'exact' }).eq('is_featured', true)
      ])

      setStats({
        totalUsers: usersRes.count || 0,
        totalArticles: articlesRes.count || 0,
        publishedArticles: publishedRes.count || 0,
        pendingArticles: (articlesRes.count || 0) - (publishedRes.count || 0)
      })
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch statistics",
        variant: "destructive"
      })
    }
  }

  const updateUserRole = async (userId: string, newRole: 'viewer' | 'editor' | 'admin') => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('user_id', userId)

      if (error) throw error

      toast({
        title: "Success",
        description: "User role updated successfully"
      })
      fetchUsers()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      })
    }
  }

  const toggleArticleStatus = async (articleId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('articles')
        .update({ is_featured: !currentStatus })
        .eq('id', articleId)

      if (error) throw error

      toast({
        title: "Success",
        description: `Article ${!currentStatus ? 'published' : 'unpublished'} successfully`
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

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-destructive text-destructive-foreground'
      case 'editor': return 'bg-primary text-primary-foreground'
      default: return 'bg-secondary text-secondary-foreground'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Shield className="w-12 h-12 text-primary mx-auto animate-pulse" />
            <p className="text-muted-foreground mt-2">Loading admin dashboard...</p>
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
            <Shield className="w-8 h-8 text-primary" />
            Admin Dashboard
          </h1>
          <p className="text-muted-foreground mt-2">Manage users, content, and platform settings</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Users</p>
                  <p className="text-2xl font-bold text-foreground">{stats.totalUsers}</p>
                </div>
                <Users className="w-8 h-8 text-primary" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Articles</p>
                  <p className="text-2xl font-bold text-foreground">{stats.totalArticles}</p>
                </div>
                <FileText className="w-8 h-8 text-primary" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Published</p>
                  <p className="text-2xl font-bold text-foreground">{stats.publishedArticles}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Pending</p>
                  <p className="text-2xl font-bold text-foreground">{stats.pendingArticles}</p>
                </div>
                <XCircle className="w-8 h-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="users" className="space-y-6">
          <TabsList>
            <TabsTrigger value="users">
              <Users className="w-4 h-4 mr-2" />
              User Management
            </TabsTrigger>
            <TabsTrigger value="articles">
              <FileText className="w-4 h-4 mr-2" />
              Article Management
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle>User Management</CardTitle>
                <CardDescription>
                  Manage user roles and permissions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.full_name}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <Badge className={getRoleBadgeColor(user.role)}>
                            {user.role}
                          </Badge>
                        </TableCell>
                        <TableCell>{new Date(user.created_at).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Select
                            value={user.role}
                            onValueChange={(newRole: 'viewer' | 'editor' | 'admin') => updateUserRole(user.user_id, newRole)}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="viewer">Viewer</SelectItem>
                              <SelectItem value="editor">Editor</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="articles">
            <Card>
              <CardHeader>
                <CardTitle>Article Management</CardTitle>
                <CardDescription>
                  Review and manage all articles on the platform
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Author</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Views</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {articles.map((article) => (
                      <TableRow key={article.id}>
                        <TableCell className="font-medium max-w-xs truncate">{article.title}</TableCell>
                        <TableCell>{article.profiles?.full_name || 'Unknown'}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{article.categories?.name}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={article.is_featured ? "default" : "secondary"}>
                            {article.is_featured ? 'Featured' : 'Regular'}
                          </Badge>
                        </TableCell>
                        <TableCell>{article.view_count || 0}</TableCell>
                        <TableCell>{new Date(article.created_at).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => toggleArticleStatus(article.id, article.is_featured)}
                            >
                              {article.is_featured ? <XCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => deleteArticle(article.id)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}