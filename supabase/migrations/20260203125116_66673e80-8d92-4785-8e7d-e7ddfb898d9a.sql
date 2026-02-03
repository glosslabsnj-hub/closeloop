-- Phase 1: Add dispatch pricing support to services table
-- Add JSONB column for complex dispatch pricing configuration
ALTER TABLE services 
ADD COLUMN IF NOT EXISTS pricing_config_json JSONB DEFAULT NULL;

-- Add service category for grouping (e.g., "towing", "roadside", "add-ons")
ALTER TABLE services 
ADD COLUMN IF NOT EXISTS service_category TEXT DEFAULT NULL;

-- Add service type for presets (e.g., "local_tow", "jump_start", "fuel_delivery")
ALTER TABLE services 
ADD COLUMN IF NOT EXISTS service_type TEXT DEFAULT NULL;

-- Add display order for custom sorting within categories
ALTER TABLE services 
ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;

COMMENT ON COLUMN services.pricing_config_json IS 'Complex pricing configuration for dispatch services: distance tiers, vehicle modifiers, etc.';
COMMENT ON COLUMN services.service_category IS 'Category for grouping services: towing, roadside, recovery, add-ons';
COMMENT ON COLUMN services.service_type IS 'Preset service type for quick setup: local_tow, long_distance_tow, jump_start, lockout, tire_change, fuel_delivery, winch_out';
COMMENT ON COLUMN services.display_order IS 'Custom sort order within category';