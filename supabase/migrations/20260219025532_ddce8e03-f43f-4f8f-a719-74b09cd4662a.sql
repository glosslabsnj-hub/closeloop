
-- Admin saved leads (mirrors agency_saved_leads but keyed on user_id for super admins)
CREATE TABLE IF NOT EXISTS public.admin_saved_leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  website TEXT,
  address TEXT,
  industry TEXT,
  rating NUMERIC,
  review_count INTEGER,
  employee_estimate TEXT,
  hours TEXT,
  reason TEXT,
  friction_signals TEXT[] DEFAULT '{}',
  confidence TEXT,
  score NUMERIC,
  temperature TEXT,
  score_reasons TEXT[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'new',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, name, address)
);

ALTER TABLE public.admin_saved_leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own admin saved leads" ON public.admin_saved_leads;
CREATE POLICY "Users can manage their own admin saved leads"
  ON public.admin_saved_leads FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Admin reseller leads (same schema for reseller finder)
CREATE TABLE IF NOT EXISTS public.admin_reseller_leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  website TEXT,
  address TEXT,
  industry TEXT,
  rating NUMERIC,
  review_count INTEGER,
  employee_estimate TEXT,
  hours TEXT,
  reason TEXT,
  friction_signals TEXT[] DEFAULT '{}',
  confidence TEXT,
  score NUMERIC,
  temperature TEXT,
  score_reasons TEXT[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'new',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, name, address)
);

ALTER TABLE public.admin_reseller_leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own admin reseller leads" ON public.admin_reseller_leads;
CREATE POLICY "Users can manage their own admin reseller leads"
  ON public.admin_reseller_leads FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_admin_saved_leads_updated_at ON public.admin_saved_leads;
CREATE TRIGGER update_admin_saved_leads_updated_at
  BEFORE UPDATE ON public.admin_saved_leads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_admin_reseller_leads_updated_at ON public.admin_reseller_leads;
CREATE TRIGGER update_admin_reseller_leads_updated_at
  BEFORE UPDATE ON public.admin_reseller_leads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
