-- Stripe Overage Billing: new SKUs, credit balance, settlement tracking
-- Required for invoice.created webhook to charge overages on Stripe invoices

-- Add new SKUs to plan_code enum
ALTER TYPE public.plan_code ADD VALUE IF NOT EXISTS 'base-200';
ALTER TYPE public.plan_code ADD VALUE IF NOT EXISTS 'growth-2000';
ALTER TYPE public.plan_code ADD VALUE IF NOT EXISTS 'scale-5000';
ALTER TYPE public.plan_code ADD VALUE IF NOT EXISTS 'power-10000';
ALTER TYPE public.plan_code ADD VALUE IF NOT EXISTS 'enterprise';

-- Add missing credit_balance_cents column for prepaid credit top-ups
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS credit_balance_cents integer NOT NULL DEFAULT 0;

-- Add overage settlement tracking to subscription_usage
ALTER TABLE public.subscription_usage
  ADD COLUMN IF NOT EXISTS overage_settled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS settled_invoice_id text,
  ADD COLUMN IF NOT EXISTS overage_billed_cents integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS credit_applied_cents integer NOT NULL DEFAULT 0;

-- Index for fast unsettled usage lookups (used by invoice.created handler)
CREATE INDEX IF NOT EXISTS idx_subscription_usage_unsettled
  ON public.subscription_usage (tenant_id, overage_settled)
  WHERE overage_settled = false;
