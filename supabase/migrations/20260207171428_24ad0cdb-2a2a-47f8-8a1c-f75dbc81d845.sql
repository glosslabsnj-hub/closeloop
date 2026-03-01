-- ============================================================================
-- COMPREHENSIVE OFFERINGS SCHEMA
-- Supports full customization for all business modes
-- ============================================================================

-- 1. PRICE MODIFIERS TABLE
-- Allows businesses to define price adjustments based on various factors
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.price_modifiers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  
  -- Modifier identity
  name TEXT NOT NULL,                           -- e.g., "SUV", "Same Day", "After Hours"
  description TEXT,                             -- Optional explanation
  
  -- Modifier type determines when it applies
  modifier_type TEXT NOT NULL CHECK (modifier_type IN (
    'vehicle_size',    -- Dispatch/detailing: sedan, SUV, truck, RV
    'property_size',   -- Cleaning/HVAC: sqft ranges, rooms, bedrooms
    'urgency',         -- Same day, emergency, scheduled
    'time_of_day',     -- After hours, weekend, holiday
    'distance',        -- Additional distance fees
    'equipment',       -- Special equipment required
    'complexity',      -- Difficulty level
    'party_size',      -- Food: group size for reservations
    'custom'           -- Business-defined custom modifier
  )),
  
  -- How the modifier affects price
  adjustment_type TEXT NOT NULL DEFAULT 'fixed' CHECK (adjustment_type IN (
    'fixed',           -- Add/subtract fixed amount (e.g., +$50)
    'percentage',      -- Add/subtract percentage (e.g., +20%)
    'multiplier'       -- Multiply price (e.g., 1.5x)
  )),
  adjustment_value NUMERIC NOT NULL DEFAULT 0,  -- The amount/percentage/multiplier
  
  -- Applicability rules
  applies_to_categories TEXT[],                 -- Which service categories (null = all)
  applies_to_services UUID[],                   -- Specific services (null = all in categories)
  applies_to_modes TEXT[],                      -- Which business modes (null = all)
  
  -- Scheduling for time-based modifiers
  active_days INTEGER[],                        -- 0=Sun, 1=Mon, etc. (null = all days)
  active_start_time TIME,                       -- e.g., 18:00 for after-hours
  active_end_time TIME,                         -- e.g., 08:00 next morning
  
  -- Display
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  show_to_customer BOOLEAN DEFAULT true,        -- Whether AI mentions this modifier
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.price_modifiers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant members can view modifiers" ON public.price_modifiers;
CREATE POLICY "Tenant members can view modifiers"
  ON public.price_modifiers
  FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Tenant members can manage modifiers" ON public.price_modifiers;
CREATE POLICY "Tenant members can manage modifiers"
  ON public.price_modifiers
  FOR ALL TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()));

-- 2. SERVICE PACKAGES TABLE
-- Bundle multiple services/items together with optional discount
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.service_packages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  
  -- Package identity
  name TEXT NOT NULL,                           -- e.g., "Full Detail Package", "6-Session Bundle"
  description TEXT,
  
  -- Package type
  package_type TEXT NOT NULL DEFAULT 'bundle' CHECK (package_type IN (
    'bundle',          -- Combine services for one-time purchase
    'membership',      -- Recurring subscription with included services
    'treatment_series' -- Medical: series of treatments (e.g., 6 laser sessions)
  )),
  
  -- Pricing
  regular_price_cents INTEGER,                  -- Total if purchased separately
  package_price_cents INTEGER NOT NULL,         -- Discounted package price
  
  -- For memberships
  billing_interval TEXT CHECK (billing_interval IN ('weekly', 'monthly', 'quarterly', 'yearly')),
  included_services_per_period JSONB,           -- e.g., {"basic_wash": 4, "interior_detail": 1}
  member_discount_percent INTEGER DEFAULT 0,    -- Additional discount on non-included services
  
  -- For treatment series
  total_sessions INTEGER,                       -- e.g., 6 for "6-Session Package"
  session_validity_days INTEGER,                -- How long to use all sessions
  
  -- Contents
  included_items JSONB NOT NULL DEFAULT '[]',   -- Array of {service_id, quantity, included_modifiers}
  
  -- Display
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,            -- Show prominently
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.service_packages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant members can view packages" ON public.service_packages;
CREATE POLICY "Tenant members can view packages"
  ON public.service_packages
  FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Tenant members can manage packages" ON public.service_packages;
CREATE POLICY "Tenant members can manage packages"
  ON public.service_packages
  FOR ALL TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()));

-- 3. FOOD-SPECIFIC ENHANCEMENTS
-- Add missing columns to food_order_settings
-- ============================================================================
ALTER TABLE public.food_order_settings 
  ADD COLUMN IF NOT EXISTS delivery_fee_cents INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS delivery_fee_type TEXT DEFAULT 'flat' CHECK (delivery_fee_type IN ('flat', 'distance_based', 'order_percentage')),
  ADD COLUMN IF NOT EXISTS delivery_fee_config JSONB,  -- For distance-based or percentage rules
  ADD COLUMN IF NOT EXISTS tip_suggestions INTEGER[] DEFAULT '{15, 18, 20, 25}',
  ADD COLUMN IF NOT EXISTS allows_special_instructions BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS max_order_items INTEGER,    -- Optional limit
  ADD COLUMN IF NOT EXISTS kitchen_hours_json JSONB,   -- Different from business hours
  ADD COLUMN IF NOT EXISTS peak_time_buffer_minutes INTEGER DEFAULT 0;  -- Add to prep time during rush

-- 4. MENU ITEM SIZE OPTIONS
-- Allow food items to have size variants
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.menu_item_sizes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  menu_item_id UUID NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  
  name TEXT NOT NULL,                           -- e.g., "Small", "Medium", "Large"
  price_cents INTEGER NOT NULL,                 -- Price for this size
  is_default BOOLEAN DEFAULT false,             -- Which size is selected by default
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.menu_item_sizes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant members can view sizes" ON public.menu_item_sizes;
CREATE POLICY "Tenant members can view sizes"
  ON public.menu_item_sizes
  FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Tenant members can manage sizes" ON public.menu_item_sizes;
CREATE POLICY "Tenant members can manage sizes"
  ON public.menu_item_sizes
  FOR ALL TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()));

-- 5. DAILY SPECIALS / TIME-LIMITED ITEMS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.menu_specials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  
  name TEXT NOT NULL,                           -- e.g., "Taco Tuesday", "Happy Hour"
  description TEXT,
  
  -- What's included
  items JSONB NOT NULL DEFAULT '[]',            -- Array of {menu_item_id, special_price_cents, quantity}
  
  -- When it's available
  schedule_type TEXT NOT NULL DEFAULT 'recurring' CHECK (schedule_type IN (
    'recurring',       -- Every week on certain days
    'date_range',      -- Specific start/end dates
    'one_time'         -- Single day only
  )),
  active_days INTEGER[],                        -- 0=Sun, 1=Mon, etc.
  start_time TIME,
  end_time TIME,
  start_date DATE,
  end_date DATE,
  
  -- Display
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.menu_specials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant members can view specials" ON public.menu_specials;
CREATE POLICY "Tenant members can view specials"
  ON public.menu_specials
  FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Tenant members can manage specials" ON public.menu_specials;
CREATE POLICY "Tenant members can manage specials"
  ON public.menu_specials
  FOR ALL TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()));

-- 6. DISPATCH-SPECIFIC ENHANCEMENTS
-- Add columns to tenant_distance_settings for after-hours rates, minimums, etc.
-- ============================================================================
ALTER TABLE public.tenant_distance_settings
  ADD COLUMN IF NOT EXISTS minimum_charge_cents INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS after_hours_multiplier NUMERIC(3,2) DEFAULT 1.0,
  ADD COLUMN IF NOT EXISTS after_hours_start TIME DEFAULT '18:00',
  ADD COLUMN IF NOT EXISTS after_hours_end TIME DEFAULT '08:00',
  ADD COLUMN IF NOT EXISTS weekend_multiplier NUMERIC(3,2) DEFAULT 1.0,
  ADD COLUMN IF NOT EXISTS holiday_multiplier NUMERIC(3,2) DEFAULT 1.0,
  ADD COLUMN IF NOT EXISTS holiday_dates DATE[],
  ADD COLUMN IF NOT EXISTS fuel_surcharge_percent NUMERIC(4,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS special_equipment_fees JSONB DEFAULT '{}';  -- e.g., {"dollies": 25, "flatbed": 50}

-- 7. MEDICAL/MEDSPA ENHANCEMENTS
-- Table for insurance and consultation settings
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.medical_practice_settings (
  tenant_id UUID PRIMARY KEY REFERENCES public.tenants(id) ON DELETE CASCADE,
  
  -- Insurance info
  accepts_insurance BOOLEAN DEFAULT false,
  accepted_insurance_carriers TEXT[],          -- e.g., ["Blue Cross", "Aetna", "United"]
  insurance_notes TEXT,                        -- What AI should say about insurance
  
  -- Pricing
  new_patient_fee_cents INTEGER,               -- New patient consultation fee
  follow_up_fee_cents INTEGER,                 -- Standard follow-up fee
  consultation_fee_cents INTEGER,              -- Initial consultation (may be waived)
  waive_consultation_with_treatment BOOLEAN DEFAULT true,
  
  -- Treatment series defaults
  series_discount_percent INTEGER DEFAULT 10,  -- Default discount for package purchases
  
  -- Compliance
  requires_consent_form BOOLEAN DEFAULT true,
  requires_medical_history BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.medical_practice_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant members can view medical settings" ON public.medical_practice_settings;
CREATE POLICY "Tenant members can view medical settings"
  ON public.medical_practice_settings
  FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Tenant members can manage medical settings" ON public.medical_practice_settings;
CREATE POLICY "Tenant members can manage medical settings"
  ON public.medical_practice_settings
  FOR ALL TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()));

-- 8. Add updated_at trigger for all new tables
-- ============================================================================
DROP TRIGGER IF EXISTS update_price_modifiers_updated_at ON public.price_modifiers;
CREATE TRIGGER update_price_modifiers_updated_at
  BEFORE UPDATE ON public.price_modifiers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_service_packages_updated_at ON public.service_packages;
CREATE TRIGGER update_service_packages_updated_at
  BEFORE UPDATE ON public.service_packages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_menu_specials_updated_at ON public.menu_specials;
CREATE TRIGGER update_menu_specials_updated_at
  BEFORE UPDATE ON public.menu_specials
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_medical_practice_settings_updated_at ON public.medical_practice_settings;
CREATE TRIGGER update_medical_practice_settings_updated_at
  BEFORE UPDATE ON public.medical_practice_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 9. Create indexes for performance
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_price_modifiers_tenant ON public.price_modifiers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_price_modifiers_type ON public.price_modifiers(modifier_type);
CREATE INDEX IF NOT EXISTS idx_service_packages_tenant ON public.service_packages(tenant_id);
CREATE INDEX IF NOT EXISTS idx_menu_item_sizes_item ON public.menu_item_sizes(menu_item_id);
CREATE INDEX IF NOT EXISTS idx_menu_specials_tenant ON public.menu_specials(tenant_id);

-- Enable realtime for key tables
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'price_modifiers') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.price_modifiers;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'service_packages') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.service_packages;
  END IF;
END $$;