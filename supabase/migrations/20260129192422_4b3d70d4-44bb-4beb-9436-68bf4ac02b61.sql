-- ============================================
-- INTEGRATIONS & AUTOMATION FRAMEWORK
-- ============================================

-- 1. Integrations table - connected external tools
CREATE TABLE IF NOT EXISTS public.integrations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  provider TEXT NOT NULL, -- google_calendar, google_sheets, webhook, printer, hubspot, square, etc.
  display_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'disconnected', -- connected, disconnected, error
  auth_type TEXT NOT NULL DEFAULT 'api_key', -- oauth, api_key
  scopes_json JSONB DEFAULT '[]'::jsonb,
  config_json JSONB DEFAULT '{}'::jsonb, -- calendar_id, sheet_id, webhook_url, etc.
  error_message TEXT,
  last_tested_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, provider)
);

-- 2. Integration secrets - encrypted credentials (minimal, API key only for now)
-- For OAuth, we'd use a vault or external service, but for MVP we store encrypted
CREATE TABLE IF NOT EXISTS public.integration_secrets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  integration_id UUID NOT NULL REFERENCES public.integrations(id) ON DELETE CASCADE,
  secret_type TEXT NOT NULL, -- api_key, access_token, refresh_token
  encrypted_value TEXT NOT NULL, -- in real production, use pgcrypto or vault
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Automation rules - maps events to destinations
CREATE TABLE IF NOT EXISTS public.automation_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  enabled BOOLEAN NOT NULL DEFAULT true,
  trigger_event TEXT NOT NULL, -- order.created, booking.created, dispatch_job.created, call.ended, missed_call, lead.captured
  destination_provider TEXT NOT NULL, -- google_calendar, google_sheets, webhook, printer, sms, email
  action_type TEXT NOT NULL, -- create_event, append_row, send_webhook, print_receipt, send_sms, send_email
  integration_id UUID REFERENCES public.integrations(id) ON DELETE SET NULL,
  field_mapping_json JSONB DEFAULT '{}'::jsonb, -- maps event payload fields to provider fields
  behavior_json JSONB DEFAULT '{"auto_confirm": true, "max_retries": 3}'::jsonb,
  priority INT NOT NULL DEFAULT 100,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Automation runs - execution log per rule
CREATE TABLE IF NOT EXISTS public.automation_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  rule_id UUID REFERENCES public.automation_rules(id) ON DELETE SET NULL,
  workflow_id UUID REFERENCES public.workflows(id) ON DELETE SET NULL, -- link to legacy workflows if any
  trigger_event TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, running, success, failed, skipped
  payload_snapshot JSONB,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  error_message TEXT,
  retry_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Automation run steps - individual action logs
CREATE TABLE IF NOT EXISTS public.automation_run_steps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  run_id UUID NOT NULL REFERENCES public.automation_runs(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  destination_provider TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, running, success, failed, skipped
  request_payload JSONB,
  response_payload JSONB,
  error_message TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. Enable RLS
ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_secrets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_run_steps ENABLE ROW LEVEL SECURITY;

-- 7. RLS Policies for integrations
DROP POLICY IF EXISTS "Tenants can view their own integrations" ON public.integrations;
CREATE POLICY "Tenants can view their own integrations"
  ON public.integrations FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Tenants can insert their own integrations" ON public.integrations;
CREATE POLICY "Tenants can insert their own integrations"
  ON public.integrations FOR INSERT
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Tenants can update their own integrations" ON public.integrations;
CREATE POLICY "Tenants can update their own integrations"
  ON public.integrations FOR UPDATE
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Tenants can delete their own integrations" ON public.integrations;
CREATE POLICY "Tenants can delete their own integrations"
  ON public.integrations FOR DELETE
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

-- 8. RLS Policies for integration_secrets (read-only from client, managed by edge functions)
DROP POLICY IF EXISTS "Tenants can view their own integration secrets" ON public.integration_secrets;
CREATE POLICY "Tenants can view their own integration secrets"
  ON public.integration_secrets FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Tenants can insert their own integration secrets" ON public.integration_secrets;
CREATE POLICY "Tenants can insert their own integration secrets"
  ON public.integration_secrets FOR INSERT
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Tenants can update their own integration secrets" ON public.integration_secrets;
CREATE POLICY "Tenants can update their own integration secrets"
  ON public.integration_secrets FOR UPDATE
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Tenants can delete their own integration secrets" ON public.integration_secrets;
CREATE POLICY "Tenants can delete their own integration secrets"
  ON public.integration_secrets FOR DELETE
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

-- 9. RLS Policies for automation_rules
DROP POLICY IF EXISTS "Tenants can view their own automation rules" ON public.automation_rules;
CREATE POLICY "Tenants can view their own automation rules"
  ON public.automation_rules FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Tenants can insert their own automation rules" ON public.automation_rules;
CREATE POLICY "Tenants can insert their own automation rules"
  ON public.automation_rules FOR INSERT
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Tenants can update their own automation rules" ON public.automation_rules;
CREATE POLICY "Tenants can update their own automation rules"
  ON public.automation_rules FOR UPDATE
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Tenants can delete their own automation rules" ON public.automation_rules;
CREATE POLICY "Tenants can delete their own automation rules"
  ON public.automation_rules FOR DELETE
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

-- 10. RLS Policies for automation_runs
DROP POLICY IF EXISTS "Tenants can view their own automation runs" ON public.automation_runs;
CREATE POLICY "Tenants can view their own automation runs"
  ON public.automation_runs FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Tenants can insert their own automation runs" ON public.automation_runs;
CREATE POLICY "Tenants can insert their own automation runs"
  ON public.automation_runs FOR INSERT
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

-- 11. RLS Policies for automation_run_steps (via run_id join)
DROP POLICY IF EXISTS "Tenants can view their own automation run steps" ON public.automation_run_steps;
CREATE POLICY "Tenants can view their own automation run steps"
  ON public.automation_run_steps FOR SELECT
  USING (run_id IN (
    SELECT id FROM public.automation_runs 
    WHERE tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid())
  ));

DROP POLICY IF EXISTS "Tenants can insert their own automation run steps" ON public.automation_run_steps;
CREATE POLICY "Tenants can insert their own automation run steps"
  ON public.automation_run_steps FOR INSERT
  WITH CHECK (run_id IN (
    SELECT id FROM public.automation_runs 
    WHERE tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid())
  ));

-- 12. Indexes
CREATE INDEX IF NOT EXISTS idx_integrations_tenant ON public.integrations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_integrations_provider ON public.integrations(tenant_id, provider);
CREATE INDEX IF NOT EXISTS idx_automation_rules_tenant ON public.automation_rules(tenant_id);
CREATE INDEX IF NOT EXISTS idx_automation_rules_trigger ON public.automation_rules(tenant_id, trigger_event);
CREATE INDEX IF NOT EXISTS idx_automation_runs_tenant ON public.automation_runs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_automation_runs_status ON public.automation_runs(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_automation_run_steps_run ON public.automation_run_steps(run_id);

-- 13. Update trigger for integrations
DROP TRIGGER IF EXISTS update_integrations_updated_at ON public.integrations;
CREATE TRIGGER update_integrations_updated_at
  BEFORE UPDATE ON public.integrations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_automation_rules_updated_at ON public.automation_rules;
CREATE TRIGGER update_automation_rules_updated_at
  BEFORE UPDATE ON public.automation_rules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();