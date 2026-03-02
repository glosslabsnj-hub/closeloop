# Receptionist Dev - Cross-Session Brain

## Last Session: 2026-03-02 10:52 AM ET (receptionist_eng — 3 critical fixes)

### What Was Done
- **Bookings route redirect fix**: `useModuleRequired` now checks both resolved `enabledModules` AND mode defaults (`defaultModulesByMode`). Service mode tenants can navigate directly to `/app/bookings` without being redirected to dashboard.
- **Transfer-to-human fix**: `twilio_call_sid` and `reason` now `required: true` on `transfer_to_owner` tool in agentToolsConfig.ts. Previously `required: false`, letting ElevenLabs call the tool without the call SID, causing silent transfer failure.
- **Opportunities RLS fix**: Added `service_role` bypass policy + `WITH CHECK` clause on opportunities table. Unblocks CallSimulator and edge functions (elevenlabs-create-callback, universal-delivery).

### Build Status
- Build: Clean (0 errors)
- Tests: 365/365 passing
- Commit: fa8a462
- Edge functions deployed: elevenlabs-transfer-call, get-agent-tools-config, elevenlabs-init
- Frontend deployed to VPS (app.getfluxdata.com)
- Migration 20260302150000 applied via Management API
- Handoff #189 filed to QA (3 gates to verify)

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
