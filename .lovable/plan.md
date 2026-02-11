

# Add Per-Tenant Delete to Admin Tenants Page

## Problem
The Admin Tenants page (`AdminTenantsPage.tsx`) uses hardcoded demo data and has no real functionality. You need to see all your actual tenants and delete test ones individually.

## Solution

### 1. New Edge Function: `delete-tenant`
Create `supabase/functions/delete-tenant/index.ts` -- a dedicated super-admin-only function that deletes a tenant by ID.

- Accepts `{ tenant_id: string }` in the request body
- Verifies the caller is a `super_admin` (same auth check as `seed-test-tenants`)
- Prevents deleting the admin's own tenant (safety check)
- Cascading delete of all related data in correct FK order (same sequence already proven in `seed-test-tenants` lines 113-127):
  - ai_call_sessions, bookings, dispatch_jobs, food_orders, medical_intakes, services, business_faqs, objection_responses, automations, assistant_settings, subscriptions, food_order_settings, customers, tenant_memberships, then tenants
- Returns `{ tenant_id, status: "deleted" }`

### 2. Rewrite `AdminTenantsPage.tsx` (currently hardcoded demo data)
Replace with a real, functional page:

- **Fetch all tenants** from the `tenants` table using a React Query hook (select id, name, business_mode, industry, created_at, onboarding_completed_at)
- **Search filter** (already has the UI -- wire it up to filter by tenant name)
- **Each tenant card** shows: name, business mode badge, industry, created date
- **Delete button** on each card with an AlertDialog confirmation ("Type DELETE to confirm" pattern, same as DangerZoneSection)
- **Calls `delete-tenant` edge function** on confirm, then refetches the tenant list
- **Protects the admin's own tenant** -- disable/hide delete on the user's own tenant
- Show a loading spinner during deletion

### 3. No Database Changes
The edge function uses the service role key to bypass RLS for the cascading delete. No migrations needed.

## Technical Details

**Files created:**
| File | Purpose |
|------|---------|
| `supabase/functions/delete-tenant/index.ts` | Super-admin-only tenant deletion with FK cascade |

**Files modified:**
| File | Change |
|------|--------|
| `src/pages/admin/AdminTenantsPage.tsx` | Replace demo data with real DB query, add delete per tenant |

