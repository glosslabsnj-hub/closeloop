-- Fix: Allow authenticated users to create tenants
-- The previous policy blocked users who already had a tenant_users record
-- This was too restrictive - users should be able to create new businesses

-- Drop the existing overly-restrictive INSERT policy
DROP POLICY IF EXISTS "Authenticated users can create tenants during onboarding" ON public.tenants;

-- Create a simpler policy that allows any authenticated user to create a tenant
-- The tenant_users link will be created after, which determines ownership
DROP POLICY IF EXISTS "Authenticated users can create tenants" ON public.tenants;
CREATE POLICY "Authenticated users can create tenants"
  ON public.tenants
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Note: Security is maintained because:
-- 1. User must be authenticated
-- 2. The tenant_users table has its own RLS that controls who can link to which tenant
-- 3. Only the creator can add themselves as owner in tenant_users