-- Migration: Add unique constraint on tenant_users
-- Date: 2026-02-03
-- Purpose: Enable ON CONFLICT DO NOTHING for idempotent membership creation

-- Add unique constraint to prevent duplicate tenant memberships
-- This allows the create-tenant edge function to use ON CONFLICT DO NOTHING
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'tenant_users_tenant_user_unique'
  ) THEN
    ALTER TABLE public.tenant_users
    ADD CONSTRAINT tenant_users_tenant_user_unique
    UNIQUE (tenant_id, user_id);
  END IF;
END $$;

-- Add index on user_id for efficient membership lookups
CREATE INDEX IF NOT EXISTS idx_tenant_users_user_id
ON public.tenant_users(user_id);
