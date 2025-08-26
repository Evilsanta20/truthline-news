import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const openAIApiKey = Deno.env.get('OPENAI_API_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      userId, 
      limit = 30, 
      since,
      balancedMode = true,
      exploreRatio = 0.25,
      mutedTopics = []
    } = await req.json();

    console.log('Getting AI recommendations for user:', userId, 'since:', since);

    // Get user preferences and interaction history
    const { data: preferences } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();

    const { data: interactions } = await supabase
      .from('article_interactions')
      .select('article_id, interaction_type, interaction_value, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(200);

    // Build article query with optional since filter
    let articleQuery = supabase
      .from('articles')
      .select(`
        *,
        categories (name, color)
      `);

    if (since) {
      // For incremental updates - get articles published after since timestamp
      articleQuery = articleQuery.gte('published_at', since);
    } else {
      // For initial load - get articles from last 30 days (more lenient for demo)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      articleQuery = articleQuery.gte('created_at', thirtyDaysAgo.toISOString());
    }

    // Apply content quality filters
    articleQuery = articleQuery
      .gte('content_quality_score', 0.4)
      .gte('credibility_score', 0.3)
      .lte('bias_score', 0.8);

    // Filter out muted topics
    if (mutedTopics.length > 0) {
      articleQuery = articleQuery.not('topic_tags', 'cs', `{${mutedTopics.join(',')}}`);
    }

    let { data: articles } = await articleQuery
      .order(since ? 'published_at' : 'created_at', { ascending: false })
      .limit(since ? 100 : 300);

    // If no articles found with date filter, try without date filter as fallback
    if (!articles || articles.length === 0) {
      console.log('No articles found with date filter, trying fallback query...');
      const { data: fallbackArticles } = await supabase
        .from('articles')
        .select(`
          *,
          categories (name, color)
        `)
        .gte('content_quality_score', 0.3)
        .gte('credibility_score', 0.2)
        .lte('bias_score', 0.9)
        .order('created_at', { ascending: false })
        .limit(100);
      
      articles = fallbackArticles;
    }

    if (!articles || articles.length === 0) {
      return new Response(
        JSON.stringify({ 
          articles: [], 
          userTopics: [],
          latest_timestamp: since || new Date().toISOString(),
          total_count: 0
        }), 
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate user topic interests from recent interactions (last 30 days)
    const topicScores = new Map();
    const recentInteractionMap = new Map();
    
    if (interactions) {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      interactions
        .filter(interaction => new Date(interaction.created_at) >= thirtyDaysAgo)
        .forEach(interaction => {
          recentInteractionMap.set(interaction.article_id, interaction);
          
          const article = articles.find(a => a.id === interaction.article_id);
          if (article && article.topic_tags) {
            article.topic_tags.forEach(topic => {
              const currentScore = topicScores.get(topic) || 0;
              const points = interaction.interaction_type === 'view' ? 1 :
                            interaction.interaction_type === 'like' ? 4 :
                            interaction.interaction_type === 'bookmark' ? 6 :
                            interaction.interaction_type === 'share' ? 5 :
                            interaction.interaction_type === 'read_time' ? Math.min(interaction.interaction_value / 30, 3) :
                            interaction.interaction_value || 1;
              topicScores.set(topic, currentScore + points);
            });
          }
        });
    }

    const userTopics = Array.from(topicScores.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    console.log('Top topic scores:', userTopics);

    // Score articles based on multiple factors with enhanced algorithm
    const scoredArticles = articles
      .filter(article => !recentInteractionMap.has(article.id)) // Exclude recently interacted articles
      .map(article => {
        let score = 0;
        
        // Content-based scoring (40% weight)
        if (article.topic_tags) {
          const topicRelevance = article.topic_tags.reduce((sum, tag) => {
            return sum + (topicScores.get(tag) || 0);
          }, 0) / Math.max(article.topic_tags.length, 1);
          score += topicRelevance * 40;
        }

        // Quality metrics (30% weight)
        const qualityScore = (
          (article.content_quality_score || 0.7) * 10 +
          (article.credibility_score || 0.7) * 10 +
          (1 - (article.bias_score || 0.5)) * 10 // Invert bias - lower is better
        );
        score += qualityScore;
        
        // Engagement and social proof (15% weight)
        score += Math.min((article.engagement_score || 0) * 0.5, 15);
        
        // Recency bonus (15% weight) - exponential decay
        const hoursOld = (Date.now() - new Date(article.published_at || article.created_at).getTime()) / (1000 * 60 * 60);
        const recencyScore = 15 * Math.exp(-hoursOld / 24); // 24-hour half-life
        score += recencyScore;
        
        // Diversity and filtering penalties
        if (preferences?.blocked_sources?.includes(article.source_name)) {
          score *= 0.1;
        }
        
        // Featured/trending bonuses
        if (article.is_featured) score += 10;
        if (article.is_trending) score += 5;
        
        return {
          ...article,
          recommendation_score: Math.max(0, score),
          match_reasons: []
        };
      });

    // Apply balanced mode for political diversity
    let finalArticles = scoredArticles;
    
    if (balancedMode && scoredArticles.length > 0) {
      // Separate articles by political lean and mix them
      const leftLean = scoredArticles.filter(a => (a.sentiment_score || 0.5) < 0.4);
      const center = scoredArticles.filter(a => (a.sentiment_score || 0.5) >= 0.4 && (a.sentiment_score || 0.5) <= 0.6);
      const rightLean = scoredArticles.filter(a => (a.sentiment_score || 0.5) > 0.6);
      
      // Interleave for balanced perspective
      finalArticles = [];
      const maxLength = Math.max(leftLean.length, center.length, rightLean.length);
      for (let i = 0; i < maxLength && finalArticles.length < limit; i++) {
        if (i < center.length) finalArticles.push(center[i]);
        if (i < leftLean.length && finalArticles.length < limit) finalArticles.push(leftLean[i]);
        if (i < rightLean.length && finalArticles.length < limit) finalArticles.push(rightLean[i]);
      }
    }

    // Sort by recommendation score and apply explore ratio
    finalArticles.sort((a, b) => b.recommendation_score - a.recommendation_score);
    
    const exploreCount = Math.floor(limit * exploreRatio);
    const recommendedCount = limit - exploreCount;
    
    // Take top scored + some random for exploration
    const topRecommended = finalArticles.slice(0, recommendedCount);
    const explorePool = finalArticles.slice(recommendedCount);
    const randomExplore = explorePool
      .sort(() => Math.random() - 0.5)
      .slice(0, Math.min(exploreCount, explorePool.length));
    
    const recommendations = [...topRecommended, ...randomExplore]
      .sort((a, b) => b.recommendation_score - a.recommendation_score)
      .slice(0, limit);

    // Get latest timestamp for incremental updates
    const latestTimestamp = recommendations.length > 0 
      ? recommendations[0].published_at || recommendations[0].created_at
      : new Date().toISOString();

    // Only store recommendations if not an incremental update
    if (!since && recommendations.length > 0) {
      const recommendationRecords = recommendations.slice(0, 10).map(article => ({
        user_id: userId,
        article_id: article.id,
        recommendation_score: article.recommendation_score,
        algorithm_used: 'enhanced_hybrid_ai',
        recommendation_reason: `Based on your interests: ${userTopics.slice(0, 2).map(t => t[0]).join(', ')}`,
      }));

      // Clean up old recommendations for this user
      await supabase
        .from('user_recommendations')
        .delete()
        .eq('user_id', userId);

      // Insert new recommendations
      if (recommendationRecords.length > 0) {
        await supabase
          .from('user_recommendations')
          .insert(recommendationRecords);
      }
    }

    console.log(`Generated ${recommendations.length} recommendations for user ${userId}`);

    return new Response(
      JSON.stringify({ 
        articles: recommendations,
        userTopics: userTopics.map(([topic, score]) => ({ topic, score })),
        latest_timestamp: latestTimestamp,
        total_count: recommendations.length
      }), 
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error generating recommendations:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to generate recommendations', 
        details: error.message 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});