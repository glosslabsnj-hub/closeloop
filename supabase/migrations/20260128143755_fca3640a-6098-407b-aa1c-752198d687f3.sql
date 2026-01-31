-- Add needs_followup to order_status enum
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'needs_followup';

-- Extend food_orders table with new columns
ALTER TABLE food_orders ADD COLUMN IF NOT EXISTS requested_time timestamptz;
ALTER TABLE food_orders ADD COLUMN IF NOT EXISTS address_json jsonb;
ALTER TABLE food_orders ADD COLUMN IF NOT EXISTS totals_estimate jsonb;
ALTER TABLE food_orders ADD COLUMN IF NOT EXISTS handoff_state jsonb DEFAULT '{}';

-- Create order_delivery_settings table
CREATE TABLE IF NOT EXISTS order_delivery_settings (
  tenant_id uuid PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
  enabled boolean DEFAULT true,
  handoff_methods jsonb DEFAULT '["internal"]',
  webhook_url text,
  webhook_secret text,
  notify_email text,
  notify_phone text,
  print_format text DEFAULT 'ticket_80mm' CHECK (print_format IN ('ticket_80mm', 'letter')),
  auto_print boolean DEFAULT false,
  cancel_window_minutes integer DEFAULT 2,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on order_delivery_settings
ALTER TABLE order_delivery_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for order_delivery_settings
CREATE POLICY "Users can view their tenant order delivery settings"
  ON order_delivery_settings FOR SELECT
  USING (has_tenant_access(auth.uid(), tenant_id));

CREATE POLICY "Owners can manage order delivery settings"
  ON order_delivery_settings FOR ALL
  USING (
    tenant_id IN (
      SELECT tenant_users.tenant_id FROM tenant_users
      WHERE tenant_users.user_id = auth.uid() AND tenant_users.role = 'owner'
    ) OR has_role(auth.uid(), 'super_admin')
  );

-- Create handoff_attempts table
CREATE TABLE IF NOT EXISTS handoff_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES food_orders(id) ON DELETE CASCADE,
  method text NOT NULL CHECK (method IN ('webhook', 'email', 'sms', 'print')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed')),
  error_message text,
  created_at timestamptz DEFAULT now()
);

-- Indexes for handoff_attempts
CREATE INDEX IF NOT EXISTS idx_handoff_attempts_order ON handoff_attempts(order_id);
CREATE INDEX IF NOT EXISTS idx_handoff_attempts_tenant ON handoff_attempts(tenant_id);

-- RLS for handoff_attempts
ALTER TABLE handoff_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their tenant handoff attempts"
  ON handoff_attempts FOR SELECT
  USING (has_tenant_access(auth.uid(), tenant_id));

CREATE POLICY "Users can manage their tenant handoff attempts"
  ON handoff_attempts FOR ALL
  USING (has_tenant_access(auth.uid(), tenant_id));

-- Trigger for updated_at on order_delivery_settings
CREATE TRIGGER update_order_delivery_settings_updated_at
  BEFORE UPDATE ON order_delivery_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();