-- Maps (fallback_number, customer_phone) -> tenant_id so that inbound replies
-- to the global TWILIO_FROM_NUMBER fallback can be routed to the correct tenant.
-- Rows are upserted by sms-sender whenever it sends via the global fallback.

CREATE TABLE IF NOT EXISTS public.sms_fallback_routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fallback_number TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  last_sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(fallback_number, customer_phone)
);

-- Index for fast inbound lookup: given fallback + customer phone, find tenant
CREATE INDEX IF NOT EXISTS idx_sms_fallback_routes_lookup
  ON public.sms_fallback_routes(fallback_number, customer_phone);

-- RLS: service role only (edge functions use service key)
ALTER TABLE public.sms_fallback_routes ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (edge functions run as service_role)
CREATE POLICY "service_role_all" ON public.sms_fallback_routes
  FOR ALL USING (true) WITH CHECK (true);
