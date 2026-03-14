-- Add trial minute alert tracking columns to subscription_usage
ALTER TABLE subscription_usage
  ADD COLUMN IF NOT EXISTS trial_80pct_alerted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS trial_100pct_alerted boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN subscription_usage.trial_80pct_alerted IS 'True if owner was notified at 80% trial minute usage';
COMMENT ON COLUMN subscription_usage.trial_100pct_alerted IS 'True if owner was notified at 100% trial minute usage';
