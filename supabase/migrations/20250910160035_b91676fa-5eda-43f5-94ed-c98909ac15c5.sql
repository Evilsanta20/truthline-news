-- Enable pg_cron extension for scheduled tasks
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create a cron job to call auto-news-refresh every 15 minutes
SELECT cron.schedule(
  'cybotic-auto-refresh',
  '*/15 * * * *', -- Every 15 minutes
  $$
  SELECT
    net.http_post(
        url:='https://nyouhqyenazoocxiomgb.supabase.co/functions/v1/auto-news-refresh',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im55b3VocXllbmF6b29jeGlvbWdiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ0MDUwMDIsImV4cCI6MjA2OTk4MTAwMn0.LjDlrJGjJK9RxkRUhPGvlj8WbZIxYwv090orTI7-ZeY"}'::jsonb,
        body:='{"trigger": "cron"}'::jsonb
    ) as request_id;
  $$
);