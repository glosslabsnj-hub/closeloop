-- Fix missing RLS policies that prevented onboarding from working
-- user_roles: users couldn't read their own role (broke super_admin detection)
-- tenant_users: users couldn't read their own memberships (broke tenant loading after onboarding)

-- Allow users to read their own role
CREATE POLICY "Users can read own role"
  ON public.user_roles
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Allow users to read their own tenant memberships
CREATE POLICY "Users can view own memberships"
  ON public.tenant_users
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Allow users to update their own tenant memberships
CREATE POLICY "Users can update own memberships"
  ON public.tenant_users
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
