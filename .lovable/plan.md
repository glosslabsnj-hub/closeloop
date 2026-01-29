

# Delete Test Users Cleanup

## Summary
Remove all test user accounts except your admin account (`jackangelini@icloud.com`). The template industry data is stored as static code, so no user accounts are needed to maintain it.

## Users to Delete (10 accounts)

| Email | Reason |
|-------|--------|
| `test1@gmail.com` | Test account, no tenant |
| `test123@gmail.com` | Test account, no tenant |
| `test122@gmail.com` | Test account, no tenant |
| `test1232@gmail.com` | Test account, no tenant |
| `test1234@gmail.com` | Test account, no tenant |
| `testvoice@closeloop.test` | Test account, no tenant |
| `voicetest123@example.com` | Test account, no tenant |
| `newbusiness2025@testmail.com` | Test account, no tenant |
| `blueboxer@test.com` | Test account with orphan tenant |
| `test123@example.com` | Test account, no tenant |

## User to Keep

| Email | Role | Reason |
|-------|------|--------|
| `jackangelini@icloud.com` | super_admin | Your admin account with template tenant |

## Implementation Steps

### Step 1: Delete Related Data First
Clean up any data associated with test tenants before deleting users:

```sql
-- Delete the orphan tenant created by blueboxer@test.com
DELETE FROM tenants WHERE id = '9a99dcab-ce42-4bc2-8c5e-9cfc7af91603';

-- Clean up any tenant_users entries (cascade should handle this, but be explicit)
DELETE FROM tenant_users WHERE user_id NOT IN (
  SELECT id FROM auth.users WHERE email = 'jackangelini@icloud.com'
);
```

### Step 2: Delete Test Users
Delete all users except your admin account using an edge function or the Supabase Admin API:

```sql
-- This requires service_role access (edge function)
-- Delete users from auth.users
SELECT auth.admin_delete_user(id) 
FROM auth.users 
WHERE email != 'jackangelini@icloud.com';
```

Since direct `auth.users` modifications require service role access, I'll create an edge function to safely perform this cleanup.

### Step 3: Edge Function Implementation

Create a `cleanup-test-users` edge function that:
1. Accepts the admin user's email to preserve
2. Deletes all other users using `supabase.auth.admin.deleteUser()`
3. Cleans up orphan tenant data via cascade

## Technical Details

### Edge Function: `supabase/functions/cleanup-test-users/index.ts`

```typescript
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  const { preserveEmail } = await req.json();
  
  if (!preserveEmail) {
    return new Response(JSON.stringify({ error: "preserveEmail required" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  // Get all users except the preserved one
  const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
  
  if (listError) {
    return new Response(JSON.stringify({ error: listError.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  const usersToDelete = users.filter(u => u.email !== preserveEmail);
  const results = [];

  for (const user of usersToDelete) {
    const { error } = await supabase.auth.admin.deleteUser(user.id);
    results.push({
      email: user.email,
      deleted: !error,
      error: error?.message
    });
  }

  return new Response(JSON.stringify({
    preserved: preserveEmail,
    deleted: results.filter(r => r.deleted).length,
    failed: results.filter(r => !r.deleted).length,
    details: results
  }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
});
```

### Invoking the Cleanup

After deploying, invoke with:
```typescript
const { data } = await supabase.functions.invoke('cleanup-test-users', {
  body: { preserveEmail: 'jackangelini@icloud.com' }
});
```

## Why Template Industries Still Work

The Admin Mode Switcher in `AdminModeSwitcher.tsx` uses static data from `src/data/industryTestData.ts` to reset tenant data. It:

1. Updates your tenant's `business_mode` and `enabled_modules`
2. Clears and repopulates industry-specific tables (menu_items, dispatch_jobs, etc.)
3. Uses predefined `TEST_PHONES` array for consistent test data

This is all driven by **your super_admin tenant**, not by separate user accounts.

## Verification

After cleanup:
- Only `jackangelini@icloud.com` should exist in `auth.users`
- Only tenant `a0000000-0000-0000-0000-000000000001` should exist
- Admin Mode Switcher should still work for all 5 business modes

