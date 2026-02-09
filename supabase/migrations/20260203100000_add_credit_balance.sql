-- Add credit balance for prepaid top-ups
-- This allows tenants to pre-purchase credits to cover overage charges

ALTER TABLE public.subscriptions
ADD COLUMN IF NOT EXISTS credit_balance_cents integer DEFAULT 0;

COMMENT ON COLUMN public.subscriptions.credit_balance_cents IS
  'Prepaid credit balance in cents. Consumed before overage charges apply.';

-- Add Stripe subscription item ID for metered billing
-- This is the subscription item used for reporting overage usage to Stripe
ALTER TABLE public.subscriptions
ADD COLUMN IF NOT EXISTS stripe_subscription_item_id text;

COMMENT ON COLUMN public.subscriptions.stripe_subscription_item_id IS
  'Stripe subscription item ID for metered overage billing.';

-- Add last_usage_alert_sent to track when we last notified user
ALTER TABLE public.subscription_usage
ADD COLUMN IF NOT EXISTS last_alert_threshold integer DEFAULT NULL;

COMMENT ON COLUMN public.subscription_usage.last_alert_threshold IS
  'Last usage alert threshold sent (80 or 100). Prevents duplicate alerts.';
