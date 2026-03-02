# Receptionist Dev - Cross-Session Brain

## Last Session: 2026-03-02 11:06 AM ET (receptionist_fix — hardening + tests)

### What Was Done
- **Processed handoff #187**: Bookings redirect bug was already fixed by eng (fa8a462). Verified fix is sound and marked completed.
- **Fixed unhandled promise rejection**: useBookings.ts confirmBooking had busy_blocks `.then()` without `.catch()`. Added `.catch()` to prevent console errors.
- **41 regression tests for route protection**: Tests verify useModuleRequired mode defaults fallback across all 6 modes. Covers the fa8a462 fix that prevented /app/bookings false redirect. Tests include route protection matrix, edge cases, and defaultModulesByMode completeness.

### Build Status
- Build: Clean (0 errors)
- Tests: 406/406 passing (was 365)
- Commit: a034eb3
- Deployed to production
- Handoff #191 filed to QA (overall/no_console_errors)

### MODE PROGRESS
- SERVICE: 18/42 QA-verified (43%) ← FOCUS (3 gates moved to in_progress)
- DISPATCH: 0/42 (0%)
- FOOD: 0/42 (0%)
- MEDICAL: 0/42 (0%)
- SALES: 0/42 (0%)
- GENERAL: 0/42 (0%)

### Key Architecture Patterns
- **tenant_id in agent tools**: MUST be `required: true` on ALL tools. Regression test guards this.
- **twilio_call_sid in transfer tool**: MUST be `required: true` — without it, transfer silently fails.
- **booking_status enum**: Has BOTH 'canceled' (American) and 'cancelled' (British). Use either.
- **revenue_attributions.status**: CHECK constraint allows only 'pending', 'completed', 'cancelled'.
- **Two HVAC tenants**: "Comfort Zone HVAC" (1c5cf729, QA) and "Cool Comfort HVAC" (2403d98e, seed).
- **RLS policy pattern**: All tenant-scoped tables need explicit SELECT/INSERT/UPDATE/DELETE policies + service_role bypass.
- **useModuleRequired**: Checks both enabledModules AND mode defaults — safe against capabilities resolution edge cases.
- **Dialog layering**: When opening a dialog after closing a Sheet, use 250ms setTimeout delay.
- **Migration push**: Supabase CLI has version mismatch issues. Use Management API `/database/query` as fallback.

### Remaining Work
- Plan/Billing page: payment method integration with Stripe Customer Portal (needs edge function)
- Developer Tools Last Call Context shows empty values (low priority)

### Next Priorities
1. QA re-verification of 3 gates (handoff #189): transfer_to_human, call_history_real_data, bookings route
2. Stripe Customer Portal edge function (future eng session)
