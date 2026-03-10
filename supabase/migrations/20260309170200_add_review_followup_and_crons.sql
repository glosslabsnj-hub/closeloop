-- Add review_followup_sent column to bookings
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS review_followup_sent BOOLEAN DEFAULT false;

-- Schedule review follow-up cron (runs daily at 2 PM UTC / 10 AM ET)
SELECT cron.schedule(
  'cron-review-followup',
  '0 14 * * *',
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_url' LIMIT 1) || '/functions/v1/cron-review-followup',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_service_role_key' LIMIT 1)
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Also add review_link to tenants if not exists
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS review_link TEXT;
