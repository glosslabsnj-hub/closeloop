-- Migration: Create tenant_distance_settings table (if not exists)
-- Date: 2026-02-02
-- Purpose: Enable tenant-configurable distance/ETA computation settings
--
-- Schema verified:
--   - Tenants PK: id uuid
--   - Membership helper: public.is_tenant_member(p_tenant_id uuid)
--   - Trigger function: public.update_updated_at_column()

-- ============================================================================
-- TABLE: tenant_distance_settings
-- ============================================================================
-- Business Brain settings for distance-based ETA configuration.
-- One row per tenant, scoped via tenant_id FK.

CREATE TABLE IF NOT EXISTS public.tenant_distance_settings (
  -- Primary key = tenant reference (one row per tenant)
  tenant_id uuid PRIMARY KEY REFERENCES public.tenants(id) ON DELETE CASCADE,

  -- Master switch: is distance-based ETA enabled for this tenant?
  distance_provider_enabled boolean NOT NULL DEFAULT false,

  -- Distance provider (platform manages API keys via env vars)
  -- 'mapbox' = Mapbox Directions API (preferred)
  -- 'google' = Google Maps Distance Matrix API
  -- 'osrm' = Open Source Routing Machine (self-hosted)
  -- 'none' = Disabled, use fallback only
  provider text NOT NULL DEFAULT 'mapbox'
    CHECK (provider IN ('mapbox', 'google', 'osrm', 'none')),

  -- Tenant's base location coordinates (geocoded from address or manually set)
  base_lat numeric(10, 7) NULL,
  base_lng numeric(10, 7) NULL,
  base_place_name text NULL,

  -- Mapbox-specific routing profile
  mapbox_route_profile text NOT NULL DEFAULT 'mapbox/driving-traffic'
    CHECK (mapbox_route_profile IN (
      'mapbox/driving',
      'mapbox/driving-traffic',
      'mapbox/walking',
      'mapbox/cycling'
    )),

  -- ETA calculation parameters
  -- Formula: eta = drive_time + eta_base_minutes + (eta_per_mile_minutes * distance_miles)
  eta_base_minutes integer NOT NULL DEFAULT 0
    CHECK (eta_base_minutes >= 0 AND eta_base_minutes <= 120),

  eta_per_mile_minutes numeric(5, 2) NULL
    CHECK (eta_per_mile_minutes IS NULL OR (eta_per_mile_minutes >= 0 AND eta_per_mile_minutes <= 30)),

  -- ETA clamping (optional)
  eta_min_minutes integer NULL
    CHECK (eta_min_minutes IS NULL OR (eta_min_minutes >= 0 AND eta_min_minutes <= 300)),

  eta_max_minutes integer NULL
    CHECK (eta_max_minutes IS NULL OR (eta_max_minutes >= 1 AND eta_max_minutes <= 600)),

  -- Round computed ETA to nearest N minutes (cleaner communication)
  eta_rounding_minutes integer NOT NULL DEFAULT 5
    CHECK (eta_rounding_minutes >= 1 AND eta_rounding_minutes <= 30),

  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON TABLE public.tenant_distance_settings IS
  'Business Brain settings for distance-based ETA computation. One row per tenant.';

COMMENT ON COLUMN public.tenant_distance_settings.distance_provider_enabled IS
  'Master switch to enable/disable distance-based ETA for this tenant';

COMMENT ON COLUMN public.tenant_distance_settings.provider IS
  'Distance API provider (platform manages keys). Options: mapbox, google, osrm, none';

COMMENT ON COLUMN public.tenant_distance_settings.base_lat IS
  'Business base location latitude (WGS84). Used as origin for distance calculations.';

COMMENT ON COLUMN public.tenant_distance_settings.base_lng IS
  'Business base location longitude (WGS84). Used as origin for distance calculations.';

COMMENT ON COLUMN public.tenant_distance_settings.base_place_name IS
  'Human-readable name of base location (from geocoding or manually entered)';

COMMENT ON COLUMN public.tenant_distance_settings.mapbox_route_profile IS
  'Mapbox routing profile: driving, driving-traffic, walking, cycling';

COMMENT ON COLUMN public.tenant_distance_settings.eta_base_minutes IS
  'Base prep time added to all ETAs (e.g., order prep time, driver dispatch time)';

COMMENT ON COLUMN public.tenant_distance_settings.eta_per_mile_minutes IS
  'Additional minutes per mile (used in fallback or to adjust provider estimate)';

COMMENT ON COLUMN public.tenant_distance_settings.eta_min_minutes IS
  'Minimum ETA floor (NULL = no minimum)';

COMMENT ON COLUMN public.tenant_distance_settings.eta_max_minutes IS
  'Maximum ETA cap (NULL = no maximum)';

COMMENT ON COLUMN public.tenant_distance_settings.eta_rounding_minutes IS
  'Round computed ETA up to nearest N minutes (e.g., 5 means 23 min -> 25 min)';

-- ============================================================================
-- INDEXES
-- ============================================================================
-- Primary key already provides index on tenant_id.
-- Add partial index on distance_provider_enabled for quick filtering of active configs.
CREATE INDEX IF NOT EXISTS idx_tenant_distance_settings_enabled
  ON public.tenant_distance_settings(distance_provider_enabled)
  WHERE distance_provider_enabled = true;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
-- Enable RLS with FORCE to ensure even table owner respects policies
ALTER TABLE public.tenant_distance_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_distance_settings FORCE ROW LEVEL SECURITY;

-- Drop existing policies if re-running migration
DROP POLICY IF EXISTS tenant_isolation_all ON public.tenant_distance_settings;
DROP POLICY IF EXISTS tenant_distance_settings_select ON public.tenant_distance_settings;
DROP POLICY IF EXISTS tenant_distance_settings_insert ON public.tenant_distance_settings;
DROP POLICY IF EXISTS tenant_distance_settings_update ON public.tenant_distance_settings;
DROP POLICY IF EXISTS tenant_distance_settings_delete ON public.tenant_distance_settings;

-- Single comprehensive policy: tenant members can SELECT/INSERT/UPDATE/DELETE their own row
-- Uses is_tenant_member() which checks tenant_users membership
CREATE POLICY tenant_isolation_all
  ON public.tenant_distance_settings
  FOR ALL
  TO authenticated
  USING (public.is_tenant_member(tenant_id))
  WITH CHECK (public.is_tenant_member(tenant_id));

-- ============================================================================
-- TRIGGER: Auto-update updated_at on row modification
-- ============================================================================
DROP TRIGGER IF EXISTS update_tenant_distance_settings_updated_at
  ON public.tenant_distance_settings;

CREATE TRIGGER update_tenant_distance_settings_updated_at
  BEFORE UPDATE ON public.tenant_distance_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================
-- Authenticated users can access (RLS will filter to their tenant)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenant_distance_settings TO authenticated;

-- Service role bypasses RLS for edge functions
GRANT ALL ON public.tenant_distance_settings TO service_role;

-- ============================================================================
-- VERIFY MIGRATION
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'tenant_distance_settings'
  ) THEN
    RAISE NOTICE 'tenant_distance_settings table created successfully';
  ELSE
    RAISE EXCEPTION 'Failed to create tenant_distance_settings table';
  END IF;
END $$;
