// @ts-nocheck
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface MoodProfile {
  want_depth: number;
  positivity_pref: number; 
  length_tolerance: number;
  topic_biases: Record<string, number>;
  tone_words: string[];
  energy_level: number;
  curiosity_level: number;
}

const MOOD_PROMPT = `You are an assistant that converts a user's mood description into a JSON mood profile.
Input: mood text, emoji, and optional context tags.
Output JSON with these exact fields:
{
  "want_depth": 0.0-1.0 (how much detailed analysis they want),
  "positivity_pref": 0.0-1.0 (preference for positive vs neutral/negative news),
  "length_tolerance": 0.0-1.0 (tolerance for longer articles),
  "topic_biases": {"AI":0.0-1.0, "Politics":0.0-1.0, "Technology":0.0-1.0, "Health":0.0-1.0, "Business":0.0-1.0, "Sports":0.0-1.0, "Entertainment":0.0-1.0},
  "tone_words": ["calm","focused","curious","relaxed","energetic","analytical"],
  "energy_level": 0.0-1.0 (how energetic/active they feel),
  "curiosity_level": 0.0-1.0 (how curious/exploratory they feel)
}

Examples:
Input: "Feeling curious but tired 😐, want something light yet insightful"
Output: {"want_depth":0.6,"positivity_pref":0.7,"length_tolerance":0.3,"topic_biases":{"AI":0.7,"Politics":0.2,"Technology":0.8,"Health":0.5,"Business":0.4,"Sports":0.3,"Entertainment":0.6},"tone_words":["curious","tired","contemplative"],"energy_level":0.3,"curiosity_level":0.8}

Input: "Stressed about work 😟, need some uplifting quick reads"
Output: {"want_depth":0.2,"positivity_pref":0.9,"length_tolerance":0.2,"topic_biases":{"AI":0.3,"Politics":0.1,"Technology":0.4,"Health":0.8,"Business":0.3,"Sports":0.6,"Entertainment":0.9},"tone_words":["stressed","seeking-comfort","quick"],"energy_level":0.4,"curiosity_level":0.3}

Input: "Excited and ready to learn! 😃 Want to dive deep into tech news"
Output: {"want_depth":0.9,"positivity_pref":0.6,"length_tolerance":0.9,"topic_biases":{"AI":0.9,"Politics":0.3,"Technology":0.95,"Health":0.4,"Business":0.7,"Sports":0.2,"Entertainment":0.3},"tone_words":["excited","eager","focused","analytical"],"energy_level":0.9,"curiosity_level":0.95}

Return only valid JSON, no explanation.`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, userId, moodText, emoji, contextTags, moodProfile } = await req.json();
    
    if (action === 'processMood') {
      console.log(`Processing mood for user ${userId}: "${moodText}" ${emoji}`);
      
      // Convert mood text to structured profile using OpenAI
      const moodInput = `${moodText || ''} ${emoji || ''} ${contextTags ? `Tags: ${contextTags.join(', ')}` : ''}`.trim();
      
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: MOOD_PROMPT },
            { role: 'user', content: moodInput }
          ],
          temperature: 0.3,
          max_tokens: 500
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.statusText}`);
      }

      const aiResult = await response.json();
      const moodProfileJson = aiResult.choices[0].message.content;
      
      let parsedMoodProfile: MoodProfile;
      try {
        parsedMoodProfile = JSON.parse(moodProfileJson);
      } catch (e) {
        console.error('Failed to parse mood profile JSON:', moodProfileJson);
        // Fallback mood profile
        parsedMoodProfile = {
          want_depth: 0.5,
          positivity_pref: 0.6,
          length_tolerance: 0.5,
          topic_biases: {
            "AI": 0.5, "Politics": 0.4, "Technology": 0.6, 
            "Health": 0.5, "Business": 0.4, "Sports": 0.3, "Entertainment": 0.4
          },
          tone_words: ["neutral"],
          energy_level: 0.5,
          curiosity_level: 0.5
        };
      }

      // Save mood to user preferences
      const moodEntry = {
        text: moodText,
        emoji: emoji,
        context_tags: contextTags || [],
        profile: parsedMoodProfile,
        timestamp: new Date().toISOString()
      };

      // Update user preferences with current mood
      const { error: updateError } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: userId,
          current_mood: moodEntry,
          mood_last_updated: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });

      if (updateError) {
        console.error('Error saving mood:', updateError);
      }

      // Get personalized recommendations based on mood
      const recommendations = await getMoodBasedRecommendations(userId, parsedMoodProfile);

      console.log(`Generated ${recommendations.length} mood-based recommendations`);

      return new Response(JSON.stringify({
        success: true,
        moodProfile: parsedMoodProfile,
        recommendations: recommendations,
        moodEntry: moodEntry
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } else if (action === 'saveMoodPreset') {
      const { name, moodProfile } = await req.json();
      
      // Get current presets
      const { data: prefs } = await supabase
        .from('user_preferences')
        .select('mood_presets')
        .eq('user_id', userId)
        .single();

      const currentPresets = prefs?.mood_presets || [];
      const newPresets = [...currentPresets, { name, profile: moodProfile, created_at: new Date().toISOString() }];

      // Update presets
      const { error } = await supabase
        .from('user_preferences')
        .update({ mood_presets: newPresets })
        .eq('user_id', userId);

      if (error) throw error;

      return new Response(JSON.stringify({ success: true, presets: newPresets }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } else if (action === 'getMoodRecommendations') {
      const { data: prefs } = await supabase
        .from('user_preferences')
        .select('current_mood')
        .eq('user_id', userId)
        .single();

      if (!prefs?.current_mood?.profile) {
        return new Response(JSON.stringify({ recommendations: [] }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const recommendations = await getMoodBasedRecommendations(userId, prefs.current_mood.profile);

      return new Response(JSON.stringify({ recommendations }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in mood-processor:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function getMoodBasedRecommendations(userId: string, moodProfile: MoodProfile) {
  try {
    // Get articles with mood-relevant fields
    const { data: articles, error } = await supabase
      .from('articles')
      .select(`
        *,
        categories (name, slug, color)
      `)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error || !articles) {
      console.error('Error fetching articles:', error);
      return [];
    }

    // Score articles based on mood profile
    const scoredArticles = articles.map(article => {
      let score = 0;
      let reasons: string[] = [];

      // Depth preference scoring
      const depthScore = article.mood_depth_score || 0.5;
      const depthMatch = 1 - Math.abs(moodProfile.want_depth - depthScore);
      score += depthMatch * 0.25;
      if (depthMatch > 0.7) reasons.push(`Matches your depth preference (${Math.round(depthMatch * 100)}%)`);

      // Positivity preference scoring  
      const positivityScore = article.mood_positivity_score || 0.5;
      const positivityMatch = 1 - Math.abs(moodProfile.positivity_pref - positivityScore);
      score += positivityMatch * 0.2;
      if (positivityMatch > 0.7) reasons.push(`Matches your mood tone (${Math.round(positivityMatch * 100)}%)`);

      // Length preference scoring
      const articleLength = article.estimated_read_time || 3;
      const lengthPreference = moodProfile.length_tolerance * 20; // Scale to minutes
      const lengthMatch = Math.max(0, 1 - Math.abs(lengthPreference - articleLength) / 20);
      score += lengthMatch * 0.15;
      if (lengthMatch > 0.6) reasons.push(`Good read length for your mood (${articleLength}min)`);

      // Topic bias scoring
      const topicTags = article.topic_tags || [];
      let topicScore = 0;
      let topicMatches = 0;
      
      topicTags.forEach(tag => {
        const normalizedTag = tag.toLowerCase();
        Object.entries(moodProfile.topic_biases).forEach(([topic, bias]) => {
          if (normalizedTag.includes(topic.toLowerCase()) || topic.toLowerCase().includes(normalizedTag)) {
            topicScore += bias;
            topicMatches++;
            if (bias > 0.7) reasons.push(`High interest in ${topic}`);
          }
        });
      });
      
      if (topicMatches > 0) {
        score += (topicScore / topicMatches) * 0.3;
      }

      // Quality and engagement boost
      const qualityBoost = (article.content_quality_score || 0.7) * 0.1;
      const engagementBoost = Math.min((article.engagement_score || 0) / 100, 0.1);
      score += qualityBoost + engagementBoost;

      // Add some randomness for discovery
      score += Math.random() * 0.1;

      return {
        ...article,
        mood_recommendation_score: Math.round(score * 100),
        mood_match_reasons: reasons
      };
    });

    // Sort by mood recommendation score and return top results
    const recommendations = scoredArticles
      .filter(article => article.mood_recommendation_score > 30)
      .sort((a, b) => b.mood_recommendation_score - a.mood_recommendation_score)
      .slice(0, 30);

    // Store mood recommendations in database
    const moodRecommendations = recommendations.map(article => ({
      user_id: userId,
      article_id: article.id,
      mood_profile: moodProfile,
      recommendation_score: article.mood_recommendation_score,
      mood_match_reasons: article.mood_match_reasons
    }));

    if (moodRecommendations.length > 0) {
      await supabase
        .from('mood_recommendations')
        .insert(moodRecommendations)
        .onConflict('user_id, article_id')
        .ignoreDuplicates();
    }

    return recommendations;

  } catch (error) {
    console.error('Error generating mood recommendations:', error);
    return [];
  }
}