-- Drop the restrictive INSERT policy on tenants
DROP POLICY IF EXISTS "Authenticated users can create tenants during onboarding" ON public.tenants;

-- Create a permissive INSERT policy for onboarding
CREATE POLICY "Authenticated users can create tenants during onboarding" 
ON public.tenants 
FOR INSERT 
TO authenticated
WITH CHECK (
  NOT EXISTS (
    SELECT 1 FROM tenant_users WHERE tenant_users.user_id = auth.uid()
  )
);