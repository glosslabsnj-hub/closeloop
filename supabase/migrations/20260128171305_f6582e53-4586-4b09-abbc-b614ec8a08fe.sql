-- Create entity_type enum for delivery rules
CREATE TYPE public.delivery_entity_type AS ENUM ('order', 'booking', 'dispatch', 'reservation', 'catering', 'intake');

-- Create auth_mode enum for webhook authentication
CREATE TYPE public.webhook_auth_mode AS ENUM ('none', 'header', 'basic');

-- Create universal_delivery_settings table (one per tenant)
CREATE TABLE IF NOT EXISTS public.universal_delivery_settings (
  tenant_id UUID PRIMARY KEY REFERENCES public.tenants(id) ON DELETE CASCADE,
  internal_enabled BOOLEAN NOT NULL DEFAULT true,
  webhook_enabled BOOLEAN NOT NULL DEFAULT false,
  webhook_url TEXT,
  webhook_secret TEXT,
  email_enabled BOOLEAN NOT NULL DEFAULT false,
  notify_email TEXT,
  sms_enabled BOOLEAN NOT NULL DEFAULT false,
  notify_phone TEXT,
  auth_mode public.webhook_auth_mode NOT NULL DEFAULT 'none',
  auth_header_name TEXT,
  auth_header_value TEXT,
  basic_user TEXT,
  basic_pass TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create delivery_rules table (per entity type per tenant)
CREATE TABLE IF NOT EXISTS public.delivery_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  entity_type public.delivery_entity_type NOT NULL,
  auto_confirm BOOLEAN NOT NULL DEFAULT false,
  review_queue_enabled BOOLEAN NOT NULL DEFAULT true,
  notify_on_new BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, entity_type)
);

-- Create delivery_attempts table (universal tracking)
CREATE TABLE IF NOT EXISTS public.delivery_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  entity_type public.delivery_entity_type NOT NULL,
  entity_id UUID NOT NULL,
  method TEXT NOT NULL CHECK (method IN ('webhook', 'email', 'sms')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed')),
  error_message TEXT,
  request_payload JSONB,
  response_body TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_delivery_rules_tenant ON public.delivery_rules(tenant_id);
CREATE INDEX IF NOT EXISTS idx_delivery_attempts_tenant ON public.delivery_attempts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_delivery_attempts_entity ON public.delivery_attempts(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_delivery_attempts_status ON public.delivery_attempts(status);

-- Enable RLS
ALTER TABLE public.universal_delivery_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_attempts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for universal_delivery_settings
DROP POLICY IF EXISTS "Tenant members can view delivery settings" ON public.universal_delivery_settings;
CREATE POLICY "Tenant members can view delivery settings"
  ON public.universal_delivery_settings FOR SELECT
  USING (public.has_tenant_access(auth.uid(), tenant_id));

DROP POLICY IF EXISTS "Tenant members can insert delivery settings" ON public.universal_delivery_settings;
CREATE POLICY "Tenant members can insert delivery settings"
  ON public.universal_delivery_settings FOR INSERT
  WITH CHECK (public.has_tenant_access(auth.uid(), tenant_id));

DROP POLICY IF EXISTS "Tenant members can update delivery settings" ON public.universal_delivery_settings;
CREATE POLICY "Tenant members can update delivery settings"
  ON public.universal_delivery_settings FOR UPDATE
  USING (public.has_tenant_access(auth.uid(), tenant_id));

-- RLS Policies for delivery_rules
DROP POLICY IF EXISTS "Tenant members can view delivery rules" ON public.delivery_rules;
CREATE POLICY "Tenant members can view delivery rules"
  ON public.delivery_rules FOR SELECT
  USING (public.has_tenant_access(auth.uid(), tenant_id));

DROP POLICY IF EXISTS "Tenant members can insert delivery rules" ON public.delivery_rules;
CREATE POLICY "Tenant members can insert delivery rules"
  ON public.delivery_rules FOR INSERT
  WITH CHECK (public.has_tenant_access(auth.uid(), tenant_id));

DROP POLICY IF EXISTS "Tenant members can update delivery rules" ON public.delivery_rules;
CREATE POLICY "Tenant members can update delivery rules"
  ON public.delivery_rules FOR UPDATE
  USING (public.has_tenant_access(auth.uid(), tenant_id));

DROP POLICY IF EXISTS "Tenant members can delete delivery rules" ON public.delivery_rules;
CREATE POLICY "Tenant members can delete delivery rules"
  ON public.delivery_rules FOR DELETE
  USING (public.has_tenant_access(auth.uid(), tenant_id));

-- RLS Policies for delivery_attempts
DROP POLICY IF EXISTS "Tenant members can view delivery attempts" ON public.delivery_attempts;
CREATE POLICY "Tenant members can view delivery attempts"
  ON public.delivery_attempts FOR SELECT
  USING (public.has_tenant_access(auth.uid(), tenant_id));

DROP POLICY IF EXISTS "Tenant members can insert delivery attempts" ON public.delivery_attempts;
CREATE POLICY "Tenant members can insert delivery attempts"
  ON public.delivery_attempts FOR INSERT
  WITH CHECK (public.has_tenant_access(auth.uid(), tenant_id));

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_universal_delivery_settings_updated_at ON public.universal_delivery_settings;
CREATE TRIGGER update_universal_delivery_settings_updated_at
  BEFORE UPDATE ON public.universal_delivery_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_delivery_rules_updated_at ON public.delivery_rules;
CREATE TRIGGER update_delivery_rules_updated_at
  BEFORE UPDATE ON public.delivery_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to initialize default delivery rules for a tenant based on their mode
CREATE OR REPLACE FUNCTION public.initialize_delivery_rules(_tenant_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_mode TEXT;
BEGIN
  SELECT business_mode INTO v_mode FROM tenants WHERE id = _tenant_id;
  
  -- Insert universal delivery settings if not exists
  INSERT INTO universal_delivery_settings (tenant_id)
  VALUES (_tenant_id)
  ON CONFLICT (tenant_id) DO NOTHING;
  
  -- Insert default rules based on mode
  -- Booking: default review (auto_confirm = false)
  INSERT INTO delivery_rules (tenant_id, entity_type, auto_confirm, review_queue_enabled)
  VALUES (_tenant_id, 'booking', false, true)
  ON CONFLICT (tenant_id, entity_type) DO NOTHING;
  
  -- Dispatch: default review (auto_confirm = false)
  INSERT INTO delivery_rules (tenant_id, entity_type, auto_confirm, review_queue_enabled)
  VALUES (_tenant_id, 'dispatch', false, true)
  ON CONFLICT (tenant_id, entity_type) DO NOTHING;
  
  -- Order: default auto-confirm (caller confirmation is already done)
  INSERT INTO delivery_rules (tenant_id, entity_type, auto_confirm, review_queue_enabled)
  VALUES (_tenant_id, 'order', true, false)
  ON CONFLICT (tenant_id, entity_type) DO NOTHING;
  
  -- Reservation: default review
  INSERT INTO delivery_rules (tenant_id, entity_type, auto_confirm, review_queue_enabled)
  VALUES (_tenant_id, 'reservation', false, true)
  ON CONFLICT (tenant_id, entity_type) DO NOTHING;
  
  -- Catering: default review
  INSERT INTO delivery_rules (tenant_id, entity_type, auto_confirm, review_queue_enabled)
  VALUES (_tenant_id, 'catering', false, true)
  ON CONFLICT (tenant_id, entity_type) DO NOTHING;
  
  -- Intake: default review
  INSERT INTO delivery_rules (tenant_id, entity_type, auto_confirm, review_queue_enabled)
  VALUES (_tenant_id, 'intake', false, true)
  ON CONFLICT (tenant_id, entity_type) DO NOTHING;
END;
$$;