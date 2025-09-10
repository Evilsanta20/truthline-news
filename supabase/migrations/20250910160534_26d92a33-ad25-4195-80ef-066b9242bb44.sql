-- Fix RLS policies to ensure proper data access for the news system

-- Update articles policy to allow better access for authenticated users
DROP POLICY IF EXISTS "Anyone can view articles" ON public.articles;
CREATE POLICY "Anyone can view articles" 
ON public.articles 
FOR SELECT 
USING (true);

-- Ensure news fetch logs are accessible 
DROP POLICY IF EXISTS "System can manage fetch logs" ON public.news_fetch_logs;
CREATE POLICY "System can manage fetch logs" 
ON public.news_fetch_logs 
FOR ALL 
USING (true);

-- Fix user_preferences policy to allow proper access
DROP POLICY IF EXISTS "Anyone can manage preferences" ON public.user_preferences;
CREATE POLICY "Users can manage own preferences" 
ON public.user_preferences 
FOR ALL 
USING (user_id = (auth.uid())::text OR user_id = 'anonymous');

CREATE POLICY "System can manage preferences" 
ON public.user_preferences 
FOR ALL 
USING (true);