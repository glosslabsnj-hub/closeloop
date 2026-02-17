
-- Agency accounts table
CREATE TABLE public.agency_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  agency_name text NOT NULL,
  agency_slug text NOT NULL UNIQUE,
  branding_json jsonb NOT NULL DEFAULT '{}',
  billing_config_json jsonb NOT NULL DEFAULT '{"commission_rate": 0.20}',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.agency_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own agency" ON public.agency_accounts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own agency" ON public.agency_accounts
  FOR UPDATE USING (auth.uid() = user_id);

-- Agency tenants (links agency to managed tenants)
CREATE TABLE public.agency_tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.agency_accounts(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'archived')),
  provisioned_at timestamptz NOT NULL DEFAULT now(),
  notes text,
  UNIQUE(agency_id, tenant_id)
);

ALTER TABLE public.agency_tenants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agency owners can view their tenants" ON public.agency_tenants
  FOR SELECT USING (
    agency_id IN (SELECT id FROM public.agency_accounts WHERE user_id = auth.uid())
  );

CREATE POLICY "Agency owners can insert tenants" ON public.agency_tenants
  FOR INSERT WITH CHECK (
    agency_id IN (SELECT id FROM public.agency_accounts WHERE user_id = auth.uid())
  );

CREATE POLICY "Agency owners can update their tenants" ON public.agency_tenants
  FOR UPDATE USING (
    agency_id IN (SELECT id FROM public.agency_accounts WHERE user_id = auth.uid())
  );

-- Agency commissions
CREATE TABLE public.agency_commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.agency_accounts(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  stripe_invoice_id text,
  invoice_amount_cents integer NOT NULL DEFAULT 0,
  commission_rate numeric NOT NULL DEFAULT 0.20,
  commission_cents integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed')),
  period_start timestamptz,
  period_end timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz
);

ALTER TABLE public.agency_commissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agency owners can view their commissions" ON public.agency_commissions
  FOR SELECT USING (
    agency_id IN (SELECT id FROM public.agency_accounts WHERE user_id = auth.uid())
  );
