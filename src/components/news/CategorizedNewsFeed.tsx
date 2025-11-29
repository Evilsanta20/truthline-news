import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { ArticleCard } from './ArticleCard'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ChevronRight, RefreshCw, Sparkles } from 'lucide-react'
import { toast } from 'sonner'

interface CategorizedNewsFeedProps {
  userId: string
}

interface Category {
  id: string
  name: string
  slug: string
  color: string
  articleCount?: number
}

interface Article {
  id: string
  title: string
  description: string
  content: string
  url: string
  url_to_image: string
  source_name: string
  author: string
  published_at: string
  category_id: string
  topic_tags: string[]
  engagement_score: number
  is_trending: boolean
  is_featured: boolean
  is_editors_pick: boolean
  view_count: number
  categories?: Category
}

interface ArticlesByCategory {
  [categoryId: string]: {
    category: Category
    articles: Article[]
  }
}

export default function CategorizedNewsFeed({ userId }: CategorizedNewsFeedProps) {
  const [articlesByCategory, setArticlesByCategory] = useState<ArticlesByCategory>({})
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())

  useEffect(() => {
    loadArticles()
  }, [])

  // Auto-cleanup and refresh every 5 minutes
  useEffect(() => {
    const autoCleanupInterval = setInterval(async () => {
      console.log('Auto-cleaning categorized news (5min interval)')
      setArticlesByCategory({}) // Clear immediately
      await fetchFreshNews()
    }, 5 * 60 * 1000) // 5 minutes

    return () => clearInterval(autoCleanupInterval)
  }, [])

  const loadArticles = async () => {
    try {
      setLoading(true)
      
      // Fetch articles with their categories (only from last 7 days)
      const { data: articles, error } = await supabase
        .from('articles')
        .select(`
          *,
          categories (
            id,
            name,
            slug,
            color
          )
        `)
        .not('category_id', 'is', null)
        .gte('published_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .order('published_at', { ascending: false })
        .limit(100)

      if (error) {
        console.error('Error loading articles:', error)
        toast.error('Failed to load articles')
        return
      }

      if (!articles || articles.length === 0) {
        toast.error('No articles found. Try fetching fresh news!')
        return
      }

      // Group articles by category
      const grouped: ArticlesByCategory = {}
      
      articles.forEach((article: Article) => {
        if (article.category_id && article.categories) {
          if (!grouped[article.category_id]) {
            grouped[article.category_id] = {
              category: article.categories,
              articles: []
            }
          }
          grouped[article.category_id].articles.push(article)
        }
      })

      // Remove empty categories and sort by article count
      const sortedGrouped = Object.entries(grouped)
        .filter(([_, data]) => data.articles.length > 0)
        .sort((a, b) => b[1].articles.length - a[1].articles.length)
        .reduce((acc, [key, value]) => {
          acc[key] = value
          return acc
        }, {} as ArticlesByCategory)

      setArticlesByCategory(sortedGrouped)

      // Auto-expand first 3 categories
      const firstThreeCategories = Object.keys(sortedGrouped).slice(0, 3)
      setExpandedCategories(new Set(firstThreeCategories))
      
    } catch (error) {
      console.error('Error in loadArticles:', error)
      toast.error('An error occurred while loading articles')
    } finally {
      setLoading(false)
    }
  }

  const fetchFreshNews = async () => {
    try {
      setRefreshing(true)
      toast.loading('Fetching latest news from all sources...')
      
      // Use category slugs that match database categories
      const categories = ['general', 'technology', 'business', 'sports', 'entertainment', 'health', 'science', 'politics', 'world']
      let totalArticles = 0
      
      for (const category of categories) {
        try {
          console.log(`Fetching news for category: ${category}`)
          const { data, error } = await supabase.functions.invoke('enhanced-news-aggregator', {
            body: { 
              category,
              limit: 15,
              forceRefresh: true
            }
          })
          
          if (error) {
            console.error(`Error fetching ${category}:`, error)
          } else if (data) {
            totalArticles += data.total_processed || 0
            console.log(`Category ${category}: ${data.total_processed || 0} articles`)
          }
        } catch (categoryError) {
          console.error(`Failed to fetch ${category}:`, categoryError)
        }
      }
      
      toast.dismiss()
      toast.success(`Fetched ${totalArticles} fresh articles across all categories!`)
      
      // Reload articles after fetching
      await loadArticles()
    } catch (error) {
      toast.dismiss()
      toast.error('Failed to fetch fresh news')
      console.error('Error fetching fresh news:', error)
    } finally {
      setRefreshing(false)
    }
  }

  const toggleCategory = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories)
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId)
    } else {
      newExpanded.add(categoryId)
    }
    setExpandedCategories(newExpanded)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Sparkles className="w-12 h-12 text-primary mx-auto animate-pulse" />
          <p className="text-foreground mt-2">Loading categorized news...</p>
        </div>
      </div>
    )
  }

  const categoryCount = Object.keys(articlesByCategory).length
  const totalArticles = Object.values(articlesByCategory).reduce(
    (sum, data) => sum + data.articles.length, 
    0
  )

  if (categoryCount === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center border-4 border-[hsl(var(--newspaper-divider))] p-12 bg-muted">
          <h2 className="text-3xl font-bold mb-4">No Articles Available</h2>
          <p className="text-muted-foreground mb-6">
            Fetch the latest news from multiple sources to get started
          </p>
          <Button 
            onClick={fetchFreshNews}
            disabled={refreshing}
            size="lg"
            className="gap-2"
          >
            {refreshing ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                Fetching News...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                Fetch Fresh News
              </>
            )}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold mb-2">News by Category</h1>
          <p className="text-muted-foreground">
            {categoryCount} categories • {totalArticles} articles
          </p>
        </div>
        <Button 
          onClick={fetchFreshNews}
          disabled={refreshing}
          size="lg"
          className="gap-2"
        >
          {refreshing ? (
            <>
              <RefreshCw className="w-5 h-5 animate-spin" />
              Refreshing...
            </>
          ) : (
            <>
              <RefreshCw className="w-5 h-5" />
              Refresh News
            </>
          )}
        </Button>
      </div>

      {/* Categories */}
      <div className="space-y-8">
        {Object.entries(articlesByCategory).map(([categoryId, data]) => {
          const isExpanded = expandedCategories.has(categoryId)
          const displayArticles = isExpanded ? data.articles : data.articles.slice(0, 3)
          
          return (
            <div key={categoryId} className="border-4 border-[hsl(var(--newspaper-divider))] bg-card">
              {/* Category Header */}
              <div 
                className="p-6 border-b-4 border-[hsl(var(--newspaper-divider))] cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => toggleCategory(categoryId)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div 
                      className="w-2 h-12"
                      style={{ backgroundColor: data.category.color }}
                    />
                    <div>
                      <h2 className="text-3xl font-bold uppercase tracking-tight">
                        {data.category.name}
                      </h2>
                      <Badge variant="secondary" className="mt-2">
                        {data.articles.length} articles
                      </Badge>
                    </div>
                  </div>
                  <ChevronRight 
                    className={`w-6 h-6 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                  />
                </div>
              </div>

              {/* Articles Grid */}
              {(isExpanded || data.articles.length <= 3) && (
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {displayArticles.map((article) => (
                      <ArticleCard key={article.id} article={article} />
                    ))}
                  </div>
                  
                  {!isExpanded && data.articles.length > 3 && (
                    <div className="mt-6 text-center">
                      <Button
                        onClick={() => toggleCategory(categoryId)}
                        variant="outline"
                        className="gap-2"
                      >
                        View All {data.articles.length} Articles
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
