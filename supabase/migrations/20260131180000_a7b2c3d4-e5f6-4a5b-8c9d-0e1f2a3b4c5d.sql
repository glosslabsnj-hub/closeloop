-- Add pricing rules and busyness rules JSONB columns to tenants table
-- Purpose: Store pricing rules engine v1 configuration and busyness-based rule overrides
-- No demo data - empty arrays/objects by default

-- Add pricing_rules_jsonb column
ALTER TABLE public.tenants
ADD COLUMN pricing_rules_jsonb JSONB NOT NULL DEFAULT '[]'::JSONB;

-- Add busyness_rules_jsonb column
ALTER TABLE public.tenants
ADD COLUMN busyness_rules_jsonb JSONB NOT NULL DEFAULT '{}'::JSONB;

-- Add comments for documentation
COMMENT ON COLUMN public.tenants.pricing_rules_jsonb IS 'Pricing rules engine v1: Array of pricing rule objects (e.g., discounts, surge pricing, time-based rates). Each rule should have: rule_type, conditions, action, priority.';
COMMENT ON COLUMN public.tenants.busyness_rules_jsonb IS 'Busyness-based rule overrides: Object mapping busyness levels to pricing/booking rule modifications. Structure: { "low": {...}, "medium": {...}, "high": {...} }.';
