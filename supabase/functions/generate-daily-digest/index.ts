import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, articleIds } = await req.json();

    if (!userId || !articleIds || articleIds.length === 0) {
      return new Response(
        JSON.stringify({ error: 'userId and articleIds are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch the articles
    const { data: articles, error: articlesError } = await supabase
      .from('articles')
      .select('id, title, description, source_name, topic_tags, published_at')
      .in('id', articleIds)
      .limit(20); // Limit to last 20 articles

    if (articlesError) {
      console.error('Error fetching articles:', articlesError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch articles' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!articles || articles.length === 0) {
      return new Response(
        JSON.stringify({ 
          summary: 'No articles read today yet. Start reading to see your daily digest!',
          highlights: [],
          topics: [],
          sources: [],
          articleCount: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prepare article data for AI
    const articleSummaries = articles.map(a => 
      `- "${a.title}" from ${a.source_name} (Topics: ${(a.topic_tags || []).join(', ')}): ${a.description || 'No description'}`
    ).join('\n');

    // Call Lovable AI to generate digest
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are a news digest assistant. Create a concise, engaging daily digest summary from the articles the user has read. Focus on:
1. Main themes and trending topics
2. Key highlights and important facts
3. Diverse perspectives if present
4. Notable sources

Keep the summary under 200 words and make it engaging and informative.`
          },
          {
            role: 'user',
            content: `Generate a daily digest summary for these ${articles.length} articles I read today:\n\n${articleSummaries}`
          }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'create_digest',
              description: 'Create a structured daily digest with summary and highlights',
              parameters: {
                type: 'object',
                properties: {
                  summary: {
                    type: 'string',
                    description: 'A concise 2-3 sentence overview of the main themes'
                  },
                  highlights: {
                    type: 'array',
                    description: 'Array of 3-5 key highlights or facts from the articles',
                    items: { type: 'string' }
                  },
                  mainTopics: {
                    type: 'array',
                    description: 'Array of 3-5 main topics covered',
                    items: { type: 'string' }
                  }
                },
                required: ['summary', 'highlights', 'mainTopics'],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'create_digest' } }
      })
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits depleted. Please add credits to continue.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      console.error('AI API error:', aiResponse.status, await aiResponse.text());
      return new Response(
        JSON.stringify({ error: 'Failed to generate digest' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall) {
      return new Response(
        JSON.stringify({ error: 'Failed to parse AI response' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const digest = JSON.parse(toolCall.function.arguments);

    // Extract unique topics and sources
    const allTopics = new Set<string>();
    const allSources = new Set<string>();
    
    articles.forEach(article => {
      (article.topic_tags || []).forEach((tag: string) => allTopics.add(tag));
      if (article.source_name) allSources.add(article.source_name);
    });

    return new Response(
      JSON.stringify({
        summary: digest.summary,
        highlights: digest.highlights,
        topics: digest.mainTopics || Array.from(allTopics).slice(0, 5),
        sources: Array.from(allSources),
        articleCount: articles.length,
        generatedAt: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-daily-digest:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});