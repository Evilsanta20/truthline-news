// @ts-nocheck
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
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
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured')
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { action = 'refresh_and_enhance', categories = ['general', 'technology', 'business', 'health', 'sports', 'politics'] } = await req.json()

    console.log(`🚀 Fresh Article Enhancer - Action: ${action}`)

    let totalProcessed = 0
    let totalEnhanced = 0
    let newArticlesFetched = 0

    // Step 1: Fetch fresh articles from multiple sources
    if (action === 'refresh_and_enhance' || action === 'refresh_only') {
      console.log('📰 Fetching fresh articles from news sources...')
      
      const { data: newsData, error: newsError } = await supabaseClient.functions.invoke('cybotic-news-system', {
        body: { 
          action: 'refresh',
          categories: categories,
          limit: 150,
          use_smart_upsert: true
        }
      })
      
      if (newsError) {
        console.error('Failed to fetch fresh news:', newsError)
      } else {
        newArticlesFetched = newsData?.total_articles || 0
        console.log(`✅ Fetched ${newArticlesFetched} fresh articles`)
      }
    }

    // Step 2: Enhance articles with AI
    if (action === 'refresh_and_enhance' || action === 'enhance_only') {
      console.log('🤖 Enhancing articles with AI...')
      
      // Get recent articles that need enhancement
      const { data: articles, error: fetchError } = await supabaseClient
        .from('articles')
        .select('id, title, description, content, topic_tags, source_name, published_at')
        .order('created_at', { ascending: false })
        .limit(30)

      if (fetchError) {
        throw fetchError
      }

      for (const article of articles || []) {
        try {
          console.log(`🔄 Enhancing: ${article.title.substring(0, 50)}...`)
          
          const enhancementPrompt = `As a world-class news editor, enhance this article to make it more engaging, informative, and perfect for modern readers. 

Original Article:
Title: ${article.title}
Content: ${article.description || article.content || 'Limited content available'}
Source: ${article.source_name}
Topics: ${article.topic_tags?.join(', ') || 'General'}

Please provide:
1. An improved, catchy headline (max 80 characters)
2. A compelling description/summary (max 200 characters) 
3. Enhanced content that's informative yet engaging (max 800 words)
4. 3-5 relevant topic tags
5. A sentiment score (0.0-1.0) where 0.5 is neutral
6. A quality score (0.0-1.0) for overall article quality

Format your response as JSON:
{
  "enhanced_title": "...",
  "enhanced_description": "...", 
  "enhanced_content": "...",
  "topic_tags": ["tag1", "tag2", "tag3"],
  "sentiment_score": 0.7,
  "content_quality_score": 0.9,
  "engagement_factors": ["factor1", "factor2"]
}`

          const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${openAIApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'gpt-5-mini-2025-08-07',
              messages: [
                { 
                  role: 'system', 
                  content: 'You are an expert news editor who creates engaging, high-quality articles. Always respond with valid JSON only.' 
                },
                { role: 'user', content: enhancementPrompt }
              ],
              max_completion_tokens: 1500
            }),
          })

          if (!response.ok) {
            console.error(`OpenAI API error: ${response.status} ${response.statusText}`)
            continue
          }

          const aiResponse = await response.json()
          const enhancedContent = aiResponse.choices[0].message.content

          try {
            const enhancement = JSON.parse(enhancedContent)
            
            // Update article with AI enhancements
            const { error: updateError } = await supabaseClient
              .from('articles')
              .update({
                title: enhancement.enhanced_title || article.title,
                description: enhancement.enhanced_description || article.description,
                content: enhancement.enhanced_content || article.content,
                topic_tags: enhancement.topic_tags || article.topic_tags,
                sentiment_score: enhancement.sentiment_score || 0.5,
                content_quality_score: enhancement.content_quality_score || 0.8,
                ai_processed_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                data_freshness_score: 1.0,
                engagement_score: (enhancement.engagement_factors?.length || 0) * 20
              })
              .eq('id', article.id)

            if (updateError) {
              console.error(`Failed to update article ${article.id}:`, updateError)
            } else {
              totalEnhanced++
              console.log(`✅ Enhanced: ${enhancement.enhanced_title?.substring(0, 50) || article.title.substring(0, 50)}...`)
            }

          } catch (parseError) {
            console.error('Failed to parse AI response:', parseError)
            console.log('Raw AI response:', enhancedContent)
          }

          totalProcessed++
          
          // Add delay to respect rate limits
          await new Promise(resolve => setTimeout(resolve, 1000))

        } catch (error) {
          console.error(`Error enhancing article ${article.id}:`, error)
        }
      }
    }

    // Step 3: Clean up old, low-quality articles
    console.log('🧹 Cleaning up old articles...')
    const { data: cleanupCount, error: cleanupError } = await supabaseClient.rpc('cleanup_duplicate_articles')
    
    if (cleanupError) {
      console.error('Cleanup failed:', cleanupError)
    } else {
      console.log(`🗑️ Cleaned up ${cleanupCount || 0} old/duplicate articles`)
    }

    // Step 4: Update data freshness scores
    const { data: freshnessCount, error: freshnessError } = await supabaseClient.rpc('update_data_freshness')
    
    if (freshnessError) {
      console.error('Freshness update failed:', freshnessError)
    } else {
      console.log(`📊 Updated freshness scores for ${freshnessCount || 0} articles`)
    }

    const result = {
      success: true,
      action,
      new_articles_fetched: newArticlesFetched,
      articles_processed: totalProcessed,
      articles_enhanced: totalEnhanced,
      articles_cleaned: cleanupCount || 0,
      freshness_updated: freshnessCount || 0,
      timestamp: new Date().toISOString()
    }

    console.log('🎉 Fresh Article Enhancement completed:', result)

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('💥 Fresh Article Enhancer error:', error)
    
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