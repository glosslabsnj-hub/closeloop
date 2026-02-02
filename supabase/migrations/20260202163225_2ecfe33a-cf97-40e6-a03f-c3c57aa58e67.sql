-- ============================================================================
-- MIGRATION: Add tenant_distance_settings table for Mapbox distance/ETA
-- ============================================================================
-- This table stores distance provider configuration for each tenant.
-- Used by: compute-distance-eta edge function, Business Brain UI
-- ============================================================================

-- Create the tenant_distance_settings table
CREATE TABLE IF NOT EXISTS public.tenant_distance_settings (
  tenant_id uuid PRIMARY KEY REFERENCES public.tenants(id) ON DELETE CASCADE,
  
  -- Master switch
  distance_provider_enabled boolean NOT NULL DEFAULT false,
  
  -- Provider (read-only in UI, always "mapbox" for now)
  provider text NOT NULL DEFAULT 'mapbox',
  
  -- Base coordinates (business location)
  base_lat numeric(10, 7) NULL,
  base_lng numeric(10, 7) NULL,
  base_place_name text NULL,
  
  -- Mapbox routing profile
  mapbox_route_profile text NOT NULL DEFAULT 'mapbox/driving-traffic',
  
  -- ETA calculation parameters
  eta_base_minutes integer NOT NULL DEFAULT 0,
  eta_per_mile_minutes numeric(5, 2) NULL,
  eta_min_minutes integer NULL,
  eta_max_minutes integer NULL,
  eta_rounding_minutes integer NOT NULL DEFAULT 5,
  
  -- Timestamps
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Add table comment
COMMENT ON TABLE public.tenant_distance_settings IS 'Stores Mapbox distance/ETA configuration per tenant';
COMMENT ON COLUMN public.tenant_distance_settings.distance_provider_enabled IS 'Master switch for distance-based ETA calculations';
COMMENT ON COLUMN public.tenant_distance_settings.base_lat IS 'Business base location latitude';
COMMENT ON COLUMN public.tenant_distance_settings.base_lng IS 'Business base location longitude';
COMMENT ON COLUMN public.tenant_distance_settings.base_place_name IS 'Human-readable name for the base location (from geocoding)';
COMMENT ON COLUMN public.tenant_distance_settings.mapbox_route_profile IS 'Mapbox routing profile: mapbox/driving-traffic, mapbox/driving, mapbox/walking, mapbox/cycling';
COMMENT ON COLUMN public.tenant_distance_settings.eta_base_minutes IS 'Base prep/response time added to all ETAs';
COMMENT ON COLUMN public.tenant_distance_settings.eta_per_mile_minutes IS 'Additional minutes per mile of distance';
COMMENT ON COLUMN public.tenant_distance_settings.eta_min_minutes IS 'Minimum ETA floor (clamp)';
COMMENT ON COLUMN public.tenant_distance_settings.eta_max_minutes IS 'Maximum ETA cap (clamp)';
COMMENT ON COLUMN public.tenant_distance_settings.eta_rounding_minutes IS 'Round ETA to nearest N minutes (default 5)';

-- Enable RLS
ALTER TABLE public.tenant_distance_settings ENABLE ROW LEVEL SECURITY;

-- Force RLS for table owner
ALTER TABLE public.tenant_distance_settings FORCE ROW LEVEL SECURITY;

-- Create tenant isolation policy (all operations)
CREATE POLICY "tenant_isolation_all"
  ON public.tenant_distance_settings
  FOR ALL
  TO authenticated
  USING (public.is_tenant_member(tenant_id))
  WITH CHECK (public.is_tenant_member(tenant_id));

-- Create updated_at trigger using existing function
CREATE TRIGGER update_tenant_distance_settings_updated_at
  BEFORE UPDATE ON public.tenant_distance_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_tenant_distance_settings_tenant_id 
  ON public.tenant_distance_settings(tenant_id);