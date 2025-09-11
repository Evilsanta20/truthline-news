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

const LOVABLE_REEL_PROMPT = `You are a lovable AI that transforms news articles into engaging, heartwarming short reels. Your personality is warm, friendly, and optimistic.

For every article, create:
1. A catchy, heartwarming headline (max 10-12 words) that makes people feel good
2. A lovable 2-3 line summary that's friendly, simple, and easy to understand
3. Adjust tone based on the user's current mood
4. Keep language light, positive, and relatable - like a friend sharing news

Input format: Article content + User mood profile
Output format: JSON only

{
  "headline": "max 10-12 words, catchy and heartwarming",
  "reel_text": "2-3 lines, friendly and simple explanation", 
  "sentiment": "positive/hopeful/inspiring/informative",
  "tags": ["relevant", "mood-based", "topics"]
}

Mood adaptation guidelines:
- If user is SAD/TIRED: Focus on hope, comfort, gentle positivity
- If user is HAPPY/EXCITED: Match their energy, use enthusiastic tone
- If user is CURIOUS: Emphasize interesting facts, "did you know" style
- If user is CALM: Use peaceful, thoughtful language
- If user is STRESSED: Keep it simple, reassuring, quick to digest

Always maintain a lovable, caring tone regardless of the news topic. Turn negative news into learning opportunities or hopeful perspectives when possible.

Examples:

Sad mood + Tech article:
{
  "headline": "New AI Tool Helps People Feel Less Lonely Online",
  "reel_text": "Sometimes technology can feel overwhelming, but here's something beautiful: scientists created an AI companion that actually listens. It's like having a caring friend who's always there when you need support. 💙",
  "sentiment": "hopeful",
  "tags": ["technology", "mental-health", "connection", "comfort"]
}

Happy mood + Sports article:
{
  "headline": "Underdog Team Wins Championship in Epic Comeback Story!",
  "reel_text": "This is what dreams are made of! A small-town team just proved that heart beats talent every single time. Their victory celebration had everyone in tears of joy - the good kind! 🎉",
  "sentiment": "inspiring", 
  "tags": ["sports", "victory", "inspiration", "celebration"]
}

Return only valid JSON, no explanation.`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { article, userId } = await req.json();
    
    if (!article) {
      throw new Error('Article is required');
    }

    console.log(`Transforming article "${article.title}" into lovable reel for user ${userId}`);
    
    // Get user's current mood profile if available
    let moodContext = "neutral, balanced mood";
    if (userId) {
      const { data: userPrefs } = await supabase
        .from('user_preferences')
        .select('current_mood')
        .eq('user_id', userId)
        .single();
      
      if (userPrefs?.current_mood) {
        const mood = userPrefs.current_mood;
        const toneWords = mood.profile?.tone_words || ['neutral'];
        const energyLevel = mood.profile?.energy_level || 0.5;
        const positivityPref = mood.profile?.positivity_pref || 0.5;
        
        moodContext = `User mood: ${mood.text || ''} ${mood.emoji || ''} (tone: ${toneWords.join(', ')}, energy: ${energyLevel}, positivity preference: ${positivityPref})`;
      }
    }

    // Prepare article content for AI
    const articleContent = `
Title: ${article.title}
Summary: ${article.summary || article.description || ''}
Content: ${article.content ? article.content.substring(0, 1500) : ''}
Source: ${article.source || ''}
Category: ${article.categories?.map(c => c.name).join(', ') || ''}
Topics: ${article.topic_tags?.join(', ') || ''}
`;

    const aiInput = `${articleContent}\n\nUser Context: ${moodContext}`;

    // Transform article using OpenAI
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: LOVABLE_REEL_PROMPT },
          { role: 'user', content: aiInput }
        ],
        temperature: 0.7,
        max_tokens: 300
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const aiResult = await response.json();
    const reelContent = aiResult.choices[0].message.content;
    
    let reelData;
    try {
      reelData = JSON.parse(reelContent);
    } catch (e) {
      console.error('Failed to parse reel JSON:', reelContent);
      // Fallback reel format
      reelData = {
        headline: article.title.length > 60 ? article.title.substring(0, 60) + "..." : article.title,
        reel_text: article.summary || article.description || "Something interesting happened in the world today! 🌟",
        sentiment: "informative",
        tags: article.topic_tags?.slice(0, 3) || ["news"]
      };
    }

    // Add metadata
    const transformedReel = {
      ...reelData,
      original_article_id: article.id,
      transformed_at: new Date().toISOString(),
      user_mood_context: moodContext
    };

    console.log(`Successfully transformed article into lovable reel: "${transformedReel.headline}"`);

    return new Response(JSON.stringify({
      success: true,
      reel: transformedReel
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in lovable-reel-transformer:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});