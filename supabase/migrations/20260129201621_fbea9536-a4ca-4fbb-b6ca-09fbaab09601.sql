-- Create setup_requests table for concierge "Done For You" setup
CREATE TABLE IF NOT EXISTS public.setup_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'in_progress', 'completed', 'cancelled')),
  
  -- What they want to integrate
  target_system TEXT NOT NULL, -- e.g., "FieldEdge", "ServiceTitan", "Towbook", "Square", "Other"
  target_system_other TEXT, -- If "Other" is selected
  
  -- What they want to happen
  sync_type TEXT[] NOT NULL DEFAULT '{}', -- e.g., ["booking_sync", "order_sync", "dispatch_sync", "lead_sync"]
  
  -- Contact and notes
  contact_email TEXT,
  contact_phone TEXT,
  notes TEXT,
  
  -- Credentials (encrypted reference or instructions)
  credentials_provided BOOLEAN DEFAULT FALSE,
  credentials_notes TEXT, -- e.g., "Will send invite to support@closeloop.com"
  
  -- Admin handling
  assigned_to TEXT, -- Admin user handling this
  admin_notes TEXT,
  completed_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.setup_requests ENABLE ROW LEVEL SECURITY;

-- Policies: Tenants can view/create their own requests
DROP POLICY IF EXISTS "Tenants can view own setup requests" ON public.setup_requests;
CREATE POLICY "Tenants can view own setup requests"
  ON public.setup_requests FOR SELECT
  USING (
    tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Tenants can create setup requests" ON public.setup_requests;
CREATE POLICY "Tenants can create setup requests"
  ON public.setup_requests FOR INSERT
  WITH CHECK (
    tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid())
  );

-- Super admins can do everything (checked via user_roles)
DROP POLICY IF EXISTS "Super admins can manage all setup requests" ON public.setup_requests;
CREATE POLICY "Super admins can manage all setup requests"
  ON public.setup_requests FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin')
  );

DROP TRIGGER IF EXISTS update_setup_requests_updated_at ON public.setup_requests;
CREATE TRIGGER update_setup_requests_updated_at
  BEFORE UPDATE ON public.setup_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add index for efficient queries
CREATE INDEX IF NOT EXISTS idx_setup_requests_tenant ON public.setup_requests(tenant_id);
CREATE INDEX IF NOT EXISTS idx_setup_requests_status ON public.setup_requests(status);

-- ============================================
-- Create routing_rules table for simple sentence-based routing
-- ============================================
CREATE TABLE IF NOT EXISTS public.routing_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  
  -- The trigger event (what happens)
  trigger_event TEXT NOT NULL, -- 'booking.created', 'order.created', 'dispatch.created', 'lead.captured'
  
  -- The destination (where it goes)
  destination TEXT NOT NULL, -- 'google_calendar', 'google_sheets', 'printnode', 'webhook', 'email', 'sms'
  
  -- Human-readable label
  label TEXT NOT NULL, -- e.g., "When AI books an appointment → Add to Google Calendar"
  
  -- Is it enabled?
  enabled BOOLEAN NOT NULL DEFAULT FALSE,
  
  -- Connection reference (if using a connected integration)
  integration_id UUID REFERENCES public.integrations(id) ON DELETE SET NULL,
  
  -- Configuration JSON (destination-specific settings)
  config_json JSONB DEFAULT '{}',
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Ensure unique rules per tenant/trigger/destination
  UNIQUE(tenant_id, trigger_event, destination)
);

-- Enable RLS
ALTER TABLE public.routing_rules ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Tenants can manage own routing rules" ON public.routing_rules;
CREATE POLICY "Tenants can manage own routing rules"
  ON public.routing_rules FOR ALL
  USING (
    tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid())
  );

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_routing_rules_updated_at ON public.routing_rules;
CREATE TRIGGER update_routing_rules_updated_at
  BEFORE UPDATE ON public.routing_rules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Index
CREATE INDEX IF NOT EXISTS idx_routing_rules_tenant ON public.routing_rules(tenant_id);
CREATE INDEX IF NOT EXISTS idx_routing_rules_enabled ON public.routing_rules(tenant_id, enabled) WHERE enabled = TRUE;