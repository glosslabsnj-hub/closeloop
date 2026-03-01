-- Add "sales" business mode to CloseLoop
-- This migration adds the sales enum value and three new tables:
-- test_drives, sales_leads, sales_inventory

-- 1. Add sales to business_mode enum
ALTER TYPE public.business_mode ADD VALUE IF NOT EXISTS 'sales';

-- 2. test_drives table
CREATE TABLE IF NOT EXISTS public.test_drives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  session_id uuid REFERENCES public.ai_call_sessions(id) ON DELETE SET NULL,

  -- Vehicle fields
  vehicle_stock_number text,
  vehicle_year text,
  vehicle_make text,
  vehicle_model text,
  vehicle_trim text,
  vehicle_vin text,
  vehicle_color text,
  vehicle_type text CHECK (vehicle_type IN ('new', 'used', 'certified')),

  -- Scheduling
  scheduled_at timestamptz,
  scheduled_date date,
  scheduled_time time,
  duration_minutes integer DEFAULT 30,

  -- Sales context
  sales_rep_requested text,
  trade_in_interest boolean DEFAULT false,
  trade_in_vehicle_info text,
  financing_interest boolean DEFAULT false,
  budget_range text,

  -- Status
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled', 'no_show')),
  notes text,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_test_drives_tenant ON public.test_drives(tenant_id);
CREATE INDEX IF NOT EXISTS idx_test_drives_session ON public.test_drives(session_id);
CREATE INDEX IF NOT EXISTS idx_test_drives_customer ON public.test_drives(customer_id);
CREATE INDEX IF NOT EXISTS idx_test_drives_tenant_date ON public.test_drives(tenant_id, scheduled_date);

-- 3. sales_leads table
CREATE TABLE IF NOT EXISTS public.sales_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  session_id uuid REFERENCES public.ai_call_sessions(id) ON DELETE SET NULL,

  -- Lead info
  lead_number text,
  interest_type text CHECK (interest_type IN ('vehicle_purchase', 'trade_in', 'financing', 'general')),
  vehicle_interest text,
  budget_range text,
  timeline text CHECK (timeline IN ('immediate', 'this_week', 'this_month', 'just_looking')),
  financing_preapproved boolean DEFAULT false,
  has_trade_in boolean DEFAULT false,
  trade_in_details text,

  -- Assignment
  assigned_sales_rep text,

  -- Status & priority
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'appointment_set', 'test_drive', 'negotiation', 'sold', 'lost')),
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'hot')),

  follow_up_at timestamptz,
  notes text,
  source text DEFAULT 'ai_call',

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sales_leads_tenant ON public.sales_leads(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sales_leads_session ON public.sales_leads(session_id);
CREATE INDEX IF NOT EXISTS idx_sales_leads_tenant_status ON public.sales_leads(tenant_id, status);

-- 4. sales_inventory table
CREATE TABLE IF NOT EXISTS public.sales_inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,

  -- Vehicle/product fields
  stock_number text,
  vin text,
  year text,
  make text,
  model text,
  trim text,
  body_style text,
  color_exterior text,
  color_interior text,

  -- Pricing
  msrp_cents integer,
  asking_price_cents integer,
  internet_price_cents integer,

  -- Condition
  condition text CHECK (condition IN ('new', 'used', 'certified')),
  mileage integer,

  -- Status
  status text NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'pending', 'sold', 'hold', 'incoming')),

  -- Features
  features text[],
  description text,

  -- Integration
  external_id text,
  external_source text CHECK (external_source IN ('dealersocket', 'vauto', 'cdk', 'manual')),
  last_synced_at timestamptz,

  -- Media & location
  photo_urls text[],
  lot_location text,
  days_on_lot integer DEFAULT 0,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_sales_inventory_stock ON public.sales_inventory(tenant_id, stock_number) WHERE stock_number IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_sales_inventory_vin ON public.sales_inventory(tenant_id, vin) WHERE vin IS NOT NULL;

-- 5. RLS policies
ALTER TABLE public.test_drives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_inventory ENABLE ROW LEVEL SECURITY;

-- test_drives RLS
DROP POLICY IF EXISTS "tenant_access" ON public.test_drives;
CREATE POLICY "tenant_access"
  ON public.test_drives
  FOR ALL USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));
DROP POLICY IF EXISTS "service_role_full" ON public.test_drives;
CREATE POLICY "service_role_full"
  ON public.test_drives
  FOR ALL USING (auth.role() = 'service_role');

-- sales_leads RLS
DROP POLICY IF EXISTS "tenant_access" ON public.sales_leads;
CREATE POLICY "tenant_access"
  ON public.sales_leads
  FOR ALL USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));
DROP POLICY IF EXISTS "service_role_full" ON public.sales_leads;
CREATE POLICY "service_role_full"
  ON public.sales_leads
  FOR ALL USING (auth.role() = 'service_role');

-- sales_inventory RLS
DROP POLICY IF EXISTS "tenant_access" ON public.sales_inventory;
CREATE POLICY "tenant_access"
  ON public.sales_inventory
  FOR ALL USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));
DROP POLICY IF EXISTS "service_role_full" ON public.sales_inventory;
CREATE POLICY "service_role_full"
  ON public.sales_inventory
  FOR ALL USING (auth.role() = 'service_role');

-- 6. Revenue attribution triggers (same pattern as bookings/dispatch_jobs/food_orders)
CREATE OR REPLACE FUNCTION public.create_revenue_attribution_test_drive()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.session_id IS NOT NULL THEN
    INSERT INTO public.revenue_attributions (tenant_id, session_id, entity_type, entity_id, revenue_cents)
    VALUES (NEW.tenant_id, NEW.session_id, 'test_drive', NEW.id, 0)
    ON CONFLICT (tenant_id, entity_type, entity_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_revenue_attribution_test_drive ON public.test_drives;
CREATE TRIGGER trg_revenue_attribution_test_drive
  AFTER INSERT ON public.test_drives
  FOR EACH ROW EXECUTE FUNCTION public.create_revenue_attribution_test_drive();

CREATE OR REPLACE FUNCTION public.create_revenue_attribution_sales_lead()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.session_id IS NOT NULL THEN
    INSERT INTO public.revenue_attributions (tenant_id, session_id, entity_type, entity_id, revenue_cents)
    VALUES (NEW.tenant_id, NEW.session_id, 'sales_lead', NEW.id, 0)
    ON CONFLICT (tenant_id, entity_type, entity_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_revenue_attribution_sales_lead ON public.sales_leads;
CREATE TRIGGER trg_revenue_attribution_sales_lead
  AFTER INSERT ON public.sales_leads
  FOR EACH ROW EXECUTE FUNCTION public.create_revenue_attribution_sales_lead();

-- 7. updated_at triggers
DROP TRIGGER IF EXISTS set_updated_at_test_drives ON public.test_drives;
CREATE TRIGGER set_updated_at_test_drives
  BEFORE UPDATE ON public.test_drives
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS set_updated_at_sales_leads ON public.sales_leads;
CREATE TRIGGER set_updated_at_sales_leads
  BEFORE UPDATE ON public.sales_leads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS set_updated_at_sales_inventory ON public.sales_inventory;
CREATE TRIGGER set_updated_at_sales_inventory
  BEFORE UPDATE ON public.sales_inventory
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
