-- Commission payout tracking fields on agency_commissions
ALTER TABLE agency_commissions
  ADD COLUMN IF NOT EXISTS payout_method text,
  ADD COLUMN IF NOT EXISTS payout_reference text,
  ADD COLUMN IF NOT EXISTS payout_notes text,
  ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES auth.users(id);

-- Agency payout preferences + Stripe Connect scaffold
ALTER TABLE agency_accounts
  ADD COLUMN IF NOT EXISTS payout_config_json jsonb DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS stripe_connect_account_id text;
