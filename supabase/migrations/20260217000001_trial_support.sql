-- Trial support fields on subscriptions
-- Adds Stripe IDs and trial minute tracking

ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS stripe_customer_id text,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text,
  ADD COLUMN IF NOT EXISTS trial_minutes_limit integer DEFAULT 30,
  ADD COLUMN IF NOT EXISTS trial_started_at timestamptz;
