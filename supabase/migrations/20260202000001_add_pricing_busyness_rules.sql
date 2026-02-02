-- Add pricing_rules_jsonb and busyness_rules_jsonb to tenants table

ALTER TABLE public.tenants
ADD COLUMN IF NOT EXISTS pricing_rules_jsonb JSONB DEFAULT '{"rules": []}'::jsonb;

ALTER TABLE public.tenants
ADD COLUMN IF NOT EXISTS busyness_rules_jsonb JSONB DEFAULT '{"base_prep_minutes": 30, "busy_buffer_minutes": 15, "manual_busyness_pct": 0}'::jsonb;

-- Comment explaining the structure
COMMENT ON COLUMN public.tenants.pricing_rules_jsonb IS 'Pricing rules configuration: { "rules": [{ "type": "flat|per-unit|tiered|distance-based|range-only|quote-only", "service_id": "uuid", "required_inputs": ["vehicle_type", "miles"], "config": {...} }] }';

COMMENT ON COLUMN public.tenants.busyness_rules_jsonb IS 'Busyness/ETA rules: { "base_prep_minutes": number, "busy_buffer_minutes": number, "manual_busyness_pct": number (0-100) }';
