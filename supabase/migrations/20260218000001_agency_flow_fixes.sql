-- Agency Flow Fixes Migration
-- 1. RLS policies for agency_applications (table has RLS enabled but zero policies)
-- 2. Add user_id column to agency_applications (links applicant to auth user)
-- 3. Add UNIQUE constraint on agency_commissions for idempotent upsert

-- ─── 1. RLS Policies for agency_applications ───

-- Admin can read all applications
CREATE POLICY "admin_select_agency_applications"
  ON agency_applications FOR SELECT
  USING (
    has_role(auth.uid(), 'super_admin')
    OR email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- Admin can update applications
CREATE POLICY "admin_update_agency_applications"
  ON agency_applications FOR UPDATE
  USING (has_role(auth.uid(), 'super_admin'));

-- ─── 2. Add user_id column to agency_applications ───

ALTER TABLE agency_applications
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);

CREATE INDEX IF NOT EXISTS idx_agency_applications_user_id
  ON agency_applications(user_id);

-- ─── 3. UNIQUE constraint on agency_commissions for upsert ───

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'agency_commissions_unique_invoice'
  ) THEN
    ALTER TABLE agency_commissions
      ADD CONSTRAINT agency_commissions_unique_invoice UNIQUE(agency_id, stripe_invoice_id);
  END IF;
END $$;
