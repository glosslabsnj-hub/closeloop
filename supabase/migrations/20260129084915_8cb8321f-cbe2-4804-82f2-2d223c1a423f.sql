-- Migrate industry column from enum to TEXT to support expanded industry catalog
-- This allows any industry slug from the catalog without enum constraints

-- First, alter the tenants table to change industry from enum to text
ALTER TABLE public.tenants 
  ALTER COLUMN industry TYPE TEXT 
  USING industry::TEXT;

-- Add a comment to document the change
COMMENT ON COLUMN public.tenants.industry IS 'Industry slug from the industry catalog (e.g., plumbing, auto_detailing). Migrated from enum to text to support 100+ industries.';

-- Note: We keep the old enum type in case other code references it, but the column is now text