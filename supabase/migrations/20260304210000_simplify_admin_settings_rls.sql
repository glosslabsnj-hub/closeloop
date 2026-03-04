-- Simplify admin_settings RLS: remove has_role() dependency.
--
-- Root cause: has_role() queries user_roles which may have its own RLS,
-- creating a circular dependency that causes 42501 on INSERT.
-- The admin_settings table is user-scoped (UNIQUE on user_id), so
-- user_id = auth.uid() is sufficient — each user can only touch their own row.
-- Non-admin users having a row here is harmless (it stores UI preferences).

-- Drop the split policies from previous migration
DROP POLICY IF EXISTS "admin_settings_select" ON public.admin_settings;
DROP POLICY IF EXISTS "admin_settings_insert" ON public.admin_settings;
DROP POLICY IF EXISTS "admin_settings_update" ON public.admin_settings;
DROP POLICY IF EXISTS "admin_settings_delete" ON public.admin_settings;
-- Drop original policy name in case it still exists
DROP POLICY IF EXISTS "Super admins manage their own settings" ON public.admin_settings;

-- Single simple policy: users can manage their own row
CREATE POLICY "users_manage_own_admin_settings"
  ON public.admin_settings
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
