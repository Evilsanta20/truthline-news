// @ts-nocheck
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface ContentAnalysis {
  biasScore: number;
  credibilityScore: number;
  sentimentScore: number;
  polarizationScore: number;
  contentQualityScore: number;
  summary: string;
  readingTimeMinutes: number;
}

async function analyzeContentWithAI(title: string, content: string, source: string): Promise<ContentAnalysis> {
  const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
  if (!openAIApiKey) {
    throw new Error('OpenAI API key not configured');
  }

  const prompt = `
Analyze this news article for bias, credibility, sentiment, and quality. Provide scores from 0-1 and a neutral summary.

Title: ${title}
Source: ${source}
Content: ${content.substring(0, 3000)}...

Please respond with a JSON object containing:
- biasScore: 0 (very biased) to 1 (neutral/balanced)
- credibilityScore: 0 (low credibility) to 1 (highly credible)
- sentimentScore: 0 (very negative) to 1 (very positive), 0.5 = neutral
- polarizationScore: 0 (not polarizing) to 1 (highly polarizing)
- contentQualityScore: 0 (poor quality) to 1 (excellent quality)
- summary: A neutral, factual 2-3 sentence summary
- readingTimeMinutes: Estimated reading time in minutes

Consider:
- Language tone and word choice for bias detection
- Source reputation and factual accuracy for credibility
- Emotional language and controversial topics for polarization
- Grammar, structure, and informativeness for quality
- Controversial keywords, political slant, inflammatory language
`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        messages: [
          { 
            role: 'system', 
            content: 'You are an expert media analyst specializing in bias detection, fact-checking, and content quality assessment. Always respond with valid JSON.' 
          },
          { role: 'user', content: prompt }
        ],
        max_completion_tokens: 1000,
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const analysis = JSON.parse(data.choices[0].message.content);
    
    return {
      biasScore: Math.max(0, Math.min(1, analysis.biasScore || 0.5)),
      credibilityScore: Math.max(0, Math.min(1, analysis.credibilityScore || 0.7)),
      sentimentScore: Math.max(0, Math.min(1, analysis.sentimentScore || 0.5)),
      polarizationScore: Math.max(0, Math.min(1, analysis.polarizationScore || 0.3)),
      contentQualityScore: Math.max(0, Math.min(1, analysis.contentQualityScore || 0.7)),
      summary: analysis.summary || 'Summary not available',
      readingTimeMinutes: Math.max(1, analysis.readingTimeMinutes || 3)
    };

  } catch (error) {
    console.error('Error analyzing content:', error);
    // Return default values if AI analysis fails
    return {
      biasScore: 0.5,
      credibilityScore: 0.7,
      sentimentScore: 0.5,
      polarizationScore: 0.3,
      contentQualityScore: 0.7,
      summary: 'AI analysis not available',
      readingTimeMinutes: Math.ceil(content.length / 200) // Rough estimate
    };
  }
}

async function generateContentEmbedding(text: string): Promise<number[]> {
  const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
  if (!openAIApiKey) {
    throw new Error('OpenAI API key not configured');
  }

  try {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: text.substring(0, 8000), // Limit input length
        dimensions: 1536
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI Embeddings API error: ${response.status}`);
    }

    const data = await response.json();
    return data.data[0].embedding;
  } catch (error) {
    console.error('Error generating embedding:', error);
    return new Array(1536).fill(0); // Return zero vector if embedding fails
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { articleId, title, content, source } = await req.json();

    if (!articleId || !title || !content) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: articleId, title, content' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Analyzing content for article: ${articleId}`);

    // Run AI analysis and embedding generation in parallel
    const [analysis, embedding] = await Promise.all([
      analyzeContentWithAI(title, content, source || 'Unknown'),
      generateContentEmbedding(`${title} ${content}`)
    ]);

    // Update article with AI analysis results
    const { error: updateError } = await supabase
      .from('articles')
      .update({
        bias_score: analysis.biasScore,
        credibility_score: analysis.credibilityScore,
        sentiment_score: analysis.sentimentScore,
        polarization_score: analysis.polarizationScore,
        content_quality_score: analysis.contentQualityScore,
        ai_summary: analysis.summary,
        reading_time_minutes: analysis.readingTimeMinutes,
        content_embedding: JSON.stringify(embedding),
        ai_processed_at: new Date().toISOString()
      })
      .eq('id', articleId);

    if (updateError) {
      throw new Error(`Database update error: ${updateError.message}`);
    }

    console.log(`Successfully analyzed article ${articleId}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        analysis,
        message: 'Article analyzed successfully' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in AI content analysis:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to analyze content', 
        details: error.message 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});