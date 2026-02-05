-- Add geocoding enhancement columns to tenant_distance_settings
ALTER TABLE public.tenant_distance_settings 
ADD COLUMN IF NOT EXISTS base_state_hint text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS service_radius_miles numeric DEFAULT 50;

-- Add comment for documentation
COMMENT ON COLUMN public.tenant_distance_settings.base_state_hint IS 'State abbreviation (e.g., NJ, CA) to append to vague addresses for better geocoding accuracy';
COMMENT ON COLUMN public.tenant_distance_settings.service_radius_miles IS 'Maximum service radius in miles - used for proximity validation of geocoded addresses';