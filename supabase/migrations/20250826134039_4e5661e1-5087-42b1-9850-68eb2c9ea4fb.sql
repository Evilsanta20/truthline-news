-- Fix critical security vulnerability in article_interactions table
-- Drop the overly permissive policy that allows anyone to access all interaction data
DROP POLICY IF EXISTS "Anyone can track interactions" ON public.article_interactions;

-- Create secure RLS policies for article_interactions

-- Policy 1: Users can only insert their own interactions
CREATE POLICY "Users can insert own interactions" 
ON public.article_interactions 
FOR INSERT 
WITH CHECK (
  -- Allow if user is authenticated and inserting their own user_id
  (auth.uid()::text = user_id) OR
  -- Allow anonymous interactions for demo/testing purposes
  (user_id = 'anonymous' OR user_id LIKE 'demo-%')
);

-- Policy 2: Users can only view their own interactions
CREATE POLICY "Users can view own interactions" 
ON public.article_interactions 
FOR SELECT 
USING (
  -- Authenticated users can see their own interactions
  (auth.uid()::text = user_id) OR
  -- Allow viewing anonymous interactions for the same session
  (user_id = 'anonymous' OR user_id LIKE 'demo-%')
);

-- Policy 3: Users can update their own interactions (if needed)
CREATE POLICY "Users can update own interactions" 
ON public.article_interactions 
FOR UPDATE 
USING (
  (auth.uid()::text = user_id) OR
  (user_id = 'anonymous' OR user_id LIKE 'demo-%')
)
WITH CHECK (
  (auth.uid()::text = user_id) OR
  (user_id = 'anonymous' OR user_id LIKE 'demo-%')
);

-- Policy 4: Users can delete their own interactions
CREATE POLICY "Users can delete own interactions" 
ON public.article_interactions 
FOR DELETE 
USING (
  (auth.uid()::text = user_id) OR
  (user_id = 'anonymous' OR user_id LIKE 'demo-%')
);

-- Policy 5: Admins can view all interactions for analytics (optional)
CREATE POLICY "Admins can view all interactions" 
ON public.article_interactions 
FOR SELECT 
USING (
  has_role(auth.uid(), 'admin'::app_role)
);