
-- Create demo_profiles table
CREATE TABLE public.demo_profiles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id uuid NOT NULL,
  owner_type text NOT NULL DEFAULT 'admin' CHECK (owner_type IN ('admin', 'agency')),
  agency_id uuid REFERENCES public.agency_accounts(id) ON DELETE SET NULL,
  business_name text NOT NULL,
  industry text NOT NULL DEFAULT 'general',
  business_mode text NOT NULL DEFAULT 'general' CHECK (business_mode IN ('service', 'dispatch', 'food', 'medical', 'general')),
  website_url text NOT NULL,
  address text,
  phone_extracted text,
  hours_json jsonb NOT NULL DEFAULT '{}',
  services_json jsonb NOT NULL DEFAULT '[]',
  faqs_json jsonb NOT NULL DEFAULT '[]',
  description text NOT NULL DEFAULT '',
  is_active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create demo_phone_numbers table
CREATE TABLE public.demo_phone_numbers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id uuid NOT NULL,
  owner_type text NOT NULL DEFAULT 'admin' CHECK (owner_type IN ('admin', 'agency')),
  phone_e164 text NOT NULL,
  twilio_sid text NOT NULL DEFAULT '',
  active_demo_profile_id uuid REFERENCES public.demo_profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(owner_id, owner_type)
);

-- Enable RLS
ALTER TABLE public.demo_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.demo_phone_numbers ENABLE ROW LEVEL SECURITY;

-- RLS for demo_profiles: owners see their own, super_admins see all
CREATE POLICY "Owners manage their demo profiles"
  ON public.demo_profiles FOR ALL
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Super admins manage all demo profiles"
  ON public.demo_profiles FOR ALL
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- RLS for demo_phone_numbers: owners see their own, super_admins see all
CREATE POLICY "Owners manage their demo phone numbers"
  ON public.demo_phone_numbers FOR ALL
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Super admins manage all demo phone numbers"
  ON public.demo_phone_numbers FOR ALL
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- Index for quick lookup by phone number (used in twilio-inbound)
CREATE INDEX idx_demo_phone_numbers_phone ON public.demo_phone_numbers(phone_e164);
CREATE INDEX idx_demo_profiles_owner ON public.demo_profiles(owner_id);
