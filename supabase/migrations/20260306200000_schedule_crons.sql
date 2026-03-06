-- Schedule customer reactivation: runs daily at 10 AM ET (3 PM UTC)
-- Finds customers with no bookings in 60+ days and sends a win-back text
SELECT cron.schedule(
  'customer-reactivation-daily',
  '0 15 * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/cron-customer-reactivation',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Schedule weekly ops digest: runs every Monday at 8 AM ET (1 PM UTC)
-- Sends Jack a Telegram summary of calls, bookings, revenue, action items
SELECT cron.schedule(
  'weekly-ops-digest',
  '0 13 * * 1',
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/cron-weekly-ops-digest',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);
