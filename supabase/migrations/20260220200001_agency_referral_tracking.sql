-- Track how agency tenants were linked
ALTER TABLE agency_tenants
  ADD COLUMN IF NOT EXISTS referral_source text DEFAULT 'manual';
