-- Add 'general' category that's missing
INSERT INTO categories (name, slug, description, color)
VALUES ('General', 'general', 'General news and updates', '#6B7280')
ON CONFLICT (slug) DO NOTHING;

-- Update existing articles without categories based on their topic tags and source
UPDATE articles
SET category_id = (
  SELECT id FROM categories WHERE slug = 
  CASE 
    WHEN topic_tags && ARRAY['politics', 'election', 'government', 'policy']::text[] THEN 'politics'
    WHEN topic_tags && ARRAY['technology', 'tech', 'ai', 'software', 'crypto']::text[] THEN 'technology'
    WHEN topic_tags && ARRAY['business', 'finance', 'economy', 'market', 'stock']::text[] THEN 'business'
    WHEN topic_tags && ARRAY['sports', 'nfl', 'nba', 'football', 'basketball']::text[] THEN 'sports'
    WHEN topic_tags && ARRAY['entertainment', 'celebrity', 'movie', 'music']::text[] THEN 'entertainment'
    WHEN topic_tags && ARRAY['health', 'medical', 'medicine', 'vaccine']::text[] THEN 'health'
    WHEN topic_tags && ARRAY['science', 'research', 'study', 'discovery']::text[] THEN 'science'
    WHEN topic_tags && ARRAY['world', 'international', 'global']::text[] THEN 'world'
    ELSE 'general'
  END
  LIMIT 1
)
WHERE category_id IS NULL 
  AND topic_tags IS NOT NULL 
  AND array_length(topic_tags, 1) > 0;

-- For articles without topic tags, categorize based on source name
UPDATE articles
SET category_id = (
  SELECT id FROM categories WHERE slug = 
  CASE 
    WHEN source_name ILIKE '%tech%' OR source_name ILIKE '%verge%' OR source_name ILIKE '%wired%' THEN 'technology'
    WHEN source_name ILIKE '%sport%' OR source_name ILIKE '%espn%' THEN 'sports'
    WHEN source_name ILIKE '%business%' OR source_name ILIKE '%bloomberg%' OR source_name ILIKE '%financial%' THEN 'business'
    WHEN source_name ILIKE '%health%' OR source_name ILIKE '%medical%' THEN 'health'
    WHEN source_name ILIKE '%entertainment%' OR source_name ILIKE '%hollywood%' THEN 'entertainment'
    ELSE 'general'
  END
  LIMIT 1
)
WHERE category_id IS NULL;

-- Final fallback: assign remaining uncategorized articles to 'general'
UPDATE articles
SET category_id = (SELECT id FROM categories WHERE slug = 'general' LIMIT 1)
WHERE category_id IS NULL;