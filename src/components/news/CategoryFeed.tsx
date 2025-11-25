import { EnhancedPersonalizedFeed } from './EnhancedPersonalizedFeed'
import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { ArticleCard } from './ArticleCard'

interface CategoryFeedProps {
  userId: string
  categorySlug: string
  categoryName: string
}

export function CategoryFeed({ userId, categorySlug, categoryName }: CategoryFeedProps) {
  const [articles, setArticles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadCategoryArticles()
  }, [categorySlug])

  const loadCategoryArticles = async () => {
    setLoading(true)
    try {
      // Get category ID
      const { data: category } = await supabase
        .from('categories')
        .select('id')
        .eq('slug', categorySlug)
        .single()

      if (category) {
        // Get articles for this category
        const { data: articles, error } = await supabase
          .from('articles')
          .select(`
            *,
            categories (name, color, slug)
          `)
          .eq('category_id', category.id)
          .gte('published_at', new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString())
          .order('published_at', { ascending: false })
          .limit(30)

        if (!error && articles) {
          setArticles(articles)
        }
      }
    } catch (error) {
      console.error('Error loading category articles:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="newspaper-byline">Loading {categoryName} articles...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="text-center border-4 border-[hsl(var(--newspaper-divider))] p-8 mb-8">
        <h2 className="newspaper-headline text-5xl mb-3">{categoryName.toUpperCase()}</h2>
        <div className="newspaper-divider my-4"></div>
        <p className="newspaper-byline text-sm">
          {articles.length} ARTICLES • LAST 48 HOURS
        </p>
      </div>

      {articles.length === 0 ? (
        <div className="text-center py-12 border-2 border-[hsl(var(--newspaper-border))] bg-muted">
          <p className="newspaper-headline text-2xl mb-2">NO ARTICLES FOUND</p>
          <p className="newspaper-byline">Check back soon for the latest {categoryName} news</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {articles.map((article) => (
            <ArticleCard key={article.id} article={article} />
          ))}
        </div>
      )}
    </div>
  )
}
