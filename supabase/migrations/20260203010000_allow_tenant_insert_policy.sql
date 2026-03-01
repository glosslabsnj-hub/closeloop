-- Migration: Add INSERT policy for tenant creation
-- Date: 2026-02-03
-- Purpose: Allow authenticated users to create new tenants
--
-- The existing tenant_isolation_all policy uses FOR ALL with is_tenant_member(id),
-- which blocks INSERT because the user has no membership before creating the tenant.
--
-- This adds a specific INSERT policy that allows authenticated users to create tenants.
-- Security is maintained because:
-- 1. User must be authenticated
-- 2. This only allows INSERT, not SELECT/UPDATE/DELETE of other tenants
-- 3. The membership link is created afterward via tenant_users

-- Add INSERT-specific policy for tenant creation
DROP POLICY IF EXISTS "Authenticated users can create tenants" ON public.tenants;
CREATE POLICY "Authenticated users can create tenants"
ON public.tenants
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Note: This policy is additive to tenant_isolation_all.
-- For INSERT operations, PostgreSQL will allow if ANY policy passes.
-- For SELECT/UPDATE/DELETE, tenant_isolation_all still enforces membership.
