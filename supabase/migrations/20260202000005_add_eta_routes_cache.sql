-- Add eta_routes_cache table for caching route calculations
-- HIPAA-safe: stores only hashed addresses, not raw strings

CREATE TABLE IF NOT EXISTS public.eta_routes_cache (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  origin_hash text NOT NULL,
  destination_hash text NOT NULL,
  distance_miles numeric,
  duration_minutes integer,
  confidence text CHECK (confidence IN ('high', 'medium', 'low')),
  provider text NOT NULL DEFAULT 'mapbox',
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days')
);

-- Unique index to prevent duplicate cache entries
CREATE UNIQUE INDEX IF NOT EXISTS idx_eta_routes_cache_unique
ON public.eta_routes_cache(tenant_id, origin_hash, destination_hash, provider);

-- Index for cache lookups
CREATE INDEX IF NOT EXISTS idx_eta_routes_cache_lookup
ON public.eta_routes_cache(tenant_id, origin_hash, destination_hash);

-- Index for TTL cleanup
CREATE INDEX IF NOT EXISTS idx_eta_routes_cache_expires
ON public.eta_routes_cache(expires_at);

-- Enable RLS
ALTER TABLE public.eta_routes_cache ENABLE ROW LEVEL SECURITY;

-- RLS policy: tenant users can view their cache entries
CREATE POLICY "Tenant users can view their route cache"
ON public.eta_routes_cache
FOR SELECT
USING (public.has_tenant_access(auth.uid(), tenant_id));

-- RLS policy: service role can manage all entries
CREATE POLICY "Service role can manage route cache"
ON public.eta_routes_cache
FOR ALL
USING (true)
WITH CHECK (true);

-- Add comment
COMMENT ON TABLE public.eta_routes_cache IS 'Cache for ETA route calculations. Stores hashed addresses only (HIPAA-safe). TTL: 7 days.';
COMMENT ON COLUMN public.eta_routes_cache.origin_hash IS 'SHA-256 hash of normalized origin address';
COMMENT ON COLUMN public.eta_routes_cache.destination_hash IS 'SHA-256 hash of normalized destination address';
COMMENT ON COLUMN public.eta_routes_cache.confidence IS 'Geocode/route confidence: high (address-level), medium (place-level), low (ambiguous)';
