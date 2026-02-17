-- Agency commissions ledger
-- Tracks commission earned by agencies on managed tenant invoices

CREATE TABLE IF NOT EXISTS agency_commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES agency_accounts(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  stripe_invoice_id text NOT NULL,
  invoice_amount_cents integer NOT NULL,
  commission_rate numeric(5,4) NOT NULL,  -- e.g. 0.2000 = 20%
  commission_cents integer NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','failed')),
  period_start timestamptz,
  period_end timestamptz,
  created_at timestamptz DEFAULT now(),
  paid_at timestamptz,
  UNIQUE(agency_id, stripe_invoice_id)
);

CREATE INDEX idx_agency_commissions_agency_id ON agency_commissions(agency_id);
CREATE INDEX idx_agency_commissions_status ON agency_commissions(status);

ALTER TABLE agency_commissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY agency_commission_owner ON agency_commissions
  FOR ALL USING (
    agency_id IN (SELECT id FROM agency_accounts WHERE user_id = auth.uid())
  );
