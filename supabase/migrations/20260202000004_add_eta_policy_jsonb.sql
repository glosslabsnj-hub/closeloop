-- Add eta_policy_jsonb column to tenants table
-- ETA policy configuration for deterministic ETA estimation

ALTER TABLE public.tenants
ADD COLUMN IF NOT EXISTS eta_policy_jsonb JSONB DEFAULT '{
  "default_range_minutes": { "min": 30, "max": 60 },
  "busyness_buffer_pct": 15,
  "holiday_buffer_pct": 10
}'::jsonb;

COMMENT ON COLUMN public.tenants.eta_policy_jsonb IS 'ETA policy configuration: { "default_range_minutes": { "min": number, "max": number }, "mode_overrides": { [mode]: { "range_minutes": {...} } }, "job_type_overrides": { [type]: { "range_minutes": {...} } }, "busyness_buffer_pct": 0-50, "holiday_buffer_pct": 0-50 }';
