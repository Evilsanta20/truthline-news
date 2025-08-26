-- Enable realtime for articles table
ALTER TABLE public.articles REPLICA IDENTITY FULL;

-- Enable realtime for article_interactions table  
ALTER TABLE public.article_interactions REPLICA IDENTITY FULL;

-- Enable realtime for user_preferences table
ALTER TABLE public.user_preferences REPLICA IDENTITY FULL;

-- Add tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.articles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.article_interactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_preferences;