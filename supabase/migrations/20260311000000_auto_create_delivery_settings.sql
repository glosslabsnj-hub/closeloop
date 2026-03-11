-- Phase 1: Auto-create delivery settings on tenant creation + backfill existing tenants
-- Fixes: notifications silently failing because delivery settings rows don't exist
-- Date: 2026-03-11

-- 1. Extend delivery_entity_type enum to include callback and job_update
-- These are used by universal-delivery but were missing from the enum,
-- causing delivery_attempts inserts to fail with a constraint violation.
ALTER TYPE public.delivery_entity_type ADD VALUE IF NOT EXISTS 'callback';
ALTER TYPE public.delivery_entity_type ADD VALUE IF NOT EXISTS 'job_update';

-- 2. Auto-create all delivery settings rows when a new tenant is created
-- This ensures notifications work out-of-the-box for every business.
CREATE OR REPLACE FUNCTION public.fn_auto_create_delivery_settings()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Universal delivery settings (callbacks, reservations, catering, intakes, job updates)
  INSERT INTO universal_delivery_settings (tenant_id)
  VALUES (NEW.id)
  ON CONFLICT (tenant_id) DO NOTHING;

  -- Booking delivery settings
  INSERT INTO booking_delivery_settings (tenant_id, enabled, handoff_methods)
  VALUES (NEW.id, true, '["internal"]'::jsonb)
  ON CONFLICT (tenant_id) DO NOTHING;

  -- Dispatch delivery settings
  INSERT INTO dispatch_delivery_settings (tenant_id, enabled, handoff_methods)
  VALUES (NEW.id, true, '["internal"]'::jsonb)
  ON CONFLICT (tenant_id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Create the trigger (drop first if exists from prior attempts)
DROP TRIGGER IF EXISTS trg_auto_create_delivery_settings ON public.tenants;
CREATE TRIGGER trg_auto_create_delivery_settings
  AFTER INSERT ON public.tenants
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_auto_create_delivery_settings();

-- 3. Backfill: create missing settings for ALL existing tenants
-- This fixes every tenant that signed up before this migration.
INSERT INTO universal_delivery_settings (tenant_id)
SELECT id FROM tenants
WHERE id NOT IN (SELECT tenant_id FROM universal_delivery_settings)
ON CONFLICT (tenant_id) DO NOTHING;

INSERT INTO booking_delivery_settings (tenant_id, enabled, handoff_methods)
SELECT id, true, '["internal"]'::jsonb FROM tenants
WHERE id NOT IN (SELECT tenant_id FROM booking_delivery_settings)
ON CONFLICT (tenant_id) DO NOTHING;

INSERT INTO dispatch_delivery_settings (tenant_id, enabled, handoff_methods)
SELECT id, true, '["internal"]'::jsonb FROM tenants
WHERE id NOT IN (SELECT tenant_id FROM dispatch_delivery_settings)
ON CONFLICT (tenant_id) DO NOTHING;
