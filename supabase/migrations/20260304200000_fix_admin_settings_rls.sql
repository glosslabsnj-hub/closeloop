-- Fix admin_settings RLS: Split FOR ALL into individual operation policies.
-- The previous single FOR ALL policy was failing on INSERT (42501) despite
-- SECURITY DEFINER has_role function. Separate policies are more reliable.

-- Drop old combined policy
DROP POLICY IF EXISTS "Super admins manage their own settings" ON public.admin_settings;

-- SELECT: super admin reads their own row
CREATE POLICY "admin_settings_select"
  ON public.admin_settings
  FOR SELECT
  USING (
    user_id = auth.uid() AND
    public.has_role(auth.uid(), 'super_admin')
  );

-- INSERT: super admin creates their own row
CREATE POLICY "admin_settings_insert"
  ON public.admin_settings
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid() AND
    public.has_role(auth.uid(), 'super_admin')
  );

-- UPDATE: super admin updates their own row
CREATE POLICY "admin_settings_update"
  ON public.admin_settings
  FOR UPDATE
  USING (
    user_id = auth.uid() AND
    public.has_role(auth.uid(), 'super_admin')
  )
  WITH CHECK (
    user_id = auth.uid() AND
    public.has_role(auth.uid(), 'super_admin')
  );

-- DELETE: super admin deletes their own row
CREATE POLICY "admin_settings_delete"
  ON public.admin_settings
  FOR DELETE
  USING (
    user_id = auth.uid() AND
    public.has_role(auth.uid(), 'super_admin')
  );
