-- Add new columns to tenants table for intensive onboarding
ALTER TABLE public.tenants 
ADD COLUMN IF NOT EXISTS tagline TEXT,
ADD COLUMN IF NOT EXISTS website_url TEXT,
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS service_area_json JSONB DEFAULT '{"type": "radius", "miles": 25}'::jsonb,
ADD COLUMN IF NOT EXISTS years_in_business INTEGER,
ADD COLUMN IF NOT EXISTS cancellation_policy TEXT,
ADD COLUMN IF NOT EXISTS deposit_policy TEXT,
ADD COLUMN IF NOT EXISTS refund_policy TEXT,
ADD COLUMN IF NOT EXISTS payment_methods TEXT[] DEFAULT ARRAY['cash', 'card']::TEXT[],
ADD COLUMN IF NOT EXISTS min_lead_hours INTEGER DEFAULT 24,
ADD COLUMN IF NOT EXISTS max_advance_days INTEGER DEFAULT 30,
ADD COLUMN IF NOT EXISTS appointment_buffer_minutes INTEGER DEFAULT 15,
ADD COLUMN IF NOT EXISTS closed_dates JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS ai_never_promise TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Add new columns to services table
ALTER TABLE public.services
ADD COLUMN IF NOT EXISTS preparation_instructions TEXT,
ADD COLUMN IF NOT EXISTS upsell_suggestions TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN IF NOT EXISTS deposit_required BOOLEAN DEFAULT false;

-- Create business_faqs table
CREATE TABLE IF NOT EXISTS public.business_faqs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  priority_weight INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on business_faqs
ALTER TABLE public.business_faqs ENABLE ROW LEVEL SECURITY;

-- RLS policies for business_faqs
DROP POLICY IF EXISTS "Users can view tenant FAQs" ON public.business_faqs;
CREATE POLICY "Users can view tenant FAQs"
  ON public.business_faqs
FOR SELECT
USING (has_tenant_access(auth.uid(), tenant_id));

DROP POLICY IF EXISTS "Owners can manage FAQs" ON public.business_faqs;
CREATE POLICY "Owners can manage FAQs"
  ON public.business_faqs
FOR ALL
USING (
  (tenant_id IN (
    SELECT tenant_users.tenant_id
    FROM tenant_users
    WHERE tenant_users.user_id = auth.uid() AND tenant_users.role = 'owner'::user_role
  )) OR has_role(auth.uid(), 'super_admin'::user_role)
);

-- Create objection_responses table
CREATE TABLE IF NOT EXISTS public.objection_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  objection TEXT NOT NULL,
  response TEXT NOT NULL,
  priority_weight INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on objection_responses
ALTER TABLE public.objection_responses ENABLE ROW LEVEL SECURITY;

-- RLS policies for objection_responses
DROP POLICY IF EXISTS "Users can view tenant objection responses" ON public.objection_responses;
CREATE POLICY "Users can view tenant objection responses"
  ON public.objection_responses
FOR SELECT
USING (has_tenant_access(auth.uid(), tenant_id));

DROP POLICY IF EXISTS "Owners can manage objection responses" ON public.objection_responses;
CREATE POLICY "Owners can manage objection responses"
  ON public.objection_responses
FOR ALL
USING (
  (tenant_id IN (
    SELECT tenant_users.tenant_id
    FROM tenant_users
    WHERE tenant_users.user_id = auth.uid() AND tenant_users.role = 'owner'::user_role
  )) OR has_role(auth.uid(), 'super_admin'::user_role)
);