-- =============================================
-- PHASE 1: CUSTOMERS + OPPORTUNITIES + RESOLVER
-- =============================================

-- Create customers table (unified customer profiles)
CREATE TABLE IF NOT EXISTS public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  phone_e164 TEXT NOT NULL, -- E.164 normalized (primary identifier)
  phone_raw TEXT, -- Original format for display
  full_name TEXT NOT NULL,
  email TEXT,
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  notes TEXT,
  source TEXT DEFAULT 'manual', -- first_call, first_sms, form, manual, referral
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, phone_e164)
);

-- Enable RLS on customers
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- RLS: Users can view customers in their tenant
DROP POLICY IF EXISTS "Users can view tenant customers" ON public.customers;
CREATE POLICY "Users can view tenant customers"
  ON public.customers FOR SELECT
USING (has_tenant_access(auth.uid(), tenant_id));

-- RLS: Users can manage tenant customers
DROP POLICY IF EXISTS "Users can manage tenant customers" ON public.customers;
CREATE POLICY "Users can manage tenant customers"
  ON public.customers FOR ALL
USING (has_tenant_access(auth.uid(), tenant_id));

-- Create opportunities table (jobs/deals/interactions linked to customers)
CREATE TABLE IF NOT EXISTS public.opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'quoted', 'booked', 'completed', 'lost')),
  source TEXT NOT NULL DEFAULT 'manual', -- missed_call, inbound_call, sms, form, manual, referral
  value_cents INTEGER, -- estimated/quoted value
  notes TEXT,
  context_json JSONB DEFAULT '{}'::JSONB, -- industry-specific intake data
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on opportunities
ALTER TABLE public.opportunities ENABLE ROW LEVEL SECURITY;

-- RLS: Users can view opportunities in their tenant
DROP POLICY IF EXISTS "Users can view tenant opportunities" ON public.opportunities;
CREATE POLICY "Users can view tenant opportunities"
  ON public.opportunities FOR SELECT
USING (has_tenant_access(auth.uid(), tenant_id));

-- RLS: Users can manage tenant opportunities
DROP POLICY IF EXISTS "Users can manage tenant opportunities" ON public.opportunities;
CREATE POLICY "Users can manage tenant opportunities"
  ON public.opportunities FOR ALL
USING (has_tenant_access(auth.uid(), tenant_id));

-- Create customer_merge_queue for conflict resolution
CREATE TABLE IF NOT EXISTS public.customer_merge_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  existing_customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  incoming_phone_e164 TEXT NOT NULL,
  incoming_name TEXT,
  incoming_email TEXT,
  conflict_type TEXT NOT NULL CHECK (conflict_type IN ('name_mismatch', 'email_mismatch', 'both_mismatch')),
  source TEXT NOT NULL, -- where the conflict came from
  resolved BOOLEAN NOT NULL DEFAULT false,
  resolution TEXT, -- 'merged', 'kept_existing', 'created_new'
  resolved_at TIMESTAMPTZ,
  resolved_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on customer_merge_queue
ALTER TABLE public.customer_merge_queue ENABLE ROW LEVEL SECURITY;

-- RLS: Owners can manage merge queue
DROP POLICY IF EXISTS "Owners can manage merge queue" ON public.customer_merge_queue;
CREATE POLICY "Owners can manage merge queue"
  ON public.customer_merge_queue FOR ALL
USING (
  (tenant_id IN (
    SELECT tenant_users.tenant_id FROM tenant_users
    WHERE tenant_users.user_id = auth.uid() AND tenant_users.role = 'owner'
  )) OR has_role(auth.uid(), 'super_admin')
);

-- RLS: Users can view merge queue
DROP POLICY IF EXISTS "Users can view merge queue" ON public.customer_merge_queue;
CREATE POLICY "Users can view merge queue"
  ON public.customer_merge_queue FOR SELECT
USING (has_tenant_access(auth.uid(), tenant_id));

-- Create knowledge_gaps table for AI gap tracking
CREATE TABLE IF NOT EXISTS public.knowledge_gaps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  gap_type TEXT NOT NULL CHECK (gap_type IN ('missing_policy', 'missing_pricing', 'missing_service_area', 'unanswered_question', 'missing_hours', 'missing_faq', 'other')),
  description TEXT NOT NULL,
  customer_question TEXT, -- original question if from customer
  ai_session_id UUID, -- link to call/chat session
  priority INTEGER NOT NULL DEFAULT 1, -- 1=low, 2=medium, 3=high
  resolved BOOLEAN NOT NULL DEFAULT false,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID,
  resolution_notes TEXT,
  occurrence_count INTEGER NOT NULL DEFAULT 1, -- how many times this gap occurred
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on knowledge_gaps
ALTER TABLE public.knowledge_gaps ENABLE ROW LEVEL SECURITY;

-- RLS: Users can view knowledge gaps
DROP POLICY IF EXISTS "Users can view knowledge gaps" ON public.knowledge_gaps;
CREATE POLICY "Users can view knowledge gaps"
  ON public.knowledge_gaps FOR SELECT
USING (has_tenant_access(auth.uid(), tenant_id));

-- RLS: Owners can manage knowledge gaps
DROP POLICY IF EXISTS "Owners can manage knowledge gaps" ON public.knowledge_gaps;
CREATE POLICY "Owners can manage knowledge gaps"
  ON public.knowledge_gaps FOR ALL
USING (
  (tenant_id IN (
    SELECT tenant_users.tenant_id FROM tenant_users
    WHERE tenant_users.user_id = auth.uid() AND tenant_users.role = 'owner'
  )) OR has_role(auth.uid(), 'super_admin')
);

-- Add customer_id and opportunity_id to conversations
ALTER TABLE public.conversations 
ADD COLUMN customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
ADD COLUMN opportunity_id UUID REFERENCES public.opportunities(id) ON DELETE SET NULL;

-- Add customer_id and opportunity_id to ai_call_sessions
ALTER TABLE public.ai_call_sessions
ADD COLUMN customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
ADD COLUMN opportunity_id UUID REFERENCES public.opportunities(id) ON DELETE SET NULL;

-- Add ai_readiness_score to tenants
ALTER TABLE public.tenants
ADD COLUMN ai_readiness_score INTEGER DEFAULT 0,
ADD COLUMN onboarding_completed_at TIMESTAMPTZ;

-- Create sync_events table for CRM/Sheets integration tracking
CREATE TABLE IF NOT EXISTS public.sync_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('customer_created', 'customer_updated', 'opportunity_created', 'opportunity_updated', 'booking_created', 'booking_updated', 'call_completed')),
  entity_type TEXT NOT NULL, -- 'customer', 'opportunity', 'booking', 'call_session'
  entity_id UUID NOT NULL,
  payload_json JSONB NOT NULL DEFAULT '{}'::JSONB,
  synced BOOLEAN NOT NULL DEFAULT false,
  synced_at TIMESTAMPTZ,
  sync_target TEXT, -- 'google_sheets', 'crm', etc.
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on sync_events
ALTER TABLE public.sync_events ENABLE ROW LEVEL SECURITY;

-- RLS: Users can view sync events
DROP POLICY IF EXISTS "Users can view sync events" ON public.sync_events;
CREATE POLICY "Users can view sync events"
  ON public.sync_events FOR SELECT
USING (has_tenant_access(auth.uid(), tenant_id));

-- RLS: System can manage sync events (via service role)
DROP POLICY IF EXISTS "System can manage sync events" ON public.sync_events;
CREATE POLICY "System can manage sync events"
  ON public.sync_events FOR ALL
USING (has_tenant_access(auth.uid(), tenant_id));

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_customers_tenant_phone ON public.customers(tenant_id, phone_e164);
CREATE INDEX IF NOT EXISTS idx_customers_tenant_email ON public.customers(tenant_id, email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_opportunities_customer ON public.opportunities(customer_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_tenant_status ON public.opportunities(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_conversations_customer ON public.conversations(customer_id) WHERE customer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ai_call_sessions_customer ON public.ai_call_sessions(customer_id) WHERE customer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_knowledge_gaps_tenant_unresolved ON public.knowledge_gaps(tenant_id, resolved) WHERE resolved = false;
CREATE INDEX IF NOT EXISTS idx_sync_events_unsynced ON public.sync_events(tenant_id, synced) WHERE synced = false;
CREATE INDEX IF NOT EXISTS idx_merge_queue_unresolved ON public.customer_merge_queue(tenant_id, resolved) WHERE resolved = false;

-- Create function to normalize phone to E.164
CREATE OR REPLACE FUNCTION public.normalize_phone_e164(phone TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  cleaned TEXT;
BEGIN
  IF phone IS NULL OR phone = '' THEN
    RETURN NULL;
  END IF;
  
  -- Remove all non-digit characters except leading +
  cleaned := regexp_replace(phone, '[^0-9+]', '', 'g');
  
  -- If starts with +, keep it
  IF left(cleaned, 1) = '+' THEN
    RETURN cleaned;
  END IF;
  
  -- If 10 digits, assume US and add +1
  IF length(cleaned) = 10 THEN
    RETURN '+1' || cleaned;
  END IF;
  
  -- If 11 digits starting with 1, add +
  IF length(cleaned) = 11 AND left(cleaned, 1) = '1' THEN
    RETURN '+' || cleaned;
  END IF;
  
  -- Otherwise return as-is with + prefix
  RETURN '+' || cleaned;
END;
$$;

-- Create the customer resolver function
CREATE OR REPLACE FUNCTION public.resolve_customer(
  _tenant_id UUID,
  _phone TEXT,
  _name TEXT DEFAULT NULL,
  _email TEXT DEFAULT NULL,
  _source TEXT DEFAULT 'manual'
)
RETURNS TABLE(
  customer_id UUID,
  is_new BOOLEAN,
  has_conflict BOOLEAN,
  conflict_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_phone_e164 TEXT;
  v_existing_customer RECORD;
  v_customer_id UUID;
  v_is_new BOOLEAN := false;
  v_has_conflict BOOLEAN := false;
  v_conflict_id UUID;
  v_conflict_type TEXT;
BEGIN
  -- Normalize phone to E.164
  v_phone_e164 := normalize_phone_e164(_phone);
  
  IF v_phone_e164 IS NULL THEN
    RAISE EXCEPTION 'Invalid phone number';
  END IF;
  
  -- Check for existing customer by phone
  SELECT * INTO v_existing_customer
  FROM customers c
  WHERE c.tenant_id = _tenant_id AND c.phone_e164 = v_phone_e164;
  
  IF v_existing_customer.id IS NOT NULL THEN
    -- Customer exists - check for conflicts
    v_customer_id := v_existing_customer.id;
    
    -- Check name conflict (if new name provided and different)
    IF _name IS NOT NULL AND _name != '' AND v_existing_customer.full_name != _name THEN
      v_has_conflict := true;
      v_conflict_type := 'name_mismatch';
    END IF;
    
    -- Check email conflict (if new email provided and different)
    IF _email IS NOT NULL AND _email != '' AND v_existing_customer.email IS NOT NULL AND v_existing_customer.email != _email THEN
      IF v_has_conflict THEN
        v_conflict_type := 'both_mismatch';
      ELSE
        v_has_conflict := true;
        v_conflict_type := 'email_mismatch';
      END IF;
    END IF;
    
    -- If conflict, create merge queue item (don't overwrite existing data)
    IF v_has_conflict THEN
      INSERT INTO customer_merge_queue (tenant_id, existing_customer_id, incoming_phone_e164, incoming_name, incoming_email, conflict_type, source)
      VALUES (_tenant_id, v_customer_id, v_phone_e164, _name, _email, v_conflict_type, _source)
      RETURNING id INTO v_conflict_id;
    ELSE
      -- No conflict - update missing fields only
      UPDATE customers SET
        email = COALESCE(customers.email, _email),
        updated_at = now()
      WHERE id = v_customer_id;
    END IF;
    
  ELSE
    -- New customer - create
    INSERT INTO customers (tenant_id, phone_e164, phone_raw, full_name, email, source)
    VALUES (_tenant_id, v_phone_e164, _phone, COALESCE(_name, 'Unknown'), _email, _source)
    RETURNING id INTO v_customer_id;
    
    v_is_new := true;
  END IF;
  
  RETURN QUERY SELECT v_customer_id, v_is_new, v_has_conflict, v_conflict_id;
END;
$$;

-- Create function to build business context for AI
CREATE OR REPLACE FUNCTION public.fn_build_business_context(_tenant_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant RECORD;
  v_services JSONB;
  v_faqs JSONB;
  v_objections JSONB;
  v_context JSONB;
BEGIN
  -- Get tenant data
  SELECT * INTO v_tenant FROM tenants WHERE id = _tenant_id;
  
  IF v_tenant.id IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Get active services
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'name', s.name,
    'description', s.description,
    'duration_minutes', s.duration_minutes,
    'price_type', s.price_type,
    'price_amount', s.price_amount,
    'deposit_required', s.deposit_required,
    'deposit_amount', s.deposit_amount,
    'preparation_instructions', s.preparation_instructions,
    'upsell_suggestions', s.upsell_suggestions
  )), '[]'::JSONB) INTO v_services
  FROM services s
  WHERE s.tenant_id = _tenant_id AND s.is_active = true;
  
  -- Get FAQs
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'question', f.question,
    'answer', f.answer
  ) ORDER BY f.priority_weight DESC), '[]'::JSONB) INTO v_faqs
  FROM business_faqs f
  WHERE f.tenant_id = _tenant_id;
  
  -- Get objection responses
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'objection', o.objection,
    'response', o.response
  ) ORDER BY o.priority_weight DESC), '[]'::JSONB) INTO v_objections
  FROM objection_responses o
  WHERE o.tenant_id = _tenant_id;
  
  -- Build complete context
  v_context := jsonb_build_object(
    'business', jsonb_build_object(
      'name', v_tenant.name,
      'tagline', v_tenant.tagline,
      'industry', v_tenant.industry,
      'phone', v_tenant.phone_public,
      'website', v_tenant.website_url,
      'address', v_tenant.address,
      'years_in_business', v_tenant.years_in_business,
      'timezone', v_tenant.timezone
    ),
    'hours', v_tenant.hours_json,
    'service_area', v_tenant.service_area_json,
    'services', v_services,
    'booking_rules', jsonb_build_object(
      'min_lead_hours', v_tenant.min_lead_hours,
      'max_advance_days', v_tenant.max_advance_days,
      'buffer_minutes', v_tenant.appointment_buffer_minutes,
      'closed_dates', v_tenant.closed_dates
    ),
    'policies', jsonb_build_object(
      'cancellation', v_tenant.cancellation_policy,
      'deposit', v_tenant.deposit_policy,
      'refund', v_tenant.refund_policy,
      'payment_methods', v_tenant.payment_methods
    ),
    'intake_fields', v_tenant.context_fields_json,
    'faqs', v_faqs,
    'objection_responses', v_objections,
    'guardrails', jsonb_build_object(
      'never_promise', v_tenant.ai_never_promise,
      'ai_enabled', v_tenant.ai_enabled
    )
  );
  
  RETURN v_context;
END;
$$;

-- Create function to calculate AI readiness score
CREATE OR REPLACE FUNCTION public.calculate_ai_readiness(_tenant_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_score INTEGER := 0;
  v_tenant RECORD;
  v_service_count INTEGER;
  v_faq_count INTEGER;
  v_objection_count INTEGER;
BEGIN
  SELECT * INTO v_tenant FROM tenants WHERE id = _tenant_id;
  
  IF v_tenant.id IS NULL THEN
    RETURN 0;
  END IF;
  
  -- Business identity (20 points max)
  IF v_tenant.name IS NOT NULL AND v_tenant.name != '' THEN v_score := v_score + 5; END IF;
  IF v_tenant.phone_public IS NOT NULL THEN v_score := v_score + 5; END IF;
  IF v_tenant.address IS NOT NULL THEN v_score := v_score + 5; END IF;
  IF v_tenant.tagline IS NOT NULL THEN v_score := v_score + 5; END IF;
  
  -- Services (20 points max)
  SELECT COUNT(*) INTO v_service_count FROM services WHERE tenant_id = _tenant_id AND is_active = true;
  IF v_service_count >= 1 THEN v_score := v_score + 10; END IF;
  IF v_service_count >= 3 THEN v_score := v_score + 10; END IF;
  
  -- Hours (10 points)
  IF v_tenant.hours_json IS NOT NULL AND v_tenant.hours_json != '{}'::JSONB THEN 
    v_score := v_score + 10; 
  END IF;
  
  -- Policies (15 points max)
  IF v_tenant.cancellation_policy IS NOT NULL THEN v_score := v_score + 5; END IF;
  IF v_tenant.deposit_policy IS NOT NULL THEN v_score := v_score + 5; END IF;
  IF v_tenant.payment_methods IS NOT NULL AND array_length(v_tenant.payment_methods, 1) > 0 THEN 
    v_score := v_score + 5; 
  END IF;
  
  -- FAQs (20 points max)
  SELECT COUNT(*) INTO v_faq_count FROM business_faqs WHERE tenant_id = _tenant_id;
  IF v_faq_count >= 3 THEN v_score := v_score + 10; END IF;
  IF v_faq_count >= 6 THEN v_score := v_score + 10; END IF;
  
  -- Objection responses (15 points max)
  SELECT COUNT(*) INTO v_objection_count FROM objection_responses WHERE tenant_id = _tenant_id;
  IF v_objection_count >= 2 THEN v_score := v_score + 8; END IF;
  IF v_objection_count >= 4 THEN v_score := v_score + 7; END IF;
  
  RETURN LEAST(v_score, 100);
END;
$$;

-- Create trigger to update ai_readiness_score on tenant changes
CREATE OR REPLACE FUNCTION public.update_tenant_readiness_score()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE tenants 
  SET ai_readiness_score = calculate_ai_readiness(NEW.tenant_id)
  WHERE id = NEW.tenant_id;
  RETURN NEW;
END;
$$;

-- Triggers to recalculate readiness when related data changes
CREATE TRIGGER trg_services_readiness
AFTER INSERT OR UPDATE OR DELETE ON services
FOR EACH ROW
EXECUTE FUNCTION update_tenant_readiness_score();

CREATE TRIGGER trg_faqs_readiness
AFTER INSERT OR UPDATE OR DELETE ON business_faqs
FOR EACH ROW
EXECUTE FUNCTION update_tenant_readiness_score();

CREATE TRIGGER trg_objections_readiness
AFTER INSERT OR UPDATE OR DELETE ON objection_responses
FOR EACH ROW
EXECUTE FUNCTION update_tenant_readiness_score();

-- Enable realtime for key tables
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'customers') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.customers;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'opportunities') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.opportunities;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'knowledge_gaps') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.knowledge_gaps;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'customer_merge_queue') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.customer_merge_queue;
  END IF;
END $$;