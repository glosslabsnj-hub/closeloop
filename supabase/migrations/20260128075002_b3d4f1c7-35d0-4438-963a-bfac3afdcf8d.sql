-- Drop the existing restrictive INSERT policy
DROP POLICY IF EXISTS "Authenticated users can create tenants during onboarding" ON public.tenants;

-- Create a PERMISSIVE INSERT policy for authenticated users during onboarding
CREATE POLICY "Authenticated users can create tenants during onboarding"
  ON public.tenants
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- User must not already have a tenant
    NOT EXISTS (
      SELECT 1 FROM tenant_users WHERE user_id = auth.uid()
    )
  );