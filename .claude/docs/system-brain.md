# Receptionist Dev - Cross-Session Brain

## Last Session: 2026-03-02 10:58 AM ET (receptionist_ux — 2 UX fixes)

### What Was Done
- **Brain section % mismatch fix**: BrainSectionDetailHost breadcrumb now uses item-status-based completion (same as BrainDashboard cards). Fixes bug where overview card showed 33% but breadcrumb showed 0%.
- **Mode-aware intake fields**: ServiceCatalogEditor intake fields now adapt to business mode and complexity. "Quick confirmation" shows 2 essential fields (address, preferred date). "Ask detailed questions" shows mode-relevant advanced fields. HVAC AC Tune-Up no longer shows 9 generic fields.

### Build Status
- Build: Clean (0 errors)
- Tests: 365/365 passing
- Commit: 2b07746
- Handoff #190 filed to QA (2 gates to verify)

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
