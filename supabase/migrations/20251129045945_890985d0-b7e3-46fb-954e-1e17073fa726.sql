-- Add verification status to articles
ALTER TABLE public.articles 
ADD COLUMN is_verified BOOLEAN DEFAULT false;

-- Add comment
COMMENT ON COLUMN public.articles.is_verified IS 'Indicates if article is from verified external sources (true) or user-generated content (false)';

-- Create index for faster queries
CREATE INDEX idx_articles_is_verified ON public.articles(is_verified);

-- Update existing articles from external sources to be verified
UPDATE public.articles 
SET is_verified = true 
WHERE source_name NOT IN ('Editor', 'editor') 
AND source_name IS NOT NULL;