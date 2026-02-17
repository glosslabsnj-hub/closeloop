-- Agency Layer + Service Intelligence Migration
-- Phase 1: Add missing service intelligence fields
-- Phase 2: Create agency_accounts and agency_tenants tables

-- ============================================================
-- PHASE 1: SERVICE INTELLIGENCE (remaining fields)
-- ============================================================

-- Add payment_timing and required_booking_fields to services
-- (booking_type, prerequisite_note, duration_min/max, complexity, price_factors already exist)
ALTER TABLE services
  ADD COLUMN IF NOT EXISTS payment_timing text NOT NULL DEFAULT 'at_service',
  ADD COLUMN IF NOT EXISTS required_booking_fields text[] DEFAULT '{}';

-- Validate payment_timing values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'services_payment_timing_check'
  ) THEN
    ALTER TABLE services
      ADD CONSTRAINT services_payment_timing_check
      CHECK (payment_timing IN ('at_booking', 'at_service', 'deposit_then_balance', 'quote_first'));
  END IF;
END $$;

-- ============================================================
-- PHASE 2: AGENCY LAYER
-- ============================================================

-- Agency accounts table
CREATE TABLE IF NOT EXISTS agency_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  agency_name text NOT NULL,
  agency_slug text UNIQUE NOT NULL,
  branding_json jsonb DEFAULT '{}',
  billing_config_json jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Agency-managed tenants junction table
CREATE TABLE IF NOT EXISTS agency_tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES agency_accounts(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  status text DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'archived')),
  provisioned_at timestamptz DEFAULT now(),
  notes text,
  UNIQUE(agency_id, tenant_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_agency_accounts_user_id ON agency_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_agency_tenants_agency_id ON agency_tenants(agency_id);
CREATE INDEX IF NOT EXISTS idx_agency_tenants_tenant_id ON agency_tenants(tenant_id);

-- RLS for agency_accounts
ALTER TABLE agency_accounts ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'agency_owner_access' AND tablename = 'agency_accounts'
  ) THEN
    CREATE POLICY agency_owner_access ON agency_accounts
      FOR ALL USING (user_id = auth.uid());
  END IF;
END $$;

-- RLS for agency_tenants
ALTER TABLE agency_tenants ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'agency_tenant_access' AND tablename = 'agency_tenants'
  ) THEN
    CREATE POLICY agency_tenant_access ON agency_tenants
      FOR ALL USING (
        agency_id IN (SELECT id FROM agency_accounts WHERE user_id = auth.uid())
      );
  END IF;
END $$;

-- ============================================================
-- PHASE 2B: ROI SHARE TOKEN
-- ============================================================

-- Add share_token to tenant_revenue_settings for public ROI reports
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tenant_revenue_settings') THEN
    ALTER TABLE tenant_revenue_settings
      ADD COLUMN IF NOT EXISTS share_token uuid DEFAULT gen_random_uuid();
  END IF;
END $$;

-- Updated_at trigger for agency_accounts
CREATE OR REPLACE FUNCTION update_agency_accounts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_agency_accounts_updated_at ON agency_accounts;
CREATE TRIGGER trg_agency_accounts_updated_at
  BEFORE UPDATE ON agency_accounts
  FOR EACH ROW EXECUTE FUNCTION update_agency_accounts_updated_at();
