
-- Agency Lead Searches (rate limiting)
CREATE TABLE public.agency_lead_searches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.agency_accounts(id) ON DELETE CASCADE,
  industry text NOT NULL,
  location text NOT NULL,
  result_count int NOT NULL DEFAULT 0,
  searched_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.agency_lead_searches ENABLE ROW LEVEL SECURITY;

-- RLS: agency users can only see their own searches
CREATE POLICY "Agency users can view own searches"
  ON public.agency_lead_searches FOR SELECT
  USING (agency_id IN (SELECT id FROM public.agency_accounts WHERE user_id = auth.uid()));

CREATE POLICY "Agency users can insert own searches"
  ON public.agency_lead_searches FOR INSERT
  WITH CHECK (agency_id IN (SELECT id FROM public.agency_accounts WHERE user_id = auth.uid()));

-- Agency Saved Leads
CREATE TABLE public.agency_saved_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.agency_accounts(id) ON DELETE CASCADE,
  name text NOT NULL,
  phone text,
  website text,
  address text,
  industry text,
  rating numeric,
  review_count int,
  employee_estimate text,
  hours text,
  reason text,
  friction_signals text[] DEFAULT '{}',
  confidence text,
  score int,
  temperature text,
  score_reasons text[] DEFAULT '{}',
  status text NOT NULL DEFAULT 'new',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(agency_id, name, address)
);

ALTER TABLE public.agency_saved_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agency users can view own saved leads"
  ON public.agency_saved_leads FOR SELECT
  USING (agency_id IN (SELECT id FROM public.agency_accounts WHERE user_id = auth.uid()));

CREATE POLICY "Agency users can insert own saved leads"
  ON public.agency_saved_leads FOR INSERT
  WITH CHECK (agency_id IN (SELECT id FROM public.agency_accounts WHERE user_id = auth.uid()));

CREATE POLICY "Agency users can update own saved leads"
  ON public.agency_saved_leads FOR UPDATE
  USING (agency_id IN (SELECT id FROM public.agency_accounts WHERE user_id = auth.uid()));

CREATE POLICY "Agency users can delete own saved leads"
  ON public.agency_saved_leads FOR DELETE
  USING (agency_id IN (SELECT id FROM public.agency_accounts WHERE user_id = auth.uid()));

-- Updated_at trigger
CREATE TRIGGER update_agency_saved_leads_updated_at
  BEFORE UPDATE ON public.agency_saved_leads
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Index for rate limit queries
CREATE INDEX idx_agency_lead_searches_agency_date 
  ON public.agency_lead_searches(agency_id, searched_at);
