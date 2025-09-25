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

const LOVABLE_CONTENT_REFINER_PROMPT = `You are a lovable AI editor that transforms raw news articles into warm, balanced, and safe content. Your goal is to make news feel like it's being shared by a caring friend.

CORE TRANSFORMATION RULES:
1. REMOVE BIAS & POLARIZATION: Strip out partisan language, extreme viewpoints, and inflammatory rhetoric
2. REDUCE TOXICITY: Replace harsh, offensive, or aggressive wording with calm, kind alternatives
3. MAINTAIN AUTHENTICITY: Keep all essential facts and context - never change the core truth
4. ADD LOVABLE VIBES: Write with warmth, empathy, and gentle optimism
5. KEEP IT ENGAGING: Make it interesting but not sensational

TONE GUIDELINES:
- Write like a thoughtful, caring friend sharing important news
- Use gentle, understanding language
- Focus on human impact and community aspects when possible
- Present challenges as opportunities for growth or learning
- Acknowledge difficulties while maintaining hope
- Use inclusive, accessible language

INPUT: Raw article with title, content, source info
OUTPUT: Only valid JSON in this exact format:

{
  "title": "A refined, neutral, lovable headline (max 80 chars)",
  "article": "Complete rewritten article maintaining all facts but with lovable tone",
  "sentiment": "positive/neutral/calm",
  "tags": ["main", "topic", "keywords"],
  "reel_text": "2-3 line lovable summary perfect for social sharing"
}

EXAMPLES OF TRANSFORMATION:

HARSH ORIGINAL: "Politicians SLAM new policy in heated debate"
LOVABLE VERSION: "Leaders discuss different perspectives on new policy"

TOXIC ORIGINAL: "Company executives greedily pocket millions while workers suffer"
LOVABLE VERSION: "New focus on fair compensation as company reports strong earnings"

BIASED ORIGINAL: "Radical protesters disrupt peaceful event"
LOVABLE VERSION: "Community voices different viewpoints at local gathering"

Remember: Never lose important facts, but always present them with kindness and balance. Make readers feel informed and cared for, not anxious or angry.

Return only valid JSON, no explanation.`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { article, action = 'refine' } = await req.json();
    
    if (!article) {
      throw new Error('Article is required');
    }

    if (action === 'refine') {
      console.log(`🌟 Refining article: "${article.title?.substring(0, 50)}..."`);
      
      // Prepare article content for AI
      const rawContent = `
TITLE: ${article.title || 'Untitled'}
SOURCE: ${article.source || article.source_name || 'Unknown'}
CONTENT: ${article.content || article.description || article.summary || ''}
URL: ${article.url || ''}
PUBLISHED: ${article.published_at || article.publishedAt || ''}
      `.trim();

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
            { role: 'system', content: LOVABLE_CONTENT_REFINER_PROMPT },
            { role: 'user', content: rawContent }
          ],
          temperature: 0.7,
          max_tokens: 2000
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.statusText}`);
      }

      const aiResult = await response.json();
      const refinedContent = aiResult.choices[0].message.content;
      
      let refinedData;
      try {
        refinedData = JSON.parse(refinedContent);
      } catch (e) {
        console.error('Failed to parse refined content JSON:', refinedContent);
        // Fallback refined format
        refinedData = {
          title: article.title?.substring(0, 80) || "News Update",
          article: article.content || article.description || "Something interesting happened in our community today.",
          sentiment: "neutral",
          tags: article.topic_tags?.slice(0, 5) || ["news"],
          reel_text: article.summary?.substring(0, 150) || "An important update from our community."
        };
      }

      // Add metadata
      const transformedArticle = {
        ...refinedData,
        original_article_id: article.id,
        original_source: article.source || article.source_name,
        original_url: article.url,
        refined_at: new Date().toISOString(),
        refinement_type: 'lovable_content_refiner'
      };

      console.log(`✨ Successfully refined article: "${transformedArticle.title}"`);

      return new Response(JSON.stringify({
        success: true,
        refined_article: transformedArticle
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } else if (action === 'batch_refine') {
      const { articles } = await req.json();
      
      if (!articles || !Array.isArray(articles)) {
        throw new Error('Articles array is required for batch refine');
      }

      console.log(`🌟 Batch refining ${articles.length} articles`);
      
      const refinedArticles = [];
      
      // Process articles in smaller batches to avoid API limits
      for (let i = 0; i < articles.length; i += 3) {
        const batch = articles.slice(i, i + 3);
        const batchPromises = batch.map(async (article) => {
          try {
            const singleRefineResponse = await fetch(`${req.url}`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': req.headers.get('Authorization') || ''
              },
              body: JSON.stringify({ article, action: 'refine' })
            });

            if (singleRefineResponse.ok) {
              const result = await singleRefineResponse.json();
              return result.refined_article;
            }
            return null;
          } catch (error) {
            console.error(`Error refining article ${article.id}:`, error);
            return null;
          }
        });

        const batchResults = await Promise.all(batchPromises);
        const validResults = batchResults.filter(result => result !== null);
        refinedArticles.push(...validResults);
        
        // Small delay between batches
        if (i + 3 < articles.length) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      console.log(`✨ Batch refined ${refinedArticles.length}/${articles.length} articles`);

      return new Response(JSON.stringify({
        success: true,
        refined_articles: refinedArticles,
        processed: articles.length,
        successful: refinedArticles.length
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    throw new Error('Invalid action');

  } catch (error) {
    console.error('Error in lovable-content-refiner:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});