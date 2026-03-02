# Receptionist Dev - Cross-Session Brain

## Last Session: 2026-03-02 10:25 AM ET (receptionist_fix — tenant_id critical fix)

### What Was Done
- **CRITICAL: tenant_id required:true on all agent tools**: 14 of 26 tenant_id parameters in agentToolsConfig.ts were `required: false`. This was the root cause of `booking_creates_correctly` gate failure — ElevenLabs could omit tenant_id, causing create-booking to silently fail. All 26 now `required: true`.
- **Regression test**: New `tests/agent-tools-config.test.ts` (5 tests) validates tenant_id is always required:true with dynamicValue.
- **QA config fix**: Added `test-consultant-callback` slug alias in lenard QA config for Apex Consulting Group.
- **Unblocked 5 gates**: All test tenants confirmed existing in Supabase. BLOCKED status was stale.

### Build Status
- Build: Clean (0 errors)
- Tests: 365/365 passing (5 new)
- Commit: 714d90e
- Edge functions deployed: elevenlabs-init, get-agent-tools-config
- Handoff #184 filed to QA (8 gates to verify)

### MODE PROGRESS
- SERVICE: 15/42 QA-verified (36%) ← FOCUS (8 gates moved from FAIL/BLOCKED → in_progress)
- DISPATCH: 0/42 (0%)
- FOOD: 0/42 (0%)
- MEDICAL: 0/42 (0%)
- SALES: 0/42 (0%)
- GENERAL: 0/42 (0%)

### Key Architecture Patterns
- **tenant_id in agent tools**: MUST be `required: true` on ALL tools. Regression test guards this.
- **booking_status enum**: Has BOTH 'canceled' (American) and 'cancelled' (British). Use either, but prefer 'canceled' for new code.
- **revenue_attributions.status**: CHECK constraint allows only 'pending', 'completed', 'cancelled'. The trigger maps booking statuses to these.
- **Two HVAC tenants**: "Comfort Zone HVAC" (1c5cf729, QA test tenant) and "Cool Comfort HVAC" (2403d98e, seed script target).
- **RLS policy pattern**: All tenant-scoped tables need explicit SELECT/INSERT/UPDATE/DELETE policies + service_role bypass.
- **Service deletion FK constraint**: Services linked to bookings can't be deleted. Use `is_active=false` to deactivate instead.
- **Dialog layering**: When opening a dialog after closing a Sheet, use 250ms setTimeout delay to avoid backdrop overlap.
- **Migration push**: Supabase CLI has version mismatch issues. Use Management API `/database/query` endpoint as fallback.

### Remaining Work
- Plan/Billing page: payment method integration with Stripe Customer Portal (needs edge function)
- Developer Tools Last Call Context shows empty values (low priority)

### Next Priorities
1. QA re-verification of 8 functional gates (handoff #184)
2. Stripe Customer Portal edge function (future eng session)
