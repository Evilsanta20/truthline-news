-- Create a function to clean up old articles (older than 7 days)
CREATE OR REPLACE FUNCTION cleanup_old_articles()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count integer := 0;
  bookmarked_article_ids uuid[];
BEGIN
  -- Get all bookmarked article IDs to preserve them
  SELECT ARRAY_AGG(DISTINCT article_id) INTO bookmarked_article_ids
  FROM bookmarks;
  
  -- Delete articles older than 7 days that are NOT bookmarked
  DELETE FROM articles
  WHERE created_at < NOW() - INTERVAL '7 days'
    AND (bookmarked_article_ids IS NULL OR id != ALL(bookmarked_article_ids));
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- Log the cleanup
  INSERT INTO aggregation_logs (source_function, log_level, results)
  VALUES (
    'cleanup_old_articles',
    'info',
    jsonb_build_object(
      'deleted_count', deleted_count,
      'timestamp', NOW()
    )
  );
  
  RETURN deleted_count;
END;
$$;

-- Create a function to archive old articles before deletion
CREATE OR REPLACE FUNCTION archive_and_cleanup_old_articles()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count integer := 0;
  bookmarked_article_ids uuid[];
BEGIN
  -- Get all bookmarked article IDs to preserve them
  SELECT ARRAY_AGG(DISTINCT article_id) INTO bookmarked_article_ids
  FROM bookmarks;
  
  -- Archive articles older than 7 days before deletion (for audit trail)
  INSERT INTO article_archive (original_article_id, title, content, url, source_name, archive_reason)
  SELECT id, title, content, url, source_name, 'aged_out'
  FROM articles
  WHERE created_at < NOW() - INTERVAL '7 days'
    AND (bookmarked_article_ids IS NULL OR id != ALL(bookmarked_article_ids))
    AND id NOT IN (SELECT original_article_id FROM article_archive WHERE original_article_id IS NOT NULL);
  
  -- Delete old articles (not bookmarked)
  DELETE FROM articles
  WHERE created_at < NOW() - INTERVAL '7 days'
    AND (bookmarked_article_ids IS NULL OR id != ALL(bookmarked_article_ids));
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- Clean up very old archives (older than 30 days)
  DELETE FROM article_archive
  WHERE archived_at < NOW() - INTERVAL '30 days';
  
  RETURN deleted_count;
END;
$$;