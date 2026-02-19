-- P0-3: Add 'manager' and 'viewer' to user_role enum
-- P0-5: Link staff_members to auth users via user_id FK

-- ============================================================================
-- 1. Extend user_role enum with manager and viewer
-- ============================================================================
-- Note: ALTER TYPE ... ADD VALUE cannot run inside a transaction in PostgreSQL.
-- Supabase migrations run each file as a single transaction by default, but
-- ADD VALUE is safe because it's idempotent (will error if value exists).
-- We use DO blocks with exception handling for safety.

DO $$
BEGIN
  ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'manager';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'viewer';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- 2. Add user_id column to staff_members for auth user linking
-- ============================================================================

ALTER TABLE staff_members
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Index for looking up staff by user_id
CREATE INDEX IF NOT EXISTS idx_staff_members_user_id
  ON staff_members(user_id)
  WHERE user_id IS NOT NULL;

-- Unique constraint: one user can only be one staff member per tenant
CREATE UNIQUE INDEX IF NOT EXISTS idx_staff_members_tenant_user
  ON staff_members(tenant_id, user_id)
  WHERE user_id IS NOT NULL;

-- ============================================================================
-- 3. Add invitation tracking columns to staff_members
-- ============================================================================

ALTER TABLE staff_members
  ADD COLUMN IF NOT EXISTS invite_email TEXT,
  ADD COLUMN IF NOT EXISTS invite_status TEXT DEFAULT 'none'
    CHECK (invite_status IN ('none', 'pending', 'accepted', 'expired')),
  ADD COLUMN IF NOT EXISTS invited_at TIMESTAMPTZ;

-- ============================================================================
-- 4. Define role permission boundaries as a helper function
-- ============================================================================

CREATE OR REPLACE FUNCTION get_role_permissions(p_role TEXT)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN CASE p_role
    WHEN 'owner' THEN '{"can_manage_billing": true, "can_delete_tenant": true, "can_manage_team": true, "can_edit_brain": true, "can_manage_settings": true, "can_view_reports": true, "can_manage_entities": true}'::jsonb
    WHEN 'manager' THEN '{"can_manage_billing": false, "can_delete_tenant": false, "can_manage_team": true, "can_edit_brain": true, "can_manage_settings": true, "can_view_reports": true, "can_manage_entities": true}'::jsonb
    WHEN 'staff' THEN '{"can_manage_billing": false, "can_delete_tenant": false, "can_manage_team": false, "can_edit_brain": false, "can_manage_settings": false, "can_view_reports": false, "can_manage_entities": true}'::jsonb
    WHEN 'viewer' THEN '{"can_manage_billing": false, "can_delete_tenant": false, "can_manage_team": false, "can_edit_brain": false, "can_manage_settings": false, "can_view_reports": true, "can_manage_entities": false}'::jsonb
    WHEN 'super_admin' THEN '{"can_manage_billing": true, "can_delete_tenant": true, "can_manage_team": true, "can_edit_brain": true, "can_manage_settings": true, "can_view_reports": true, "can_manage_entities": true}'::jsonb
    ELSE '{"can_manage_billing": false, "can_delete_tenant": false, "can_manage_team": false, "can_edit_brain": false, "can_manage_settings": false, "can_view_reports": false, "can_manage_entities": false}'::jsonb
  END;
END;
$$;

-- ============================================================================
-- 5. Helper: Check if user has a specific permission for a tenant
-- ============================================================================

CREATE OR REPLACE FUNCTION has_permission(p_user_id UUID, p_tenant_id UUID, p_permission TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_role TEXT;
  v_perms JSONB;
BEGIN
  SELECT role INTO v_role
  FROM tenant_users
  WHERE user_id = p_user_id AND tenant_id = p_tenant_id;

  IF v_role IS NULL THEN
    RETURN FALSE;
  END IF;

  v_perms := get_role_permissions(v_role);
  RETURN COALESCE((v_perms ->> p_permission)::boolean, FALSE);
END;
$$;
