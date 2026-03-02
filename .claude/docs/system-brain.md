# Receptionist Dev - Cross-Session Brain

## Last Session: 2026-03-02 10:10 AM ET (receptionist_ux — Brain progress + mobile + terminology)

### What Was Done
- **Brain dashboard 0% progress bug (handoff #179)**: Dashboard cards showed binary 0%/100% because completion tracked only 1 essentialField per section. Replaced with group-based item-status completion that matches sidebar data. Now shows granular progress (e.g., 33% = 1 of 3 items complete).
- **Mobile 375px responsiveness**: Hero card responsive SVG (h-24→h-32), recommendation chips min-h-[40px] touch target, header buttons stack on mobile, BrainCategoryCard/SectionSummaryCard responsive padding.
- **Industry terminology**: ServicePoliciesEditor + ServiceCoverageEditor now use dynamic `appointmentLabel`. HVAC/plumber sees "job/jobs", salon sees "appointment/appointments" (7 instances fixed).

### Build Status
- Build: Clean (0 errors)
- Tests: 360/360 passing
- Commits: 7792a46, b788b1c
- Handoff #179 completed. Handoff #183 filed to QA.

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
