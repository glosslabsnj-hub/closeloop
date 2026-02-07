-- ================================================
-- COMPREHENSIVE POLICIES SCHEMA FOR ALL BUSINESS MODES
-- ================================================

-- 1. SERVICE MODE POLICIES
-- For salons, HVAC, plumbers, cleaners, contractors, etc.
CREATE TABLE public.service_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  
  -- Scheduling policies
  no_show_fee_cents integer DEFAULT 0,
  no_show_fee_type text DEFAULT 'fixed' CHECK (no_show_fee_type IN ('fixed', 'percentage', 'full_service')),
  late_arrival_grace_minutes integer DEFAULT 15,
  late_arrival_fee_cents integer DEFAULT 0,
  rescheduling_notice_hours integer DEFAULT 24,
  rescheduling_fee_cents integer DEFAULT 0,
  max_reschedules_allowed integer DEFAULT 2,
  
  -- Service guarantees
  satisfaction_guarantee_enabled boolean DEFAULT false,
  satisfaction_guarantee_text text,
  warranty_days integer,
  warranty_text text,
  
  -- Property/premises
  pet_policy text, -- "We love pets" / "Please secure pets" / "No pets during service"
  parking_requirements text,
  access_requirements text, -- "Gate codes, keys, etc."
  age_restriction_years integer, -- For services requiring adult supervision
  
  -- Liability
  liability_waiver_required boolean DEFAULT false,
  liability_waiver_text text,
  damage_policy text,
  insurance_info text,
  
  -- Travel
  travel_fee_policy text,
  minimum_service_charge_cents integer,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(tenant_id)
);

-- 2. DISPATCH MODE POLICIES
-- For towing, roadside assistance, emergency services
CREATE TABLE public.dispatch_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  
  -- Payment terms
  payment_due_at_service boolean DEFAULT true,
  accepted_payment_methods text[] DEFAULT ARRAY['cash', 'card'],
  cash_only_after_hours boolean DEFAULT false,
  prepayment_required boolean DEFAULT false,
  
  -- Cancellation after dispatch
  cancel_after_dispatch_fee_cents integer DEFAULT 5000,
  cancel_en_route_fee_cents integer DEFAULT 7500,
  cancel_on_scene_fee_cents integer DEFAULT 10000,
  
  -- Storage policies
  storage_daily_rate_cents integer DEFAULT 5000,
  storage_max_days integer DEFAULT 30,
  storage_grace_period_hours integer DEFAULT 24,
  storage_lien_sale_days integer DEFAULT 45,
  
  -- Vehicle release
  release_requires_id boolean DEFAULT true,
  release_requires_registration boolean DEFAULT true,
  release_requires_title boolean DEFAULT false,
  release_requires_insurance boolean DEFAULT false,
  release_authorized_agent_allowed boolean DEFAULT true,
  release_police_hold_policy text,
  
  -- Liability
  damage_waiver_text text,
  pre_existing_damage_policy text,
  liability_limit_cents integer,
  insurance_requirement_text text,
  
  -- Keys/lockout
  lockout_attempt_limit integer DEFAULT 2,
  lockout_disclaimer text,
  spare_key_policy text,
  
  -- Priority/urgency
  priority_fee_percentage integer DEFAULT 0, -- % extra for priority service
  emergency_surcharge_cents integer,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(tenant_id)
);

-- 3. FOOD MODE POLICIES
-- For restaurants, cafes, catering, food trucks
CREATE TABLE public.food_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  
  -- Order modifications
  order_modification_cutoff_minutes integer DEFAULT 5,
  order_cancellation_allowed boolean DEFAULT true,
  order_cancellation_cutoff_minutes integer DEFAULT 10,
  order_cancellation_fee_cents integer DEFAULT 0,
  
  -- Refunds
  wrong_order_refund_policy text DEFAULT 'full_refund',
  missing_item_policy text DEFAULT 'refund_or_credit',
  quality_issue_policy text,
  
  -- Delivery
  delivery_driver_tip_policy text,
  contactless_delivery_default boolean DEFAULT true,
  delivery_instructions_required boolean DEFAULT false,
  delivery_photo_proof boolean DEFAULT false,
  
  -- Allergies & dietary
  allergy_disclaimer text,
  cross_contamination_warning text,
  dietary_accommodation_policy text,
  nutrition_info_available boolean DEFAULT false,
  
  -- Reservations
  reservation_hold_minutes integer DEFAULT 15,
  reservation_no_show_fee_cents integer DEFAULT 0,
  reservation_cancellation_hours integer DEFAULT 4,
  large_party_minimum integer DEFAULT 6,
  large_party_deposit_cents integer,
  large_party_deposit_policy text,
  
  -- Catering
  catering_minimum_guests integer DEFAULT 10,
  catering_deposit_percentage integer DEFAULT 50,
  catering_cancellation_days integer DEFAULT 7,
  catering_cancellation_fee_policy text,
  catering_final_count_hours integer DEFAULT 48,
  
  -- Venue policies
  outside_food_allowed boolean DEFAULT false,
  corkage_fee_cents integer,
  cake_cutting_fee_cents integer,
  private_event_minimum_cents integer,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(tenant_id)
);

-- 4. MEDICAL MODE POLICIES
-- For clinics, practices, telehealth
CREATE TABLE public.medical_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  
  -- Appointment policies
  appointment_no_show_fee_cents integer DEFAULT 5000,
  appointment_late_arrival_minutes integer DEFAULT 15,
  appointment_late_reschedule boolean DEFAULT true,
  cancellation_notice_hours integer DEFAULT 24,
  cancellation_fee_cents integer DEFAULT 2500,
  new_patient_arrival_minutes integer DEFAULT 15, -- Arrive early
  
  -- Insurance & billing
  insurance_verification_required boolean DEFAULT true,
  insurance_verification_days_before integer DEFAULT 2,
  out_of_network_disclosure text,
  balance_due_policy text,
  payment_plan_available boolean DEFAULT true,
  payment_plan_minimum_cents integer,
  collections_notice text,
  
  -- Forms & consent
  hipaa_consent_required boolean DEFAULT true,
  treatment_consent_required boolean DEFAULT true,
  financial_agreement_required boolean DEFAULT true,
  minor_consent_policy text,
  telehealth_consent_required boolean DEFAULT true,
  
  -- Prescription policies
  prescription_refill_notice_days integer DEFAULT 5,
  prescription_refill_appointment_required boolean DEFAULT false,
  controlled_substance_policy text,
  
  -- Medical records
  records_request_fee_cents integer DEFAULT 2500,
  records_request_processing_days integer DEFAULT 14,
  records_release_form_required boolean DEFAULT true,
  
  -- After hours
  after_hours_contact_policy text,
  emergency_protocol text,
  hospital_affiliation text,
  
  -- Patient rights
  patient_rights_summary text,
  complaint_procedure text,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(tenant_id)
);

-- 5. GENERAL POLICIES (applies to all modes as fallback)
CREATE TABLE public.general_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  
  -- Contact policies
  response_time_hours integer DEFAULT 24,
  preferred_contact_method text DEFAULT 'phone',
  callback_availability text,
  
  -- Privacy & data
  privacy_policy_url text,
  data_retention_policy text,
  marketing_opt_in_default boolean DEFAULT false,
  
  -- Terms
  terms_of_service_url text,
  dispute_resolution_policy text,
  
  -- Seasonal/temporary
  holiday_policy text,
  weather_cancellation_policy text,
  force_majeure_text text,
  
  -- Accessibility
  ada_accommodations_text text,
  language_support text[],
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(tenant_id)
);

-- 6. REQUIRED INTAKE QUESTIONS (Mode-aware intake configuration)
CREATE TABLE public.intake_requirements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  
  field_key text NOT NULL, -- e.g., 'customer_name', 'address', 'vehicle_year'
  field_label text NOT NULL, -- "What's your name?"
  field_type text DEFAULT 'text' CHECK (field_type IN ('text', 'phone', 'email', 'address', 'number', 'select', 'multiselect', 'date', 'time', 'datetime')),
  options_json jsonb, -- For select/multiselect types
  
  is_required boolean DEFAULT true,
  ask_order integer DEFAULT 100, -- Sort order
  
  -- Visibility rules
  visible_modes text[] DEFAULT ARRAY['service', 'dispatch', 'food', 'medical', 'general'],
  visible_intents text[], -- e.g., ['booking', 'dispatch'] - null means all
  
  -- AI guidance
  ai_prompt_hint text, -- How to ask this question
  validation_hint text, -- What makes a valid answer
  
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(tenant_id, field_key)
);

-- Enable RLS
ALTER TABLE public.service_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dispatch_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.food_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medical_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.general_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intake_requirements ENABLE ROW LEVEL SECURITY;

-- RLS Policies for service_policies
CREATE POLICY "Users can view own tenant service policies" ON public.service_policies
  FOR SELECT USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));
  
CREATE POLICY "Users can insert own tenant service policies" ON public.service_policies
  FOR INSERT WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));
  
CREATE POLICY "Users can update own tenant service policies" ON public.service_policies
  FOR UPDATE USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

-- RLS Policies for dispatch_policies
CREATE POLICY "Users can view own tenant dispatch policies" ON public.dispatch_policies
  FOR SELECT USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));
  
CREATE POLICY "Users can insert own tenant dispatch policies" ON public.dispatch_policies
  FOR INSERT WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));
  
CREATE POLICY "Users can update own tenant dispatch policies" ON public.dispatch_policies
  FOR UPDATE USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

-- RLS Policies for food_policies
CREATE POLICY "Users can view own tenant food policies" ON public.food_policies
  FOR SELECT USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));
  
CREATE POLICY "Users can insert own tenant food policies" ON public.food_policies
  FOR INSERT WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));
  
CREATE POLICY "Users can update own tenant food policies" ON public.food_policies
  FOR UPDATE USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

-- RLS Policies for medical_policies
CREATE POLICY "Users can view own tenant medical policies" ON public.medical_policies
  FOR SELECT USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));
  
CREATE POLICY "Users can insert own tenant medical policies" ON public.medical_policies
  FOR INSERT WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));
  
CREATE POLICY "Users can update own tenant medical policies" ON public.medical_policies
  FOR UPDATE USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

-- RLS Policies for general_policies
CREATE POLICY "Users can view own tenant general policies" ON public.general_policies
  FOR SELECT USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));
  
CREATE POLICY "Users can insert own tenant general policies" ON public.general_policies
  FOR INSERT WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));
  
CREATE POLICY "Users can update own tenant general policies" ON public.general_policies
  FOR UPDATE USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

-- RLS Policies for intake_requirements
CREATE POLICY "Users can view own tenant intake requirements" ON public.intake_requirements
  FOR SELECT USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));
  
CREATE POLICY "Users can insert own tenant intake requirements" ON public.intake_requirements
  FOR INSERT WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));
  
CREATE POLICY "Users can update own tenant intake requirements" ON public.intake_requirements
  FOR UPDATE USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete own tenant intake requirements" ON public.intake_requirements
  FOR DELETE USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

-- Indexes
CREATE INDEX idx_service_policies_tenant ON public.service_policies(tenant_id);
CREATE INDEX idx_dispatch_policies_tenant ON public.dispatch_policies(tenant_id);
CREATE INDEX idx_food_policies_tenant ON public.food_policies(tenant_id);
CREATE INDEX idx_medical_policies_tenant ON public.medical_policies(tenant_id);
CREATE INDEX idx_general_policies_tenant ON public.general_policies(tenant_id);
CREATE INDEX idx_intake_requirements_tenant ON public.intake_requirements(tenant_id);
CREATE INDEX idx_intake_requirements_active ON public.intake_requirements(tenant_id, is_active);

-- Updated at triggers
CREATE TRIGGER update_service_policies_updated_at
  BEFORE UPDATE ON public.service_policies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_dispatch_policies_updated_at
  BEFORE UPDATE ON public.dispatch_policies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_food_policies_updated_at
  BEFORE UPDATE ON public.food_policies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_medical_policies_updated_at
  BEFORE UPDATE ON public.medical_policies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_general_policies_updated_at
  BEFORE UPDATE ON public.general_policies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_intake_requirements_updated_at
  BEFORE UPDATE ON public.intake_requirements
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();