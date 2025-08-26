import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface FeedbackData {
  userId: string;
  articleId: string;
  feedbackType: 'like' | 'dislike' | 'share' | 'bookmark' | 'hide' | 'report';
  rating?: number;
  relevanceScore?: number;
  qualityFeedback?: string;
  biasFeedback?: string;
}

async function updateUserReadingPatterns(userId: string, articleId: string, feedbackType: string) {
  try {
    // Get article details
    const { data: article } = await supabase
      .from('articles')
      .select('category_id, source_name, topic_tags, bias_score, sentiment_score')
      .eq('id', articleId)
      .single();

    if (!article) return;

    // Get current reading patterns
    const { data: patterns } = await supabase
      .from('user_reading_patterns')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (!patterns) {
      // Create new reading pattern
      await supabase
        .from('user_reading_patterns')
        .insert({
          user_id: userId,
          category_preferences: {},
          topics_of_interest: article.topic_tags || [],
          preferred_sources: [article.source_name],
          total_articles_read: 1,
          engagement_score: feedbackType === 'like' ? 0.7 : 0.5
        });
      return;
    }

    // Update existing patterns
    const updates: any = {
      total_articles_read: patterns.total_articles_read + 1,
      updated_at: new Date().toISOString()
    };

    // Update category preferences
    const categoryPrefs = patterns.category_preferences || {};
    if (article.category_id) {
      const weight = feedbackType === 'like' ? 1 : feedbackType === 'dislike' ? -0.5 : 0.2;
      categoryPrefs[article.category_id] = (categoryPrefs[article.category_id] || 0) + weight;
    }
    updates.category_preferences = categoryPrefs;

    // Update topics of interest
    if (article.topic_tags && feedbackType === 'like') {
      const currentTopics = patterns.topics_of_interest || [];
      const newTopics = [...new Set([...currentTopics, ...article.topic_tags])];
      updates.topics_of_interest = newTopics.slice(0, 20); // Limit to 20 topics
    }

    // Update preferred sources
    if (feedbackType === 'like' || feedbackType === 'bookmark') {
      const currentSources = patterns.preferred_sources || [];
      if (!currentSources.includes(article.source_name)) {
        updates.preferred_sources = [...currentSources, article.source_name].slice(0, 10);
      }
    }

    // Update engagement score
    const engagementBoost = {
      'like': 0.05,
      'bookmark': 0.08,
      'share': 0.1,
      'dislike': -0.03,
      'hide': -0.05,
      'report': -0.1
    }[feedbackType] || 0;

    updates.engagement_score = Math.max(0, Math.min(1, 
      (patterns.engagement_score || 0.5) + engagementBoost
    ));

    // Update bias tolerance based on interaction with biased content
    if (article.bias_score !== null) {
      const currentTolerance = patterns.bias_tolerance || 0.7;
      if (feedbackType === 'like' && article.bias_score < 0.3) {
        // User likes low-bias content
        updates.bias_tolerance = Math.max(0.3, currentTolerance - 0.05);
      } else if (feedbackType === 'dislike' && article.bias_score > 0.7) {
        // User dislikes high-bias content
        updates.bias_tolerance = Math.max(0.3, currentTolerance - 0.05);
      }
    }

    await supabase
      .from('user_reading_patterns')
      .update(updates)
      .eq('user_id', userId);

    console.log(`Updated reading patterns for user ${userId}`);

  } catch (error) {
    console.error('Error updating reading patterns:', error);
  }
}

async function generatePersonalizedRecommendations(userId: string) {
  try {
    // Trigger recommendation generation in background
    EdgeRuntime.waitUntil(
      supabase.functions.invoke('ai-personalized-recommendations', {
        body: { userId }
      }).catch(error => console.error('Recommendation generation error:', error))
    );
  } catch (error) {
    console.error('Error triggering recommendations:', error);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const feedbackData: FeedbackData = await req.json();

    const { userId, articleId, feedbackType, rating, relevanceScore, qualityFeedback, biasFeedback } = feedbackData;

    if (!userId || !articleId || !feedbackType) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: userId, articleId, feedbackType' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing feedback: ${feedbackType} for article ${articleId} by user ${userId}`);

    // Store feedback in database
    const { error: feedbackError } = await supabase
      .from('user_feedback')
      .insert({
        user_id: userId,
        article_id: articleId,
        feedback_type: feedbackType,
        rating: rating || null,
        relevance_score: relevanceScore || null,
        quality_feedback: qualityFeedback || null,
        bias_feedback: biasFeedback || null,
        created_at: new Date().toISOString()
      });

    if (feedbackError) {
      // If it's a duplicate, update existing feedback
      if (feedbackError.code === '23505') {
        await supabase
          .from('user_feedback')
          .update({
            rating: rating || null,
            relevance_score: relevanceScore || null,
            quality_feedback: qualityFeedback || null,
            bias_feedback: biasFeedback || null,
            created_at: new Date().toISOString()
          })
          .eq('user_id', userId)
          .eq('article_id', articleId)
          .eq('feedback_type', feedbackType);
      } else {
        throw feedbackError;
      }
    }

    // Record interaction for analytics
    const interactionValue = {
      'like': 2,
      'dislike': -1,
      'bookmark': 3,
      'share': 5,
      'hide': -2,
      'report': -5
    }[feedbackType] || 1;

    await supabase
      .from('article_interactions')
      .insert({
        user_id: userId,
        article_id: articleId,
        interaction_type: feedbackType,
        interaction_value: interactionValue,
        created_at: new Date().toISOString()
      });

    // Update user reading patterns based on feedback
    await updateUserReadingPatterns(userId, articleId, feedbackType);

    // Trigger personalized recommendation generation
    await generatePersonalizedRecommendations(userId);

    // Update article engagement score
    await supabase
      .from('articles')
      .update({
        engagement_score: supabase.sql`COALESCE(engagement_score, 0) + ${interactionValue}`
      })
      .eq('id', articleId);

    console.log(`Successfully processed ${feedbackType} feedback for article ${articleId}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Feedback processed successfully',
        feedbackType,
        impact: 'Reading preferences updated and recommendations refreshed'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error processing user feedback:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to process feedback', 
        details: error.message 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});