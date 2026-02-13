

# Fix: Agent Toggle Not Persisting for Super Admin

## Root Cause

The agent toggle on Blue Boxer's dashboard **silently fails** because of an RLS (Row-Level Security) policy issue.

Here's what happens step by step:
1. You toggle the AI agent ON for Blue Boxer
2. The system sends an UPDATE to the database for Blue Boxer's settings
3. The database checks: "Is this user a member of Blue Boxer?" using `is_tenant_member()`
4. That function looks in `tenant_users` for your user ID + Blue Boxer's ID
5. You only have a `tenant_users` record for **Hawk's Towing**, not Blue Boxer
6. The database **silently ignores** the update (0 rows affected, no error thrown)
7. The toast says "AI Agent is now live" because no SQL error occurred
8. The system refreshes and re-reads the unchanged data -- toggle snaps back to OFF

This is a general problem: as a super admin switching between tenants, you can VIEW any tenant's data (because the read path uses `fetchAdminSettings` which queries by tenant ID directly), but you cannot WRITE to tenants you don't have a `tenant_users` row for.

## Solution

Update the `is_tenant_member()` database function to include a **super admin bypass**. If the current user has `role = 'super_admin'` in `user_roles`, they should be treated as a member of ANY tenant.

### Database Migration

Alter the `is_tenant_member()` function to add a super admin check at the top:

```sql
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
```

### Why This Fixes It

- This single function is used by **all** RLS policies across the system (`tenant_isolation_all`)
- Updating it means super admins can read AND write to any tenant they switch to
- No frontend code changes needed -- the toggle, dashboard, and all other tenant operations will "just work"
- Regular (non-admin) users are unaffected since the super admin check only passes for users with `role = 'super_admin'`

### Secondary Fix: Missing `settings_json` Column

The database logs show repeated errors: `column assistant_settings.settings_json does not exist`. This is referenced in the `getBusinessBrainSnapshot.ts` edge function. While it doesn't directly cause the toggle bug, it produces noise in logs and could cause issues in the brain snapshot queries. A quick fix:

- Add `settings_json JSONB DEFAULT '{}'` column to `assistant_settings`, OR
- Remove the `settings_json` reference from the edge function's SELECT query

Both fixes will be included in the same migration.

### Files Changed

| File | Change |
|------|--------|
| New DB migration | Update `is_tenant_member()` with super admin bypass + add `settings_json` column |

No frontend files need to change.
