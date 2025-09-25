// @ts-nocheck
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Auto-refresh function that runs every 15 minutes
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('🔄 Auto-refresh triggered at:', new Date().toISOString())
    
    // Call the cybotic news system to refresh
    const newsResponse = await supabaseClient.functions.invoke('cybotic-news-system', {
      body: {
        action: 'refresh',
        categories: ['general', 'technology', 'business', 'health', 'sports', 'politics'],
        limit: 120
      }
    })
    
    if (newsResponse.error) {
      console.error('News system refresh failed:', newsResponse.error)
      return new Response(JSON.stringify({
        success: false,
        error: newsResponse.error.message,
        timestamp: new Date().toISOString()
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
    
    console.log('✅ Auto-refresh completed successfully')
    console.log('Articles processed:', newsResponse.data?.total_articles || 0)
    
    // Log the auto-refresh execution
    await supabaseClient
      .from('news_fetch_logs')
      .insert({
        api_source: 'AUTO_REFRESH',
        category: 'ALL',
        articles_fetched: newsResponse.data?.total_articles || 0,
        articles_stored: newsResponse.data?.total_articles || 0,
        api_status: 'success',
        error_message: null,
        execution_time_ms: Date.now() - new Date().getTime(),
        fetch_timestamp: new Date().toISOString()
      })

    return new Response(JSON.stringify({
      success: true,
      message: 'Auto-refresh completed successfully',
      articles_processed: newsResponse.data?.total_articles || 0,
      categories: newsResponse.data?.categories_processed || [],
      timestamp: new Date().toISOString(),
      next_refresh: new Date(Date.now() + 15 * 60 * 1000).toISOString() // 15 minutes from now
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Auto-refresh error:', error)
    
    // Log the error
    try {
      const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      )
      
      await supabaseClient
        .from('news_fetch_logs')
        .insert({
          api_source: 'AUTO_REFRESH',
          category: 'ALL',
          articles_fetched: 0,
          articles_stored: 0,
          api_status: 'error',
          error_message: error.message,
          execution_time_ms: 0,
          fetch_timestamp: new Date().toISOString()
        })
    } catch (logError) {
      console.error('Failed to log error:', logError)
    }
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})