-- ============================================================================
-- Coverage & ETA Enhancements for All Business Modes
-- ============================================================================

-- Service Mode: Service coverage settings (same-day radius, travel buffers, duration)
CREATE TABLE IF NOT EXISTS public.service_coverage_settings (
  tenant_id UUID PRIMARY KEY REFERENCES public.tenants(id) ON DELETE CASCADE,
  
  -- Same-day service radius
  same_day_radius_miles NUMERIC,
  same_day_enabled BOOLEAN DEFAULT true,
  same_day_cutoff_time TIME, -- e.g., 2pm = no same-day after this
  
  -- Travel buffer between appointments
  travel_buffer_minutes INTEGER DEFAULT 15,
  buffer_mode TEXT DEFAULT 'fixed' CHECK (buffer_mode IN ('fixed', 'distance_based', 'none')),
  
  -- On-site duration defaults
  default_onsite_minutes INTEGER DEFAULT 60,
  onsite_by_service_type JSONB DEFAULT '{}', -- {"hvac_repair": 90, "inspection": 30}
  
  -- Urgency handling
  accepts_same_day_urgent BOOLEAN DEFAULT true,
  urgent_upcharge_percent NUMERIC DEFAULT 0,
  
  -- Geographic preferences
  preferred_zip_priority JSONB DEFAULT '[]', -- ZIPs where you prefer to work
  avoid_traffic_hours BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Food Mode: Delivery zones with tiered fees
CREATE TABLE IF NOT EXISTS public.delivery_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  
  zone_name TEXT NOT NULL,
  zone_type TEXT DEFAULT 'radius' CHECK (zone_type IN ('radius', 'zip', 'neighborhood')),
  
  -- For radius zones
  min_miles NUMERIC DEFAULT 0,
  max_miles NUMERIC,
  
  -- For zip zones
  zip_codes TEXT[] DEFAULT '{}',
  
  -- For neighborhood zones
  neighborhood_names TEXT[] DEFAULT '{}',
  
  -- Pricing for this zone
  delivery_fee_cents INTEGER DEFAULT 0,
  minimum_order_cents INTEGER DEFAULT 0,
  
  -- Delivery time estimates
  estimated_delivery_min_minutes INTEGER DEFAULT 30,
  estimated_delivery_max_minutes INTEGER DEFAULT 45,
  
  -- Peak adjustments
  peak_fee_cents INTEGER DEFAULT 0, -- extra during peak hours
  peak_time_adjustment_minutes INTEGER DEFAULT 10, -- extra time during peak
  
  -- Zone status
  is_active BOOLEAN DEFAULT true,
  priority_order INTEGER DEFAULT 0, -- for display and matching order
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Food Mode: Peak hour definitions
CREATE TABLE IF NOT EXISTS public.peak_hours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  
  name TEXT NOT NULL, -- "Lunch Rush", "Dinner Peak"
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  
  -- Impact on operations
  prep_buffer_minutes INTEGER DEFAULT 10, -- extra prep time
  delivery_buffer_minutes INTEGER DEFAULT 10, -- extra delivery time
  fee_adjustment_cents INTEGER DEFAULT 0, -- surge fee
  
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Medical Mode: Coverage settings
CREATE TABLE IF NOT EXISTS public.medical_coverage_settings (
  tenant_id UUID PRIMARY KEY REFERENCES public.tenants(id) ON DELETE CASCADE,
  
  -- In-home visits
  offers_home_visits BOOLEAN DEFAULT false,
  home_visit_radius_miles NUMERIC,
  home_visit_fee_cents INTEGER DEFAULT 0,
  home_visit_duration_minutes INTEGER DEFAULT 60,
  
  -- Telehealth
  offers_telehealth BOOLEAN DEFAULT true,
  telehealth_states TEXT[] DEFAULT '{}', -- licensed states for virtual visits
  telehealth_platforms TEXT[] DEFAULT '{}', -- supported platforms
  
  -- Appointment buffers
  standard_buffer_minutes INTEGER DEFAULT 10,
  new_patient_extra_minutes INTEGER DEFAULT 15,
  procedure_buffer_minutes INTEGER DEFAULT 30,
  
  -- Urgent/same-day
  reserves_urgent_slots BOOLEAN DEFAULT true,
  urgent_slots_per_day INTEGER DEFAULT 2,
  
  -- Insurance coverage
  accepts_medicare BOOLEAN DEFAULT true,
  accepts_medicaid BOOLEAN DEFAULT false,
  in_network_insurers TEXT[] DEFAULT '{}',
  out_of_network_policy TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Dispatch Mode: Surge zones and highway coverage
CREATE TABLE IF NOT EXISTS public.dispatch_coverage_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  
  zone_name TEXT NOT NULL,
  zone_type TEXT DEFAULT 'standard' CHECK (zone_type IN ('standard', 'highway', 'remote', 'premium')),
  
  -- Geographic definition
  definition_type TEXT DEFAULT 'radius' CHECK (definition_type IN ('radius', 'zip', 'county', 'highway')),
  min_miles NUMERIC DEFAULT 0,
  max_miles NUMERIC,
  zip_codes TEXT[] DEFAULT '{}',
  county_names JSONB DEFAULT '[]', -- [{name: "Cook", state: "IL"}]
  highway_numbers TEXT[] DEFAULT '{}', -- ["I-95", "US-1"]
  
  -- Pricing
  base_rate_cents INTEGER,
  per_mile_rate_cents INTEGER,
  minimum_charge_cents INTEGER,
  
  -- ETA adjustments
  eta_base_minutes INTEGER DEFAULT 30,
  eta_per_mile_minutes NUMERIC DEFAULT 2.0,
  
  -- Availability
  is_active BOOLEAN DEFAULT true,
  available_24_7 BOOLEAN DEFAULT true,
  available_hours JSONB, -- [{day: 0, start: "08:00", end: "22:00"}]
  
  priority_order INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- General Mode: Response time settings
CREATE TABLE IF NOT EXISTS public.response_time_settings (
  tenant_id UUID PRIMARY KEY REFERENCES public.tenants(id) ON DELETE CASCADE,
  
  -- Standard response times
  callback_target_minutes INTEGER DEFAULT 60,
  callback_max_minutes INTEGER DEFAULT 240,
  
  -- Email response
  email_target_hours INTEGER DEFAULT 24,
  email_max_hours INTEGER DEFAULT 48,
  
  -- Urgency tiers
  urgent_callback_minutes INTEGER DEFAULT 15,
  urgent_surcharge_cents INTEGER DEFAULT 0,
  
  -- Off-hours behavior
  after_hours_callback_mode TEXT DEFAULT 'next_day' CHECK (after_hours_callback_mode IN ('next_day', 'within_hours', 'emergency_only')),
  after_hours_target_minutes INTEGER,
  
  -- Priority zones (faster response)
  priority_zip_codes TEXT[] DEFAULT '{}',
  priority_response_minutes INTEGER DEFAULT 30,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add ETA enhancement columns to tenant_distance_settings
ALTER TABLE public.tenant_distance_settings 
  ADD COLUMN IF NOT EXISTS busy_buffer_minutes INTEGER DEFAULT 10,
  ADD COLUMN IF NOT EXISTS traffic_buffer_percent INTEGER DEFAULT 15,
  ADD COLUMN IF NOT EXISTS highway_response_faster_minutes INTEGER DEFAULT 10,
  ADD COLUMN IF NOT EXISTS remote_area_buffer_minutes INTEGER DEFAULT 15,
  ADD COLUMN IF NOT EXISTS max_eta_minutes INTEGER DEFAULT 120,
  ADD COLUMN IF NOT EXISTS eta_rounding_mode TEXT DEFAULT 'nearest_5' CHECK (eta_rounding_mode IN ('nearest_5', 'nearest_10', 'nearest_15', 'exact'));

-- Enable RLS on all new tables
ALTER TABLE public.service_coverage_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.peak_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medical_coverage_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dispatch_coverage_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.response_time_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for service_coverage_settings
CREATE POLICY "Users can view their tenant service coverage settings"
  ON public.service_coverage_settings FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert their tenant service coverage settings"
  ON public.service_coverage_settings FOR INSERT
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can update their tenant service coverage settings"
  ON public.service_coverage_settings FOR UPDATE
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

-- RLS Policies for delivery_zones
CREATE POLICY "Users can view their tenant delivery zones"
  ON public.delivery_zones FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert their tenant delivery zones"
  ON public.delivery_zones FOR INSERT
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can update their tenant delivery zones"
  ON public.delivery_zones FOR UPDATE
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete their tenant delivery zones"
  ON public.delivery_zones FOR DELETE
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

-- RLS Policies for peak_hours
CREATE POLICY "Users can view their tenant peak hours"
  ON public.peak_hours FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert their tenant peak hours"
  ON public.peak_hours FOR INSERT
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can update their tenant peak hours"
  ON public.peak_hours FOR UPDATE
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete their tenant peak hours"
  ON public.peak_hours FOR DELETE
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

-- RLS Policies for medical_coverage_settings
CREATE POLICY "Users can view their tenant medical coverage settings"
  ON public.medical_coverage_settings FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert their tenant medical coverage settings"
  ON public.medical_coverage_settings FOR INSERT
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can update their tenant medical coverage settings"
  ON public.medical_coverage_settings FOR UPDATE
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

-- RLS Policies for dispatch_coverage_zones
CREATE POLICY "Users can view their tenant dispatch coverage zones"
  ON public.dispatch_coverage_zones FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert their tenant dispatch coverage zones"
  ON public.dispatch_coverage_zones FOR INSERT
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can update their tenant dispatch coverage zones"
  ON public.dispatch_coverage_zones FOR UPDATE
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete their tenant dispatch coverage zones"
  ON public.dispatch_coverage_zones FOR DELETE
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

-- RLS Policies for response_time_settings
CREATE POLICY "Users can view their tenant response time settings"
  ON public.response_time_settings FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert their tenant response time settings"
  ON public.response_time_settings FOR INSERT
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can update their tenant response time settings"
  ON public.response_time_settings FOR UPDATE
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_delivery_zones_tenant ON public.delivery_zones(tenant_id);
CREATE INDEX IF NOT EXISTS idx_peak_hours_tenant ON public.peak_hours(tenant_id);
CREATE INDEX IF NOT EXISTS idx_dispatch_coverage_zones_tenant ON public.dispatch_coverage_zones(tenant_id);

-- Updated_at triggers
CREATE TRIGGER set_service_coverage_settings_updated_at
  BEFORE UPDATE ON public.service_coverage_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER set_medical_coverage_settings_updated_at
  BEFORE UPDATE ON public.medical_coverage_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER set_delivery_zones_updated_at
  BEFORE UPDATE ON public.delivery_zones
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER set_dispatch_coverage_zones_updated_at
  BEFORE UPDATE ON public.dispatch_coverage_zones
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER set_response_time_settings_updated_at
  BEFORE UPDATE ON public.response_time_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();