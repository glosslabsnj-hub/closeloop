-- Enable pg_cron extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;

-- Grant usage to postgres role (required for cron jobs)
GRANT USAGE ON SCHEMA cron TO postgres;

-- Schedule daily retention cleanup at 3am UTC
SELECT cron.schedule(
  'daily-retention-cleanup',
  '0 3 * * *',
  $$
  -- Clean up old audit events based on default 365-day retention
  DELETE FROM public.audit_events ae
  WHERE ae.occurred_at < now() - (
    SELECT COALESCE(rp.audit_days, 365) * interval '1 day'
    FROM public.retention_policies rp
    WHERE rp.tenant_id = ae.tenant_id
  );
  
  -- Clean up orphaned audit events (no retention policy = use default 365 days)
  DELETE FROM public.audit_events
  WHERE occurred_at < now() - interval '365 days'
  AND tenant_id NOT IN (SELECT tenant_id FROM public.retention_policies);
  
  -- Clean up old AI call session transcripts based on retention policy
  UPDATE public.ai_call_sessions acs
  SET transcript = NULL
  WHERE acs.started_at < now() - (
    SELECT COALESCE(rp.transcript_days, 30) * interval '1 day'
    FROM public.retention_policies rp
    WHERE rp.tenant_id = acs.tenant_id
    AND rp.transcript_days > 0
    AND rp.store_transcripts = false
  );
  $$
);