-- Fix staff_members RLS policies to allow super_admin access
-- Bug: Super admins testing tenant views couldn't add/edit/delete team members
-- because RLS only checked tenant_users.role, not user_roles.role

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "staff_members_insert" ON public.staff_members;
DROP POLICY IF EXISTS "staff_members_update" ON public.staff_members;
DROP POLICY IF EXISTS "staff_members_delete" ON public.staff_members;

-- Recreate with super_admin bypass
CREATE POLICY "staff_members_insert"
  ON public.staff_members
  FOR INSERT WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM public.tenant_users
      WHERE user_id = auth.uid() AND role IN ('owner', 'manager')
    )
    OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'super_admin'
    )
  );

CREATE POLICY "staff_members_update"
  ON public.staff_members
  FOR UPDATE USING (
    tenant_id IN (
      SELECT tenant_id FROM public.tenant_users
      WHERE user_id = auth.uid() AND role IN ('owner', 'manager')
    )
    OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'super_admin'
    )
  );

CREATE POLICY "staff_members_delete"
  ON public.staff_members
  FOR DELETE USING (
    tenant_id IN (
      SELECT tenant_id FROM public.tenant_users
      WHERE user_id = auth.uid() AND role = 'owner'
    )
    OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'super_admin'
    )
  );
