
ALTER TABLE public.tenant_distance_settings
  ADD COLUMN IF NOT EXISTS dropoff_coverage_mode text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS dropoff_max_miles integer;

COMMENT ON COLUMN public.tenant_distance_settings.dropoff_coverage_mode IS 'none = no dropoff check, same_area = dropoff must be in service area, extended = dropoff can be up to dropoff_max_miles';
