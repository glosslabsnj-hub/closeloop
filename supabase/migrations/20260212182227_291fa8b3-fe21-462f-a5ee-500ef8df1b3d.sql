
-- 1. Create tenant_integrations table
CREATE TABLE public.tenant_integrations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  credentials_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  config_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_synced_at TIMESTAMPTZ,
  sync_cursor TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, provider)
);

-- Enable RLS
ALTER TABLE public.tenant_integrations ENABLE ROW LEVEL SECURITY;

-- RLS policies: tenant members only
CREATE POLICY "Tenant members can view integrations"
  ON public.tenant_integrations FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

CREATE POLICY "Tenant members can insert integrations"
  ON public.tenant_integrations FOR INSERT
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

CREATE POLICY "Tenant members can update integrations"
  ON public.tenant_integrations FOR UPDATE
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

CREATE POLICY "Tenant members can delete integrations"
  ON public.tenant_integrations FOR DELETE
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

-- Updated_at trigger
CREATE TRIGGER update_tenant_integrations_updated_at
  BEFORE UPDATE ON public.tenant_integrations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Add external_id to active_jobs for deduplication
ALTER TABLE public.active_jobs ADD COLUMN external_id TEXT;

-- Partial unique index: (tenant_id, external_id) where external_id is not null
CREATE UNIQUE INDEX idx_active_jobs_external_id
  ON public.active_jobs (tenant_id, external_id)
  WHERE external_id IS NOT NULL;
