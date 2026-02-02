-- Create geocode_cache table for caching address-to-coordinates lookups
-- HIPAA-safe: stores only hashed addresses, not raw address strings

CREATE TABLE IF NOT EXISTS public.geocode_cache (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  address_hash text NOT NULL,
  lat numeric NOT NULL,
  lng numeric NOT NULL,
  confidence text NOT NULL DEFAULT 'medium' CHECK (confidence IN ('high', 'medium', 'low')),
  provider text NOT NULL DEFAULT 'mapbox',
  fetched_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Unique index to prevent duplicate cache entries per tenant + address + provider
CREATE UNIQUE INDEX IF NOT EXISTS idx_geocode_cache_unique
ON public.geocode_cache(tenant_id, address_hash, provider);

-- Index for cache lookups (fast tenant + address queries)
CREATE INDEX IF NOT EXISTS idx_geocode_cache_lookup
ON public.geocode_cache(tenant_id, address_hash);

-- Index for TTL-based cleanup (batch deletion of expired entries)
CREATE INDEX IF NOT EXISTS idx_geocode_cache_expires
ON public.geocode_cache(expires_at);

-- Enable RLS
ALTER TABLE public.geocode_cache ENABLE ROW LEVEL SECURITY;

-- Force RLS even for table owner (defense in depth)
ALTER TABLE public.geocode_cache FORCE ROW LEVEL SECURITY;

-- RLS policy: tenant members can read their own cache entries
CREATE POLICY tenant_geocode_cache_select
ON public.geocode_cache
FOR SELECT
TO authenticated
USING (public.is_tenant_member(tenant_id));

-- RLS policy: tenant members can insert their own cache entries
CREATE POLICY tenant_geocode_cache_insert
ON public.geocode_cache
FOR INSERT
TO authenticated
WITH CHECK (public.is_tenant_member(tenant_id));

-- RLS policy: tenant members can delete their own cache entries
CREATE POLICY tenant_geocode_cache_delete
ON public.geocode_cache
FOR DELETE
TO authenticated
USING (public.is_tenant_member(tenant_id));

-- Add comments
COMMENT ON TABLE public.geocode_cache IS 'Cache for address-to-coordinate geocoding. Stores hashed addresses only (HIPAA-safe). TTL: 30 days.';
COMMENT ON COLUMN public.geocode_cache.address_hash IS 'SHA-256 hash of normalized address string';
COMMENT ON COLUMN public.geocode_cache.lat IS 'Geocoded latitude';
COMMENT ON COLUMN public.geocode_cache.lng IS 'Geocoded longitude';
COMMENT ON COLUMN public.geocode_cache.confidence IS 'Geocode confidence: high (address-level), medium (place-level), low (ambiguous)';
COMMENT ON COLUMN public.geocode_cache.provider IS 'Geocoding provider used (mapbox, google, etc.)';
COMMENT ON COLUMN public.geocode_cache.fetched_at IS 'Timestamp when geocode was fetched from provider';
COMMENT ON COLUMN public.geocode_cache.expires_at IS 'Expiration time for cache entry (TTL)';
