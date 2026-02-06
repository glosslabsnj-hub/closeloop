-- Add geocode_provider column to tenant_distance_settings
-- This allows dispatch/towing businesses to use HERE for better cross-street/route handling
ALTER TABLE public.tenant_distance_settings
ADD COLUMN IF NOT EXISTS geocode_provider text NOT NULL DEFAULT 'mapbox';

-- Add comment for documentation
COMMENT ON COLUMN public.tenant_distance_settings.geocode_provider IS 
'Geocoding provider: mapbox (default for most), here (better for dispatch/towing with cross-streets, routes, mile markers)';

-- Auto-set HERE as default geocode_provider for dispatch tenants
UPDATE public.tenant_distance_settings tds
SET geocode_provider = 'here'
FROM public.tenants t
WHERE tds.tenant_id = t.id
AND t.business_mode = 'dispatch';