// @ts-nocheck
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('🧹 Starting automatic news cleanup...')

    // Call the database function to archive and cleanup old articles
    const { data, error } = await supabaseClient.rpc('archive_and_cleanup_old_articles')

    if (error) {
      console.error('Error during cleanup:', error)
      throw error
    }

    const deletedCount = data || 0
    console.log(`✅ Cleanup complete: ${deletedCount} old articles removed`)

    // Also clean up old logs (older than 30 days)
    const { error: logError } = await supabaseClient.rpc('cleanup_old_logs')
    if (logError) {
      console.warn('Warning: Could not clean up old logs:', logError)
    }

    return new Response(JSON.stringify({
      success: true,
      deleted_articles: deletedCount,
      message: `Successfully cleaned up ${deletedCount} old articles`,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('Error in cleanup-old-news function:', error)
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false,
      deleted_articles: 0
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
