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

// Dynamic article templates for realistic content generation
const articleTemplates = [
  {
    category: 'Technology',
    templates: [
      { title: 'AI Breakthrough in {field} Shows {percentage}% Improvement', content: 'Researchers have developed a new AI system that demonstrates significant advances in {field}. The breakthrough shows {percentage}% improvement over existing methods, potentially revolutionizing how we approach {application}. Early tests indicate the technology could be ready for commercial use within {timeframe}.', topics: ['artificial intelligence', 'research', 'innovation'] },
      { title: 'New {device} Features {capability} Technology', content: 'Tech giant announces their latest {device} will include groundbreaking {capability} technology. The new feature promises to enhance user experience by {benefit}. Industry experts predict this could set new standards for {industry} devices.', topics: ['technology', 'innovation', 'consumer electronics'] },
      { title: 'Cybersecurity Alert: {threat} Targets {sector}', content: 'Security researchers have identified a new {threat} specifically targeting {sector} organizations. The attack vector exploits {vulnerability} and has already affected {number} companies globally. Experts recommend immediate {action} to prevent data breaches.', topics: ['cybersecurity', 'data protection', 'enterprise'] }
    ]
  },
  {
    category: 'Health',
    templates: [
      { title: 'Study Reveals {finding} About {condition}', content: 'A comprehensive study involving {participants} participants has revealed important insights about {condition}. The research, published in {journal}, shows that {finding}. This discovery could lead to new treatment approaches within {timeframe}.', topics: ['health research', 'medical study', 'healthcare'] },
      { title: 'New Treatment for {disease} Shows Promise', content: 'Clinical trials for a new {disease} treatment have shown {result}. The therapy, developed by {institution}, offers hope for millions of patients worldwide. Researchers report {benefit} with minimal side effects in Phase {phase} trials.', topics: ['clinical trials', 'medical breakthrough', 'treatment'] },
      { title: 'Health Officials Issue {type} Alert for {region}', content: 'Public health authorities have issued a {type} alert for {region} following reports of {issue}. Officials recommend {action} as a precautionary measure. The situation is being closely monitored with regular updates expected.', topics: ['public health', 'safety alert', 'prevention'] }
    ]
  },
  {
    category: 'Sports',
    templates: [
      { title: '{team} Defeats {opponent} in Thrilling {score} Victory', content: 'In a spectacular match that kept fans on the edge of their seats, {team} secured a {score} victory over {opponent}. The game featured outstanding performances from {player1} and {player2}. This win positions {team} strongly for the upcoming {event}.', topics: ['sports', 'competition', 'athletics'] },
      { title: 'Olympic Record Broken in {event}', content: 'The {event} world record was shattered today as {athlete} achieved a time/score of {record}. The performance came during {competition} and breaks a record that had stood for {years} years. This achievement positions {athlete} as a top contender for upcoming international competitions.', topics: ['olympics', 'world record', 'athletics'] },
      { title: '{league} Season Highlights: Top Performers', content: 'As the {league} season reaches its midpoint, several athletes have emerged as standout performers. {player} leads in {stat}, while {team} maintains their position at the top of the standings. Fans can expect intense competition in the remaining matches.', topics: ['professional sports', 'season analysis', 'performance'] }
    ]
  },
  {
    category: 'Business',
    templates: [
      { title: '{company} Reports {type} Earnings for Q{quarter}', content: '{company} announced {type} quarterly earnings, with revenue reaching ${amount} billion. The results were driven by strong performance in {sector} and increased demand for {product}. CEO {name} expressed optimism about future growth prospects.', topics: ['earnings', 'corporate finance', 'market performance'] },
      { title: 'Market Analysis: {sector} Sector Shows {trend}', content: 'Financial analysts report that the {sector} sector is experiencing {trend} this quarter. Key indicators include {metric1} and {metric2}. Investors are advised to {advice} given current market conditions and projected {outlook}.', topics: ['market analysis', 'investment', 'economic trends'] },
      { title: 'New Partnership Between {company1} and {company2}', content: 'Industry leaders {company1} and {company2} have announced a strategic partnership focused on {focus}. The collaboration aims to {goal} and is expected to generate ${value} million in revenue over {timeframe}. Both companies see this as a key growth opportunity.', topics: ['business partnership', 'corporate strategy', 'collaboration'] }
    ]
  }
];

// Generate dynamic content
const generateDynamicContent = (template: any, category: string) => {
  const variables = {
    field: ['machine learning', 'quantum computing', 'robotics', 'biotechnology', 'renewable energy'][Math.floor(Math.random() * 5)],
    percentage: (Math.floor(Math.random() * 40) + 10).toString(),
    application: ['medical diagnosis', 'financial analysis', 'climate modeling', 'drug discovery', 'autonomous systems'][Math.floor(Math.random() * 5)],
    timeframe: ['18 months', '2 years', '3-5 years', 'the next decade'][Math.floor(Math.random() * 4)],
    device: ['smartphone', 'tablet', 'laptop', 'smartwatch', 'VR headset'][Math.floor(Math.random() * 5)],
    capability: ['neural processing', 'holographic display', 'biometric scanning', 'wireless charging', 'AR integration'][Math.floor(Math.random() * 5)],
    benefit: ['40% faster processing', 'improved battery life', 'enhanced security', 'better user experience', 'increased productivity'][Math.floor(Math.random() * 5)],
    industry: ['mobile', 'wearable', 'gaming', 'enterprise', 'consumer'][Math.floor(Math.random() * 5)],
    threat: ['ransomware', 'phishing campaign', 'data breach', 'supply chain attack', 'zero-day exploit'][Math.floor(Math.random() * 5)],
    sector: ['healthcare', 'financial services', 'government', 'education', 'manufacturing'][Math.floor(Math.random() * 5)],
    vulnerability: ['unpatched software', 'weak passwords', 'misconfigured servers', 'social engineering', 'outdated protocols'][Math.floor(Math.random() * 5)],
    number: (Math.floor(Math.random() * 500) + 50).toString(),
    action: ['software updates', 'security audits', 'staff training', 'network monitoring', 'backup verification'][Math.floor(Math.random() * 5)],
    finding: ['significant correlation', 'promising results', 'unexpected benefits', 'new risk factors', 'innovative treatment approach'][Math.floor(Math.random() * 5)],
    condition: ['diabetes', 'heart disease', 'cancer', 'Alzheimer\'s', 'arthritis'][Math.floor(Math.random() * 5)],
    participants: (Math.floor(Math.random() * 10000) + 1000).toString(),
    journal: ['Nature Medicine', 'The Lancet', 'New England Journal of Medicine', 'Science', 'Cell'][Math.floor(Math.random() * 5)],
    disease: ['cancer', 'diabetes', 'heart disease', 'neurological disorders', 'autoimmune diseases'][Math.floor(Math.random() * 5)],
    result: ['promising outcomes', 'significant improvement', 'reduced symptoms', 'enhanced quality of life', 'better survival rates'][Math.floor(Math.random() * 5)],
    institution: ['Mayo Clinic', 'Johns Hopkins', 'Stanford Medical', 'MIT Research', 'Harvard Medical'][Math.floor(Math.random() * 5)],
    benefit: ['80% symptom reduction', 'improved mobility', 'enhanced cognitive function', 'better pain management', 'increased energy levels'][Math.floor(Math.random() * 5)],
    phase: ['II', 'III'][Math.floor(Math.random() * 2)],
    type: ['health', 'safety', 'travel', 'food safety', 'environmental'][Math.floor(Math.random() * 5)],
    region: ['California', 'New York', 'Texas', 'Florida', 'the Northeast'][Math.floor(Math.random() * 5)],
    issue: ['contamination concerns', 'disease outbreak', 'air quality issues', 'water safety concerns', 'food recalls'][Math.floor(Math.random() * 5)],
    team: ['Lakers', 'Warriors', 'Celtics', 'Heat', 'Knicks'][Math.floor(Math.random() * 5)],
    opponent: ['Clippers', 'Nuggets', '76ers', 'Bucks', 'Nets'][Math.floor(Math.random() * 5)],
    score: [`${Math.floor(Math.random() * 50) + 80}-${Math.floor(Math.random() * 50) + 70}`, `${Math.floor(Math.random() * 30) + 90}-${Math.floor(Math.random() * 30) + 80}`][Math.floor(Math.random() * 2)],
    player1: ['LeBron James', 'Stephen Curry', 'Kevin Durant', 'Giannis Antetokounmpo', 'Luka Dončić'][Math.floor(Math.random() * 5)],
    player2: ['Anthony Davis', 'Klay Thompson', 'Kyrie Irving', 'Jrue Holiday', 'Kristaps Porziņģis'][Math.floor(Math.random() * 5)],
    event: ['playoffs', 'championship', 'tournament', 'finals', 'semifinals'][Math.floor(Math.random() * 5)],
    athlete: ['Sarah Johnson', 'Michael Chen', 'Emma Rodriguez', 'David Kim', 'Lisa Thompson'][Math.floor(Math.random() * 5)],
    record: ['9.58 seconds', '2:01:09', '8.95 meters', '6.14 meters', '23.12 meters'][Math.floor(Math.random() * 5)],
    competition: ['World Championships', 'Olympic Trials', 'Diamond League', 'National Championships', 'International Meet'][Math.floor(Math.random() * 5)],
    years: (Math.floor(Math.random() * 15) + 5).toString(),
    league: ['NBA', 'NFL', 'MLB', 'NHL', 'MLS'][Math.floor(Math.random() * 5)],
    stat: ['points', 'rebounds', 'assists', 'goals', 'saves'][Math.floor(Math.random() * 5)],
    company: ['Apple', 'Google', 'Microsoft', 'Amazon', 'Meta'][Math.floor(Math.random() * 5)],
    amount: (Math.floor(Math.random() * 50) + 10).toString(),
    quarter: ['1', '2', '3', '4'][Math.floor(Math.random() * 4)],
    name: ['Tim Cook', 'Sundar Pichai', 'Satya Nadella', 'Andy Jassy', 'Mark Zuckerberg'][Math.floor(Math.random() * 5)],
    product: ['smartphones', 'cloud services', 'software licenses', 'advertising', 'hardware'][Math.floor(Math.random() * 5)],
    trend: ['strong growth', 'market volatility', 'consolidation', 'innovation surge', 'sustainable expansion'][Math.floor(Math.random() * 5)],
    metric1: ['increased trading volume', 'rising valuations', 'merger activity', 'IPO launches', 'dividend increases'][Math.floor(Math.random() * 5)],
    metric2: ['improved margins', 'market share gains', 'cost optimization', 'revenue growth', 'profit increases'][Math.floor(Math.random() * 5)],
    advice: ['consider diversification', 'monitor closely', 'maintain positions', 'increase exposure', 'reduce risk'][Math.floor(Math.random() * 5)],
    outlook: ['positive momentum', 'market stability', 'continued growth', 'strong fundamentals', 'emerging opportunities'][Math.floor(Math.random() * 5)],
    company1: ['Tesla', 'Ford', 'GM', 'Toyota', 'BMW'][Math.floor(Math.random() * 5)],
    company2: ['Intel', 'NVIDIA', 'AMD', 'Qualcomm', 'Samsung'][Math.floor(Math.random() * 5)],
    focus: ['autonomous vehicles', 'electric batteries', 'semiconductor technology', 'AI integration', 'sustainable manufacturing'][Math.floor(Math.random() * 5)],
    goal: ['accelerate innovation', 'reduce costs', 'expand market reach', 'improve efficiency', 'enhance sustainability'][Math.floor(Math.random() * 5)],
    value: (Math.floor(Math.random() * 1000) + 100).toString(),
  };

  let title = template.title;
  let content = template.content;

  // Replace all variables in title and content
  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(`{${key}}`, 'g');
    title = title.replace(regex, value);
    content = content.replace(regex, value);
  });

  return { title, content, topics: template.topics };
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

      // Find templates for this category
      const categoryTemplates = articleTemplates.find(t => 
        t.category.toLowerCase() === targetCategory.name.toLowerCase()
      );

      if (!categoryTemplates) continue;

      // Select random template
      const template = categoryTemplates.templates[Math.floor(Math.random() * categoryTemplates.templates.length)];
      
      // Generate dynamic content
      const { title, content, topics } = generateDynamicContent(template, targetCategory.name);

      // Create publication time (recent)
      const publishedAt = new Date(now.getTime() - Math.random() * 24 * 60 * 60 * 1000); // Within last 24 hours

      // Generate quality scores
      const contentQualityScore = 0.6 + Math.random() * 0.3; // 0.6-0.9
      const credibilityScore = 0.5 + Math.random() * 0.4; // 0.5-0.9
      const biasScore = 0.3 + Math.random() * 0.4; // 0.3-0.7
      const sentimentScore = 0.4 + Math.random() * 0.2; // 0.4-0.6 (neutral)

      const article = {
        title,
        description: content.substring(0, 150) + '...',
        content,
        url: `https://example.com/article/${Date.now()}-${i}`,
        source_name: ['Reuters', 'Associated Press', 'BBC News', 'CNN', 'NPR', 'The Guardian', 'Wall Street Journal'][Math.floor(Math.random() * 7)],
        category_id: targetCategory.id,
        published_at: publishedAt.toISOString(),
        is_featured: Math.random() < 0.3,
        is_trending: Math.random() < 0.4,
        topic_tags: topics,
        engagement_score: Math.floor(Math.random() * 1000),
        content_quality_score: Math.round(contentQualityScore * 100) / 100,
        credibility_score: Math.round(credibilityScore * 100) / 100,
        bias_score: Math.round(biasScore * 100) / 100,
        sentiment_score: Math.round(sentimentScore * 100) / 100,
        reading_time_minutes: Math.ceil(content.split(' ').length / 200), // Assuming 200 WPM
        created_at: now.toISOString(),
        updated_at: now.toISOString()
      };

      generatedArticles.push(article);
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