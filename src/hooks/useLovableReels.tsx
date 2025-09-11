import { useState, useCallback } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'

interface ReelData {
  headline: string
  reel_text: string
  sentiment: string
  tags: string[]
  original_article_id?: string
  transformed_at?: string
  user_mood_context?: string
}

interface TransformResult {
  success: boolean
  reel?: ReelData
  error?: string
}

export const useLovableReels = (userId?: string) => {
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const transformToLovableReel = useCallback(async (article: any): Promise<ReelData | null> => {
    if (!article) return null

    setLoading(true)
    try {
      console.log('🎬 Transforming article to lovable reel:', article.title)
      
      const { data, error } = await supabase.functions.invoke('lovable-reel-transformer', {
        body: { 
          article,
          userId 
        }
      })

      if (error) {
        console.error('Error transforming to reel:', error)
        toast({
          title: "Reel Transform Error",
          description: "Failed to create lovable reel format",
          variant: "destructive"
        })
        return null
      }

      const result: TransformResult = data
      
      if (!result.success || !result.reel) {
        throw new Error(result.error || 'Failed to transform article')
      }

      console.log('✨ Successfully created lovable reel:', result.reel.headline)
      return result.reel

    } catch (error) {
      console.error('Error in transformToLovableReel:', error)
      toast({
        title: "Transform Failed",
        description: "Couldn't create a lovable reel from this article",
        variant: "destructive"
      })
      return null
    } finally {
      setLoading(false)
    }
  }, [userId, toast])

  const batchTransformArticles = useCallback(async (articles: any[]): Promise<ReelData[]> => {
    if (!articles.length) return []

    setLoading(true)
    const reels: ReelData[] = []
    
    try {
      console.log(`🎬 Batch transforming ${articles.length} articles to lovable reels`)
      
      // Process in batches to avoid overwhelming the API
      const batchSize = 5
      for (let i = 0; i < articles.length; i += batchSize) {
        const batch = articles.slice(i, i + batchSize)
        const batchPromises = batch.map(article => transformToLovableReel(article))
        
        const batchResults = await Promise.all(batchPromises)
        const validReels = batchResults.filter(reel => reel !== null) as ReelData[]
        
        reels.push(...validReels)
        
        // Small delay between batches to be API-friendly
        if (i + batchSize < articles.length) {
          await new Promise(resolve => setTimeout(resolve, 500))
        }
      }

      console.log(`✨ Successfully created ${reels.length} lovable reels`)
      
      if (reels.length > 0) {
        toast({
          title: "Lovable Reels Ready! 💝",
          description: `Created ${reels.length} heartwarming news reels just for you`,
        })
      }

      return reels

    } catch (error) {
      console.error('Error in batchTransformArticles:', error)
      toast({
        title: "Batch Transform Failed",
        description: "Couldn't create lovable reels from articles",
        variant: "destructive"
      })
      return []
    } finally {
      setLoading(false)
    }
  }, [transformToLovableReel, toast])

  return {
    transformToLovableReel,
    batchTransformArticles,
    loading
  }
}