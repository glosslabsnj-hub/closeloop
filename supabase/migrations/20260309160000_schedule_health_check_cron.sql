-- Schedule daily tenant health check (runs at 6 AM UTC)
-- Checks all active tenants and stores health snapshots
SELECT cron.schedule(
  'cron-tenant-health',
  '0 6 * * *',
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_url' LIMIT 1) || '/functions/v1/cron-tenant-health',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_service_role_key' LIMIT 1)
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Create health snapshots table for tracking health over time
CREATE TABLE IF NOT EXISTS tenant_health_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  overall_score INTEGER NOT NULL,
  overall_status TEXT NOT NULL,
  config_health JSONB NOT NULL DEFAULT '{}',
  integration_health JSONB NOT NULL DEFAULT '{}',
  notification_health JSONB NOT NULL DEFAULT '{}',
  ai_health JSONB NOT NULL DEFAULT '{}',
  data_health JSONB NOT NULL DEFAULT '{}',
  automation_health JSONB NOT NULL DEFAULT '{}',
  issues JSONB NOT NULL DEFAULT '[]',
  checked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_health_snapshots_tenant_date
  ON tenant_health_snapshots(tenant_id, checked_at DESC);

-- RLS
ALTER TABLE tenant_health_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenants can view their own health snapshots"
  ON tenant_health_snapshots FOR SELECT
  USING (tenant_id IN (
    SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()
  ));
