-- Create daily notification cron job that runs at 10 AM UTC
-- This will automatically trigger notifications every day at 10 AM

SELECT cron.schedule(
  'daily-notifications-10am',
  '0 10 * * *',  -- At 10:00 AM UTC every day
  $$
    SELECT net.http_post(
      url := 'https://idryuttsllvtlcdhlelk.supabase.co/functions/v1/daily-notification-check',
      headers := '{"Content-Type": "application/json"}',
      body := '{}'
    ) as request_id;
  $$
);

-- Verify the cron job was created
SELECT * FROM cron.job WHERE schedule = '0 10 * * *';
