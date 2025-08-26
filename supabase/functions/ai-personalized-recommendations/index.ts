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

interface UserPreferences {
  categoryPreferences: Record<string, number>;
  biasTolerance: number;
  sentimentPreference: number;
  topicsOfInterest: string[];
  preferredSources: string[];
  readingTimePreference: number;
  engagementScore: number;
}

interface RecommendationScore {
  articleId: string;
  score: number;
  reason: string;
  algorithm: string;
}

async function getUserPreferences(userId: string): Promise<UserPreferences> {
  const { data: patterns } = await supabase
    .from('user_reading_patterns')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (!patterns) {
    // Return default preferences for new users
    return {
      categoryPreferences: {},
      biasTolerance: 0.7,
      sentimentPreference: 0.5,
      topicsOfInterest: [],
      preferredSources: [],
      readingTimePreference: 5,
      engagementScore: 0.5
    };
  }

  return {
    categoryPreferences: patterns.category_preferences || {},
    biasTolerance: patterns.bias_tolerance || 0.7,
    sentimentPreference: patterns.sentiment_preference || 0.5,
    topicsOfInterest: patterns.topics_of_interest || [],
    preferredSources: patterns.preferred_sources || [],
    readingTimePreference: patterns.reading_time_preference || 5,
    engagementScore: patterns.engagement_score || 0.5
  };
}

async function getUserInteractionHistory(userId: string): Promise<any[]> {
  const { data: interactions } = await supabase
    .from('article_interactions')
    .select(`
      *,
      articles (
        id, title, category_id, source_name, bias_score, 
        sentiment_score, content_quality_score, topic_tags
      )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(100);

  return interactions || [];
}

async function getContentBasedRecommendations(
  userId: string, 
  preferences: UserPreferences,
  interactions: any[]
): Promise<RecommendationScore[]> {
  
  // Get user's preferred topics based on interaction history
  const topicScores: Record<string, number> = {};
  interactions.forEach(interaction => {
    if (interaction.articles?.topic_tags) {
      interaction.articles.topic_tags.forEach((topic: string) => {
        topicScores[topic] = (topicScores[topic] || 0) + 
          (interaction.interaction_type === 'like' ? 2 : 
           interaction.interaction_type === 'bookmark' ? 3 : 1);
      });
    }
  });

  console.log('Top topic scores:', Object.entries(topicScores).sort((a, b) => b[1] - a[1]).slice(0, 5));

  // Get articles that match user preferences and haven't been interacted with
  const interactedArticleIds = interactions.map(i => i.article_id);
  
  const { data: candidateArticles } = await supabase
    .from('articles')
    .select('*')
    .not('id', 'in', `(${interactedArticleIds.join(',') || 'null'})`)
    .gte('content_quality_score', 0.6) // Filter for quality content
    .gte('credibility_score', 0.6)
    .lte('polarization_score', 0.7) // Avoid highly polarizing content
    .order('created_at', { ascending: false })
    .limit(100);

  if (!candidateArticles) return [];

  const recommendations: RecommendationScore[] = [];

  candidateArticles.forEach(article => {
    let score = 0.5; // Base score
    let reasons: string[] = [];

    // Content quality factor
    score += (article.content_quality_score - 0.5) * 0.2;
    if (article.content_quality_score > 0.8) {
      reasons.push('high quality content');
    }

    // Bias tolerance
    const biasDistance = Math.abs(article.bias_score - 0.5);
    if (biasDistance <= preferences.biasTolerance) {
      score += 0.15;
      reasons.push('matches bias preference');
    } else {
      score -= 0.1;
    }

    // Sentiment preference
    const sentimentDistance = Math.abs(article.sentiment_score - preferences.sentimentPreference);
    score += (1 - sentimentDistance) * 0.1;

    // Topic matching
    if (article.topic_tags) {
      const topicMatch = article.topic_tags.some((tag: string) => topicScores[tag] > 0);
      if (topicMatch) {
        const topicBoost = Math.max(...article.topic_tags.map((tag: string) => topicScores[tag] || 0)) * 0.001;
        score += topicBoost;
        reasons.push('matches reading interests');
      }
    }

    // Source preference
    if (preferences.preferredSources.includes(article.source_name)) {
      score += 0.1;
      reasons.push('preferred source');
    }

    // Reading time preference
    if (article.reading_time_minutes <= preferences.readingTimePreference) {
      score += 0.05;
      reasons.push('suitable length');
    }

    // Credibility boost
    score += (article.credibility_score - 0.5) * 0.15;

    // Freshness factor (newer articles get slight boost)
    const hoursOld = (Date.now() - new Date(article.created_at).getTime()) / (1000 * 60 * 60);
    if (hoursOld < 24) {
      score += 0.05;
      reasons.push('recent news');
    }

    recommendations.push({
      articleId: article.id,
      score: Math.max(0, Math.min(1, score)),
      reason: reasons.join(', ') || 'general recommendation',
      algorithm: 'content-based'
    });
  });

  return recommendations.sort((a, b) => b.score - a.score).slice(0, 20);
}

async function getCollaborativeRecommendations(
  userId: string,
  preferences: UserPreferences
): Promise<RecommendationScore[]> {
  
  // Find users with similar preferences and interactions
  const { data: similarUsers } = await supabase
    .from('user_reading_patterns')
    .select('user_id, engagement_score, category_preferences')
    .neq('user_id', userId)
    .gte('engagement_score', preferences.engagementScore - 0.2)
    .lte('engagement_score', preferences.engagementScore + 0.2)
    .limit(50);

  if (!similarUsers || similarUsers.length === 0) {
    return [];
  }

  // Get highly rated articles from similar users
  const similarUserIds = similarUsers.map(u => u.user_id);
  
  const { data: positiveInteractions } = await supabase
    .from('article_interactions')
    .select('article_id, COUNT(*) as interaction_count')
    .in('user_id', similarUserIds)
    .in('interaction_type', ['like', 'bookmark', 'share'])
    .order('interaction_count', { ascending: false })
    .limit(20);

  if (!positiveInteractions) return [];

  const recommendations: RecommendationScore[] = positiveInteractions.map(interaction => ({
    articleId: interaction.article_id,
    score: Math.min(0.8, 0.4 + (interaction.interaction_count * 0.05)),
    reason: 'liked by similar users',
    algorithm: 'collaborative'
  }));

  return recommendations;
}

async function generateHybridRecommendations(userId: string): Promise<RecommendationScore[]> {
  const preferences = await getUserPreferences(userId);
  const interactions = await getUserInteractionHistory(userId);

  // Run both recommendation algorithms
  const [contentBased, collaborative] = await Promise.all([
    getContentBasedRecommendations(userId, preferences, interactions),
    getCollaborativeRecommendations(userId, preferences)
  ]);

  // Combine and weight recommendations
  const combinedScores: Record<string, RecommendationScore> = {};

  // Add content-based recommendations with 70% weight
  contentBased.forEach(rec => {
    combinedScores[rec.articleId] = {
      ...rec,
      score: rec.score * 0.7,
      algorithm: 'hybrid'
    };
  });

  // Add collaborative recommendations with 30% weight
  collaborative.forEach(rec => {
    if (combinedScores[rec.articleId]) {
      combinedScores[rec.articleId].score += rec.score * 0.3;
      combinedScores[rec.articleId].reason += `, ${rec.reason}`;
    } else {
      combinedScores[rec.articleId] = {
        ...rec,
        score: rec.score * 0.3,
        algorithm: 'hybrid'
      };
    }
  });

  return Object.values(combinedScores)
    .sort((a, b) => b.score - a.score)
    .slice(0, 20);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId } = await req.json();

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'Missing userId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Getting AI recommendations for user: ${userId}`);

    const recommendations = await generateHybridRecommendations(userId);

    // Store recommendations in database
    if (recommendations.length > 0) {
      const recommendationData = recommendations.map(rec => ({
        user_id: userId,
        article_id: rec.articleId,
        recommendation_score: rec.score,
        recommendation_reason: rec.reason,
        algorithm_used: rec.algorithm,
        created_at: new Date().toISOString()
      }));

      // Clear old recommendations
      await supabase
        .from('user_recommendations')
        .delete()
        .eq('user_id', userId);

      // Insert new recommendations
      await supabase
        .from('user_recommendations')
        .insert(recommendationData);

      console.log(`Generated ${recommendations.length} recommendations for user ${userId}`);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        recommendations: recommendations.slice(0, 10),
        count: recommendations.length
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