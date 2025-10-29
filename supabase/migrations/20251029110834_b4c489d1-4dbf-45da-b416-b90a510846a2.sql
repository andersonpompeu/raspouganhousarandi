-- Enable pg_cron extension for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Enable pg_net extension for HTTP requests
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create a cron job to run the reminder scheduler daily at 9:00 AM
SELECT cron.schedule(
  'daily-reminder-scheduler',
  '0 9 * * *', -- Every day at 9:00 AM
  $$
  SELECT
    net.http_post(
      url := 'https://qtcvgixswhahwtfvhelp.supabase.co/functions/v1/reminder-scheduler',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF0Y3ZnaXhzd2hhaHd0ZnZoZWxwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDUwNzU5MCwiZXhwIjoyMDc2MDgzNTkwfQ.wKr5fLnqU1B3-EwQ09Ue5v6tPp0nNmVKg2aYE39_N-4"}'::jsonb
    ) AS request_id;
  $$
);