-- Create news_fetch_logs table for tracking API calls and results
CREATE TABLE IF NOT EXISTS public.news_fetch_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  api_source TEXT NOT NULL,
  category TEXT,
  articles_fetched INTEGER DEFAULT 0,
  articles_stored INTEGER DEFAULT 0,
  api_status TEXT DEFAULT 'success',
  error_message TEXT,
  fetch_timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  execution_time_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create article_archive table for storing older versions
CREATE TABLE IF NOT EXISTS public.article_archive (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  original_article_id UUID,
  title TEXT NOT NULL,
  content TEXT,
  url TEXT NOT NULL,
  source_name TEXT,
  archived_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  archive_reason TEXT DEFAULT 'update'
);

-- Enable RLS on new tables
ALTER TABLE public.news_fetch_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.article_archive ENABLE ROW LEVEL SECURITY;

-- Create policies for logs (admins can view all, system can insert)
CREATE POLICY "System can manage fetch logs" 
ON public.news_fetch_logs 
FOR ALL 
USING (true);

CREATE POLICY "Admins can view fetch logs" 
ON public.news_fetch_logs 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create policies for archive (system manages, users can view)
CREATE POLICY "System can manage article archive" 
ON public.article_archive 
FOR ALL 
USING (true);

CREATE POLICY "Anyone can view archived articles" 
ON public.article_archive 
FOR SELECT 
USING (true);

-- Add index for better performance
CREATE INDEX idx_news_fetch_logs_timestamp ON public.news_fetch_logs(fetch_timestamp);
CREATE INDEX idx_article_archive_original_id ON public.article_archive(original_article_id);
CREATE INDEX idx_articles_content_hash ON public.articles(content_hash);

-- Function to archive article before update
CREATE OR REPLACE FUNCTION archive_article_before_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Archive the old version before updating
  INSERT INTO public.article_archive (
    original_article_id,
    title,
    content,
    url,
    source_name,
    archive_reason
  ) VALUES (
    OLD.id,
    OLD.title,
    OLD.content,
    OLD.url,
    OLD.source_name,
    'updated'
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for archiving
CREATE TRIGGER archive_article_trigger
  BEFORE UPDATE ON public.articles
  FOR EACH ROW
  EXECUTE FUNCTION archive_article_before_update();