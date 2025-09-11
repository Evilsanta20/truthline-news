import { useState, useCallback } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'

interface RefinedArticle {
  title: string
  article: string
  sentiment: string
  tags: string[]
  reel_text: string
  original_article_id?: string
  original_source?: string
  original_url?: string
  refined_at?: string
  refinement_type?: string
}

interface RefineResult {
  success: boolean
  refined_article?: RefinedArticle
  error?: string
}

interface BatchRefineResult {
  success: boolean
  refined_articles?: RefinedArticle[]
  processed?: number
  successful?: number
  error?: string
}

export const useLovableContentRefiner = () => {
  const [loading, setLoading] = useState(false)
  const [batchLoading, setBatchLoading] = useState(false)
  const { toast } = useToast()

  const refineArticle = useCallback(async (article: any): Promise<RefinedArticle | null> => {
    if (!article) return null

    setLoading(true)
    try {
      console.log('🌟 Refining article for lovable content:', article.title)
      
      const { data, error } = await supabase.functions.invoke('lovable-content-refiner', {
        body: { 
          article,
          action: 'refine'
        }
      })

      if (error) {
        console.error('Error refining article:', error)
        toast({
          title: "Content Refining Error",
          description: "Failed to create lovable version of the article",
          variant: "destructive"
        })
        return null
      }

      const result: RefineResult = data
      
      if (!result.success || !result.refined_article) {
        throw new Error(result.error || 'Failed to refine article')
      }

      console.log('✨ Successfully refined article:', result.refined_article.title)
      return result.refined_article

    } catch (error) {
      console.error('Error in refineArticle:', error)
      toast({
        title: "Refine Failed",
        description: "Couldn't create a lovable version of this article",
        variant: "destructive"
      })
      return null
    } finally {
      setLoading(false)
    }
  }, [toast])

  const batchRefineArticles = useCallback(async (articles: any[]): Promise<RefinedArticle[]> => {
    if (!articles.length) return []

    setBatchLoading(true)
    try {
      console.log(`🌟 Batch refining ${articles.length} articles for lovable content`)
      
      const { data, error } = await supabase.functions.invoke('lovable-content-refiner', {
        body: { 
          articles,
          action: 'batch_refine'
        }
      })

      if (error) {
        console.error('Error batch refining articles:', error)
        toast({
          title: "Batch Refining Error", 
          description: "Failed to create lovable versions of articles",
          variant: "destructive"
        })
        return []
      }

      const result: BatchRefineResult = data
      
      if (!result.success || !result.refined_articles) {
        throw new Error(result.error || 'Failed to batch refine articles')
      }

      console.log(`✨ Successfully refined ${result.successful}/${result.processed} articles`)
      
      if (result.refined_articles.length > 0) {
        toast({
          title: "🌟 Lovable Content Ready!",
          description: `Refined ${result.refined_articles.length} articles with warm, balanced content`,
        })
      }

      return result.refined_articles

    } catch (error) {
      console.error('Error in batchRefineArticles:', error)
      toast({
        title: "Batch Refine Failed",
        description: "Couldn't create lovable versions of articles",
        variant: "destructive"
      })
      return []
    } finally {
      setBatchLoading(false)
    }
  }, [toast])

  return {
    refineArticle,
    batchRefineArticles,
    loading,
    batchLoading
  }
}