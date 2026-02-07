-- =============================================
-- Mode-Specific Knowledge Tables for Business Brain
-- =============================================

-- 1. Menu Knowledge (Food Mode) - Detailed item descriptions, ingredients, allergens
CREATE TABLE public.menu_knowledge (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  menu_item_id UUID REFERENCES public.menu_items(id) ON DELETE SET NULL,
  item_name TEXT NOT NULL,
  detailed_description TEXT,
  ingredients TEXT[],
  allergens TEXT[],
  dietary_tags TEXT[], -- vegan, vegetarian, gluten-free, etc.
  prep_notes TEXT, -- How it's prepared
  pairing_suggestions TEXT, -- Wine, sides, drinks
  chef_notes TEXT, -- Special preparation notes
  calorie_count INTEGER,
  spice_level INTEGER CHECK (spice_level BETWEEN 0 AND 5),
  is_signature BOOLEAN DEFAULT false,
  is_seasonal BOOLEAN DEFAULT false,
  seasonal_availability TEXT, -- e.g., "Summer only"
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Vehicle Knowledge (Dispatch Mode) - Vehicle-specific towing requirements
CREATE TABLE public.vehicle_knowledge (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  vehicle_category TEXT NOT NULL, -- Sedan, SUV, Motorcycle, Semi, RV, etc.
  equipment_required TEXT[], -- Flatbed, Wheel-lift, Dollies, etc.
  weight_class TEXT, -- Light, Medium, Heavy
  max_weight_lbs INTEGER,
  special_instructions TEXT,
  common_issues TEXT[], -- Common problems for this vehicle type
  estimated_hookup_minutes INTEGER,
  requires_special_permit BOOLEAN DEFAULT false,
  additional_fees_apply BOOLEAN DEFAULT false,
  fee_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Roadside Knowledge (Dispatch Mode) - Emergency situation scripts
CREATE TABLE public.roadside_knowledge (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  situation_type TEXT NOT NULL, -- Flat tire, Dead battery, Lockout, Fuel delivery, etc.
  safety_instructions TEXT, -- What to tell the caller for safety
  estimated_service_time_minutes INTEGER,
  tools_required TEXT[],
  can_be_self_service BOOLEAN DEFAULT false,
  self_service_tips TEXT,
  escalation_triggers TEXT[], -- When to call 911 instead
  common_questions TEXT[],
  ai_script TEXT, -- Exactly what to say
  priority_level TEXT CHECK (priority_level IN ('standard', 'urgent', 'emergency')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Symptom Triage (Medical Mode) - When to escalate, pre-visit prep
CREATE TABLE public.symptom_triage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  symptom_category TEXT NOT NULL, -- Pain, Respiratory, Skin, Mental Health, etc.
  symptom_name TEXT NOT NULL,
  severity_indicators TEXT[], -- Red flags that require escalation
  escalation_action TEXT, -- "Recommend ER", "Schedule same-day", "911"
  pre_visit_instructions TEXT, -- What to do before appointment
  questions_to_ask TEXT[], -- Questions AI should ask
  can_be_telehealth BOOLEAN DEFAULT true,
  typical_duration_minutes INTEGER, -- How long appointment usually takes
  specialty_referral TEXT, -- If specialist is needed
  hipaa_safe_response TEXT, -- What AI can say without violating HIPAA
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Insurance Knowledge (Medical Mode) - Plan-specific scripts
CREATE TABLE public.insurance_knowledge (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  carrier_name TEXT NOT NULL,
  plan_types TEXT[], -- HMO, PPO, Medicare, Medicaid, etc.
  is_accepted BOOLEAN DEFAULT true,
  verification_process TEXT,
  common_coverage_notes TEXT,
  copay_typical_range TEXT,
  pre_authorization_required TEXT[], -- Services needing pre-auth
  billing_notes TEXT,
  patient_script TEXT, -- What to tell patients about this carrier
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. Product Knowledge (Service Mode) - Products used in services
CREATE TABLE public.product_knowledge (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  brand TEXT,
  category TEXT, -- Hair color, Cleaning supplies, Auto parts, etc.
  description TEXT,
  benefits TEXT[],
  usage_instructions TEXT,
  warnings TEXT,
  price_range TEXT,
  is_premium BOOLEAN DEFAULT false,
  upsell_script TEXT, -- How AI should mention this product
  related_services TEXT[], -- Services this product is used in
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. Aftercare Instructions (Service + Medical Mode)
CREATE TABLE public.aftercare_instructions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
  service_name TEXT NOT NULL,
  immediate_care TEXT[], -- First 24 hours
  ongoing_care TEXT[], -- Days/weeks after
  things_to_avoid TEXT[],
  warning_signs TEXT[], -- When to call back
  follow_up_recommended BOOLEAN DEFAULT false,
  follow_up_timeframe TEXT, -- "2 weeks", "1 month"
  ai_verbatim_script TEXT, -- Exactly what AI should say
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. Competitor Knowledge (All Modes) - Competitive positioning
CREATE TABLE public.competitor_knowledge (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  competitor_name TEXT NOT NULL,
  our_advantage TEXT[], -- Why we're better
  common_customer_concerns TEXT[], -- What customers say about them
  response_script TEXT, -- How AI should respond when they're mentioned
  price_comparison_notes TEXT,
  never_say TEXT[], -- Things AI should never say about competitors
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 9. Seasonal/Event Knowledge (All Modes) - Holidays, special occasions
CREATE TABLE public.seasonal_knowledge (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  event_name TEXT NOT NULL, -- "Valentine's Day", "Super Bowl", "Tax Season"
  start_date TEXT, -- MM-DD format or "variable"
  end_date TEXT,
  special_hours TEXT,
  special_pricing_notes TEXT,
  special_menu_notes TEXT,
  booking_tips TEXT, -- "Book 2 weeks ahead"
  ai_announcement TEXT, -- What AI should proactively mention
  is_recurring BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 10. Catering Knowledge (Food Mode) - Event-specific scripts
CREATE TABLE public.catering_knowledge (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL, -- Wedding, Corporate, Birthday, etc.
  min_guests INTEGER,
  max_guests INTEGER,
  lead_time_days INTEGER, -- How far in advance to book
  menu_restrictions TEXT,
  setup_requirements TEXT,
  staffing_included BOOLEAN DEFAULT false,
  rental_equipment TEXT[], -- What we provide
  venue_requirements TEXT,
  deposit_percentage INTEGER,
  cancellation_policy TEXT,
  ai_script TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.menu_knowledge ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_knowledge ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roadside_knowledge ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.symptom_triage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insurance_knowledge ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_knowledge ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aftercare_instructions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competitor_knowledge ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seasonal_knowledge ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catering_knowledge ENABLE ROW LEVEL SECURITY;

-- RLS Policies for all tables
CREATE POLICY "Tenant isolation" ON public.menu_knowledge
  FOR ALL USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));
  
CREATE POLICY "Tenant isolation" ON public.vehicle_knowledge
  FOR ALL USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));
  
CREATE POLICY "Tenant isolation" ON public.roadside_knowledge
  FOR ALL USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));
  
CREATE POLICY "Tenant isolation" ON public.symptom_triage
  FOR ALL USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));
  
CREATE POLICY "Tenant isolation" ON public.insurance_knowledge
  FOR ALL USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));
  
CREATE POLICY "Tenant isolation" ON public.product_knowledge
  FOR ALL USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));
  
CREATE POLICY "Tenant isolation" ON public.aftercare_instructions
  FOR ALL USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));
  
CREATE POLICY "Tenant isolation" ON public.competitor_knowledge
  FOR ALL USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));
  
CREATE POLICY "Tenant isolation" ON public.seasonal_knowledge
  FOR ALL USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));
  
CREATE POLICY "Tenant isolation" ON public.catering_knowledge
  FOR ALL USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

-- Create updated_at triggers
CREATE TRIGGER update_menu_knowledge_updated_at BEFORE UPDATE ON public.menu_knowledge
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  
CREATE TRIGGER update_vehicle_knowledge_updated_at BEFORE UPDATE ON public.vehicle_knowledge
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  
CREATE TRIGGER update_roadside_knowledge_updated_at BEFORE UPDATE ON public.roadside_knowledge
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  
CREATE TRIGGER update_symptom_triage_updated_at BEFORE UPDATE ON public.symptom_triage
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  
CREATE TRIGGER update_insurance_knowledge_updated_at BEFORE UPDATE ON public.insurance_knowledge
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  
CREATE TRIGGER update_product_knowledge_updated_at BEFORE UPDATE ON public.product_knowledge
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  
CREATE TRIGGER update_aftercare_instructions_updated_at BEFORE UPDATE ON public.aftercare_instructions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  
CREATE TRIGGER update_competitor_knowledge_updated_at BEFORE UPDATE ON public.competitor_knowledge
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  
CREATE TRIGGER update_seasonal_knowledge_updated_at BEFORE UPDATE ON public.seasonal_knowledge
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  
CREATE TRIGGER update_catering_knowledge_updated_at BEFORE UPDATE ON public.catering_knowledge
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes for performance
CREATE INDEX idx_menu_knowledge_tenant ON public.menu_knowledge(tenant_id);
CREATE INDEX idx_vehicle_knowledge_tenant ON public.vehicle_knowledge(tenant_id);
CREATE INDEX idx_roadside_knowledge_tenant ON public.roadside_knowledge(tenant_id);
CREATE INDEX idx_symptom_triage_tenant ON public.symptom_triage(tenant_id);
CREATE INDEX idx_insurance_knowledge_tenant ON public.insurance_knowledge(tenant_id);
CREATE INDEX idx_product_knowledge_tenant ON public.product_knowledge(tenant_id);
CREATE INDEX idx_aftercare_instructions_tenant ON public.aftercare_instructions(tenant_id);
CREATE INDEX idx_competitor_knowledge_tenant ON public.competitor_knowledge(tenant_id);
CREATE INDEX idx_seasonal_knowledge_tenant ON public.seasonal_knowledge(tenant_id);
CREATE INDEX idx_catering_knowledge_tenant ON public.catering_knowledge(tenant_id);