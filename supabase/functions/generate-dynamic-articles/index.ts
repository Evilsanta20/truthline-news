// @ts-nocheck
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

// AI-powered article generation
const generateAIArticle = async (category: string): Promise<{title: string, content: string, summary: string, imageQuery: string, topics: string[]}> => {
  const prompts = {
    'Technology': 'Generate a realistic technology news article about recent breakthroughs, product launches, or industry developments. Include specific details, companies, and technical information.',
    'Health': 'Generate a realistic health and medical news article about recent research findings, treatment breakthroughs, or public health developments. Include scientific details and expert perspectives.',
    'Sports': 'Generate a realistic sports news article about recent games, player performances, trades, or sporting events. Include specific scores, player names, and detailed game analysis.',
    'Business': 'Generate a realistic business news article about corporate earnings, market trends, mergers, or economic developments. Include financial details and market analysis.',
    'Politics': 'Generate a realistic political news article about recent policy developments, election news, or government announcements. Include specific details and political context.',
    'Entertainment': 'Generate a realistic entertainment news article about movies, TV shows, music, or celebrity news. Include industry insights and cultural impact.',
    'Science': 'Generate a realistic science news article about recent discoveries, research findings, or scientific breakthroughs. Include technical details and research context.'
  };

  const prompt = prompts[category as keyof typeof prompts] || prompts['Technology'];

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are a professional news writer. Generate realistic, engaging news articles that sound authentic and current. Always include:
            1. A compelling headline (max 80 characters)
            2. Full article content (300-500 words) with proper paragraphs
            3. A brief summary (2-3 sentences)
            4. An image search query for relevant photos
            5. 3-5 relevant topic tags
            
            Format your response as JSON:
            {
              "title": "Article headline",
              "content": "Full article content with multiple paragraphs",
              "summary": "Brief 2-3 sentence summary",
              "imageQuery": "search query for relevant image",
              "topics": ["tag1", "tag2", "tag3"]
            }`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.8,
        max_tokens: 1000
      }),
    });

    const data = await response.json();
    const aiResponse = JSON.parse(data.choices[0].message.content);
    return aiResponse;
  } catch (error) {
    console.error('Error generating AI article:', error);
    // Fallback to basic template
    return {
      title: `Breaking News in ${category}`,
      content: `This is a developing story in the ${category.toLowerCase()} sector. Our newsroom is working to bring you the latest updates as they become available. This story involves significant developments that could impact the industry and consumers alike.

The situation continues to evolve with multiple stakeholders monitoring the developments closely. Industry experts suggest this could have far-reaching implications for the market and related sectors.

We will continue to update this story as more information becomes available. Stay tuned for the latest developments and analysis on this important ${category.toLowerCase()} news story.`,
      summary: `Breaking developments in ${category.toLowerCase()} with potential industry impact.`,
      imageQuery: `${category.toLowerCase()} news technology`,
      topics: [category.toLowerCase(), 'breaking news', 'industry']
    };
  }
};

// Get image from Unsplash
const getUnsplashImage = async (query: string): Promise<string | null> => {
  try {
    const response = await fetch(`https://source.unsplash.com/800x600/?${encodeURIComponent(query)}`);
    return response.url;
  } catch (error) {
    console.error('Error fetching image:', error);
    return null;
  }
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { count = 10, category } = await req.json();
    
    console.log(`Generating ${count} dynamic articles${category ? ` for category: ${category}` : ''}`);

    // Get available categories
    const { data: categories } = await supabase
      .from('categories')
      .select('*');

    if (!categories || categories.length === 0) {
      throw new Error('No categories found in database');
    }

    const generatedArticles = [];
    const now = new Date();

    for (let i = 0; i < count; i++) {
      // Select random category or use specified one
      const targetCategory = category 
        ? categories.find(c => c.name.toLowerCase() === category.toLowerCase())
        : categories[Math.floor(Math.random() * categories.length)];

      if (!targetCategory) continue;

      // Generate AI-powered article
      const aiArticle = await generateAIArticle(targetCategory.name);
      
      // Get relevant image
      const imageUrl = await getUnsplashImage(aiArticle.imageQuery);
      
      // Create publication time (recent, within last 3 days)
      const publishedAt = new Date(now.getTime() - Math.random() * 3 * 24 * 60 * 60 * 1000);

      // Generate realistic quality scores
      const contentQualityScore = 0.75 + Math.random() * 0.2; // 0.75-0.95 (high quality)
      const credibilityScore = 0.7 + Math.random() * 0.25; // 0.7-0.95
      const biasScore = 0.2 + Math.random() * 0.3; // 0.2-0.5 (lower bias)
      const sentimentScore = 0.45 + Math.random() * 0.1; // 0.45-0.55 (neutral)

      // Generate unique article ID for internal URL
      const articleId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const article = {
        title: aiArticle.title,
        description: aiArticle.summary,
        content: aiArticle.content,
        url: `/article/${articleId}`, // Internal URL for proper routing
        url_to_image: imageUrl,
        source_name: ['Reuters', 'Associated Press', 'BBC News', 'CNN', 'NPR', 'The Guardian', 'Wall Street Journal', 'Bloomberg', 'Financial Times'][Math.floor(Math.random() * 9)],
        author: ['Sarah Johnson', 'Michael Chen', 'Emma Rodriguez', 'David Kim', 'Lisa Thompson', 'James Wilson', 'Maria Garcia', 'Robert Brown'][Math.floor(Math.random() * 8)],
        category_id: targetCategory.id,
        published_at: publishedAt.toISOString(),
        is_featured: Math.random() < 0.25,
        is_trending: Math.random() < 0.35,
        is_editors_pick: Math.random() < 0.15,
        topic_tags: aiArticle.topics,
        engagement_score: Math.floor(Math.random() * 2000) + 100, // 100-2100
        view_count: Math.floor(Math.random() * 10000) + 50,
        content_quality_score: Math.round(contentQualityScore * 100) / 100,
        credibility_score: Math.round(credibilityScore * 100) / 100,
        bias_score: Math.round(biasScore * 100) / 100,
        sentiment_score: Math.round(sentimentScore * 100) / 100,
        polarization_score: 0.2 + Math.random() * 0.2, // Low polarization
        reading_time_minutes: Math.max(1, Math.ceil(aiArticle.content.split(' ').length / 200)),
        ai_summary: aiArticle.summary,
        ai_processed_at: now.toISOString(),
        created_at: now.toISOString(),
        updated_at: now.toISOString()
      };

      generatedArticles.push(article);
      
      // Add small delay between API calls to avoid rate limiting
      if (i < count - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    // Insert articles into database
    const { data: insertedArticles, error: insertError } = await supabase
      .from('articles')
      .insert(generatedArticles)
      .select();

    if (insertError) {
      throw insertError;
    }

    console.log(`Successfully generated and inserted ${insertedArticles?.length || 0} articles`);

    return new Response(
      JSON.stringify({ 
        success: true,
        generated_count: insertedArticles?.length || 0,
        articles: insertedArticles
      }), 
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error generating dynamic articles:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: 'Failed to generate articles', 
        details: error.message 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});