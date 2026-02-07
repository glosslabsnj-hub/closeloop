-- Add distance and pricing fields to dispatch_jobs for full context from check_service_area
ALTER TABLE public.dispatch_jobs 
ADD COLUMN IF NOT EXISTS dispatch_distance_miles numeric,
ADD COLUMN IF NOT EXISTS tow_distance_miles numeric,
ADD COLUMN IF NOT EXISTS total_distance_miles numeric,
ADD COLUMN IF NOT EXISTS service_tier text,
ADD COLUMN IF NOT EXISTS pricing_note text,
ADD COLUMN IF NOT EXISTS price_breakdown jsonb;

-- Add comment for documentation
COMMENT ON COLUMN public.dispatch_jobs.dispatch_distance_miles IS 'Distance from base to pickup location (miles)';
COMMENT ON COLUMN public.dispatch_jobs.tow_distance_miles IS 'Distance from pickup to dropoff location (miles)';
COMMENT ON COLUMN public.dispatch_jobs.total_distance_miles IS 'Total trip distance (miles)';
COMMENT ON COLUMN public.dispatch_jobs.service_tier IS 'Pricing tier: local, long_distance, or out_of_area';
COMMENT ON COLUMN public.dispatch_jobs.pricing_note IS 'Human-readable pricing summary from check_service_area';
COMMENT ON COLUMN public.dispatch_jobs.price_breakdown IS 'Detailed pricing breakdown JSON';