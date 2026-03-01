-- =============================================================================
-- Configuration-to-AI Integrity: Schema Additions
-- =============================================================================
-- Adds pricing columns to bookings, delivery fee tracking to food_orders,
-- callback_requests table, medical intake delivery settings, and callback
-- delivery settings. These support the full owner-config → AI → entity →
-- notification pipeline.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 0A. Add price_cents, price_breakdown, duration_minutes to bookings
-- Bookings currently have no price columns. persistBooking() can't store
-- pricing even when computed.
-- -----------------------------------------------------------------------------
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS price_cents INTEGER,
  ADD COLUMN IF NOT EXISTS price_breakdown JSONB,
  ADD COLUMN IF NOT EXISTS duration_minutes INTEGER;

COMMENT ON COLUMN public.bookings.price_cents IS 'Computed price in cents from service + modifiers';
COMMENT ON COLUMN public.bookings.price_breakdown IS 'JSON breakdown: base, modifiers applied, final';
COMMENT ON COLUMN public.bookings.duration_minutes IS 'Service duration in minutes from service catalog';

-- -----------------------------------------------------------------------------
-- 0B. Add delivery_fee_cents to food_orders
-- food_orders has tax_cents but it is always NULL. Add delivery_fee_cents
-- for zone-based delivery fee tracking.
-- -----------------------------------------------------------------------------
ALTER TABLE public.food_orders
  ADD COLUMN IF NOT EXISTS delivery_fee_cents INTEGER,
  ADD COLUMN IF NOT EXISTS totals_breakdown JSONB;

COMMENT ON COLUMN public.food_orders.delivery_fee_cents IS 'Delivery fee based on delivery zone match';
COMMENT ON COLUMN public.food_orders.totals_breakdown IS 'JSON breakdown: subtotal, tax, delivery_fee, total';

-- -----------------------------------------------------------------------------
-- 0C. Create callback_requests table
-- Callbacks are extracted (CanonicalCallback) but discarded at routing.
-- This table ensures no callback request is ever lost.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.callback_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  session_id UUID REFERENCES public.ai_call_sessions(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  customer_name TEXT,
  customer_phone TEXT,
  best_time TEXT,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'contacted', 'resolved')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.callback_requests IS
  'Persisted callback requests from AI calls. Ensures no callback intent is lost.';

CREATE INDEX IF NOT EXISTS idx_callback_requests_tenant
  ON public.callback_requests(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_callback_requests_status
  ON public.callback_requests(tenant_id, status);

-- RLS
ALTER TABLE public.callback_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view tenant callback requests" ON public.callback_requests;
CREATE POLICY "Users can view tenant callback requests"
  ON public.callback_requests FOR SELECT
  USING (public.has_tenant_access(auth.uid(), tenant_id));

DROP POLICY IF EXISTS "Users can insert tenant callback requests" ON public.callback_requests;
CREATE POLICY "Users can insert tenant callback requests"
  ON public.callback_requests FOR INSERT
  WITH CHECK (public.has_tenant_access(auth.uid(), tenant_id));

DROP POLICY IF EXISTS "Users can update tenant callback requests" ON public.callback_requests;
CREATE POLICY "Users can update tenant callback requests"
  ON public.callback_requests FOR UPDATE
  USING (public.has_tenant_access(auth.uid(), tenant_id));

-- Updated_at trigger
DROP TRIGGER IF EXISTS update_callback_requests_updated_at ON public.callback_requests;
CREATE TRIGGER update_callback_requests_updated_at
  BEFORE UPDATE ON public.callback_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- -----------------------------------------------------------------------------
-- 0D. Create medical_intake_delivery_settings table
-- Mirrors booking_delivery_settings pattern for medical mode handoff config.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.medical_intake_delivery_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL UNIQUE REFERENCES public.tenants(id) ON DELETE CASCADE,
  webhook_url TEXT,
  webhook_secret TEXT,
  sms_enabled BOOLEAN NOT NULL DEFAULT false,
  sms_recipient_phone TEXT,
  email_enabled BOOLEAN NOT NULL DEFAULT false,
  email_recipient TEXT,
  hipaa_redact BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.medical_intake_delivery_settings IS
  'Per-tenant settings for medical intake notification delivery. HIPAA redaction on by default.';

-- RLS
ALTER TABLE public.medical_intake_delivery_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view tenant medical intake delivery settings" ON public.medical_intake_delivery_settings;
CREATE POLICY "Users can view tenant medical intake delivery settings"
  ON public.medical_intake_delivery_settings FOR SELECT
  USING (public.has_tenant_access(auth.uid(), tenant_id));

DROP POLICY IF EXISTS "Users can insert tenant medical intake delivery settings" ON public.medical_intake_delivery_settings;
CREATE POLICY "Users can insert tenant medical intake delivery settings"
  ON public.medical_intake_delivery_settings FOR INSERT
  WITH CHECK (public.has_tenant_access(auth.uid(), tenant_id));

DROP POLICY IF EXISTS "Users can update tenant medical intake delivery settings" ON public.medical_intake_delivery_settings;
CREATE POLICY "Users can update tenant medical intake delivery settings"
  ON public.medical_intake_delivery_settings FOR UPDATE
  USING (public.has_tenant_access(auth.uid(), tenant_id));

DROP TRIGGER IF EXISTS update_medical_intake_delivery_settings_updated_at ON public.medical_intake_delivery_settings;
CREATE TRIGGER update_medical_intake_delivery_settings_updated_at
  BEFORE UPDATE ON public.medical_intake_delivery_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- -----------------------------------------------------------------------------
-- 0E. Create callback_delivery_settings table
-- Configures how callback requests are delivered to the business owner.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.callback_delivery_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL UNIQUE REFERENCES public.tenants(id) ON DELETE CASCADE,
  sms_enabled BOOLEAN NOT NULL DEFAULT false,
  sms_recipient_phone TEXT,
  email_enabled BOOLEAN NOT NULL DEFAULT false,
  email_recipient TEXT,
  webhook_url TEXT,
  webhook_secret TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.callback_delivery_settings IS
  'Per-tenant settings for callback request notification delivery.';

-- RLS
ALTER TABLE public.callback_delivery_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view tenant callback delivery settings" ON public.callback_delivery_settings;
CREATE POLICY "Users can view tenant callback delivery settings"
  ON public.callback_delivery_settings FOR SELECT
  USING (public.has_tenant_access(auth.uid(), tenant_id));

DROP POLICY IF EXISTS "Users can insert tenant callback delivery settings" ON public.callback_delivery_settings;
CREATE POLICY "Users can insert tenant callback delivery settings"
  ON public.callback_delivery_settings FOR INSERT
  WITH CHECK (public.has_tenant_access(auth.uid(), tenant_id));

DROP POLICY IF EXISTS "Users can update tenant callback delivery settings" ON public.callback_delivery_settings;
CREATE POLICY "Users can update tenant callback delivery settings"
  ON public.callback_delivery_settings FOR UPDATE
  USING (public.has_tenant_access(auth.uid(), tenant_id));

DROP TRIGGER IF EXISTS update_callback_delivery_settings_updated_at ON public.callback_delivery_settings;
CREATE TRIGGER update_callback_delivery_settings_updated_at
  BEFORE UPDATE ON public.callback_delivery_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- -----------------------------------------------------------------------------
-- Update handoff_attempts entity_type check to include new entity types
-- -----------------------------------------------------------------------------
ALTER TABLE public.handoff_attempts
  DROP CONSTRAINT IF EXISTS check_entity_type;

ALTER TABLE public.handoff_attempts
  ADD CONSTRAINT check_entity_type CHECK (
    entity_type IN ('order', 'booking', 'dispatch', 'reservation', 'callback', 'intake')
    OR entity_type IS NULL
  );

-- Also add 'skipped' to handoff_attempts status for transparent email tracking
ALTER TABLE public.handoff_attempts
  DROP CONSTRAINT IF EXISTS handoff_attempts_status_check;

ALTER TABLE public.handoff_attempts
  ADD CONSTRAINT handoff_attempts_status_check CHECK (
    status IN ('pending', 'success', 'failed', 'skipped')
  );
