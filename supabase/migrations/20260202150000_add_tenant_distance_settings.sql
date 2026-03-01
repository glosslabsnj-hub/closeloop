-- Migration: Add tenant_distance_settings table for Distance-aware ETA
-- Date: 2026-02-02
-- Purpose: Enable tenant-configurable driving distance/time computation for ETA calculations

-- ============================================================================
-- TABLE: tenant_distance_settings
-- ============================================================================
-- Business Brain settings table for distance-based ETA configuration.
-- Allows tenants to configure how driving distance/time is computed between
-- their base address and caller-provided addresses (pickup/delivery).

CREATE TABLE IF NOT EXISTS public.tenant_distance_settings (
  -- Primary key = tenant reference (one row per tenant)
  tenant_id uuid PRIMARY KEY REFERENCES public.tenants(id) ON DELETE CASCADE,

  -- Whether distance-based ETA is enabled for this tenant
  enabled boolean NOT NULL DEFAULT false,

  -- Distance provider to use (platform manages API keys)
  -- 'google' = Google Maps Distance Matrix API
  -- 'mapbox' = Mapbox Directions API (future)
  -- 'osrm' = Open Source Routing Machine (future)
  -- 'none' = Disabled, use fallback only
  provider text NOT NULL DEFAULT 'google'
    CHECK (provider IN ('google', 'mapbox', 'osrm', 'none')),

  -- Fallback behavior if provider fails or is unavailable
  -- 'none' = Return no distance estimate (let caller handle)
  -- 'per_mile' = Estimate based on straight-line distance × minutes_per_mile
  fallback_mode text NOT NULL DEFAULT 'none'
    CHECK (fallback_mode IN ('none', 'per_mile')),

  -- Minutes per mile for fallback estimation (when fallback_mode='per_mile')
  -- Default 2.0 assumes average urban driving speed of ~30 mph
  fallback_minutes_per_mile numeric NOT NULL DEFAULT 2.0
    CHECK (fallback_minutes_per_mile > 0 AND fallback_minutes_per_mile <= 10),

  -- Round computed ETA up to nearest N minutes (for cleaner customer communication)
  -- e.g., 5 means "23 minutes" becomes "25 minutes"
  eta_rounding_minutes integer NOT NULL DEFAULT 5
    CHECK (eta_rounding_minutes >= 1 AND eta_rounding_minutes <= 30),

  -- Maximum serviceable distance in miles (optional)
  -- If set, edge functions can reject requests beyond this radius
  -- NULL = no limit (tenant serves any distance)
  max_distance_miles numeric NULL
    CHECK (max_distance_miles IS NULL OR (max_distance_miles > 0 AND max_distance_miles <= 500)),

  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Add table comment for documentation
COMMENT ON TABLE public.tenant_distance_settings IS
  'Business Brain settings for distance-based ETA computation. One row per tenant.';

COMMENT ON COLUMN public.tenant_distance_settings.provider IS
  'Distance API provider (platform manages keys). Options: google, mapbox, osrm, none';

COMMENT ON COLUMN public.tenant_distance_settings.fallback_mode IS
  'Behavior when provider fails. none = no estimate, per_mile = straight-line estimate';

COMMENT ON COLUMN public.tenant_distance_settings.max_distance_miles IS
  'Optional service radius limit. NULL = unlimited range.';

-- ============================================================================
-- INDEX
-- ============================================================================
-- Primary key already provides index on tenant_id.
-- Add index on enabled for quick filtering of active distance configs.
CREATE INDEX IF NOT EXISTS idx_tenant_distance_settings_enabled
  ON public.tenant_distance_settings(enabled)
  WHERE enabled = true;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
-- Enable RLS with FORCE to ensure even table owner respects policies
ALTER TABLE public.tenant_distance_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_distance_settings FORCE ROW LEVEL SECURITY;

-- Drop existing policy if re-running migration
DROP POLICY IF EXISTS tenant_isolation_all ON public.tenant_distance_settings;

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
-- Uses existing update_updated_at_column() function from earlier migrations
DROP TRIGGER IF EXISTS update_tenant_distance_settings_updated_at ON public.tenant_distance_settings;
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
