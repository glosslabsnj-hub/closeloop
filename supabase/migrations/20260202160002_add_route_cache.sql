-- Create route_cache table for caching coordinate-based route calculations
-- Complements geocode_cache: first geocode address → lat/lng, then lookup route

CREATE TABLE IF NOT EXISTS public.route_cache (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  origin_lat numeric NOT NULL,
  origin_lng numeric NOT NULL,
  dest_lat numeric NOT NULL,
  dest_lng numeric NOT NULL,
  distance_miles numeric NOT NULL,
  drive_time_minutes numeric NOT NULL,
  provider text NOT NULL DEFAULT 'mapbox' CHECK (provider IN ('mapbox', 'google', 'osrm')),
  route_profile text NULL,
  fetched_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Unique index: tenant + origin + dest + provider + profile
-- Rounded to 4 decimal places (~11m precision) for cache hits on nearby coordinates
CREATE UNIQUE INDEX IF NOT EXISTS idx_route_cache_unique
ON public.route_cache(
  tenant_id,
  round(origin_lat::numeric, 4),
  round(origin_lng::numeric, 4),
  round(dest_lat::numeric, 4),
  round(dest_lng::numeric, 4),
  provider,
  COALESCE(route_profile, '')
);

-- Index for cache lookups
CREATE INDEX IF NOT EXISTS idx_route_cache_lookup
ON public.route_cache(
  tenant_id,
  round(origin_lat::numeric, 4),
  round(origin_lng::numeric, 4),
  round(dest_lat::numeric, 4),
  round(dest_lng::numeric, 4)
);

-- Index for TTL-based cleanup
CREATE INDEX IF NOT EXISTS idx_route_cache_expires
ON public.route_cache(expires_at);

-- Enable RLS
ALTER TABLE public.route_cache ENABLE ROW LEVEL SECURITY;

-- Force RLS even for table owner (defense in depth)
ALTER TABLE public.route_cache FORCE ROW LEVEL SECURITY;

-- RLS policy: tenant members can read their own cache entries
CREATE POLICY tenant_route_cache_select
ON public.route_cache
FOR SELECT
TO authenticated
USING (public.is_tenant_member(tenant_id));

-- RLS policy: tenant members can insert their own cache entries
CREATE POLICY tenant_route_cache_insert
ON public.route_cache
FOR INSERT
TO authenticated
WITH CHECK (public.is_tenant_member(tenant_id));

-- RLS policy: tenant members can delete their own cache entries
CREATE POLICY tenant_route_cache_delete
ON public.route_cache
FOR DELETE
TO authenticated
USING (public.is_tenant_member(tenant_id));

-- Add comments
COMMENT ON TABLE public.route_cache IS 'Cache for coordinate-based route calculations. Uses lat/lng with 4 decimal precision (~11m). TTL: 7 days.';
COMMENT ON COLUMN public.route_cache.origin_lat IS 'Origin latitude';
COMMENT ON COLUMN public.route_cache.origin_lng IS 'Origin longitude';
COMMENT ON COLUMN public.route_cache.dest_lat IS 'Destination latitude';
COMMENT ON COLUMN public.route_cache.dest_lng IS 'Destination longitude';
COMMENT ON COLUMN public.route_cache.distance_miles IS 'Route distance in miles';
COMMENT ON COLUMN public.route_cache.drive_time_minutes IS 'Estimated drive time in minutes';
COMMENT ON COLUMN public.route_cache.provider IS 'Routing provider: mapbox, google, osrm';
COMMENT ON COLUMN public.route_cache.route_profile IS 'Provider-specific route profile (e.g., mapbox/driving-traffic)';
COMMENT ON COLUMN public.route_cache.fetched_at IS 'Timestamp when route was fetched from provider';
COMMENT ON COLUMN public.route_cache.expires_at IS 'Expiration time for cache entry (TTL)';
