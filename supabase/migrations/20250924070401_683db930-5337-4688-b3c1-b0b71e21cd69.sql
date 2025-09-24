-- Improve articles table with better indexing and deduplication
CREATE INDEX IF NOT EXISTS idx_articles_url_hash ON articles(content_hash);
CREATE INDEX IF NOT EXISTS idx_articles_published_at ON articles(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_articles_created_at ON articles(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_articles_updated_at ON articles(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_articles_source_name ON articles(source_name);
CREATE INDEX IF NOT EXISTS idx_articles_topic_tags ON articles USING GIN(topic_tags);

-- Add data freshness tracking columns
ALTER TABLE articles ADD COLUMN IF NOT EXISTS data_freshness_score numeric DEFAULT 1.0;
ALTER TABLE articles ADD COLUMN IF NOT EXISTS last_verified_at timestamp with time zone DEFAULT now();
ALTER TABLE articles ADD COLUMN IF NOT EXISTS source_last_modified timestamp with time zone;
ALTER TABLE articles ADD COLUMN IF NOT EXISTS cache_expires_at timestamp with time zone;

-- Create a function to calculate content hash for deduplication
CREATE OR REPLACE FUNCTION calculate_content_hash(title_text text, content_text text, url_text text)
RETURNS text AS $$
BEGIN
  RETURN encode(digest(CONCAT(COALESCE(title_text, ''), COALESCE(content_text, ''), COALESCE(url_text, '')), 'sha256'), 'hex');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create function to handle smart article upserting (insert or update)
-- Fixed parameter ordering: required params first, then optional with defaults
CREATE OR REPLACE FUNCTION upsert_article(
  p_title text,
  p_url text,
  p_description text DEFAULT NULL,
  p_content text DEFAULT NULL,
  p_url_to_image text DEFAULT NULL,
  p_source_name text DEFAULT NULL,
  p_author text DEFAULT NULL,
  p_published_at timestamp with time zone DEFAULT NULL,
  p_topic_tags text[] DEFAULT '{}',
  p_bias_score numeric DEFAULT 0.5,
  p_credibility_score numeric DEFAULT 0.7,
  p_sentiment_score numeric DEFAULT 0.5,
  p_content_quality_score numeric DEFAULT 0.7,
  p_engagement_score numeric DEFAULT 0
) RETURNS uuid AS $$
DECLARE
  content_hash_val text;
  existing_article_id uuid;
  result_id uuid;
  cache_duration interval := '6 hours'::interval;
BEGIN
  -- Calculate content hash for deduplication
  content_hash_val := calculate_content_hash(p_title, p_content, p_url);
  
  -- Check if article already exists with same content hash or URL
  SELECT id INTO existing_article_id 
  FROM articles 
  WHERE content_hash = content_hash_val 
  OR url = p_url
  LIMIT 1;
  
  IF existing_article_id IS NOT NULL THEN
    -- Update existing article with fresh data if it's been more than 1 hour
    UPDATE articles SET
      title = COALESCE(p_title, title),
      description = COALESCE(p_description, description),
      content = COALESCE(p_content, content),
      url_to_image = COALESCE(p_url_to_image, url_to_image),
      author = COALESCE(p_author, author),
      published_at = COALESCE(p_published_at, published_at),
      topic_tags = CASE 
        WHEN array_length(p_topic_tags, 1) > 0 THEN p_topic_tags 
        ELSE topic_tags 
      END,
      bias_score = COALESCE(p_bias_score, bias_score),
      credibility_score = COALESCE(p_credibility_score, credibility_score),
      sentiment_score = COALESCE(p_sentiment_score, sentiment_score),
      content_quality_score = COALESCE(p_content_quality_score, content_quality_score),
      engagement_score = GREATEST(engagement_score, p_engagement_score),
      updated_at = now(),
      last_verified_at = now(),
      cache_expires_at = now() + cache_duration,
      data_freshness_score = 1.0
    WHERE id = existing_article_id
    AND (last_verified_at IS NULL OR last_verified_at < now() - '1 hour'::interval);
    
    result_id := existing_article_id;
  ELSE
    -- Insert new article
    INSERT INTO articles (
      title, description, content, url, url_to_image, source_name, author,
      published_at, topic_tags, bias_score, credibility_score, sentiment_score,
      content_quality_score, engagement_score, content_hash, last_verified_at,
      cache_expires_at, data_freshness_score
    ) VALUES (
      p_title, p_description, p_content, p_url, p_url_to_image, p_source_name, p_author,
      COALESCE(p_published_at, now()), p_topic_tags, p_bias_score, p_credibility_score, 
      p_sentiment_score, p_content_quality_score, p_engagement_score, content_hash_val,
      now(), now() + cache_duration, 1.0
    ) RETURNING id INTO result_id;
  END IF;
  
  RETURN result_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to clean up old duplicate articles
CREATE OR REPLACE FUNCTION cleanup_duplicate_articles()
RETURNS integer AS $$
DECLARE
  deleted_count integer := 0;
BEGIN
  -- Delete older duplicates keeping the most recent one
  WITH duplicates AS (
    SELECT id, 
           ROW_NUMBER() OVER (PARTITION BY content_hash ORDER BY created_at DESC, updated_at DESC) as rn
    FROM articles 
    WHERE content_hash IS NOT NULL
  )
  DELETE FROM articles 
  WHERE id IN (
    SELECT id FROM duplicates WHERE rn > 1
  );
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- Clean up articles with very low quality scores older than 7 days
  DELETE FROM articles 
  WHERE created_at < now() - '7 days'::interval 
  AND content_quality_score < 0.2 
  AND engagement_score < 1;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to mark stale articles and update freshness scores
CREATE OR REPLACE FUNCTION update_data_freshness()
RETURNS integer AS $$
DECLARE
  updated_count integer := 0;
BEGIN
  -- Update freshness scores based on age and cache expiration
  UPDATE articles 
  SET data_freshness_score = CASE
    WHEN cache_expires_at IS NOT NULL AND cache_expires_at > now() THEN 1.0
    WHEN last_verified_at > now() - '1 hour'::interval THEN 0.9
    WHEN last_verified_at > now() - '6 hours'::interval THEN 0.7
    WHEN last_verified_at > now() - '24 hours'::interval THEN 0.5
    WHEN last_verified_at > now() - '72 hours'::interval THEN 0.3
    ELSE 0.1
  END
  WHERE data_freshness_score IS NULL 
  OR cache_expires_at < now() 
  OR last_verified_at < now() - '1 hour'::interval;
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create automated trigger to set content hash on insert/update
CREATE OR REPLACE FUNCTION set_content_hash_trigger()
RETURNS trigger AS $$
BEGIN
  IF NEW.content_hash IS NULL OR NEW.content_hash = '' THEN
    NEW.content_hash := calculate_content_hash(NEW.title, NEW.content, NEW.url);
  END IF;
  
  -- Set cache expiration if not set
  IF NEW.cache_expires_at IS NULL THEN
    NEW.cache_expires_at := now() + '6 hours'::interval;
  END IF;
  
  -- Update last verified timestamp
  NEW.last_verified_at := now();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for content hash and cache management
DROP TRIGGER IF EXISTS trigger_set_content_hash ON articles;
CREATE TRIGGER trigger_set_content_hash
  BEFORE INSERT OR UPDATE ON articles
  FOR EACH ROW
  EXECUTE FUNCTION set_content_hash_trigger();

-- Create a data sync status table for tracking sync operations
CREATE TABLE IF NOT EXISTS data_sync_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_type text NOT NULL, -- 'news_fetch', 'cache_refresh', 'cleanup'
  started_at timestamp with time zone NOT NULL DEFAULT now(),
  completed_at timestamp with time zone,
  status text NOT NULL DEFAULT 'running', -- 'running', 'completed', 'failed'
  articles_processed integer DEFAULT 0,
  articles_added integer DEFAULT 0,
  articles_updated integer DEFAULT 0,
  articles_removed integer DEFAULT 0,
  error_message text,
  metadata jsonb DEFAULT '{}',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on data_sync_status
ALTER TABLE data_sync_status ENABLE ROW LEVEL SECURITY;

-- Create policies for data_sync_status
CREATE POLICY "System can manage sync status" ON data_sync_status
  FOR ALL USING (true);

CREATE POLICY "Admins can view sync status" ON data_sync_status
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

-- Create function to start a sync operation
CREATE OR REPLACE FUNCTION start_sync_operation(
  sync_type_param text, 
  metadata_param jsonb DEFAULT '{}'
)
RETURNS uuid AS $$
DECLARE
  sync_id uuid;
BEGIN
  INSERT INTO data_sync_status (sync_type, metadata)
  VALUES (sync_type_param, metadata_param)
  RETURNING id INTO sync_id;
  
  RETURN sync_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to complete a sync operation
CREATE OR REPLACE FUNCTION complete_sync_operation(
  sync_id_param uuid,
  status_param text DEFAULT 'completed',
  articles_processed_param integer DEFAULT 0,
  articles_added_param integer DEFAULT 0,
  articles_updated_param integer DEFAULT 0,
  articles_removed_param integer DEFAULT 0,
  error_message_param text DEFAULT NULL
)
RETURNS boolean AS $$
BEGIN
  UPDATE data_sync_status
  SET 
    completed_at = now(),
    status = status_param,
    articles_processed = articles_processed_param,
    articles_added = articles_added_param,
    articles_updated = articles_updated_param,
    articles_removed = articles_removed_param,
    error_message = error_message_param
  WHERE id = sync_id_param;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create indexes on data_sync_status for performance
CREATE INDEX IF NOT EXISTS idx_data_sync_status_type_created ON data_sync_status(sync_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_data_sync_status_status ON data_sync_status(status);

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION upsert_article TO authenticated, anon;
GRANT EXECUTE ON FUNCTION cleanup_duplicate_articles TO authenticated, anon;
GRANT EXECUTE ON FUNCTION update_data_freshness TO authenticated, anon;
GRANT EXECUTE ON FUNCTION start_sync_operation TO authenticated, anon;
GRANT EXECUTE ON FUNCTION complete_sync_operation TO authenticated, anon;