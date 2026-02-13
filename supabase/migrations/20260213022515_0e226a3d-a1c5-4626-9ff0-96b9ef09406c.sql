
-- 1. Update is_tenant_member() with super admin bypass
CREATE OR REPLACE FUNCTION public.is_tenant_member(p_tenant_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RETURN false;
  END IF;

  -- Super admin bypass: can access all tenants
  IF EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = v_uid AND role = 'super_admin'
  ) THEN
    RETURN true;
  END IF;

  -- Regular tenant membership check
  IF to_regclass('public.tenant_users') IS NOT NULL THEN
    RETURN EXISTS (
      SELECT 1 FROM public.tenant_users
      WHERE tenant_id = p_tenant_id AND user_id = v_uid
    );
  END IF;

  IF to_regclass('public.tenant_memberships') IS NOT NULL THEN
    RETURN EXISTS (
      SELECT 1 FROM public.tenant_memberships
      WHERE tenant_id = p_tenant_id AND user_id = v_uid
    );
  END IF;

  RETURN false;
END;
$$;

-- 2. Add missing settings_json column to assistant_settings
ALTER TABLE public.assistant_settings
ADD COLUMN IF NOT EXISTS settings_json JSONB DEFAULT '{}';
