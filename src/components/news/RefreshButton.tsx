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
      // Clear local cache immediately
      if (userId) {
        localStorage.removeItem(`shown_articles_${userId}`)
        localStorage.removeItem(`reels_shown_${userId}`)
      }
      
      toast.info('🚀 Fetching latest news...')
      
      // Fetch and refresh in parallel for speed
      const [result] = await Promise.all([
        onGenerateFresh(),
        onRefresh()
      ])
      
      if (result.success && result.articles_processed > 0) {
        toast.success(`✅ ${result.articles_processed} fresh articles loaded!`)
      } else {
        toast.error('No new articles. Try Full Refresh.')
      }
    } catch (error: any) {
      console.error('Refresh failed:', error)
      toast.error(`Failed: ${error.message}`)
    }
  }

  const handleFullRefresh = async () => {
    try {
      setIsPurging(true)
      
      // Clear local cache IMMEDIATELY
      if (userId) {
        localStorage.removeItem(`shown_articles_${userId}`)
        localStorage.removeItem(`reels_shown_${userId}`)
      }
      
      toast.info('🔄 Purging old news...')
      
      // Purge and fetch in one fast operation
      const { data, error } = await supabase.functions.invoke('purge-and-fetch-latest', {
        body: { wipe_all: false, max_age_hours: 3 }
      })
      
      if (error) {
        throw new Error(error.message || 'Purge failed')
      }
      
      const removed = data?.removed || 0
      const added = data?.articles_added || 0
      
      // Refresh feed immediately
      onRefresh()
      
      toast.success(`✅ ${removed} old removed, ${added} fresh loaded!`)
    } catch (error: any) {
      console.error('Full refresh failed:', error)
      toast.error(`Failed: ${error.message}`)
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
