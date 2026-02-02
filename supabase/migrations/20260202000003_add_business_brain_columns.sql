-- Add missing columns for Business Brain functionality
-- This fixes "failed to load" errors in Business Brain sections

-- Add pricing_rules_jsonb
ALTER TABLE public.tenants
ADD COLUMN IF NOT EXISTS pricing_rules_jsonb JSONB DEFAULT '{"rules": []}'::jsonb;

COMMENT ON COLUMN public.tenants.pricing_rules_jsonb IS 'Pricing rules configuration: { "rules": [{ "type": "flat|per-unit|tiered|distance-based|range-only|quote-only", "service_id": "uuid", "required_inputs": ["vehicle_type", "miles"], "config": {...} }] }';

-- Add busyness_rules_jsonb
ALTER TABLE public.tenants
ADD COLUMN IF NOT EXISTS busyness_rules_jsonb JSONB DEFAULT '{"base_prep_minutes": 30, "busy_buffer_minutes": 15, "manual_busyness_pct": 30}'::jsonb;

COMMENT ON COLUMN public.tenants.busyness_rules_jsonb IS 'Busyness/ETA rules: { "base_prep_minutes": number, "busy_buffer_minutes": number, "manual_busyness_pct": number (0-100) }';

-- Add ai_policies_json
ALTER TABLE public.tenants
ADD COLUMN IF NOT EXISTS ai_policies_json JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.tenants.ai_policies_json IS 'AI business policies for upselling, pricing negotiation, capacity management, recognition, and escalation';
