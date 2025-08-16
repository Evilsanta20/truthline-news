-- Create user preferences tracking table
CREATE TABLE public.user_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  preferred_topics TEXT[] DEFAULT '{}',
  blocked_topics TEXT[] DEFAULT '{}',
  preferred_sources TEXT[] DEFAULT '{}',
  blocked_sources TEXT[] DEFAULT '{}',
  reading_history JSONB DEFAULT '{}',
  interaction_scores JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- Create policies for user preferences (allow anonymous users)
CREATE POLICY "Anyone can manage preferences" 
ON public.user_preferences 
FOR ALL 
USING (true);

-- Create interaction tracking table
CREATE TABLE public.article_interactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  article_id UUID NOT NULL,
  interaction_type TEXT NOT NULL CHECK (interaction_type IN ('view', 'bookmark', 'like', 'share', 'read_time')),
  interaction_value NUMERIC DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for interactions
ALTER TABLE public.article_interactions ENABLE ROW LEVEL SECURITY;

-- Create policies for interactions (allow anonymous users)
CREATE POLICY "Anyone can track interactions" 
ON public.article_interactions 
FOR ALL 
USING (true);

-- Add AI recommendation columns to articles
ALTER TABLE public.articles ADD COLUMN topic_tags TEXT[] DEFAULT '{}';
ALTER TABLE public.articles ADD COLUMN engagement_score NUMERIC DEFAULT 0;
ALTER TABLE public.articles ADD COLUMN recommendation_score NUMERIC DEFAULT 0;

-- Create indexes for better performance
CREATE INDEX idx_user_preferences_user_id ON public.user_preferences(user_id);
CREATE INDEX idx_article_interactions_user_id ON public.article_interactions(user_id);
CREATE INDEX idx_article_interactions_article_id ON public.article_interactions(article_id);
CREATE INDEX idx_articles_topic_tags ON public.articles USING gin(topic_tags);
CREATE INDEX idx_articles_engagement_score ON public.articles(engagement_score DESC);
CREATE INDEX idx_articles_recommendation_score ON public.articles(recommendation_score DESC);

-- Insert comprehensive seed data for different news genres
INSERT INTO public.categories (name, slug, description, color) VALUES 
('Politics', 'politics', 'Political news and government updates', '#DC2626'),
('Technology', 'technology', 'Tech industry news and innovations', '#1D4ED8'),
('Sports', 'sports', 'Sports news and updates', '#059669'),
('Entertainment', 'entertainment', 'Celebrity news and entertainment', '#7C2D12'),
('Business', 'business', 'Business and finance news', '#4338CA'),
('Health', 'health', 'Health and medical news', '#C2410C'),
('Science', 'science', 'Scientific discoveries and research', '#0D9488'),
('World', 'world', 'International news and events', '#991B1B')
ON CONFLICT (slug) DO NOTHING;

-- Create diverse sample articles for testing personalization
INSERT INTO public.articles (title, description, content, category_id, source_name, url, topic_tags, engagement_score, is_featured, is_trending) 
SELECT 
  CASE 
    WHEN c.slug = 'politics' THEN 'Political Development ' || generate_series || ': New Policy Changes'
    WHEN c.slug = 'technology' THEN 'Tech Innovation ' || generate_series || ': AI Breakthrough'
    WHEN c.slug = 'sports' THEN 'Sports Update ' || generate_series || ': Championship Results'
    WHEN c.slug = 'entertainment' THEN 'Entertainment News ' || generate_series || ': Celebrity Interview'
    WHEN c.slug = 'business' THEN 'Business Analysis ' || generate_series || ': Market Trends'
    WHEN c.slug = 'health' THEN 'Health Report ' || generate_series || ': Medical Research'
    WHEN c.slug = 'science' THEN 'Science Discovery ' || generate_series || ': Research Findings'
    ELSE 'World News ' || generate_series || ': Global Events'
  END as title,
  'Detailed analysis and coverage of ' || lower(c.name) || ' developments with expert insights and comprehensive reporting.',
  'Full article content with detailed information about recent ' || lower(c.name) || ' developments. This includes expert analysis, background context, and implications for readers interested in ' || lower(c.name) || ' topics.',
  c.id,
  CASE 
    WHEN generate_series % 4 = 0 THEN 'Reuters'
    WHEN generate_series % 4 = 1 THEN 'Associated Press'
    WHEN generate_series % 4 = 2 THEN 'BBC News'
    ELSE 'CNN'
  END,
  'https://example.com/' || c.slug || '-article-' || generate_series,
  ARRAY[lower(c.name), 'news', 'breaking', 'analysis'],
  random() * 100,
  generate_series <= 2,
  generate_series <= 3
FROM public.categories c, generate_series(1, 8)
WHERE c.slug IN ('politics', 'technology', 'sports', 'entertainment', 'business', 'health', 'science', 'world');

-- Create function to update article engagement scores
CREATE OR REPLACE FUNCTION update_article_engagement()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.articles 
  SET engagement_score = (
    SELECT COALESCE(
      SUM(
        CASE interaction_type
          WHEN 'view' THEN 1
          WHEN 'bookmark' THEN 3
          WHEN 'like' THEN 2
          WHEN 'share' THEN 5
          WHEN 'read_time' THEN interaction_value / 60
          ELSE 1
        END
      ), 0
    )
    FROM public.article_interactions 
    WHERE article_id = NEW.article_id
  )
  WHERE id = NEW.article_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for engagement score updates
CREATE TRIGGER update_engagement_trigger
  AFTER INSERT ON public.article_interactions
  FOR EACH ROW
  EXECUTE FUNCTION update_article_engagement();