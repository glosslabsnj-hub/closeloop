-- Track onboarding progress per agency-managed tenant
ALTER TABLE agency_tenants
  ADD COLUMN IF NOT EXISTS onboarding_status text DEFAULT 'provisioned'
    CHECK (onboarding_status IN ('provisioned','brain_setup','ai_ready','plan_selected','live')),
  ADD COLUMN IF NOT EXISTS onboarding_updated_at timestamptz;
