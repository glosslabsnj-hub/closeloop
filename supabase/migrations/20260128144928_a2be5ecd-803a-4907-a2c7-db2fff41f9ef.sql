-- Create booking_delivery_settings table
CREATE TABLE public.booking_delivery_settings (
  tenant_id uuid PRIMARY KEY REFERENCES public.tenants(id) ON DELETE CASCADE,
  enabled boolean DEFAULT true,
  handoff_methods jsonb DEFAULT '["internal"]'::jsonb,
  webhook_url text,
  webhook_secret text,
  notify_email text,
  notify_phone text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create dispatch_delivery_settings table
CREATE TABLE public.dispatch_delivery_settings (
  tenant_id uuid PRIMARY KEY REFERENCES public.tenants(id) ON DELETE CASCADE,
  enabled boolean DEFAULT true,
  handoff_methods jsonb DEFAULT '["internal"]'::jsonb,
  webhook_url text,
  webhook_secret text,
  notify_email text,
  notify_phone text,
  urgent_sms_phone text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Extend handoff_attempts to support booking and dispatch (make order_id nullable, add entity_type/entity_id)
ALTER TABLE public.handoff_attempts 
  ADD COLUMN IF NOT EXISTS entity_type text,
  ADD COLUMN IF NOT EXISTS entity_id uuid,
  ALTER COLUMN order_id DROP NOT NULL;

-- Add check constraint for entity_type
ALTER TABLE public.handoff_attempts 
  ADD CONSTRAINT check_entity_type CHECK (entity_type IN ('order', 'booking', 'dispatch') OR entity_type IS NULL);

-- Create indexes for the new columns
CREATE INDEX IF NOT EXISTS idx_handoff_attempts_entity ON public.handoff_attempts(entity_type, entity_id);

-- Enable RLS on new tables
ALTER TABLE public.booking_delivery_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dispatch_delivery_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for booking_delivery_settings
CREATE POLICY "Users can view their tenant booking delivery settings"
  ON public.booking_delivery_settings FOR SELECT
  USING (has_tenant_access(auth.uid(), tenant_id));

CREATE POLICY "Owners can manage booking delivery settings"
  ON public.booking_delivery_settings FOR ALL
  USING (
    tenant_id IN (
      SELECT tenant_users.tenant_id FROM tenant_users
      WHERE tenant_users.user_id = auth.uid() AND tenant_users.role = 'owner'
    ) OR has_role(auth.uid(), 'super_admin')
  );

-- RLS Policies for dispatch_delivery_settings
CREATE POLICY "Users can view their tenant dispatch delivery settings"
  ON public.dispatch_delivery_settings FOR SELECT
  USING (has_tenant_access(auth.uid(), tenant_id));

CREATE POLICY "Owners can manage dispatch delivery settings"
  ON public.dispatch_delivery_settings FOR ALL
  USING (
    tenant_id IN (
      SELECT tenant_users.tenant_id FROM tenant_users
      WHERE tenant_users.user_id = auth.uid() AND tenant_users.role = 'owner'
    ) OR has_role(auth.uid(), 'super_admin')
  );

-- Triggers for updated_at
CREATE TRIGGER update_booking_delivery_settings_updated_at
  BEFORE UPDATE ON public.booking_delivery_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_dispatch_delivery_settings_updated_at
  BEFORE UPDATE ON public.dispatch_delivery_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();