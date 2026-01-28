-- Fix the overly permissive INSERT policy on tenants
DROP POLICY IF EXISTS "Authenticated users can create tenants during onboarding" ON public.tenants;

-- Create a more restrictive INSERT policy - users can only create a tenant if they don't have one yet
CREATE POLICY "Authenticated users can create tenants during onboarding"
  ON public.tenants
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- User must not already be associated with any tenant
    NOT EXISTS (
      SELECT 1 FROM tenant_users WHERE user_id = auth.uid()
    )
  );