-- Add SMS consent tracking columns for A2P campaign compliance (TCPA)

-- Owner consent captured during onboarding
ALTER TABLE a2p_registrations ADD COLUMN IF NOT EXISTS owner_sms_consent boolean DEFAULT false;
ALTER TABLE a2p_registrations ADD COLUMN IF NOT EXISTS owner_sms_consent_at timestamptz;
ALTER TABLE a2p_registrations ADD COLUMN IF NOT EXISTS owner_sms_consent_ip text;

-- End-customer consent timestamp
ALTER TABLE customers ADD COLUMN IF NOT EXISTS sms_consent_at timestamptz;
