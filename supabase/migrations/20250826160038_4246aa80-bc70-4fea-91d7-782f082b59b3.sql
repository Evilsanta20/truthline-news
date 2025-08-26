-- Enhanced schema for AI-powered news platform

-- Add AI-related columns to articles table
ALTER TABLE public.articles 
ADD COLUMN IF NOT EXISTS bias_score DECIMAL(3,2) DEFAULT 0.5,
ADD COLUMN IF NOT EXISTS credibility_score DECIMAL(3,2) DEFAULT 0.7,
ADD COLUMN IF NOT EXISTS sentiment_score DECIMAL(3,2) DEFAULT 0.5,
ADD COLUMN IF NOT EXISTS polarization_score DECIMAL(3,2) DEFAULT 0.3,
ADD COLUMN IF NOT EXISTS ai_summary TEXT,
ADD COLUMN IF NOT EXISTS content_quality_score DECIMAL(3,2) DEFAULT 0.7,
ADD COLUMN IF NOT EXISTS reading_time_minutes INTEGER DEFAULT 3,
ADD COLUMN IF NOT EXISTS ai_processed_at TIMESTAMP WITH TIME ZONE;

-- Create user reading patterns table
CREATE TABLE IF NOT EXISTS public.user_reading_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_preferences JSONB DEFAULT '{}',
  reading_time_preference INTEGER DEFAULT 5, -- minutes
  bias_tolerance DECIMAL(3,2) DEFAULT 0.7,
  sentiment_preference DECIMAL(3,2) DEFAULT 0.5,
  topics_of_interest TEXT[] DEFAULT '{}',
  preferred_sources TEXT[] DEFAULT '{}',
  avg_session_duration INTEGER DEFAULT 300, -- seconds
  total_articles_read INTEGER DEFAULT 0,
  engagement_score DECIMAL(3,2) DEFAULT 0.5,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create user feedback table for recommendation improvement
CREATE TABLE IF NOT EXISTS public.user_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  article_id UUID NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  feedback_type TEXT NOT NULL CHECK (feedback_type IN ('like', 'dislike', 'share', 'bookmark', 'hide', 'report')),
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  relevance_score DECIMAL(3,2),
  quality_feedback TEXT,
  bias_feedback TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, article_id, feedback_type)
);

-- Create personalized recommendations table
CREATE TABLE IF NOT EXISTS public.user_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  article_id UUID NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  recommendation_score DECIMAL(4,3) NOT NULL,
  recommendation_reason TEXT,
  algorithm_used TEXT DEFAULT 'hybrid',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  shown_at TIMESTAMP WITH TIME ZONE,
  clicked_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(user_id, article_id)
);

-- Enable RLS on new tables
ALTER TABLE public.user_reading_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_recommendations ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_reading_patterns
CREATE POLICY "Users can manage own reading patterns" ON public.user_reading_patterns
  FOR ALL USING (auth.uid() = user_id);

-- RLS policies for user_feedback
CREATE POLICY "Users can manage own feedback" ON public.user_feedback
  FOR ALL USING (auth.uid() = user_id);

-- RLS policies for user_recommendations
CREATE POLICY "Users can view own recommendations" ON public.user_recommendations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can manage recommendations" ON public.user_recommendations
  FOR ALL USING (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_articles_ai_scores ON public.articles(bias_score, credibility_score, content_quality_score);
CREATE INDEX IF NOT EXISTS idx_user_recommendations_score ON public.user_recommendations(user_id, recommendation_score DESC);
CREATE INDEX IF NOT EXISTS idx_user_feedback_type ON public.user_feedback(user_id, feedback_type, created_at);
CREATE INDEX IF NOT EXISTS idx_articles_content_embedding ON public.articles USING ivfflat (content_embedding vector_cosine_ops) WITH (lists = 100);

-- Function to update reading patterns based on interactions
CREATE OR REPLACE FUNCTION public.update_reading_patterns()
RETURNS TRIGGER AS $$
BEGIN
  -- Update user reading patterns when they interact with articles
  INSERT INTO public.user_reading_patterns (user_id)
  VALUES (NEW.user_id)
  ON CONFLICT (user_id) DO UPDATE SET
    total_articles_read = user_reading_patterns.total_articles_read + 1,
    updated_at = now();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;