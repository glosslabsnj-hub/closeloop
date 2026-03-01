-- AI Context Snapshots table for debugging
CREATE TABLE IF NOT EXISTS public.ai_context_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('voice', 'sms', 'browser_test')),
  session_id TEXT NOT NULL,
  call_sid TEXT,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  location_id UUID REFERENCES public.tenant_locations(id) ON DELETE SET NULL,
  context_json JSONB NOT NULL DEFAULT '{}',
  missing_sections TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_ai_context_snapshots_tenant_created ON public.ai_context_snapshots(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_context_snapshots_channel ON public.ai_context_snapshots(channel, created_at DESC);

-- Enable RLS
ALTER TABLE public.ai_context_snapshots ENABLE ROW LEVEL SECURITY;

-- RLS policy: tenant users can view their own snapshots
DROP POLICY IF EXISTS "Tenant users can view their own context snapshots" ON public.ai_context_snapshots;
CREATE POLICY "Tenant users can view their own context snapshots"
  ON public.ai_context_snapshots FOR SELECT
  USING (public.has_tenant_access(auth.uid(), tenant_id));

-- Super admins can view all
DROP POLICY IF EXISTS "Super admins can view all context snapshots" ON public.ai_context_snapshots;
CREATE POLICY "Super admins can view all context snapshots"
  ON public.ai_context_snapshots FOR SELECT
  USING (public.has_role(auth.uid(), 'super_admin'));

-- Service role can insert (edge functions)
DROP POLICY IF EXISTS "Service role can insert context snapshots" ON public.ai_context_snapshots;
CREATE POLICY "Service role can insert context snapshots"
  ON public.ai_context_snapshots FOR INSERT
  WITH CHECK (true);

-- Auto-cleanup: keep only last 100 per tenant
CREATE OR REPLACE FUNCTION public.cleanup_old_context_snapshots()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM public.ai_context_snapshots
  WHERE tenant_id = NEW.tenant_id
    AND id NOT IN (
      SELECT id FROM public.ai_context_snapshots
      WHERE tenant_id = NEW.tenant_id
      ORDER BY created_at DESC
      LIMIT 100
    );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_cleanup_context_snapshots ON public.ai_context_snapshots;
CREATE TRIGGER trg_cleanup_context_snapshots
  AFTER INSERT ON public.ai_context_snapshots
  FOR EACH ROW
  EXECUTE FUNCTION public.cleanup_old_context_snapshots();