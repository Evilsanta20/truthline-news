import React from 'react'
import { Button } from '@/components/ui/button'
import { RefreshCw, Zap, Sparkles, Bot } from 'lucide-react'
import { toast } from 'sonner'
import { useFreshArticleSystem } from '@/hooks/useFreshArticleSystem'

interface RefreshButtonProps {
  onRefresh: () => Promise<void>
  onGenerateFresh: () => Promise<{ success: boolean; articles_processed: number; categories: string[]; timestamp?: string }>
  loading: boolean
  className?: string
}

export const RefreshButton: React.FC<RefreshButtonProps> = ({
  onRefresh,
  onGenerateFresh,
  loading,
  className = ''
}) => {
  const freshArticleSystem = useFreshArticleSystem({
    onComplete: (result) => {
      console.log('Fresh articles system completed:', result)
      // Trigger refresh to show new articles
      onRefresh()
    }
  })

  const handleRefresh = async () => {
    try {
      toast.info('Refreshing articles...')
      await onRefresh()
      toast.success('Articles refreshed!')
    } catch (error) {
      console.error('Refresh failed:', error)
      toast.error('Failed to refresh articles')
    }
  }

  const handleGenerateFresh = async () => {
    try {
      toast.info('🚀 Generating fresh news from all sources...')
      const result = await onGenerateFresh()
      
      if (result.success) {
        toast.success(`✅ Fresh news generated! ${result.articles_processed} articles processed from ${result.categories.length} categories`)
      } else {
        toast.error('Failed to generate fresh news')
      }
    } catch (error: any) {
      console.error('Generate fresh failed:', error)
      toast.error(`Failed to generate fresh news: ${error.message}`)
    }
  }

  const handleFreshAndPerfect = async () => {
    try {
      await freshArticleSystem.refreshAndEnhanceArticles()
    } catch (error) {
      console.error('Fresh and perfect failed:', error)
    }
  }

  const handleEnhanceOnly = async () => {
    try {
      await freshArticleSystem.enhanceExistingArticles()
    } catch (error) {
      console.error('Enhance failed:', error)
    }
  }

  return (
    <div className={`flex gap-2 flex-wrap ${className}`}>
      <Button
        onClick={handleRefresh}
        disabled={loading || freshArticleSystem.loading}
        variant="outline"
        size="sm"
        className="flex items-center gap-2"
      >
        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        Refresh
      </Button>
      
      <Button
        onClick={handleGenerateFresh}
        disabled={loading || freshArticleSystem.loading}
        size="sm"
        className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
      >
        <Zap className="h-4 w-4" />
        Generate Fresh News
      </Button>

      <Button
        onClick={handleFreshAndPerfect}
        disabled={loading || freshArticleSystem.loading}
        size="sm"
        className="flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700"
      >
        {freshArticleSystem.loading ? (
          <RefreshCw className="h-4 w-4 animate-spin" />
        ) : (
          <Sparkles className="h-4 w-4" />
        )}
        Fresh & Perfect
      </Button>

      <Button
        onClick={handleEnhanceOnly}
        disabled={loading || freshArticleSystem.loading}
        variant="outline"
        size="sm"
        className="flex items-center gap-2 border-purple-200 text-purple-700 hover:bg-purple-50"
      >
        <Bot className="h-4 w-4" />
        AI Enhance
      </Button>

      {freshArticleSystem.progress && (
        <div className="flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary text-sm rounded-md">
          <RefreshCw className="h-3 w-3 animate-spin" />
          <span>{freshArticleSystem.progress}</span>
        </div>
      )}
    </div>
  )
}