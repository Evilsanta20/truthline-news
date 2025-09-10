-- Add mood-related fields to user_preferences table
ALTER TABLE public.user_preferences 
ADD COLUMN mood_presets jsonb DEFAULT '[]'::jsonb,
ADD COLUMN current_mood jsonb DEFAULT NULL,
ADD COLUMN mood_history jsonb DEFAULT '[]'::jsonb,
ADD COLUMN mood_last_updated timestamp with time zone DEFAULT NULL;

-- Add mood context to article interactions
ALTER TABLE public.article_interactions 
ADD COLUMN mood_context jsonb DEFAULT NULL;

-- Add mood-related scores to articles
ALTER TABLE public.articles 
ADD COLUMN mood_depth_score numeric DEFAULT 0.5,
ADD COLUMN mood_positivity_score numeric DEFAULT 0.5,
ADD COLUMN estimated_read_time integer DEFAULT 3;

-- Create mood recommendations table for tracking mood-based suggestions
CREATE TABLE public.mood_recommendations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id text NOT NULL,
  article_id uuid NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  mood_profile jsonb NOT NULL,
  recommendation_score numeric NOT NULL,
  mood_match_reasons text[] DEFAULT '{}',
  created_at timestamp with time zone DEFAULT now(),
  clicked boolean DEFAULT false,
  feedback_score integer DEFAULT NULL
);

-- Enable RLS on mood_recommendations
ALTER TABLE public.mood_recommendations ENABLE ROW LEVEL SECURITY;

-- Create policies for mood_recommendations
CREATE POLICY "Users can view own mood recommendations" ON public.mood_recommendations
FOR SELECT USING (user_id = (auth.uid())::text OR user_id = 'anonymous' OR user_id LIKE 'demo-%');

CREATE POLICY "Users can insert own mood recommendations" ON public.mood_recommendations
FOR INSERT WITH CHECK (user_id = (auth.uid())::text OR user_id = 'anonymous' OR user_id LIKE 'demo-%');

CREATE POLICY "Users can update own mood recommendations" ON public.mood_recommendations
FOR UPDATE USING (user_id = (auth.uid())::text OR user_id = 'anonymous' OR user_id LIKE 'demo-%');

-- Create function to update mood scores
CREATE OR REPLACE FUNCTION public.update_mood_scores()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Update mood depth scores based on content length and complexity
  UPDATE public.articles 
  SET mood_depth_score = CASE 
    WHEN length(content) > 2000 THEN 0.8
    WHEN length(content) > 1000 THEN 0.6
    WHEN length(content) > 500 THEN 0.4
    ELSE 0.2
  END
  WHERE mood_depth_score = 0.5; -- Only update unset scores
  
  -- Update positivity scores based on sentiment
  UPDATE public.articles 
  SET mood_positivity_score = GREATEST(0.0, LEAST(1.0, sentiment_score))
  WHERE mood_positivity_score = 0.5 AND sentiment_score IS NOT NULL;
  
  -- Update estimated read time
  UPDATE public.articles 
  SET estimated_read_time = GREATEST(1, LEAST(20, length(content) / 200))
  WHERE estimated_read_time = 3 AND content IS NOT NULL;
END;
$$;

-- Run the mood scores update
SELECT public.update_mood_scores();