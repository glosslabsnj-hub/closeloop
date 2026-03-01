-- Add booking behavior settings to assistant_settings
ALTER TABLE assistant_settings 
ADD COLUMN IF NOT EXISTS ai_booking_mode TEXT DEFAULT 'auto_book' CHECK (ai_booking_mode IN ('auto_book', 'pending_approval')),
ADD COLUMN IF NOT EXISTS pending_booking_notify_email BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS pending_booking_notify_sms BOOLEAN DEFAULT true;

-- Add calendar sync columns to tenants for storing synced availability
ALTER TABLE tenants
ADD COLUMN IF NOT EXISTS calendar_sync_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS calendar_sync_provider TEXT,
ADD COLUMN IF NOT EXISTS calendar_last_synced_at TIMESTAMP WITH TIME ZONE;

-- Create availability_slots table for manual or synced time slots
CREATE TABLE IF NOT EXISTS availability_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0=Sunday, 6=Saturday
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(tenant_id, day_of_week, start_time)
);

-- Create blocked_times table for specific date/time blocks (from calendar sync or manual)
CREATE TABLE IF NOT EXISTS blocked_times (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  start_at TIMESTAMP WITH TIME ZONE NOT NULL,
  end_at TIMESTAMP WITH TIME ZONE NOT NULL,
  reason TEXT,
  source TEXT DEFAULT 'manual', -- 'manual', 'google_calendar', 'outlook', etc.
  external_event_id TEXT, -- For synced events
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE availability_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_times ENABLE ROW LEVEL SECURITY;

-- RLS policies for availability_slots
DROP POLICY IF EXISTS "Owners can manage availability slots" ON availability_slots;
CREATE POLICY "Owners can manage availability slots"
  ON availability_slots FOR ALL
USING (
  tenant_id IN (
    SELECT tenant_id FROM tenant_users 
    WHERE user_id = auth.uid() AND role = 'owner'
  ) OR has_role(auth.uid(), 'super_admin')
);

DROP POLICY IF EXISTS "Users can view availability slots" ON availability_slots;
CREATE POLICY "Users can view availability slots"
  ON availability_slots FOR SELECT
USING (has_tenant_access(auth.uid(), tenant_id));

-- RLS policies for blocked_times
DROP POLICY IF EXISTS "Owners can manage blocked times" ON blocked_times;
CREATE POLICY "Owners can manage blocked times"
  ON blocked_times FOR ALL
USING (
  tenant_id IN (
    SELECT tenant_id FROM tenant_users 
    WHERE user_id = auth.uid() AND role = 'owner'
  ) OR has_role(auth.uid(), 'super_admin')
);

DROP POLICY IF EXISTS "Users can view blocked times" ON blocked_times;
CREATE POLICY "Users can view blocked times"
  ON blocked_times FOR SELECT
USING (has_tenant_access(auth.uid(), tenant_id));

-- Update fn_build_business_context to include booking mode
CREATE OR REPLACE FUNCTION public.fn_build_business_context(_tenant_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_tenant RECORD;
  v_assistant RECORD;
  v_services JSONB;
  v_faqs JSONB;
  v_objections JSONB;
  v_availability JSONB;
  v_context JSONB;
BEGIN
  -- Get tenant data
  SELECT * INTO v_tenant FROM tenants WHERE id = _tenant_id;
  
  IF v_tenant.id IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Get assistant settings for booking mode
  SELECT * INTO v_assistant FROM assistant_settings WHERE tenant_id = _tenant_id;
  
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
  
  -- Get availability slots
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'day_of_week', a.day_of_week,
    'start_time', a.start_time,
    'end_time', a.end_time,
    'is_available', a.is_available
  ) ORDER BY a.day_of_week, a.start_time), '[]'::JSONB) INTO v_availability
  FROM availability_slots a
  WHERE a.tenant_id = _tenant_id AND a.is_available = true;
  
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
    'availability_slots', v_availability,
    'booking_rules', jsonb_build_object(
      'min_lead_hours', v_tenant.min_lead_hours,
      'max_advance_days', v_tenant.max_advance_days,
      'buffer_minutes', v_tenant.appointment_buffer_minutes,
      'closed_dates', v_tenant.closed_dates,
      'booking_mode', COALESCE(v_assistant.ai_booking_mode, 'auto_book'),
      'booking_url', v_assistant.booking_url
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
$function$;