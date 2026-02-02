
## What’s actually happening (root cause)

I understand: you’re trying to multi-tenant test, but the browser voice test keeps using `tenantId = a0000000-0000-0000-0000-000000000001`, which you’re calling “demo/fake”, and it’s not respecting the “active business” you intend.

From the live request capture, the browser test is **still sending**:

```json
{"tenantId":"a0000000-0000-0000-0000-000000000001","connectionType":"webrtc"}
```

and the token endpoint returns dynamic variables for **City Roadside Rescue** (dispatch). So the system is consistently using that tenant.

The real reason you can’t switch is:

1) **`AdminTenantSwitcher` is never mounted anywhere in the UI**, so there is currently no way to set `admin_settings.admin_active_tenant_id`.
   - Code evidence: `AdminTenantSwitcher.tsx` exists, but there are **zero imports/usages** outside itself.

2) `admin_settings` for your super admin user is currently **empty** (no row), so `effectiveTenantId` falls back to the tenant from `tenant_users`.
   - DB evidence: `admin_settings` has no row for your user.
   - DB evidence: your `tenant_users` row points to `a000...0001`, so that becomes the effective tenant.

3) Large parts of the app still use `const { tenant } = useAuth()` (not `effectiveTenant`), especially `/app/simulator` components like `QuickSetupWizard` and `CallSimulator`, so even if you switched, those pages wouldn’t fully follow the selected tenant unless we fix the source-of-truth.

4) Server-side: `elevenlabs-init` still contains a hard “tripwire” that blocks the `a000...0001` tenant ID. That will break phone-call flows (even if browser token works), and it reinforces the “demo/fake” confusion.

---

## Goal (what we’ll make true)

As a super admin:

- You can create multiple test tenants (service/dispatch/food/medical).
- You can select an **Active Test Tenant** in the UI.
- The selection is persisted per admin user (`admin_settings.admin_active_tenant_id`).
- **All tenant-scoped reads/writes (Business Brain + Simulator + Voice Test)** use that active tenant.
- No silent demo fallbacks anywhere; missing tenantId → clear 400 error (already enforced in conversation-token).
- The Test Call screen shows an **admin-only debug panel** with the exact dynamic variables being injected.

---

## Implementation plan (changes to make)

### 1) Mount the Admin Test Harness UI (so selection actually works)

**Why:** Today the switcher exists but is not rendered, so `admin_active_tenant_id` is never set.

**Changes:**
- Add `AdminTenantSwitcher` into a globally visible admin-only spot:
  - Best place: `src/components/layouts/AppLayout.tsx` header area (next to NotificationBell / profile menu), so it’s available on every `/app/*` route including `/app/simulator`.
- Optionally also include it inside the existing `AdminModeSwitcher` banner (if you want “Testing Mode” and “Active Tenant” together), but the header placement is the key.

**Acceptance test:**
- As super admin, you see:
  - Dropdown “Active Tenant”
  - Button “Create Test Tenant”

---

### 2) Auto-create + persist admin active tenant on first login (no “unset” state)

**Why:** Right now `admin_settings` is empty, so effective tenant always falls back to `tenant_users`.

**Changes in `src/contexts/AuthContext.tsx`:**
- When a super admin logs in:
  1. Fetch all `tenant_users` rows for the user (not `.single()`).
  2. Fetch `admin_settings` row.
  3. If `admin_settings` row is missing:
     - create it via upsert with `admin_active_tenant_id =` a safe default:
       - default = first tenant in `tenant_users` list
     - then fetch that tenant as the active tenant.
- If the admin selects a tenant, `setActiveTenantId()` already upserts, but we’ll also refresh related state (tenant object, tenant-scoped settings).

**Critical fix:** super admins will soon have multiple `tenant_users` rows (one per test tenant), so `.single()` will start failing. We must replace the super-admin path with list-based logic.

**Acceptance test:**
- `admin_settings` row exists after first admin login.
- Reloading the page keeps the chosen tenant active.

---

### 3) Make “effective tenant” the single writable truth across the app

**Why:** Many pages still read/write using `tenant.id`. For admins, `tenant` must reflect the currently selected active tenant, otherwise Business Brain edits won’t match tests.

**Approach (cleanest + least refactor):**
- In `AuthContext`, for super admins:
  - set the `tenant` value exposed by the context to be the **active tenant** (selected tenant), not the “first tenant_users tenant”.
  - Keep a separate internal “primaryTenant” (if needed) for subscription/identity, but the app’s tenant-scoped operations should see the active one.

**Also update subscription gating:**
- `AppLayout.tsx` currently blocks routes if `hasActiveSubscription` is false.
- Test tenants likely won’t have subscriptions; super admins should not be blocked from testing.
- Update gating to allow access if `isSuperAdmin === true`.

**Acceptance test:**
- Switching active tenant updates:
  - Navigation modules (dispatch/food/etc)
  - Business Brain data shown
  - Simulator and Voice tests

---

### 4) Update Simulator route to use active tenant (it currently doesn’t)

Right now on `/app/simulator`:
- `QuickSetupWizard` uses `tenant.id` for:
  - saving assistant_settings
  - initiating test phone calls
- `CallSimulator` uses `tenant.id` for:
  - pricing rules fetch
  - customer resolver
  - `ai-plan-response` invoke

**Changes:**
- Update `QuickSetupWizard.tsx` to use `effectiveTenantId` / `tenant` (after tenant becomes effective).
- Update `CallSimulator.tsx` similarly so all simulator actions run against the selected tenant.

**Acceptance test:**
- Switch active tenant to Food tenant → Simulator uses Food tenant’s policies/services/FAQs, not dispatch.

---

### 5) Fix the “demo tenant tripwire” inconsistency server-side

**Why:** You currently have one “special UUID” treated as demo in some places:
- `elevenlabs-conversation-token` no longer blocks it (good).
- `elevenlabs-init` still blocks it (bad/inconsistent), which can break voice flows and causes confusion.

**Changes:**
- In `supabase/functions/elevenlabs-init/index.ts`:
  - Remove the hard-coded UUID tripwire block.
  - Keep the real safety rule: if tenant cannot be resolved, return a safe response (or a clear error if that’s desired for ElevenLabs).
- Ensure the only enforced rule is:
  - “tenant must be resolved explicitly” (for browser token endpoint this is already strict)
  - No implicit fallback to “some demo tenant”.

**Acceptance test:**
- Browser test + phone test both work for whatever tenant is selected (including the current seeded one).

---

### 6) Make the Debug Panel show “valid tenant” based on reality, not a magic UUID

**Why:** `DynamicVariablesDebugPanel` currently labels `a000...0001` as “Demo tenant (blocked)” by comparing against a constant UUID. That is exactly what’s making this feel “fake”.

**Changes in `src/components/admin/DynamicVariablesDebugPanel.tsx`:**
- Remove the hardcoded check against `"a000...0001"`.
- Instead show:
  - Selected tenantId (from UI / auth context)
  - dynamicVariables.tenant_id
  - A green check if they match and business_name is present
  - A warning if mismatch or missing

**Acceptance test:**
- Debug panel clearly confirms “selected tenant == injected tenant”.

---

## What you’ll do in the UI after this ships (verification steps)

1) Go to `/app/simulator` → you should see “Active Tenant” dropdown in the header.
2) Click “Create Test Tenant” → create “Test Pizza” (food mode).
3) Switch “Active Tenant” to “Test Pizza”.
4) Go to Business Brain → add an obvious FAQ (“We are a pizza shop”).
5) Go back to Simulator → Browser Voice Test.
6) Confirm debug panel shows:
   - tenant_id = Test Pizza’s UUID
   - business_name = Test Pizza
7) Speak: “Do you do catering?” and confirm it answers in the context of the food tenant.

---

## Files we will update (scope)

Frontend:
- `src/components/layouts/AppLayout.tsx` (mount AdminTenantSwitcher + super admin subscription bypass)
- `src/contexts/AuthContext.tsx` (auto-create admin_settings; multi-tenant user handling; set tenant = effective tenant for admins)
- `src/components/setup/QuickSetupWizard.tsx` (use effective tenant for writes/invokes)
- `src/components/simulator/CallSimulator.tsx` (use effective tenant for reads/writes)
- `src/components/admin/DynamicVariablesDebugPanel.tsx` (remove hardcoded “demo UUID” logic)

Backend functions:
- `supabase/functions/elevenlabs-init/index.ts` (remove demo UUID tripwire; keep real tenant resolution safety)

Optional (if you want to fully retire the seeded `a000...0001` tenant):
- Create a brand-new tenant and migrate/link your admin user to it, then set it as active. This is not required to satisfy the harness; the harness works with any real tenant row.

---

## Risks / edge cases we’ll handle

- **Multiple tenant_users rows for super admin:** must avoid `.single()`; use list + active selection.
- **Test tenants without subscriptions:** super admin must bypass gating.
- **RLS constraints:** your current policies allow super admins broad access and allow authenticated inserts to tenants; creation should work.
- **Consistency:** ensure both browser token and init flows respect the same “no fallback” principle (but not “block this UUID”).

