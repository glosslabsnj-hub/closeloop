# Receptionist Dev - Cross-Session Brain

## Last Session: 2026-03-02 9:47 AM ET (receptionist_eng — Cancel booking enum + HVAC services)

### What Was Done
- **Cancel booking enum fix (handoff #177)**: Added `'cancelled'` (British) to `booking_status` enum. Both spellings now valid. Root cause: enum only had `'canceled'` but edge functions and triggers used `'cancelled'`.
- **Revenue attribution trigger fix**: `fn_attribution_on_booking()` was passing raw booking status to `revenue_attributions.status` which has CHECK(`'pending','completed','cancelled'`). Fixed to properly map: completed→completed, canceled/cancelled/no_show→cancelled, everything else→pending.
- **HVAC services fix (handoff #178)**: Added 6 missing services to "Comfort Zone HVAC" tenant (AC Repair, Furnace Repair, AC/Furnace/Mini-Split Installation, Heat Pump Service). Now 14 active services.
- **UI consistency**: BookingDetailsSheet, useScheduleData, industryRevenueConfig all updated to handle both canceled/cancelled.

### Build Status
- Build: Clean (0 errors)
- Tests: 360/360 passing
- Commit: d8cb96f
- Deployed to production (app.getfluxdata.com returns 200)
- Handoffs #177, #178 completed. Handoffs #181, #182 filed to QA.

### MODE PROGRESS
- SERVICE: 15/42 QA-verified (36%) ← FOCUS
- DISPATCH: 0/42 (0%)
- FOOD: 0/42 (0%)
- MEDICAL: 0/42 (0%)
- SALES: 0/42 (0%)
- GENERAL: 0/42 (0%)

### Key Architecture Patterns
- **booking_status enum**: Has BOTH 'canceled' (American) and 'cancelled' (British). Use either, but prefer 'canceled' for new code.
- **revenue_attributions.status**: CHECK constraint allows only 'pending', 'completed', 'cancelled'. The trigger maps booking statuses to these.
- **Two HVAC tenants**: "Comfort Zone HVAC" (1c5cf729, QA test tenant) and "Cool Comfort HVAC" (2403d98e, seed script target).
- **deposit_amount**: Exists on BOTH services table (per-service) AND assistant_settings (tenant-wide policy text).
- **RLS policy pattern**: All tenant-scoped tables need explicit SELECT/INSERT/UPDATE/DELETE policies + service_role bypass.
- **RLS WITH CHECK**: Every `FOR ALL` policy MUST have both `USING` and `WITH CHECK`.
- **Service deletion FK constraint**: Services linked to bookings can't be deleted. Use `is_active=false` to deactivate instead.
- **Dialog layering**: When opening a dialog after closing a Sheet, use 250ms setTimeout delay to avoid backdrop overlap.
- **Migration push**: Supabase CLI has version mismatch issues. Use Management API `/database/query` endpoint as fallback.

### Remaining Work
- Plan/Billing page: payment method integration with Stripe Customer Portal (needs edge function)
- 5 functional gates blocked on test tenant slug lookup (tenants don't have slug column)
- Developer Tools Last Call Context shows empty values (low priority)

### Next Priorities
1. QA re-verification of cancel booking + HVAC services (handoffs #181, #182)
2. Stripe Customer Portal edge function (future eng session)
