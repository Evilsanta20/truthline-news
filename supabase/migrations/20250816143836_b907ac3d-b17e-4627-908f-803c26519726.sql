-- Enable vector extension for embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- Create user preferences tracking table
CREATE TABLE public.user_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL DEFAULT 'anonymous', -- Use TEXT for anonymous users
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

-- Create policies for user preferences (allow anonymous access)
CREATE POLICY "Anyone can manage preferences" 
ON public.user_preferences 
FOR ALL 
USING (true);

-- Create interaction tracking table
CREATE TABLE public.article_interactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL DEFAULT 'anonymous',
  article_id UUID NOT NULL,
  interaction_type TEXT NOT NULL CHECK (interaction_type IN ('view', 'bookmark', 'like', 'share', 'read_time')),
  interaction_value NUMERIC DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for interactions
ALTER TABLE public.article_interactions ENABLE ROW LEVEL SECURITY;

-- Create policies for interactions (allow anonymous access)
CREATE POLICY "Anyone can track interactions" 
ON public.article_interactions 
FOR ALL 
USING (true);

-- Add embedding and AI-related columns to articles
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS content_embedding vector(384);
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS topic_tags TEXT[] DEFAULT '{}';
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS engagement_score NUMERIC DEFAULT 0;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON public.user_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_article_interactions_user_id ON public.article_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_article_interactions_article_id ON public.article_interactions(article_id);
CREATE INDEX IF NOT EXISTS idx_articles_topic_tags ON public.articles USING gin(topic_tags);
CREATE INDEX IF NOT EXISTS idx_articles_engagement_score ON public.articles(engagement_score DESC);

-- Update existing categories with proper colors
UPDATE public.categories SET color = '#DC2626' WHERE slug = 'politics';
UPDATE public.categories SET color = '#1D4ED8' WHERE slug = 'technology';

-- Insert additional seed data for different news genres
INSERT INTO public.categories (name, slug, description, color) VALUES 
('Politics', 'politics', 'Political news and government updates', '#DC2626'),
('Technology', 'technology', 'Tech industry news and innovations', '#1D4ED8'),
('Sports', 'sports', 'Sports news and updates', '#059669'),
('Entertainment', 'entertainment', 'Celebrity news and entertainment', '#7C2D12'),
('Business', 'business', 'Business and finance news', '#4338CA'),
('Health', 'health', 'Health and medical news', '#C2410C'),
('Science', 'science', 'Scientific discoveries and research', '#0D9488'),
('World', 'world', 'International news and events', '#991B1B')
ON CONFLICT (slug) DO UPDATE SET 
  color = EXCLUDED.color,
  description = EXCLUDED.description;

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
DROP TRIGGER IF EXISTS update_engagement_trigger ON public.article_interactions;
CREATE TRIGGER update_engagement_trigger
  AFTER INSERT ON public.article_interactions
  FOR EACH ROW
  EXECUTE FUNCTION update_article_engagement();