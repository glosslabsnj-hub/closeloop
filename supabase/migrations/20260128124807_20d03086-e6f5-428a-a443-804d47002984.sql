-- Create business_mode enum
CREATE TYPE public.business_mode AS ENUM ('service', 'dispatch', 'food', 'medical', 'general');

-- Create order_status enum for food orders
CREATE TYPE public.order_status AS ENUM ('pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'completed', 'cancelled');

-- Create reservation_status enum
CREATE TYPE public.reservation_status AS ENUM ('pending', 'confirmed', 'seated', 'completed', 'cancelled', 'no_show');

-- Create dispatch_status enum
CREATE TYPE public.dispatch_status AS ENUM ('pending', 'assigned', 'en_route', 'on_site', 'completed', 'cancelled');

-- Create dispatch_priority enum
CREATE TYPE public.dispatch_priority AS ENUM ('low', 'normal', 'high', 'urgent');

-- Add business_mode, enabled_modules, and hipaa_mode to tenants
ALTER TABLE public.tenants 
ADD COLUMN business_mode business_mode NOT NULL DEFAULT 'service',
ADD COLUMN enabled_modules jsonb DEFAULT '["ai_voice", "instant_text_back", "booking"]'::jsonb,
ADD COLUMN hipaa_mode boolean NOT NULL DEFAULT false;

-- ==========================================
-- FOOD MODULE TABLES
-- ==========================================

-- Menu items table
CREATE TABLE IF NOT EXISTS public.menu_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  category text,
  price_cents integer,
  is_available boolean NOT NULL DEFAULT true,
  dietary_tags text[] DEFAULT ARRAY[]::text[],
  prep_time_minutes integer,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Menu documents for PDF storage
CREATE TABLE IF NOT EXISTS public.menu_documents (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_url text,
  parsed_text text,
  parsed_json jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Food orders table
CREATE TABLE IF NOT EXISTS public.food_orders (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES public.customers(id),
  order_number text NOT NULL,
  status order_status NOT NULL DEFAULT 'pending',
  order_type text NOT NULL DEFAULT 'pickup', -- pickup, delivery, dine_in
  items_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  subtotal_cents integer,
  tax_cents integer,
  total_cents integer,
  special_instructions text,
  scheduled_at timestamp with time zone,
  customer_name text,
  customer_phone text,
  delivery_address text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Reservations table
CREATE TABLE IF NOT EXISTS public.reservations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES public.customers(id),
  status reservation_status NOT NULL DEFAULT 'pending',
  party_size integer NOT NULL DEFAULT 2,
  reservation_date date NOT NULL,
  reservation_time time without time zone NOT NULL,
  customer_name text NOT NULL,
  customer_phone text,
  customer_email text,
  special_requests text,
  table_preference text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Catering requests table
CREATE TABLE IF NOT EXISTS public.catering_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES public.customers(id),
  status text NOT NULL DEFAULT 'inquiry', -- inquiry, quoted, confirmed, completed, cancelled
  event_date date,
  event_time time without time zone,
  guest_count integer,
  event_type text,
  location text,
  budget_range text,
  menu_preferences text,
  dietary_restrictions text,
  customer_name text NOT NULL,
  customer_phone text,
  customer_email text,
  notes text,
  quote_amount_cents integer,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ==========================================
-- DISPATCH MODULE TABLES
-- ==========================================

-- Dispatch jobs table
CREATE TABLE IF NOT EXISTS public.dispatch_jobs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES public.customers(id),
  job_number text NOT NULL,
  status dispatch_status NOT NULL DEFAULT 'pending',
  priority dispatch_priority NOT NULL DEFAULT 'normal',
  
  -- Location info
  pickup_address text,
  pickup_lat numeric,
  pickup_lng numeric,
  dropoff_address text,
  dropoff_lat numeric,
  dropoff_lng numeric,
  
  -- Assignment
  assigned_crew text,
  assigned_vehicle text,
  
  -- Timing
  requested_at timestamp with time zone,
  scheduled_at timestamp with time zone,
  dispatched_at timestamp with time zone,
  arrived_at timestamp with time zone,
  completed_at timestamp with time zone,
  
  -- Details
  job_type text,
  description text,
  customer_name text,
  customer_phone text,
  estimated_duration_minutes integer,
  price_cents integer,
  notes text,
  
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ==========================================
-- MEDICAL MODULE TABLES
-- ==========================================

-- Medical settings per tenant (HIPAA controls)
CREATE TABLE IF NOT EXISTS public.medical_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL UNIQUE REFERENCES public.tenants(id) ON DELETE CASCADE,
  store_transcripts boolean NOT NULL DEFAULT false,
  store_recordings boolean NOT NULL DEFAULT false,
  retention_days integer NOT NULL DEFAULT 30,
  require_verbal_consent boolean NOT NULL DEFAULT true,
  intake_fields_json jsonb DEFAULT '[]'::jsonb,
  scheduling_rules_json jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Medical intakes (minimal PHI storage)
CREATE TABLE IF NOT EXISTS public.medical_intakes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES public.customers(id),
  call_session_id uuid REFERENCES public.ai_call_sessions(id),
  
  -- Structured intake fields only (no full transcript by default)
  intake_type text, -- new_patient, follow_up, prescription_refill, appointment_request
  urgency_level text, -- routine, soon, urgent
  reason_for_visit text,
  preferred_date date,
  preferred_time_range text,
  insurance_provider text,
  
  -- Summary only (not full transcript)
  ai_summary text,
  
  -- Consent tracking
  verbal_consent_given boolean DEFAULT false,
  consent_timestamp timestamp with time zone,
  
  -- Status
  status text NOT NULL DEFAULT 'pending', -- pending, scheduled, completed, cancelled
  
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ==========================================
-- ENABLE RLS ON ALL NEW TABLES
-- ==========================================

ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.food_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catering_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dispatch_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medical_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medical_intakes ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- RLS POLICIES - MENU ITEMS
-- ==========================================
DROP POLICY IF EXISTS "Users can view tenant menu items" ON public.menu_items;
CREATE POLICY "Users can view tenant menu items"
  ON public.menu_items FOR SELECT
USING (has_tenant_access(auth.uid(), tenant_id));

DROP POLICY IF EXISTS "Owners can manage menu items" ON public.menu_items;
CREATE POLICY "Owners can manage menu items"
  ON public.menu_items FOR ALL
USING (
  tenant_id IN (
    SELECT tenant_id FROM tenant_users 
    WHERE user_id = auth.uid() AND role = 'owner'
  ) OR has_role(auth.uid(), 'super_admin')
);

-- ==========================================
-- RLS POLICIES - MENU DOCUMENTS
-- ==========================================
DROP POLICY IF EXISTS "Users can view tenant menu documents" ON public.menu_documents;
CREATE POLICY "Users can view tenant menu documents"
  ON public.menu_documents FOR SELECT
USING (has_tenant_access(auth.uid(), tenant_id));

DROP POLICY IF EXISTS "Owners can manage menu documents" ON public.menu_documents;
CREATE POLICY "Owners can manage menu documents"
  ON public.menu_documents FOR ALL
USING (
  tenant_id IN (
    SELECT tenant_id FROM tenant_users 
    WHERE user_id = auth.uid() AND role = 'owner'
  ) OR has_role(auth.uid(), 'super_admin')
);

-- ==========================================
-- RLS POLICIES - FOOD ORDERS
-- ==========================================
DROP POLICY IF EXISTS "Users can view tenant food orders" ON public.food_orders;
CREATE POLICY "Users can view tenant food orders"
  ON public.food_orders FOR SELECT
USING (has_tenant_access(auth.uid(), tenant_id));

DROP POLICY IF EXISTS "Users can manage tenant food orders" ON public.food_orders;
CREATE POLICY "Users can manage tenant food orders"
  ON public.food_orders FOR ALL
USING (has_tenant_access(auth.uid(), tenant_id));

-- ==========================================
-- RLS POLICIES - RESERVATIONS
-- ==========================================
DROP POLICY IF EXISTS "Users can view tenant reservations" ON public.reservations;
CREATE POLICY "Users can view tenant reservations"
  ON public.reservations FOR SELECT
USING (has_tenant_access(auth.uid(), tenant_id));

DROP POLICY IF EXISTS "Users can manage tenant reservations" ON public.reservations;
CREATE POLICY "Users can manage tenant reservations"
  ON public.reservations FOR ALL
USING (has_tenant_access(auth.uid(), tenant_id));

-- ==========================================
-- RLS POLICIES - CATERING REQUESTS
-- ==========================================
DROP POLICY IF EXISTS "Users can view tenant catering requests" ON public.catering_requests;
CREATE POLICY "Users can view tenant catering requests"
  ON public.catering_requests FOR SELECT
USING (has_tenant_access(auth.uid(), tenant_id));

DROP POLICY IF EXISTS "Users can manage tenant catering requests" ON public.catering_requests;
CREATE POLICY "Users can manage tenant catering requests"
  ON public.catering_requests FOR ALL
USING (has_tenant_access(auth.uid(), tenant_id));

-- ==========================================
-- RLS POLICIES - DISPATCH JOBS
-- ==========================================
DROP POLICY IF EXISTS "Users can view tenant dispatch jobs" ON public.dispatch_jobs;
CREATE POLICY "Users can view tenant dispatch jobs"
  ON public.dispatch_jobs FOR SELECT
USING (has_tenant_access(auth.uid(), tenant_id));

DROP POLICY IF EXISTS "Users can manage tenant dispatch jobs" ON public.dispatch_jobs;
CREATE POLICY "Users can manage tenant dispatch jobs"
  ON public.dispatch_jobs FOR ALL
USING (has_tenant_access(auth.uid(), tenant_id));

-- ==========================================
-- RLS POLICIES - MEDICAL SETTINGS
-- ==========================================
DROP POLICY IF EXISTS "Users can view tenant medical settings" ON public.medical_settings;
CREATE POLICY "Users can view tenant medical settings"
  ON public.medical_settings FOR SELECT
USING (has_tenant_access(auth.uid(), tenant_id));

DROP POLICY IF EXISTS "Owners can manage medical settings" ON public.medical_settings;
CREATE POLICY "Owners can manage medical settings"
  ON public.medical_settings FOR ALL
USING (
  tenant_id IN (
    SELECT tenant_id FROM tenant_users 
    WHERE user_id = auth.uid() AND role = 'owner'
  ) OR has_role(auth.uid(), 'super_admin')
);

-- ==========================================
-- RLS POLICIES - MEDICAL INTAKES
-- ==========================================
DROP POLICY IF EXISTS "Users can view tenant medical intakes" ON public.medical_intakes;
CREATE POLICY "Users can view tenant medical intakes"
  ON public.medical_intakes FOR SELECT
USING (has_tenant_access(auth.uid(), tenant_id));

DROP POLICY IF EXISTS "Users can manage tenant medical intakes" ON public.medical_intakes;
CREATE POLICY "Users can manage tenant medical intakes"
  ON public.medical_intakes FOR ALL
USING (has_tenant_access(auth.uid(), tenant_id));

-- ==========================================
-- TRIGGERS FOR UPDATED_AT
-- ==========================================
DROP TRIGGER IF EXISTS update_menu_items_updated_at ON public.menu_items;
CREATE TRIGGER update_menu_items_updated_at
  BEFORE UPDATE ON public.menu_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_food_orders_updated_at ON public.food_orders;
CREATE TRIGGER update_food_orders_updated_at
  BEFORE UPDATE ON public.food_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_reservations_updated_at ON public.reservations;
CREATE TRIGGER update_reservations_updated_at
  BEFORE UPDATE ON public.reservations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_catering_requests_updated_at ON public.catering_requests;
CREATE TRIGGER update_catering_requests_updated_at
  BEFORE UPDATE ON public.catering_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_dispatch_jobs_updated_at ON public.dispatch_jobs;
CREATE TRIGGER update_dispatch_jobs_updated_at
  BEFORE UPDATE ON public.dispatch_jobs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_medical_settings_updated_at ON public.medical_settings;
CREATE TRIGGER update_medical_settings_updated_at
  BEFORE UPDATE ON public.medical_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_medical_intakes_updated_at ON public.medical_intakes;
CREATE TRIGGER update_medical_intakes_updated_at
  BEFORE UPDATE ON public.medical_intakes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();