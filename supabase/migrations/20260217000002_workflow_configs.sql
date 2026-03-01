-- Migration: Create workflow configuration tables for all business modes
-- Purpose: Make all AI agents configuration-driven (zero hard-coded business logic)
-- Author: CloseLoop Platform
-- Date: 2026-02-17

-- =====================================================
-- DISPATCH WORKFLOW CONFIG
-- =====================================================
CREATE TABLE IF NOT EXISTS dispatch_workflow_config (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,

  -- Vehicle collection workflow
  vehicle_info_timing text CHECK (vehicle_info_timing IN ('before_pricing', 'after_pricing', 'optional')) DEFAULT 'before_pricing',
  vehicle_affects_pricing boolean DEFAULT true,
  required_vehicle_fields text[] DEFAULT ARRAY['color', 'make'],

  -- Vehicle-specific protocols
  luxury_flatbed_recommendation boolean DEFAULT false,
  luxury_brands text[] DEFAULT ARRAY['BMW', 'Mercedes', 'Audi', 'Porsche', 'Tesla', 'Lexus', 'Maserati', 'Bentley', 'Rolls-Royce', 'Ferrari', 'Lamborghini'],
  awd_detection_enabled boolean DEFAULT false,
  motorcycle_special_handling boolean DEFAULT false,

  -- Payment collection
  ask_payment_method boolean DEFAULT true,
  payment_timing text CHECK (payment_timing IN ('upfront', 'on_arrival', 'invoiced')) DEFAULT 'on_arrival',
  require_payment_confirmation boolean DEFAULT false,
  accepted_methods text[] DEFAULT ARRAY['cash', 'card'],
  payment_due_message text DEFAULT 'Driver will collect {{price}} when they arrive',

  -- Address protocols
  confirm_geocoded_address boolean DEFAULT true,
  require_zip_code boolean DEFAULT false,
  address_confirmation_script text DEFAULT 'Got it, {{geocoded_address}} - is that correct?',

  -- Expectation management
  driver_callback_script text DEFAULT 'Our driver will call you when they''re about 10 minutes away',
  include_direct_contact_info boolean DEFAULT false,
  escalation_number text,

  -- Service-specific dropoff requirements (overrides per service)
  service_dropoff_rules jsonb DEFAULT '{}',
  -- Example: {"towing": {"requires_dropoff": true, "ask_upfront": true}, "jumpstart": {"requires_dropoff": false}}

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  UNIQUE(tenant_id)
);

-- =====================================================
-- SERVICE WORKFLOW CONFIG
-- =====================================================
CREATE TABLE IF NOT EXISTS service_workflow_config (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,

  -- Intake field collection
  collect_service_duration boolean DEFAULT true,
  collect_deposit_upfront boolean DEFAULT false,
  deposit_timing text CHECK (deposit_timing IN ('before_booking', 'at_confirmation', 'day_before')) DEFAULT 'at_confirmation',
  deposit_amount_behavior text CHECK (deposit_amount_behavior IN ('fixed', 'percentage', 'per_service')) DEFAULT 'percentage',
  default_deposit_percentage integer DEFAULT 50,

  -- Service-specific questions
  required_intake_questions jsonb DEFAULT '[]',
  -- Example: [{"service_id": "abc-123", "questions": ["Do you have the parts already?", "Is this an emergency?"]}, ...]

  -- Scheduling preferences
  suggest_alternatives_when_unavailable boolean DEFAULT true,
  max_alternatives_to_suggest integer DEFAULT 3,
  alternative_suggestion_window_days integer DEFAULT 7,

  -- Confirmation behavior
  booking_confirmation_script text DEFAULT 'Perfect! You''re all set for {{date}} at {{time}}',
  send_sms_confirmation boolean DEFAULT true,
  ask_for_email_confirmation boolean DEFAULT false,

  -- Rescheduling/cancellation
  allow_ai_rescheduling boolean DEFAULT true,
  allow_ai_cancellation boolean DEFAULT false,
  cancellation_requires_manager boolean DEFAULT false,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  UNIQUE(tenant_id)
);

-- =====================================================
-- FOOD WORKFLOW CONFIG
-- =====================================================
CREATE TABLE IF NOT EXISTS food_workflow_config (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,

  -- Order type handling
  ask_pickup_vs_delivery text CHECK (ask_pickup_vs_delivery IN ('always', 'if_both_enabled', 'never')) DEFAULT 'if_both_enabled',
  default_order_type text CHECK (default_order_type IN ('pickup', 'delivery', 'ask')) DEFAULT 'ask',

  -- Customization protocols
  allow_menu_customizations boolean DEFAULT true,
  require_allergy_check boolean DEFAULT false,
  ask_special_instructions boolean DEFAULT true,

  -- Timing
  ask_asap_vs_scheduled boolean DEFAULT true,
  min_advance_order_minutes integer DEFAULT 30,
  default_prep_time_minutes integer DEFAULT 20,

  -- Delivery specifics
  collect_delivery_instructions boolean DEFAULT true,
  require_buzzer_code boolean DEFAULT false,

  -- Order confirmation
  order_confirmation_script text DEFAULT 'Great! Your order will be ready {{ready_time}}',
  repeat_order_back boolean DEFAULT true,
  confirm_total_before_submit boolean DEFAULT true,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  UNIQUE(tenant_id)
);

-- =====================================================
-- MEDICAL WORKFLOW CONFIG
-- =====================================================
CREATE TABLE IF NOT EXISTS medical_workflow_config (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,

  -- HIPAA consent
  consent_timing text CHECK (consent_timing IN ('before_intake', 'after_reason', 'at_end')) DEFAULT 'before_intake',
  consent_script text DEFAULT 'Before we continue, I need your verbal consent to collect your health information. Do I have your permission to proceed?',
  require_explicit_consent boolean DEFAULT true,

  -- Symptom collection
  collect_symptom_details boolean DEFAULT true,
  symptom_severity_scale boolean DEFAULT true,
  ask_duration_of_symptoms boolean DEFAULT true,

  -- Service-specific intake questions
  required_intake_questions jsonb DEFAULT '[]',
  -- Example: [{"service_id": "checkup", "questions": ["Any medications?", "Allergies?"]}, ...]

  -- Emergency protocols
  detect_emergency_keywords boolean DEFAULT true,
  emergency_escalation_script text DEFAULT 'This sounds like it may need immediate attention. I recommend calling 911 or going to the ER. Can I help you with anything else?',

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  UNIQUE(tenant_id)
);

-- =====================================================
-- GENERAL WORKFLOW CONFIG (for general/sales modes)
-- =====================================================
CREATE TABLE IF NOT EXISTS general_workflow_config (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,

  -- Lead qualification
  qualification_questions jsonb DEFAULT '[]',
  -- Example: [{"question": "What's your budget?", "required": false}, ...]

  -- Callback handling
  callback_confirmation_script text DEFAULT 'I''ll have someone call you back at {{callback_time}}',
  ask_best_time_to_call boolean DEFAULT true,
  ask_callback_reason boolean DEFAULT true,

  -- FAQ behavior
  escalate_unknown_questions boolean DEFAULT true,
  unknown_question_script text DEFAULT 'That''s a great question - let me have someone who can give you the details call you back',

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  UNIQUE(tenant_id)
);

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- Dispatch workflow config RLS
ALTER TABLE dispatch_workflow_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "dispatch_workflow_config_tenant_isolation" ON dispatch_workflow_config;
CREATE POLICY "dispatch_workflow_config_tenant_isolation"
  ON dispatch_workflow_config
  FOR ALL
  USING (
    tenant_id IN (
      SELECT tenant_id
      FROM tenant_users
      WHERE user_id = auth.uid()
    )
  );

-- Service workflow config RLS
ALTER TABLE service_workflow_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_workflow_config_tenant_isolation" ON service_workflow_config;
CREATE POLICY "service_workflow_config_tenant_isolation"
  ON service_workflow_config
  FOR ALL
  USING (
    tenant_id IN (
      SELECT tenant_id
      FROM tenant_users
      WHERE user_id = auth.uid()
    )
  );

-- Food workflow config RLS
ALTER TABLE food_workflow_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "food_workflow_config_tenant_isolation" ON food_workflow_config;
CREATE POLICY "food_workflow_config_tenant_isolation"
  ON food_workflow_config
  FOR ALL
  USING (
    tenant_id IN (
      SELECT tenant_id
      FROM tenant_users
      WHERE user_id = auth.uid()
    )
  );

-- Medical workflow config RLS
ALTER TABLE medical_workflow_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "medical_workflow_config_tenant_isolation" ON medical_workflow_config;
CREATE POLICY "medical_workflow_config_tenant_isolation"
  ON medical_workflow_config
  FOR ALL
  USING (
    tenant_id IN (
      SELECT tenant_id
      FROM tenant_users
      WHERE user_id = auth.uid()
    )
  );

-- General workflow config RLS
ALTER TABLE general_workflow_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "general_workflow_config_tenant_isolation" ON general_workflow_config;
CREATE POLICY "general_workflow_config_tenant_isolation"
  ON general_workflow_config
  FOR ALL
  USING (
    tenant_id IN (
      SELECT tenant_id
      FROM tenant_users
      WHERE user_id = auth.uid()
    )
  );

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to create default workflow config for a tenant based on their mode
CREATE OR REPLACE FUNCTION create_default_workflow_config(
  p_tenant_id uuid,
  p_business_mode text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Create dispatch config if mode is dispatch
  IF p_business_mode = 'dispatch' THEN
    INSERT INTO dispatch_workflow_config (tenant_id)
    VALUES (p_tenant_id)
    ON CONFLICT (tenant_id) DO NOTHING;
  END IF;

  -- Create service config if mode is service or medical
  IF p_business_mode IN ('service', 'medical') THEN
    INSERT INTO service_workflow_config (tenant_id)
    VALUES (p_tenant_id)
    ON CONFLICT (tenant_id) DO NOTHING;
  END IF;

  -- Create food config if mode is food
  IF p_business_mode = 'food' THEN
    INSERT INTO food_workflow_config (tenant_id)
    VALUES (p_tenant_id)
    ON CONFLICT (tenant_id) DO NOTHING;
  END IF;

  -- Create medical config if mode is medical
  IF p_business_mode = 'medical' THEN
    INSERT INTO medical_workflow_config (tenant_id)
    VALUES (p_tenant_id)
    ON CONFLICT (tenant_id) DO NOTHING;
  END IF;

  -- Create general config if mode is general (or as fallback for all)
  IF p_business_mode = 'general' THEN
    INSERT INTO general_workflow_config (tenant_id)
    VALUES (p_tenant_id)
    ON CONFLICT (tenant_id) DO NOTHING;
  END IF;
END;
$$;

-- Function to auto-create workflow config when tenant is created (trigger)
CREATE OR REPLACE FUNCTION auto_create_workflow_config()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM create_default_workflow_config(NEW.id, NEW.business_mode);
  RETURN NEW;
END;
$$;

-- Create trigger on tenants table
DROP TRIGGER IF EXISTS trigger_auto_create_workflow_config ON tenants;
CREATE TRIGGER trigger_auto_create_workflow_config
  AFTER INSERT ON tenants
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_workflow_config();

-- =====================================================
-- SEED EXISTING TENANTS WITH DEFAULT CONFIGS
-- =====================================================

-- Seed dispatch configs for existing dispatch tenants
INSERT INTO dispatch_workflow_config (
  tenant_id,
  vehicle_info_timing,
  vehicle_affects_pricing,
  required_vehicle_fields,
  luxury_flatbed_recommendation,
  awd_detection_enabled,
  ask_payment_method,
  payment_timing,
  confirm_geocoded_address,
  driver_callback_script
)
SELECT
  id AS tenant_id,
  'before_pricing' AS vehicle_info_timing,  -- Safe default: matches current behavior
  true AS vehicle_affects_pricing,
  ARRAY['color', 'make'] AS required_vehicle_fields,
  false AS luxury_flatbed_recommendation,  -- Opt-in feature
  false AS awd_detection_enabled,
  true AS ask_payment_method,
  'on_arrival' AS payment_timing,
  true AS confirm_geocoded_address,
  'Our driver will call you when they''re about 10 minutes away' AS driver_callback_script
FROM tenants
WHERE business_mode = 'dispatch'
ON CONFLICT (tenant_id) DO NOTHING;

-- Seed service configs for existing service tenants
INSERT INTO service_workflow_config (
  tenant_id,
  collect_service_duration,
  collect_deposit_upfront,
  suggest_alternatives_when_unavailable,
  max_alternatives_to_suggest,
  booking_confirmation_script
)
SELECT
  id AS tenant_id,
  true AS collect_service_duration,
  false AS collect_deposit_upfront,  -- Opt-in
  true AS suggest_alternatives_when_unavailable,
  3 AS max_alternatives_to_suggest,
  'Perfect! You''re all set for {{date}} at {{time}}' AS booking_confirmation_script
FROM tenants
WHERE business_mode = 'service'
ON CONFLICT (tenant_id) DO NOTHING;

-- Seed food configs for existing food tenants
INSERT INTO food_workflow_config (
  tenant_id,
  ask_pickup_vs_delivery,
  default_order_type,
  allow_menu_customizations,
  ask_asap_vs_scheduled,
  order_confirmation_script
)
SELECT
  id AS tenant_id,
  'if_both_enabled' AS ask_pickup_vs_delivery,
  'ask' AS default_order_type,
  true AS allow_menu_customizations,
  true AS ask_asap_vs_scheduled,
  'Great! Your order will be ready {{ready_time}}' AS order_confirmation_script
FROM tenants
WHERE business_mode = 'food'
ON CONFLICT (tenant_id) DO NOTHING;

-- Seed medical configs for existing medical tenants
INSERT INTO medical_workflow_config (
  tenant_id,
  consent_timing,
  require_explicit_consent,
  collect_symptom_details,
  detect_emergency_keywords
)
SELECT
  id AS tenant_id,
  'before_intake' AS consent_timing,
  true AS require_explicit_consent,
  true AS collect_symptom_details,
  true AS detect_emergency_keywords
FROM tenants
WHERE business_mode = 'medical'
ON CONFLICT (tenant_id) DO NOTHING;

-- Seed general configs for existing general tenants
INSERT INTO general_workflow_config (
  tenant_id,
  ask_best_time_to_call,
  escalate_unknown_questions
)
SELECT
  id AS tenant_id,
  true AS ask_best_time_to_call,
  true AS escalate_unknown_questions
FROM tenants
WHERE business_mode = 'general'
ON CONFLICT (tenant_id) DO NOTHING;

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_dispatch_workflow_config_tenant_id ON dispatch_workflow_config(tenant_id);
CREATE INDEX IF NOT EXISTS idx_service_workflow_config_tenant_id ON service_workflow_config(tenant_id);
CREATE INDEX IF NOT EXISTS idx_food_workflow_config_tenant_id ON food_workflow_config(tenant_id);
CREATE INDEX IF NOT EXISTS idx_medical_workflow_config_tenant_id ON medical_workflow_config(tenant_id);
CREATE INDEX IF NOT EXISTS idx_general_workflow_config_tenant_id ON general_workflow_config(tenant_id);

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE dispatch_workflow_config IS 'Workflow configuration for dispatch-mode AI agents (towing, roadside, courier, locksmith)';
COMMENT ON TABLE service_workflow_config IS 'Workflow configuration for service-mode AI agents (booking, scheduling)';
COMMENT ON TABLE food_workflow_config IS 'Workflow configuration for food-mode AI agents (restaurant, catering)';
COMMENT ON TABLE medical_workflow_config IS 'Workflow configuration for medical-mode AI agents (healthcare intake)';
COMMENT ON TABLE general_workflow_config IS 'Workflow configuration for general/sales AI agents (lead capture, callbacks)';

COMMENT ON COLUMN dispatch_workflow_config.vehicle_info_timing IS 'When to collect vehicle info: before_pricing (affects quote), after_pricing (just for driver notes), optional (skip unless needed)';
COMMENT ON COLUMN dispatch_workflow_config.luxury_flatbed_recommendation IS 'Enable flatbed recommendations for luxury vehicles (BMW, Mercedes, etc.)';
COMMENT ON COLUMN dispatch_workflow_config.service_dropoff_rules IS 'JSON object mapping service types to dropoff requirements. Example: {"towing": {"requires_dropoff": true}, "jumpstart": {"requires_dropoff": false}}';

COMMENT ON COLUMN service_workflow_config.required_intake_questions IS 'JSON array of service-specific intake questions. Example: [{"service_id": "abc-123", "questions": ["Do you have parts?", "Emergency?"]}]';
COMMENT ON COLUMN food_workflow_config.ask_pickup_vs_delivery IS 'When to ask about order type: always (every call), if_both_enabled (only if both are options), never (use default)';
COMMENT ON COLUMN medical_workflow_config.consent_timing IS 'When to collect HIPAA consent: before_intake, after_reason, or at_end';
