-- Add pricing_rules_json column to tenants table
-- This stores an array of pricing rules with optional service_id for scoping

ALTER TABLE public.tenants
ADD COLUMN IF NOT EXISTS pricing_rules_json JSONB DEFAULT '[]'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN public.tenants.pricing_rules_json IS
'Array of pricing rules. Each rule has: id, name, description, type (surcharge/discount/fee),
amount, amount_type (percent/fixed), service_id (null for global, uuid for service-scoped),
is_active, created_at, updated_at';
