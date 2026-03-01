
-- A2P 10DLC Registration tracking table
CREATE TABLE IF NOT EXISTS public.a2p_registrations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending_data' CHECK (status IN ('pending_data', 'pending_profile', 'pending_brand', 'pending_campaign', 'approved', 'failed')),
  
  -- Twilio resource SIDs
  customer_profile_sid TEXT,
  brand_sid TEXT,
  campaign_sid TEXT,
  messaging_service_sid TEXT,
  
  -- Business identity data (collected during onboarding)
  legal_business_name TEXT,
  ein TEXT, -- stored temporarily, ideally only in Twilio TrustHub
  entity_type TEXT CHECK (entity_type IN ('sole_proprietorship', 'llc', 'corporation', 'partnership', 'non_profit')),
  registration_state TEXT,
  street_address TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  contact_first_name TEXT,
  contact_last_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  website_url TEXT,
  
  -- Status tracking
  failure_reason TEXT,
  brand_score INTEGER, -- TCR brand score (affects throughput)
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  CONSTRAINT unique_tenant_a2p UNIQUE (tenant_id)
);

-- Enable RLS
ALTER TABLE public.a2p_registrations ENABLE ROW LEVEL SECURITY;

-- RLS policies: tenant-scoped access
DROP POLICY IF EXISTS "Users can view their own a2p registration" ON public.a2p_registrations;
CREATE POLICY "Users can view their own a2p registration"
  ON public.a2p_registrations FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can insert their own a2p registration" ON public.a2p_registrations;
CREATE POLICY "Users can insert their own a2p registration"
  ON public.a2p_registrations FOR INSERT
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can update their own a2p registration" ON public.a2p_registrations;
CREATE POLICY "Users can update their own a2p registration"
  ON public.a2p_registrations FOR UPDATE
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_a2p_registrations_updated_at ON public.a2p_registrations;
CREATE TRIGGER update_a2p_registrations_updated_at
  BEFORE UPDATE ON public.a2p_registrations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
