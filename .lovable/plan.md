
# Fix Tenant Creation RLS Errors

## Problem
Both the onboarding page and admin test tenant dialog directly insert into `public.tenants` from the frontend, which triggers RLS violations when client INSERT policies are properly restricted.

## Current State
- **Edge function exists:** `supabase/functions/create-tenant/index.ts` already handles:
  - JWT verification via anon client
  - Tenant creation using service role
  - Membership (`tenant_users`) creation with `role='owner'`
  - Returns `{ tenant_id, membership_created }`

- **Two frontend locations need updates:**
  1. `src/pages/app/OnboardingPage.tsx` (main onboarding)
  2. `src/components/admin/CreateTestTenantDialog.tsx` (admin test tenants)

## Implementation Plan

### 1. Update OnboardingPage.tsx
Replace direct tenant insert (lines 283-304) with edge function call:

```typescript
// OLD CODE (lines 283-304):
const { error: tenantError } = await supabase
  .from("tenants")
  .insert(tenantData as any);
// ... followed by tenant_users insert

// NEW CODE:
const { data: createResult, error: createError } = await supabase.functions.invoke(
  "create-tenant",
  {
    body: {
      name: businessBasics.businessName,
      business_mode: businessMode,
      timezone: businessBasics.timezone,
      tagline: businessBasics.tagline || null,
      phone_public: businessBasics.phoneNumber,
      address: businessBasics.address || null,
      hours_json: businessBasics.hoursJson,
      industry: industrySlug,
      enabled_modules: enabledModules,
      cancellation_policy: policies.cancellationPolicy || null,
      deposit_policy: policies.depositPolicy || null,
      refund_policy: policies.refundPolicy || null,
      payment_methods: policies.paymentMethods,
      ai_never_promise: policies.aiNeverPromise,
      hipaa_mode: businessMode === "medical",
    },
  }
);

if (createError || createResult?.error) {
  console.error("Tenant creation error:", createError || createResult?.error);
  throw new Error(createResult?.error || createError?.message || "Failed to create business profile");
}

const tenantId = createResult.tenant_id;
console.log("Tenant created via edge function:", tenantId.substring(0, 8) + "...");

// Remove the separate tenant_users insert - edge function handles it
```

Key changes:
- Remove client-side `crypto.randomUUID()` - server generates ID
- Remove direct `tenants` insert
- Remove direct `tenant_users` insert
- Add proper error handling for edge function response

### 2. Update CreateTestTenantDialog.tsx
Replace direct inserts (lines 68-94) with edge function call:

```typescript
// OLD CODE:
const { data: newTenant, error: tenantError } = await supabase
  .from("tenants")
  .insert({ ... })
  .select("id")
  .single();
// ... followed by tenant_users insert

// NEW CODE:
const { data: createResult, error: createError } = await supabase.functions.invoke(
  "create-tenant",
  {
    body: {
      name: businessName.trim(),
      business_mode: businessMode,
      timezone,
      enabled_modules: getDefaultModules(businessMode),
      hipaa_mode: businessMode === "medical",
    },
  }
);

if (createError || createResult?.error) {
  throw new Error(createResult?.error || createError?.message || "Failed to create tenant");
}

const tenantId = createResult.tenant_id;
```

Also remove the separate `tenant_users` and `assistant_settings` inserts - the edge function handles membership, and `assistant_settings` should be created after tenant exists using the returned `tenant_id`.

### 3. Deploy Edge Function
Ensure `create-tenant` edge function is deployed (it already exists but should verify deployment).

### 4. Keep Existing RLS Intact
No RLS policy changes needed - the goal is to NOT add INSERT policies for `tenants` table. The edge function uses service role to bypass RLS.

---

## Technical Details

### Edge Function Response Contract
```typescript
// Success:
{ tenant_id: string, membership_created: boolean }

// Error:
{ error: string }
```

### After Tenant Creation
Both flows continue to create related records (services, FAQs, subscriptions, etc.) using the returned `tenant_id`. These subsequent inserts are allowed because the user now has a `tenant_users` row, so RLS policies on other tables will pass.

### Error Handling Pattern
```typescript
const { data, error } = await supabase.functions.invoke("create-tenant", { body });

// Handle transport error
if (error) {
  console.error("Tenant creation transport error:", error);
  toast.error(error.message || "Failed to create business");
  return;
}

// Handle application error
if (data?.error) {
  console.error("Tenant creation app error:", data.error);
  toast.error(data.error);
  return;
}

// Success
const tenantId = data.tenant_id;
```

### Files to Modify
1. `src/pages/app/OnboardingPage.tsx` - Replace lines 232-304 with edge function call
2. `src/components/admin/CreateTestTenantDialog.tsx` - Replace lines 65-107 with edge function call

### Definition of Done
- No more `new row violates row-level security policy for table "tenants"` errors
- User becomes owner member immediately after creation
- Redirect succeeds and tenant-scoped data loads
- Both onboarding and admin test tenant flows work correctly
