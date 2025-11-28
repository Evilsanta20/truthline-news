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
  const handleRefreshAndGenerate = async () => {
    try {
      toast.info('🚀 Fetching latest news from all sources...')
      
      // Generate fresh news first
      const result = await onGenerateFresh()
      
      if (result.success) {
        // Then refresh the feed to show the new articles
        await onRefresh()
        toast.success(`✅ Loaded ${result.articles_processed} fresh articles!`)
      } else {
        toast.error('Failed to fetch fresh news')
      }
    } catch (error: any) {
      console.error('Refresh failed:', error)
      toast.error(`Failed to refresh: ${error.message}`)
    }
  }

  return (
    <Button
      onClick={handleRefreshAndGenerate}
      disabled={loading}
      size="sm"
      className={`flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 ${className}`}
    >
      {loading ? (
        <RefreshCw className="h-4 w-4 animate-spin" />
      ) : (
        <Zap className="h-4 w-4" />
      )}
      {loading ? 'Fetching...' : 'Fetch Fresh News'}
    </Button>
  )
}
