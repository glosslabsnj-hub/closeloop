-- Schedule auto-complete bookings: runs every 15 minutes
-- Marks bookings as "completed" when 2+ hours have passed after appointment end time,
-- then triggers the post-service automation chain (thank-you SMS, invoice, review request)
SELECT cron.schedule(
  'auto-complete-bookings-15min',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/cron-auto-complete-bookings',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);
