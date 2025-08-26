-- Create aggregation logs table for observability
CREATE TABLE IF NOT EXISTS public.aggregation_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source_function TEXT NOT NULL,
  execution_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  results JSONB NOT NULL DEFAULT '{}'::jsonb,
  success_rate NUMERIC(3,2),
  log_level TEXT NOT NULL DEFAULT 'info',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add content hash column to articles for deduplication
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS content_hash TEXT;

-- Add processing metadata columns
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS processing_notes TEXT;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_articles_content_hash ON public.articles(content_hash);
CREATE INDEX IF NOT EXISTS idx_aggregation_logs_execution_time ON public.aggregation_logs(execution_time);
CREATE INDEX IF NOT EXISTS idx_aggregation_logs_source_function ON public.aggregation_logs(source_function);

-- Enable RLS for aggregation logs
ALTER TABLE public.aggregation_logs ENABLE ROW LEVEL SECURITY;

-- Allow system to manage aggregation logs
CREATE POLICY "System can manage aggregation logs" 
ON public.aggregation_logs 
FOR ALL 
USING (true);

-- Create function to clean up old logs (keep last 30 days)
CREATE OR REPLACE FUNCTION public.cleanup_old_logs()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM public.aggregation_logs 
  WHERE created_at < now() - INTERVAL '30 days';
END;
$$;

-- Add content quality thresholds configuration table
CREATE TABLE IF NOT EXISTS public.content_quality_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  config_name TEXT NOT NULL UNIQUE,
  toxicity_threshold NUMERIC(3,2) DEFAULT 0.4,
  bias_threshold NUMERIC(3,2) DEFAULT 0.7,
  sensationalism_threshold NUMERIC(3,2) DEFAULT 0.65,
  min_factuality NUMERIC(3,2) DEFAULT 0.45,
  min_content_quality NUMERIC(3,2) DEFAULT 0.4,
  min_credibility NUMERIC(3,2) DEFAULT 0.3,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert default quality configuration
INSERT INTO public.content_quality_config (config_name) 
VALUES ('default') 
ON CONFLICT (config_name) DO NOTHING;

-- Enable RLS for content quality config
ALTER TABLE public.content_quality_config ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read config, only admins to modify
CREATE POLICY "Anyone can read quality config" 
ON public.content_quality_config 
FOR SELECT 
USING (true);

CREATE POLICY "Admins can manage quality config" 
ON public.content_quality_config 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));