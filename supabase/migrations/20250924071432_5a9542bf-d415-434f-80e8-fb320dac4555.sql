-- Update existing articles to have better cache expiration and trigger immediate refresh
UPDATE articles 
SET 
  cache_expires_at = NOW() - INTERVAL '1 hour',
  data_freshness_score = 0.1,
  last_verified_at = NOW() - INTERVAL '13 days'
WHERE created_at < NOW() - INTERVAL '7 days';

-- Create a function to auto-trigger fresh article refresh daily
CREATE OR REPLACE FUNCTION schedule_fresh_article_refresh()
RETURNS void AS $$
BEGIN
  -- This function can be called by pg_cron to refresh articles daily
  PERFORM
  FROM pg_sleep(1); -- Placeholder for actual refresh trigger
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION schedule_fresh_article_refresh TO authenticated, anon;