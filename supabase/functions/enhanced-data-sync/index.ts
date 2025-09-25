// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { action = 'sync', force_fresh = false, cleanup_old = false } = await req.json()

    console.log(`🔄 Enhanced Data Sync - Action: ${action}`)

    // Start sync operation tracking
    const { data: syncData, error: syncError } = await supabaseClient.rpc('start_sync_operation', {
      sync_type_param: action,
      metadata_param: { force_fresh, cleanup_old, started_by: 'enhanced-data-sync' }
    })

    if (syncError) {
      console.error('Failed to start sync operation:', syncError)
      return new Response(JSON.stringify({ success: false, error: syncError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const syncId = syncData
    let articlesProcessed = 0
    let articlesAdded = 0
    let articlesUpdated = 0
    let articlesRemoved = 0

    try {
      switch (action) {
        case 'sync':
          // Refresh data freshness scores
          console.log('📊 Updating data freshness scores...')
          const { data: freshnessData, error: freshnessError } = await supabaseClient.rpc('update_data_freshness')
          if (freshnessError) throw freshnessError
          articlesProcessed += freshnessData || 0

          // Fetch fresh news if needed
          if (force_fresh) {
            console.log('🚀 Fetching fresh news data...')
            const { data: newsData, error: newsError } = await supabaseClient.functions.invoke('cybotic-news-system', {
              body: { 
                action: 'refresh',
                categories: ['general', 'technology', 'business', 'health', 'sports', 'politics'],
                limit: 120,
                use_smart_upsert: true
              }
            })
            
            if (newsError) throw newsError
            articlesAdded += newsData?.total_articles || 0
          }

          // Cleanup old articles if requested
          if (cleanup_old) {
            console.log('🧹 Cleaning up duplicate and low-quality articles...')
            const { data: cleanupData, error: cleanupError } = await supabaseClient.rpc('cleanup_duplicate_articles')
            if (cleanupError) throw cleanupError
            articlesRemoved += cleanupData || 0
          }
          break

        case 'cache_refresh':
          // Force refresh cache for stale articles
          console.log('💾 Refreshing cached articles...')
          const { data: cacheArticles, error: cacheError } = await supabaseClient
            .from('articles')
            .select('id, url, title')
            .lt('data_freshness_score', 0.7)
            .limit(50)

          if (cacheError) throw cacheError

          for (const article of (cacheArticles || [])) {
            try {
              // Re-fetch and update article
              const updateResult = await supabaseClient.rpc('upsert_article', {
                p_title: article.title,
                p_url: article.url
              })
              
              if (updateResult.data) articlesUpdated++
            } catch (err) {
              console.warn(`Failed to refresh article ${article.id}:`, err)
            }
          }
          
          articlesProcessed = (cacheArticles || []).length
          break

        case 'cleanup':
          console.log('🗑️ Running comprehensive cleanup...')
          const { data: cleanupResult, error: cleanupErr } = await supabaseClient.rpc('cleanup_duplicate_articles')
          if (cleanupErr) throw cleanupErr
          
          articlesRemoved = cleanupResult || 0
          articlesProcessed = articlesRemoved
          break

        case 'health_check':
          // Check system health
          console.log('🏥 Running system health check...')
          const { data: articlesCount, error: countError } = await supabaseClient
            .from('articles')
            .select('id', { count: 'exact', head: true })

          if (countError) throw countError

          const { data: staleCount, error: staleError } = await supabaseClient
            .from('articles')
            .select('id', { count: 'exact', head: true })
            .lt('data_freshness_score', 0.5)

          if (staleError) throw staleError

          const healthStatus = {
            total_articles: articlesCount?.count || 0,
            stale_articles: staleCount?.count || 0,
            freshness_ratio: ((articlesCount?.count || 0) - (staleCount?.count || 0)) / (articlesCount?.count || 1),
            last_sync: new Date().toISOString()
          }

          await supabaseClient.rpc('complete_sync_operation', {
            sync_id_param: syncId,
            status_param: 'completed',
            articles_processed_param: articlesCount?.count || 0,
            articles_added_param: 0,
            articles_updated_param: 0,
            articles_removed_param: 0
          })

          return new Response(JSON.stringify({
            success: true,
            action: 'health_check',
            health_status: healthStatus,
            sync_id: syncId
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })

        default:
          throw new Error(`Unknown action: ${action}`)
      }

      // Complete sync operation
      await supabaseClient.rpc('complete_sync_operation', {
        sync_id_param: syncId,
        status_param: 'completed',
        articles_processed_param: articlesProcessed,
        articles_added_param: articlesAdded,
        articles_updated_param: articlesUpdated,
        articles_removed_param: articlesRemoved
      })

      const result = {
        success: true,
        action,
        sync_id: syncId,
        articles_processed: articlesProcessed,
        articles_added: articlesAdded,
        articles_updated: articlesUpdated,
        articles_removed: articlesRemoved,
        timestamp: new Date().toISOString()
      }

      console.log('✅ Enhanced Data Sync completed:', result)

      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })

    } catch (error) {
      console.error('❌ Enhanced Data Sync failed:', error)

      // Mark sync as failed
      await supabaseClient.rpc('complete_sync_operation', {
        sync_id_param: syncId,
        status_param: 'failed',
        articles_processed_param: articlesProcessed,
        articles_added_param: articlesAdded,
        articles_updated_param: articlesUpdated,
        articles_removed_param: articlesRemoved,
        error_message_param: error.message
      })

      return new Response(JSON.stringify({
        success: false,
        error: error.message,
        sync_id: syncId,
        articles_processed: articlesProcessed
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

  } catch (error) {
    console.error('💥 Critical error in Enhanced Data Sync:', error)
    
    return new Response(JSON.stringify({
      success: false,
      error: 'Internal server error',
      message: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})