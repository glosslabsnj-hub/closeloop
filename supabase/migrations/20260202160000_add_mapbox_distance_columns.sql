-- Add Mapbox distance + ETA columns to tenants table
-- These columns enable distance-aware ETA calculations via Mapbox routing API

-- Base coordinates for tenant's business location (geocoded from address)
ALTER TABLE public.tenants
ADD COLUMN IF NOT EXISTS base_lat numeric NULL;

ALTER TABLE public.tenants
ADD COLUMN IF NOT EXISTS base_lng numeric NULL;

COMMENT ON COLUMN public.tenants.base_lat IS 'Geocoded latitude of business base address';
COMMENT ON COLUMN public.tenants.base_lng IS 'Geocoded longitude of business base address';

-- Distance provider configuration
ALTER TABLE public.tenants
ADD COLUMN IF NOT EXISTS distance_provider text NOT NULL DEFAULT 'mapbox';

ALTER TABLE public.tenants
ADD COLUMN IF NOT EXISTS mapbox_route_profile text NOT NULL DEFAULT 'mapbox/driving-traffic';

ALTER TABLE public.tenants
ADD COLUMN IF NOT EXISTS distance_provider_enabled boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.tenants.distance_provider IS 'Distance routing provider: mapbox, google, osrm, none';
COMMENT ON COLUMN public.tenants.mapbox_route_profile IS 'Mapbox routing profile: mapbox/driving, mapbox/driving-traffic, mapbox/walking, mapbox/cycling';
COMMENT ON COLUMN public.tenants.distance_provider_enabled IS 'Whether distance-based ETA is enabled for this tenant';

-- ETA estimation parameters
ALTER TABLE public.tenants
ADD COLUMN IF NOT EXISTS eta_base_minutes integer NOT NULL DEFAULT 0;

ALTER TABLE public.tenants
ADD COLUMN IF NOT EXISTS eta_per_mile_minutes numeric NOT NULL DEFAULT 0;

ALTER TABLE public.tenants
ADD COLUMN IF NOT EXISTS eta_min_minutes integer NULL;

ALTER TABLE public.tenants
ADD COLUMN IF NOT EXISTS eta_max_minutes integer NULL;

COMMENT ON COLUMN public.tenants.eta_base_minutes IS 'Base prep time added to all ETAs (in minutes)';
COMMENT ON COLUMN public.tenants.eta_per_mile_minutes IS 'Additional minutes per mile for ETA calculation';
COMMENT ON COLUMN public.tenants.eta_min_minutes IS 'Minimum ETA floor (optional)';
COMMENT ON COLUMN public.tenants.eta_max_minutes IS 'Maximum ETA cap (optional)';

-- Add constraint for valid distance providers
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tenants_distance_provider_check'
  ) THEN
    ALTER TABLE public.tenants
    ADD CONSTRAINT tenants_distance_provider_check
    CHECK (distance_provider IN ('mapbox', 'google', 'osrm', 'none'));
  END IF;
END $$;

-- Add constraint for valid mapbox route profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tenants_mapbox_route_profile_check'
  ) THEN
    ALTER TABLE public.tenants
    ADD CONSTRAINT tenants_mapbox_route_profile_check
    CHECK (mapbox_route_profile IN (
      'mapbox/driving',
      'mapbox/driving-traffic',
      'mapbox/walking',
      'mapbox/cycling'
    ));
  END IF;
END $$;
