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

interface ContentQualityScores {
  toxicity_score: number;
  bias_score: number;
  sensationalism_score: number;
  political_polarity: number;
  subjectivity: number;
  factuality_score: number;
  content_quality_score: number;
  credibility_score: number;
  explanations: string[];
}

interface ContentAnalysisRequest {
  title: string;
  content: string;
  source_name: string;
  url: string;
  author?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { title, content, source_name, url, author }: ContentAnalysisRequest = await req.json();

    console.log(`Analyzing content: "${title}" from ${source_name}`);

    // Step 1: Hard content filters (immediate rejection)
    const hardFilterResult = applyHardFilters({ title, content, source_name, url, author });
    if (!hardFilterResult.passes) {
      return new Response(
        JSON.stringify({ 
          passes_quality_check: false, 
          rejection_reason: hardFilterResult.reason,
          scores: null
        }), 
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 2: AI-powered content quality scoring
    const scores = await analyzeContentQuality({ title, content, source_name, url, author });
    
    // Step 3: Apply soft filters based on scores
    const softFilterResult = applySoftFilters(scores);
    
    // Step 4: Generate neutral summaries if content passes
    let summaries = null;
    if (softFilterResult.passes) {
      summaries = await generateNeutralSummaries({ title, content, source_name });
    }

    console.log('Content analysis completed:', {
      passes: softFilterResult.passes,
      scores: scores,
      summaries: summaries ? 'Generated' : 'Not generated'
    });

    return new Response(
      JSON.stringify({ 
        passes_quality_check: softFilterResult.passes,
        rejection_reason: softFilterResult.reason,
        scores,
        summaries,
        explanations: scores.explanations
      }), 
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in enhanced-content-analyzer:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Content analysis failed', 
        details: error.message 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function applyHardFilters(content: ContentAnalysisRequest) {
  const { title, content: body, url } = content;

  // Minimum content length check
  if (body.length < 800) {
    return { passes: false, reason: 'Content too short (minimum 800 characters)' };
  }

  // Title length check
  if (title.length < 10) {
    return { passes: false, reason: 'Title too short' };
  }

  // URL validation
  try {
    new URL(url);
  } catch {
    return { passes: false, reason: 'Invalid URL format' };
  }

  // Spam/clickbait patterns
  const spamPatterns = [
    /you won't believe/i,
    /shocking/i,
    /doctors hate/i,
    /one weird trick/i,
    /[0-9]+\s+(reasons|ways|things|secrets)/i,
    /click here/i,
    /sponsored content/i,
    /advertisement/i
  ];

  for (const pattern of spamPatterns) {
    if (pattern.test(title) || pattern.test(body)) {
      return { passes: false, reason: 'Contains spam/clickbait patterns' };
    }
  }

  // Adult/NSFW content check
  const adultPatterns = [
    /\b(sex|porn|nude|naked|xxx)\b/i,
    /\badult content\b/i
  ];

  for (const pattern of adultPatterns) {
    if (pattern.test(title) || pattern.test(body)) {
      return { passes: false, reason: 'Contains adult/NSFW content' };
    }
  }

  // Excessive caps check
  const capsRatio = (title.match(/[A-Z]/g) || []).length / title.length;
  if (capsRatio > 0.5 && title.length > 10) {
    return { passes: false, reason: 'Excessive capital letters in title' };
  }

  // Excessive emoji check
  const emojiCount = (title.match(/[\u{1F600}-\u{1F64F}|\u{1F300}-\u{1F5FF}|\u{1F680}-\u{1F6FF}|\u{2600}-\u{26FF}|\u{2700}-\u{27BF}]/gu) || []).length;
  if (emojiCount > 3) {
    return { passes: false, reason: 'Too many emojis in title' };
  }

  return { passes: true, reason: null };
}

async function analyzeContentQuality(content: ContentAnalysisRequest): Promise<ContentQualityScores> {
  const analysisPrompt = `
Analyze the following news article for content quality and bias. Return a JSON object with scores (0.0-1.0) and explanations:

Title: "${content.title}"
Source: "${content.source_name}"
Content: "${content.content.substring(0, 2000)}..."

Provide scores for:
- toxicity_score: 0.0 (clean) to 1.0 (toxic/harmful)
- bias_score: 0.0 (neutral/factual) to 1.0 (heavily biased)
- sensationalism_score: 0.0 (measured) to 1.0 (sensational/clickbait)
- political_polarity: -1.0 (left-leaning) to +1.0 (right-leaning), 0.0 (neutral)
- subjectivity: 0.0 (objective/factual) to 1.0 (subjective/opinion)
- factuality_score: 0.0 (false/misleading) to 1.0 (factual/accurate)
- content_quality_score: 0.0 (poor quality) to 1.0 (high quality)
- credibility_score: 0.0 (not credible) to 1.0 (highly credible)

Also provide brief explanations for each score.

Return only valid JSON in this format:
{
  "toxicity_score": 0.1,
  "bias_score": 0.3,
  "sensationalism_score": 0.2,
  "political_polarity": 0.0,
  "subjectivity": 0.4,
  "factuality_score": 0.8,
  "content_quality_score": 0.7,
  "credibility_score": 0.8,
  "explanations": ["Brief explanation for each score"]
}`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14', // Using GPT-4.1 for reliable analysis
        messages: [
          {
            role: 'system',
            content: 'You are an expert content analyst specializing in news quality assessment, bias detection, and factuality scoring. Always return valid JSON.'
          },
          { role: 'user', content: analysisPrompt }
        ],
        max_tokens: 1000,
        temperature: 0.3
      }),
    });

    const data = await response.json();
    
    if (data.error) {
      console.error('OpenAI API error:', data.error);
      // Return default scores on API failure
      return getDefaultScores();
    }

    const analysisResult = JSON.parse(data.choices[0].message.content);
    console.log('AI content analysis result:', analysisResult);
    
    return analysisResult;
  } catch (error) {
    console.error('Error in AI analysis:', error);
    return getDefaultScores();
  }
}

function getDefaultScores(): ContentQualityScores {
  return {
    toxicity_score: 0.2,
    bias_score: 0.4,
    sensationalism_score: 0.3,
    political_polarity: 0.0,
    subjectivity: 0.5,
    factuality_score: 0.7,
    content_quality_score: 0.6,
    credibility_score: 0.7,
    explanations: ['Using default scores due to analysis failure']
  };
}

function applySoftFilters(scores: ContentQualityScores) {
  const TOXICITY_THRESHOLD = 0.4;
  const BIAS_THRESHOLD = 0.7;
  const SENSATIONALISM_THRESHOLD = 0.65;
  const MIN_FACTUALITY = 0.45;

  if (scores.toxicity_score > TOXICITY_THRESHOLD) {
    return { 
      passes: false, 
      reason: `High toxicity score: ${scores.toxicity_score.toFixed(2)}` 
    };
  }

  if (scores.sensationalism_score > SENSATIONALISM_THRESHOLD && scores.factuality_score < MIN_FACTUALITY) {
    return { 
      passes: false, 
      reason: `High sensationalism (${scores.sensationalism_score.toFixed(2)}) with low factuality (${scores.factuality_score.toFixed(2)})` 
    };
  }

  // Allow biased content but mark it for balanced feed processing
  if (scores.bias_score > BIAS_THRESHOLD) {
    console.log(`High bias detected (${scores.bias_score.toFixed(2)}), will be handled in balanced feed logic`);
  }

  return { passes: true, reason: null };
}

async function generateNeutralSummaries(content: ContentAnalysisRequest) {
  const summaryPrompt = `
Generate two neutral summaries for this news article:

Title: "${content.title}"
Source: "${content.source_name}"
Content: "${content.content.substring(0, 3000)}..."

Return JSON with:
1. "blurb_30w": A 25-40 word neutral headline summary (no opinions, just facts)
2. "key_points": Exactly 3 factual bullet points (no speculation or opinions)
3. "context": Optional 1-2 line context if this is an ongoing story (or null)

Guidelines:
- Remove all opinion adjectives and speculation
- Focus on facts only
- Include source attribution
- Keep neutral tone
- No sensational language

Return only valid JSON:
{
  "blurb_30w": "Neutral 25-40 word summary here...",
  "key_points": [
    "First factual point",
    "Second factual point", 
    "Third factual point"
  ],
  "context": "Brief context if ongoing story or null"
}`;

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
            content: 'You are a neutral news summarizer. Generate factual, unbiased summaries without opinions or speculation. Always return valid JSON.'
          },
          { role: 'user', content: summaryPrompt }
        ],
        max_tokens: 500,
        temperature: 0.1
      }),
    });

    const data = await response.json();
    
    if (data.error) {
      console.error('OpenAI API error for summaries:', data.error);
      return null;
    }

    const summaryResult = JSON.parse(data.choices[0].message.content);
    console.log('Generated neutral summaries:', summaryResult);
    
    return summaryResult;
  } catch (error) {
    console.error('Error generating summaries:', error);
    return null;
  }
}