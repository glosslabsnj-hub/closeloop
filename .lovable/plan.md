

# Fix Plan: Dashboard Setup & Phone Persistence Issues

## Problem Summary

After thorough investigation, I identified **4 distinct issues**:

### Issue 1: RLS Policy Blocks Insert on `assistant_settings`
**Root Cause**: The user `test1234@gmail.com` has no `tenant_users` record (they may have signed up but never completed onboarding). When the app tries to upsert to `assistant_settings`, the RLS `INSERT` policy fails because `has_tenant_access()` returns false.

The code is trying to upsert to the demo tenant (`a0000000-0000-0000-0000-000000000001`) which belongs to a different user.

### Issue 2: Dashboard Shows Without Checking Tenant
**Root Cause**: Users who have no tenant are being shown the Dashboard with setup steps instead of being redirected to complete onboarding. The AppLayout doesn't properly gate users without tenants.

### Issue 3: Phone Number Doesn't Persist in Settings Tab
**Root Cause**: The Settings page uses `useTenantSettings()` which updates the `tenants` table's `phone_public` field, but the phone number entered in the setup wizard goes to `assistant_settings.business_phone_number`. These are different fields and different tables.

### Issue 4: Calendar Step Uses Upsert But No Record Exists
**Root Cause**: For new tenants, `assistant_settings` must first be created (via `initialize_assistant_settings()` RPC during onboarding). The calendar step uses `upsert` but when no row exists and the RLS check fails, it fails with the observed error.

### Issue 5: Each Business Needs Unique Forwarding Number
**Root Cause**: The `CarrierInstructions` component shows a hardcoded forwarding number (`+1 (555) 123-4567`) instead of a unique per-tenant number. Each tenant should receive a dedicated forwarding number.

---

## Fix Implementation Plan

### Fix 1: Redirect Users Without Tenants to Onboarding

**File**: `src/components/layouts/AppLayout.tsx`

**Change**: Add a check for users without a tenant and redirect them to the onboarding page. Currently the app only checks for subscription, not for tenant existence.

**Logic**:
```typescript
// Add after loading check
if (!loading && user && !tenant) {
  // User is logged in but has no tenant - send to onboarding
  if (location.pathname !== "/app/onboarding") {
    navigate("/app/onboarding");
    return;
  }
}
```

### Fix 2: Ensure Assistant Settings Row Exists Before Setup Steps

**File**: `src/components/dashboard/PhoneConnectionStep.tsx`
**File**: `src/components/dashboard/CalendarConnectionStep.tsx`

**Change**: Before attempting to upsert, first check if the row exists. If not, use `insert` instead of `upsert`, or ensure the row is created via the `initialize_assistant_settings` RPC at the right time.

Better approach: Use **`UPDATE`** when the row is guaranteed to exist (after onboarding creates it), and only use `INSERT` if it doesn't.

**Implementation Pattern**:
```typescript
// Check if settings exist first
const { data: existing } = await supabase
  .from("assistant_settings")
  .select("tenant_id")
  .eq("tenant_id", tenant.id)
  .maybeSingle();

if (existing) {
  // UPDATE existing row
  await supabase.from("assistant_settings").update({...}).eq("tenant_id", tenant.id);
} else {
  // INSERT new row
  await supabase.from("assistant_settings").insert({...});
}
```

### Fix 3: Generate Unique Per-Tenant Forwarding Numbers

**File**: `src/components/dashboard/CarrierInstructions.tsx`
**File**: `src/components/dashboard/PhoneConnectionStep.tsx`

**Change**: Instead of hardcoding `+1 (555) 123-4567`, generate a unique forwarding number per tenant and store it in `assistant_settings.closeloop_number`.

**Implementation**:
1. Add a database function or edge function to provision/generate a unique CloseLoop number per tenant
2. Store this in `assistant_settings.closeloop_number`
3. Display the tenant's unique number in `CarrierInstructions`

For MVP (mock mode), we can generate a deterministic number based on tenant ID:
```typescript
const generateForwardingNumber = (tenantId: string) => {
  // Generate consistent number from tenant ID hash
  const hash = tenantId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const areaCode = 800 + (hash % 100); // 800-899
  const exchange = 200 + (hash % 800); // 200-999
  const subscriber = 1000 + (hash % 9000); // 1000-9999
  return `+1 (${areaCode}) ${exchange}-${subscriber}`;
};
```

### Fix 4: Sync Phone Number Fields Between Settings and Setup

**File**: `src/pages/app/SettingsPage.tsx`

**Change**: The Settings page "Public Phone Number" field should read/write from the same source as the setup wizard. Either:
- Option A: Use `assistant_settings.business_phone_number` for both
- Option B: Keep `tenants.phone_public` but sync it during setup

**Recommended**: Option A - update Settings to also update `assistant_settings.business_phone_number` when the phone is changed, and load from it.

### Fix 5: Add Skip Button for Calendar Step

**File**: `src/components/dashboard/CalendarConnectionStep.tsx`

**Change**: The `onSkip` prop exists but isn't always shown. Ensure the skip button is visible and functional.

---

## Technical Implementation Details

### Step 1: Update AppLayout for Tenant Gate
Add tenant existence check to redirect users without tenants to onboarding.

### Step 2: Fix PhoneConnectionStep
- Check for existing `assistant_settings` row before upsert
- Generate unique forwarding number per tenant
- Pass correct number to CarrierInstructions

### Step 3: Fix CalendarConnectionStep  
- Use update instead of upsert when settings exist
- Ensure skip button works correctly
- Only enable "coming soon" for Google Calendar, allow skip

### Step 4: Update CarrierInstructions
- Accept the tenant's unique forwarding number as prop
- Remove hardcoded number

### Step 5: Fix SettingsPage Phone Field
- Read `business_phone_number` from `assistant_settings` via AuthContext
- Update both `tenants.phone_public` and `assistant_settings.business_phone_number`

---

## Effort Estimates

| Fix | Effort | Priority |
|-----|--------|----------|
| AppLayout tenant gate | 15 min | P0 |
| PhoneConnectionStep upsert fix | 20 min | P0 |
| CalendarConnectionStep upsert fix | 15 min | P0 |
| Unique forwarding numbers | 20 min | P0 |
| Settings phone sync | 15 min | P1 |

**Total: ~1.5 hours**

---

## Acceptance Criteria

1. Users without a tenant are redirected to `/app/onboarding`
2. Phone connection step successfully saves and marks step complete
3. Calendar step successfully saves with CloseLoop Calendar option
4. Each tenant sees their own unique forwarding number
5. Phone number saved in Settings persists when returning to the tab
6. Calendar step can be skipped if user chooses Google Calendar (coming soon)

