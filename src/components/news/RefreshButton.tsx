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

  const handleFullRefresh = async () => {
    try {
      setIsPurging(true)
      toast.info('🔄 Purging old news and fetching completely fresh articles...')
      
      // Call purge-and-fetch-latest to wipe old news and get fresh ones
      const { data, error } = await supabase.functions.invoke('purge-and-fetch-latest', {
        body: { wipe_all: false, max_age_hours: 3 }
      })
      
      if (error) throw error
      
      // Clear local storage of shown articles
      if (userId) {
        localStorage.removeItem(`shown_articles_${userId}`)
        localStorage.removeItem(`reels_shown_${userId}`)
      }
      
      toast.success(`✅ Purged ${data.removed} old articles, added ${data.articles_added} fresh ones!`)
      
      // Refresh the feed
      await onRefresh()
    } catch (error: any) {
      console.error('Full refresh failed:', error)
      toast.error(`Failed to refresh: ${error.message}`)
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
