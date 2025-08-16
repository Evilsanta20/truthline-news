-- Create user preferences tracking table
CREATE TABLE public.user_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
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

-- Create policies for user preferences
CREATE POLICY "Users can manage their own preferences" 
ON public.user_preferences 
FOR ALL 
USING (auth.uid()::text = user_id::text OR user_id::text = 'anonymous');

-- Create interaction tracking table
CREATE TABLE public.article_interactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  article_id UUID NOT NULL,
  interaction_type TEXT NOT NULL CHECK (interaction_type IN ('view', 'bookmark', 'like', 'share', 'read_time')),
  interaction_value NUMERIC DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for interactions
ALTER TABLE public.article_interactions ENABLE ROW LEVEL SECURITY;

-- Create policies for interactions
CREATE POLICY "Users can manage their own interactions" 
ON public.article_interactions 
FOR ALL 
USING (auth.uid()::text = user_id::text OR user_id::text = 'anonymous');

-- Add embedding column to articles for AI recommendations
ALTER TABLE public.articles ADD COLUMN content_embedding vector(1536);
ALTER TABLE public.articles ADD COLUMN topic_tags TEXT[] DEFAULT '{}';
ALTER TABLE public.articles ADD COLUMN engagement_score NUMERIC DEFAULT 0;

-- Create indexes for better performance
CREATE INDEX idx_user_preferences_user_id ON public.user_preferences(user_id);
CREATE INDEX idx_article_interactions_user_id ON public.article_interactions(user_id);
CREATE INDEX idx_article_interactions_article_id ON public.article_interactions(article_id);
CREATE INDEX idx_articles_topic_tags ON public.articles USING gin(topic_tags);
CREATE INDEX idx_articles_engagement_score ON public.articles(engagement_score DESC);

-- Insert seed data for different news genres
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

-- Create sample articles for testing
INSERT INTO public.articles (title, description, content, category_id, source_name, url, topic_tags, engagement_score, is_featured) 
SELECT 
  'Sample ' || c.name || ' Article ' || generate_series,
  'This is a sample ' || lower(c.name) || ' article for testing the personalization engine',
  'Full content of the ' || lower(c.name) || ' article with detailed information about recent developments...',
  c.id,
  'Sample News',
  'https://example.com/article-' || generate_series,
  ARRAY[lower(c.name), 'sample', 'test'],
  random() * 100,
  generate_series <= 2
FROM public.categories c, generate_series(1, 5)
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
          WHEN 'read_time' THEN interaction_value / 60 -- Convert seconds to minutes
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