import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { Navbar } from '@/components/layout/Navbar'
import { ArticleCard } from '@/components/news/ArticleCard'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Newspaper, TrendingUp, Star, Loader2 } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'

const Index = () => {
  const { user, loading: authLoading } = useAuth()
  const [articles, setArticles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState('general')

  const categories = [
    { slug: 'general', name: 'All News', icon: Newspaper },
    { slug: 'technology', name: 'Technology', icon: Newspaper },
    { slug: 'business', name: 'Business', icon: Newspaper },
    { slug: 'health', name: 'Health', icon: Newspaper },
    { slug: 'sports', name: 'Sports', icon: Newspaper }
  ]

  const fetchNews = async (category = 'general') => {
    setLoading(true)
    try {
      const { data, error } = await supabase.functions.invoke('fetch-news', {
        body: { category, pageSize: 20 }
      })
      
      if (error) throw error
      setArticles(data?.articles || [])
    } catch (error) {
      console.error('Error fetching news:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!authLoading) {
      fetchNews(activeCategory)
    }
  }, [activeCategory, authLoading])

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/auth" replace />
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Latest News
          </h1>
          <p className="text-muted-foreground">
            Stay informed with personalized news from trusted sources
          </p>
        </div>

        {/* Category Filter */}
        <div className="flex flex-wrap gap-2 mb-8">
          {categories.map((category) => (
            <Button
              key={category.slug}
              variant={activeCategory === category.slug ? "default" : "outline"}
              onClick={() => setActiveCategory(category.slug)}
              className="flex items-center gap-2"
            >
              <category.icon className="w-4 h-4" />
              {category.name}
            </Button>
          ))}
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* Featured Articles */}
            {articles.filter(a => a.is_featured).length > 0 && (
              <section className="mb-12">
                <div className="flex items-center gap-2 mb-6">
                  <Star className="w-5 h-5 text-primary" />
                  <h2 className="text-2xl font-bold text-foreground">Featured</h2>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {articles.filter(a => a.is_featured).slice(0, 2).map((article) => (
                    <ArticleCard key={article.id} article={article} variant="featured" />
                  ))}
                </div>
              </section>
            )}

            {/* Trending Articles */}
            {articles.filter(a => a.is_trending).length > 0 && (
              <section className="mb-12">
                <div className="flex items-center gap-2 mb-6">
                  <TrendingUp className="w-5 h-5 text-destructive" />
                  <h2 className="text-2xl font-bold text-foreground">Trending</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {articles.filter(a => a.is_trending).slice(0, 3).map((article) => (
                    <ArticleCard key={article.id} article={article} />
                  ))}
                </div>
              </section>
            )}

            {/* All Articles */}
            <section>
              <h2 className="text-2xl font-bold text-foreground mb-6">All Articles</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {articles.map((article) => (
                  <ArticleCard key={article.id} article={article} />
                ))}
              </div>
              
              {articles.length === 0 && (
                <div className="text-center py-12">
                  <Newspaper className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No articles found for this category.</p>
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  )
};

export default Index;
