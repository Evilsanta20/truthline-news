import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { RefreshCw, Zap, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/integrations/supabase/client'

interface RefreshButtonProps {
  onRefresh: () => Promise<void>
  onGenerateFresh: () => Promise<{ success: boolean; articles_processed: number; categories: string[]; timestamp?: string }>
  loading: boolean
  className?: string
  userId?: string
}

export const RefreshButton: React.FC<RefreshButtonProps> = ({
  onRefresh,
  onGenerateFresh,
  loading,
  className = '',
  userId
}) => {
  const [isPurging, setIsPurging] = useState(false)

  const handleRefreshAndGenerate = async () => {
    try {
      toast.info('🚀 Fetching latest news from all sources...')
      
      // Generate fresh news from APIs first
      const result = await onGenerateFresh()
      
      if (result.success && result.articles_processed > 0) {
        // Then refresh the feed to show the new articles
        await onRefresh()
        toast.success(`✅ Loaded ${result.articles_processed} fresh articles from news APIs!`)
      } else {
        toast.error('No new articles available. Try Full Refresh to clear old news.')
      }
    } catch (error: any) {
      console.error('Refresh failed:', error)
      toast.error(`Failed to fetch news: ${error.message}`)
    }
  }

  const handleFullRefresh = async () => {
    try {
      setIsPurging(true)
      toast.info('🔄 Purging old news and fetching completely fresh articles from APIs...')
      
      // Call purge-and-fetch-latest to wipe old news and get fresh ones from external APIs
      const { data, error } = await supabase.functions.invoke('purge-and-fetch-latest', {
        body: { wipe_all: false, max_age_hours: 3 }
      })
      
      if (error) {
        console.error('Purge error:', error)
        throw new Error(error.message || 'Failed to purge and fetch news')
      }
      
      // Clear local storage of shown articles
      if (userId) {
        localStorage.removeItem(`shown_articles_${userId}`)
        localStorage.removeItem(`reels_shown_${userId}`)
      }
      
      const removed = data?.removed || 0
      const added = data?.articles_added || 0
      
      toast.success(`✅ Purged ${removed} old articles, fetched ${added} fresh ones from news APIs!`)
      
      // Refresh the feed to show new articles
      await onRefresh()
    } catch (error: any) {
      console.error('Full refresh failed:', error)
      toast.error(`Full refresh failed: ${error.message}`)
    } finally {
      setIsPurging(false)
    }
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Button
        onClick={handleRefreshAndGenerate}
        disabled={loading || isPurging}
        size="sm"
        className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
      >
        {loading ? (
          <RefreshCw className="h-4 w-4 animate-spin" />
        ) : (
          <Zap className="h-4 w-4" />
        )}
        {loading ? 'Fetching...' : 'Fetch Fresh'}
      </Button>
      
      <Button
        onClick={handleFullRefresh}
        disabled={loading || isPurging}
        size="sm"
        variant="destructive"
        className="flex items-center gap-2"
      >
        {isPurging ? (
          <RefreshCw className="h-4 w-4 animate-spin" />
        ) : (
          <Trash2 className="h-4 w-4" />
        )}
        {isPurging ? 'Purging...' : 'Full Refresh'}
      </Button>
    </div>
  )
}
