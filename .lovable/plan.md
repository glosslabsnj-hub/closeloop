

# Build Error Fixes for CloseLoop

## Overview

Claude Code created new components and hooks for the mode-aware dashboards and test tenant seeding, but introduced several TypeScript errors. These need to be fixed here in Lovable since they involve:

1. **Database schema mismatches** - Components referencing columns that don't exist
2. **Type errors in edge functions** - Supabase client typing issues
3. **Framer Motion type issues** - Incorrect variant definitions
4. **AddOnItem type mismatch** - Missing required properties

---

## Error Analysis

### Group 1: Database Column Mismatches

The new dashboard widgets reference columns that don't exist in the actual database schema:

| File | Missing Column | Actual Column |
|------|---------------|---------------|
| `TodayCalendarStrip.tsx` | `starts_at` | `start_at` |
| `TodayCalendarStrip.tsx` | `service_name` | Need to join `services` table |
| `TodayCalendarStrip.tsx` | `customer_name` | Need to join `customers` table via `lead_id` |
| `PatientIntakeQueue.tsx` | `patient_name` | Need to join `customers` table via `customer_id` |
| `useDispatchDashboard.ts` | `eta_minutes` | `estimated_arrival_at` (timestamp, not minutes) |
| `useDispatchDashboard.ts` | `in_progress` status | Valid statuses are: pending, assigned, en_route, on_site, completed, cancelled |
| `useFoodDashboard.ts` | `estimated_ready_at` | Column doesn't exist |

### Group 2: Edge Function Type Errors

`seed-test-tenants/index.ts` has Supabase client typing issues. The function parameter needs to use `any` type for the client since we're not importing the full Database type in edge functions.

### Group 3: BusinessBrainPage Type Errors

The `operationsEnableAddOn` function uses a simplified type `{ id: string; label: string; description: string }` but `AddOnItem` requires:
- `title` (not `label`)
- `icon: LucideIcon`
- `capabilityKey: string`

### Group 4: Framer Motion Variants

The `ease` property in motion variants should be a typed easing value, not a string literal.

---

## Fix Plan

### Phase 1: Fix Database Column Queries

**TodayCalendarStrip.tsx**
- Change `starts_at` to `start_at`
- Join with `services` table for service name
- Join with `customers` table via `lead_id` for customer name

**PatientIntakeQueue.tsx**
- Join with `customers` table via `customer_id` for patient name

**useDispatchDashboard.ts**
- Remove `eta_minutes` from select (use `estimated_arrival_at`)
- Change `in_progress` status to valid enum values

**useFoodDashboard.ts**
- Remove `estimated_ready_at` from select (column doesn't exist)

### Phase 2: Fix Edge Function Types

**seed-test-tenants/index.ts**
- Change function parameter type to accept `any` client
- Use `as any` cast for insert operations to bypass strict typing

### Phase 3: Fix BusinessBrainPage Types

**BusinessBrainPage.tsx**
- Change `operationsEnableAddOn` to accept full `AddOnItem` type
- Or cast the items appropriately when calling the function

### Phase 4: Fix Framer Motion Variants

**BusinessBrainPage.tsx**
- Change `ease: "easeOut"` to `ease: [0, 0, 0.2, 1]` (valid easing array)
- Or remove the `ease` property entirely (default is fine)

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/dashboard/widgets/TodayCalendarStrip.tsx` | Fix column names and joins |
| `src/components/dashboard/widgets/PatientIntakeQueue.tsx` | Add customer join for patient name |
| `src/hooks/useDispatchDashboard.ts` | Fix column names and status values |
| `src/hooks/useFoodDashboard.ts` | Remove non-existent column |
| `supabase/functions/seed-test-tenants/index.ts` | Fix TypeScript types |
| `src/pages/app/BusinessBrainPage.tsx` | Fix AddOnItem type and motion variants |
| `src/components/dashboard/widgets/LeadFunnelSummary.tsx` | Fix excessive type depth issue |

---

## Technical Details

### Database Schema Reference

**bookings table:**
- `id`, `tenant_id`, `lead_id`, `service_id`, `start_at`, `end_at`, `status`, `notes`, `created_at`
- No `starts_at`, `service_name`, or `customer_name` columns

**medical_intakes table:**
- `id`, `tenant_id`, `customer_id`, `status`, `intake_type`, `urgency_level`, `reason_for_visit`, etc.
- No `patient_name` column - must join with `customers`

**dispatch_jobs table:**
- Has `estimated_arrival_at` (timestamptz) but not `eta_minutes`
- Valid statuses: `pending`, `assigned`, `en_route`, `on_site`, `completed`, `cancelled`

**food_orders table:**
- Has `scheduled_at` for pickup time, but no `estimated_ready_at`

---

## Implementation Order

1. Fix simpler type errors first (edge function, motion variants)
2. Fix database query issues (requires understanding joins)
3. Verify each component works in isolation
4. Test end-to-end with real data

This will unblock the build and allow Claude Code's onboarding refactor to work properly.

