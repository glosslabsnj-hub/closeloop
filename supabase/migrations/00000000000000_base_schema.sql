-- ============================================================================
-- Flux Receptionist: Base Schema
-- ============================================================================
-- This migration creates the foundational tables, enums, and functions that
-- were part of the original Lovable-generated schema. All subsequent migrations
-- (starting with 20260128...) assume these objects already exist.
--
-- ORDER: Extensions -> Enums -> Tables -> Functions -> RLS Policies
-- ============================================================================

-- ============================================================================
-- EXTENSIONS
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- ENUMS
-- ============================================================================

CREATE TYPE public.user_role AS ENUM ('owner', 'staff', 'super_admin', 'driver');

CREATE TYPE public.booking_status AS ENUM (
  'pending_deposit', 'confirmed', 'completed', 'canceled', 'no_show', 'pending'
);

CREATE TYPE public.lead_source AS ENUM (
  'missed_call', 'website_form', 'manual', 'referral', 'ai_call'
);

CREATE TYPE public.lead_status AS ENUM (
  'new', 'contacted', 'qualified', 'booked', 'lost', 'won'
);

CREATE TYPE public.channel_type AS ENUM ('sms', 'email', 'internal');
CREATE TYPE public.message_direction AS ENUM ('inbound', 'outbound');
CREATE TYPE public.message_status AS ENUM ('queued', 'sent', 'delivered', 'failed');

CREATE TYPE public.automation_trigger AS ENUM (
  'missed_call', 'new_lead', 'no_reply_10m', 'no_reply_24h',
  'booking_created', 'booking_completed'
);

CREATE TYPE public.price_type AS ENUM ('fixed', 'starting_at', 'quote_only');

CREATE TYPE public.industry_type AS ENUM (
  'detailing', 'hvac', 'plumber', 'medspa', 'dental', 'other'
);


-- ============================================================================
-- TABLES (all tables created first, before functions and RLS)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.tenants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  industry TEXT NOT NULL DEFAULT 'other',
  timezone TEXT NOT NULL DEFAULT 'America/New_York',
  phone_public TEXT,
  hours_json JSONB DEFAULT '{}'::jsonb,
  google_review_url TEXT,
  yelp_review_url TEXT,
  review_channel TEXT,
  review_delay_hours INTEGER,
  auto_send_reviews BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.tenant_users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role public.user_role NOT NULL DEFAULT 'owner',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  role public.user_role NOT NULL DEFAULT 'owner',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  source public.lead_source NOT NULL DEFAULT 'manual',
  status public.lead_status NOT NULL DEFAULT 'new',
  customer_id UUID,
  last_message_at TIMESTAMP WITH TIME ZONE,
  tags TEXT[],
  vehicle_or_context TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_leads_tenant ON public.leads(tenant_id);
CREATE INDEX IF NOT EXISTS idx_leads_phone ON public.leads(phone);
CREATE INDEX IF NOT EXISTS idx_leads_status ON public.leads(tenant_id, status);

CREATE TABLE IF NOT EXISTS public.services (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  price_amount NUMERIC,
  price_type public.price_type NOT NULL DEFAULT 'fixed',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
-- Note: tenant_id added by migration 20260202144500

CREATE TABLE IF NOT EXISTS public.bookings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
  start_at TIMESTAMP WITH TIME ZONE NOT NULL,
  end_at TIMESTAMP WITH TIME ZONE NOT NULL,
  status public.booking_status NOT NULL DEFAULT 'pending',
  deposit_required BOOLEAN NOT NULL DEFAULT false,
  deposit_paid BOOLEAN NOT NULL DEFAULT false,
  stripe_payment_intent_id TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bookings_tenant ON public.bookings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_bookings_lead ON public.bookings(lead_id);
CREATE INDEX IF NOT EXISTS idx_bookings_time ON public.bookings(tenant_id, start_at);

CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  channel public.channel_type NOT NULL DEFAULT 'sms',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_conversations_tenant ON public.conversations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_conversations_lead ON public.conversations(lead_id);

CREATE TABLE IF NOT EXISTS public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  direction public.message_direction NOT NULL,
  status public.message_status NOT NULL DEFAULT 'queued',
  meta_json JSONB,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_tenant ON public.messages(tenant_id);

CREATE TABLE IF NOT EXISTS public.automations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  trigger public.automation_trigger NOT NULL,
  steps_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_automations_tenant ON public.automations(tenant_id);

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  actor_user_id UUID,
  meta_json JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant ON public.audit_logs(tenant_id);

CREATE TABLE IF NOT EXISTS public.inventory_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  sku TEXT,
  category TEXT,
  unit_of_measure TEXT,
  unit_cost_cents INTEGER,
  sell_price_cents INTEGER,
  min_stock_level INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inventory_items_tenant ON public.inventory_items(tenant_id);

CREATE TABLE IF NOT EXISTS public.inventory_locations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT,
  location_type TEXT,
  assigned_user_id UUID,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inventory_locations_tenant ON public.inventory_locations(tenant_id);

CREATE TABLE IF NOT EXISTS public.inventory_stock (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES public.inventory_locations(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inventory_stock_tenant ON public.inventory_stock(tenant_id);
CREATE INDEX IF NOT EXISTS idx_inventory_stock_item ON public.inventory_stock(item_id);

CREATE TABLE IF NOT EXISTS public.inventory_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES public.inventory_locations(id) ON DELETE CASCADE,
  transaction_type TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  job_id UUID,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inventory_transactions_tenant ON public.inventory_transactions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_item ON public.inventory_transactions(item_id);

CREATE TABLE IF NOT EXISTS public.loyalty_programs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Loyalty Program',
  points_per_dollar INTEGER DEFAULT 1,
  points_for_signup INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(tenant_id)
);

CREATE INDEX IF NOT EXISTS idx_loyalty_programs_tenant ON public.loyalty_programs(tenant_id);

CREATE TABLE IF NOT EXISTS public.loyalty_rewards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  program_id UUID NOT NULL REFERENCES public.loyalty_programs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  points_required INTEGER NOT NULL,
  reward_type TEXT,
  reward_value_cents INTEGER,
  reward_percentage NUMERIC,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_loyalty_rewards_program ON public.loyalty_rewards(program_id);

CREATE TABLE IF NOT EXISTS public.loyalty_balances (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  program_id UUID NOT NULL REFERENCES public.loyalty_programs(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL,
  points_balance INTEGER NOT NULL DEFAULT 0,
  lifetime_points INTEGER NOT NULL DEFAULT 0,
  tier TEXT,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_loyalty_balances_customer ON public.loyalty_balances(customer_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_balances_program ON public.loyalty_balances(program_id);

CREATE TABLE IF NOT EXISTS public.loyalty_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  program_id UUID NOT NULL REFERENCES public.loyalty_programs(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL,
  transaction_type TEXT NOT NULL,
  points INTEGER NOT NULL,
  order_id UUID,
  reward_id UUID REFERENCES public.loyalty_rewards(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_customer ON public.loyalty_transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_program ON public.loyalty_transactions(program_id);


-- ============================================================================
-- HELPER FUNCTIONS (after tables, before RLS policies)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.has_tenant_access(_user_id UUID, _tenant_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tenant_users
    WHERE user_id = _user_id
      AND tenant_id = _tenant_id
  );
$$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.user_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
  OR
  EXISTS (
    SELECT 1 FROM public.tenant_users
    WHERE user_id = _user_id
      AND role = _role
  );
$$;

CREATE OR REPLACE FUNCTION public.is_tenant_member(p_tenant_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tenant_users
    WHERE user_id = auth.uid()
      AND tenant_id = p_tenant_id
  );
$$;

CREATE OR REPLACE FUNCTION public.normalize_phone_e164(phone TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  cleaned TEXT;
BEGIN
  cleaned := regexp_replace(phone, '[^0-9]', '', 'g');
  IF length(cleaned) = 10 THEN RETURN '+1' || cleaned; END IF;
  IF length(cleaned) = 11 AND cleaned LIKE '1%' THEN RETURN '+' || cleaned; END IF;
  IF length(cleaned) > 10 THEN RETURN '+' || cleaned; END IF;
  RETURN phone;
END;
$$;


-- ============================================================================
-- ROW LEVEL SECURITY (after tables AND functions both exist)
-- ============================================================================

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_transactions ENABLE ROW LEVEL SECURITY;

-- NOTE: RLS policies are NOT created here. The migrations create them progressively
-- and would conflict with any policies defined in the base schema. The migrations
-- handle all policy creation with proper DROP IF EXISTS / CREATE patterns.

-- ============================================================================
-- END OF BASE SCHEMA
-- ============================================================================
