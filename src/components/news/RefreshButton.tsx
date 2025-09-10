import React from 'react'
import { Button } from '@/components/ui/button'
import { RefreshCw, Zap } from 'lucide-react'
import { toast } from 'sonner'

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

  return (
    <div className={`flex gap-2 ${className}`}>
      <Button
        onClick={handleRefresh}
        disabled={loading}
        variant="outline"
        size="sm"
        className="flex items-center gap-2"
      >
        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        Refresh
      </Button>
      
      <Button
        onClick={handleGenerateFresh}
        disabled={loading}
        size="sm"
        className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
      >
        <Zap className="h-4 w-4" />
        Generate Fresh News
      </Button>
    </div>
  )
}