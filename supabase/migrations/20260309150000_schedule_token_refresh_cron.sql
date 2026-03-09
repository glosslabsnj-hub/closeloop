-- Schedule proactive token refresh cron (runs daily at 3 AM UTC)
-- Refreshes any OAuth token expiring within 7 days to prevent silent integration breaks
SELECT cron.schedule(
  'cron-token-refresh',
  '0 3 * * *',
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_url' LIMIT 1) || '/functions/v1/cron-token-refresh',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_service_role_key' LIMIT 1)
    ),
    body := '{}'::jsonb
  );
  $$
);
