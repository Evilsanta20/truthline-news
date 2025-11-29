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

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'userId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // If no articleIds provided, fetch from interactions
    let finalArticleIds = articleIds;
    if (!articleIds || articleIds.length === 0) {
      console.log('No articleIds provided, fetching from interactions...');
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const { data: interactions, error: interactionsError } = await supabase
        .from('article_interactions')
        .select('article_id')
        .eq('user_id', userId)
        .gte('created_at', todayStart.toISOString())
        .order('created_at', { ascending: false })
        .limit(30);

      if (interactionsError) {
        console.error('Error fetching interactions:', interactionsError);
      } else {
        finalArticleIds = [...new Set(interactions?.map((i: any) => i.article_id) || [])];
        console.log(`Found ${finalArticleIds.length} interactions for user ${userId}`);
      }
    }

    if (!finalArticleIds || finalArticleIds.length === 0) {
      console.log('No articles to process for digest');
      return new Response(
        JSON.stringify({ 
          summary: "You haven't read any articles today yet. Start exploring to see your daily digest!",
          highlights: ["Try browsing the news feed to discover interesting stories", "Bookmark articles you want to read later", "Check back here to see your personalized digest"],
          topics: [],
          sources: [],
          articleCount: 0,
          generatedAt: new Date().toISOString()
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch the articles
    console.log(`Fetching ${finalArticleIds.length} articles...`);
    const { data: articles, error: articlesError } = await supabase
      .from('articles')
      .select('id, title, description, source_name, topic_tags, published_at, content')
      .in('id', finalArticleIds)
      .order('published_at', { ascending: false })
      .limit(20);

    if (articlesError) {
      console.error('Error fetching articles:', articlesError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch articles' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!articles || articles.length === 0) {
      console.log('No articles found in database');
      return new Response(
        JSON.stringify({ 
          summary: "No articles available for your digest. Articles may have expired or been removed.",
          highlights: ["Try reading some new articles", "Your digest will update automatically as you read"],
          topics: [],
          sources: [],
          articleCount: 0,
          generatedAt: new Date().toISOString()
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing ${articles.length} articles for digest`);

    // Prepare article data for AI with more detail
    const articleSummaries = articles.map((a: any) => {
      const content = a.content ? a.content.substring(0, 300) : (a.description || '');
      return `Title: "${a.title}"
Source: ${a.source_name}
Topics: ${(a.topic_tags || []).join(', ')}
Summary: ${content}
Published: ${new Date(a.published_at).toLocaleDateString()}
---`;
    }).join('\n\n');

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
            content: `You are an expert news curator creating personalized daily digests. Your digests should be:
- Engaging and conversational
- Focus on connecting themes across articles
- Highlight the most important facts and developments
- Provide context and insights
- Be concise but informative (150-200 words)

Create a digest that feels like a smart friend catching you up on what matters.`
          },
          {
            role: 'user',
            content: `Create my daily news digest from these ${articles.length} articles I've engaged with today. Find connections, highlight what's important, and give me the key takeaways:\n\n${articleSummaries}`
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
                    description: 'An engaging 2-3 paragraph summary (150-200 words) that connects themes and highlights what matters most. Make it conversational and insightful.'
                  },
                  highlights: {
                    type: 'array',
                    description: 'Array of 4-6 specific, actionable key highlights or important facts. Each should be a complete, clear statement.',
                    items: { type: 'string' },
                    minItems: 4,
                    maxItems: 6
                  },
                  mainTopics: {
                    type: 'array',
                    description: 'Array of 3-5 main topics or themes (not just keywords, but meaningful topics like "Climate Policy Changes" not just "Climate")',
                    items: { type: 'string' },
                    minItems: 3,
                    maxItems: 5
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