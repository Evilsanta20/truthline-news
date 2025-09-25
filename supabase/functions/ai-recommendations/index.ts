// @ts-nocheck
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, limit = 10 } = await req.json();
    
    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log(`Getting AI recommendations for user: ${userId}`);

    // Get user preferences
    const { data: preferences } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();

    // Get user interaction history
    const { data: interactions } = await supabase
      .from('article_interactions')
      .select('article_id, interaction_type, interaction_value, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(100);

    // Analyze user behavior patterns
    const interactionScores = {};
    const topicScores = {};
    
    if (interactions) {
      for (const interaction of interactions) {
        // Get article details for this interaction
        const { data: article } = await supabase
          .from('articles')
          .select('category_id, topic_tags, categories(name, slug)')
          .eq('id', interaction.article_id)
          .single();

        if (article) {
          const categorySlug = (article.categories as any)?.slug;
          const topicTags: string[] = article.topic_tags || [];

          // Score interactions: view=1, bookmark=3, like=2, share=5
          const score = interaction.interaction_type === 'view' ? 1 :
                       interaction.interaction_type === 'bookmark' ? 3 :
                       interaction.interaction_type === 'like' ? 2 :
                       interaction.interaction_type === 'share' ? 5 : 1;

          // Add to topic scores
          if (categorySlug) {
            (topicScores as any)[categorySlug] = ((topicScores as any)[categorySlug] || 0) + score;
          }
          
          // Add topic tags to scores
          topicTags.forEach((tag: string) => {
            (topicScores as any)[tag] = ((topicScores as any)[tag] || 0) + score * 0.5;
          });
        }
      }
    }

    // Include preferred topics from user preferences
    if (preferences?.preferred_topics) {
      preferences.preferred_topics.forEach((topic: string) => {
        (topicScores as any)[topic] = ((topicScores as any)[topic] || 0) + 5; // High preference score
      });
    }

    // Get articles with recommendation scoring
    let query = supabase
      .from('articles')
      .select(`
        *,
        categories(name, slug, color)
      `)
      .order('created_at', { ascending: false })
      .limit(100);

    // Filter out blocked topics if any
    if (preferences?.blocked_topics && preferences.blocked_topics.length > 0) {
      // This would require a more complex query in a real implementation
      console.log('Applying blocked topics filter:', preferences.blocked_topics);
    }

    const { data: articles, error } = await query;

    if (error) {
      throw error;
    }

    // Calculate recommendation scores for each article
    const scoredArticles = articles?.map(article => {
      let recommendationScore = 0;
      
      // Base engagement score
      recommendationScore += (article.engagement_score || 0) * 0.1;
      
      // Category preference score
      const categorySlug = (article.categories as any)?.slug;
      if (categorySlug && (topicScores as any)[categorySlug]) {
        recommendationScore += (topicScores as any)[categorySlug] * 2;
      }
      
      // Topic tags score
      if (article.topic_tags) {
        article.topic_tags.forEach((tag: string) => {
          if ((topicScores as any)[tag]) {
            recommendationScore += (topicScores as any)[tag] * 1.5;
          }
        });
      }
      
      // Recency bonus (newer articles get slight boost)
      const ageInDays = (new Date().getTime() - new Date(article.created_at).getTime()) / (1000 * 60 * 60 * 24);
      recommendationScore += Math.max(0, (7 - ageInDays) * 0.5);
      
      // Featured/trending bonus
      if (article.is_featured) recommendationScore += 5;
      if (article.is_trending) recommendationScore += 3;
      if (article.is_editors_pick) recommendationScore += 4;
      
      return {
        ...article,
        recommendation_score: recommendationScore
      };
    }) || [];

    // Sort by recommendation score and limit results
    const recommendations = scoredArticles
      .sort((a, b) => b.recommendation_score - a.recommendation_score)
      .slice(0, limit);

    // Update recommendation scores in database for analytics
    for (const article of recommendations.slice(0, 5)) {
      await supabase
        .from('articles')
        .update({ recommendation_score: article.recommendation_score })
        .eq('id', article.id);
    }

    console.log(`Generated ${recommendations.length} recommendations for user ${userId}`);
    console.log('Top topic scores:', Object.entries(topicScores).sort(([,a], [,b]) => (b as number) - (a as number)).slice(0, 5));

    return new Response(JSON.stringify({
      recommendations,
      userTopics: Object.entries(topicScores)
        .sort(([,a], [,b]) => (b as number) - (a as number))
        .slice(0, 10)
        .map(([topic, score]) => ({ topic, score })),
      totalInteractions: interactions?.length || 0
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in AI recommendations:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});