-- Fix has_tenant_access to allow super_admin users to access any tenant.
-- Previously, admin users switching tenants via AdminTenantSwitcher
-- were blocked by RLS because they weren't in tenant_users for the target tenant.
-- This caused "new row violates row-level security policy" errors on
-- opportunities, customers, and other tenant-scoped tables.

CREATE OR REPLACE FUNCTION public.has_tenant_access(_user_id UUID, _tenant_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tenant_users
    WHERE user_id = _user_id
      AND tenant_id = _tenant_id
  )
  OR EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'super_admin'
  );
$$;
