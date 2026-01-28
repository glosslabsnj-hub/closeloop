-- Fix infinite recursion in RLS policies for public.tenant_users
-- Root cause: policies referenced tenant_users inside tenant_users policies, triggering recursion (42P17).

ALTER TABLE public.tenant_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners can manage tenant users" ON public.tenant_users;
DROP POLICY IF EXISTS "Users can insert themselves into tenants" ON public.tenant_users;
DROP POLICY IF EXISTS "Users can view tenant members" ON public.tenant_users;

-- Read: allow current user to read their own row and other members of their tenant.
-- We use the SECURITY DEFINER helper get_user_tenant_id(auth.uid()) instead of a self-referential subquery.
CREATE POLICY "Tenant members can view tenant users"
ON public.tenant_users
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR tenant_id = public.get_user_tenant_id(auth.uid())
  OR public.has_role(auth.uid(), 'super_admin'::public.user_role)
);

-- Insert: allow user to create their own membership row (used during signup bootstrap)
CREATE POLICY "Users can insert themselves into tenants"
ON public.tenant_users
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  OR public.has_role(auth.uid(), 'super_admin'::public.user_role)
);

-- Update/Delete: keep conservative (self-row only) to avoid accidental privilege escalation.
CREATE POLICY "Users can update their own tenant_user row"
ON public.tenant_users
FOR UPDATE
TO authenticated
USING (
  user_id = auth.uid()
  OR public.has_role(auth.uid(), 'super_admin'::public.user_role)
)
WITH CHECK (
  user_id = auth.uid()
  OR public.has_role(auth.uid(), 'super_admin'::public.user_role)
);

CREATE POLICY "Users can delete their own tenant_user row"
ON public.tenant_users
FOR DELETE
TO authenticated
USING (
  user_id = auth.uid()
  OR public.has_role(auth.uid(), 'super_admin'::public.user_role)
);
