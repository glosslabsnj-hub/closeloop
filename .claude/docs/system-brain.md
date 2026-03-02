# Receptionist Dev - Cross-Session Brain

## Last Session: 2026-03-02 6:27 PM ET (receptionist_fix — test_drives schema bug + test expansion)

### What Was Done
- **Fixed test_drives.vehicle_interest bug**: `elevenlabs-webhook` persistTestDrive() used non-existent `vehicle_interest` column. PostgREST silently dropped it = data loss. Moved to `notes` field.
- **Expanded schema safety tests**: 20→25 tests. Now covers test_drives, food_orders, medical_intakes, sales_leads with allowlist validation (not just banned column lists).
- **Deployed**: elevenlabs-webhook edge function + frontend. Live 200.

### Build Status
- Build: Clean (0 errors)
- Tests: 661/661 passing
- Commit: 648955e
- Pushed to main

### MODE PROGRESS
- SERVICE: 23/42 QA-verified (55%) ← FOCUS
- DISPATCH: 0/42 (0%)
- FOOD: 0/42 (0%)
- MEDICAL: 0/42 (0%)
- SALES: 0/42 (0%)
- GENERAL: 0/42 (0%)

### Key Architecture Patterns
- **Super_admin auth**: TWO layers must both handle super_admin: (1) DB `has_tenant_access()` function (migration 20260301210000) and (2) edge function `requireAuthedTenant` in `_shared/tenant.ts`. Both now check `user_roles` for super_admin and allow any tenant.
- **ai-plan-response**: Uses Anthropic Claude Haiku 4.5. Queries DB directly. Falls back gracefully if ANTHROPIC_API_KEY missing. FAQs+services always injected (commit 2c74dd1).
- **build-business-brain**: Queries 23 tables in parallel. Mode-specific knowledge only for matching mode. FAQs+services unconditional.
- **Booking customer linkage**: bookings table has NO customer_id. Link is `lead_id → leads.customer_id`. ALL booking lookups must go through leads table. dispatch_jobs and ai_call_sessions DO have customer_id.
- **tenant_id in agent tools**: MUST be `required: true` on ALL tools. Regression test guards this.
- **twilio_call_sid in transfer tool**: MUST be `required: true`.
- **booking_status enum**: Has BOTH 'canceled' and 'cancelled'. Use either.
- **order_status enum**: pending, confirmed, preparing, ready, out_for_delivery, completed, cancelled. NO 'ready_for_pickup'.
- **RLS policy pattern**: All tenant-scoped tables need explicit SELECT/INSERT/UPDATE/DELETE policies + service_role bypass.
- **Global hooks must fail silently**: useAgencyAccount, useMyAgencyApplication, useKnowledgeConflicts, useNotifications all run on every page via AppLayout. They MUST NOT throw — return null/[] on error. All must have `retry: false` and `staleTime > 0`. Regression test enforces this.
- **Mode-aware terminology pattern**: Use `useIndustryContext()` → `terms` for UI labels. For public pages (no auth), use `getTerminology(mode)` directly.
- **test_drives vs sales_leads**: `vehicle_interest` is a valid column on `sales_leads` but NOT on `test_drives`. PostgREST silently drops unknown INSERT columns (no error, just data loss). Schema safety tests guard all 5 entity tables with allowlists.
- **Edge function deployment**: Functions MUST be deployed after code changes. Use: `SUPABASE_ACCESS_TOKEN=$(grep SUPABASE_ACCESS_TOKEN .env | cut -d'"' -f2) npx supabase functions deploy [name] --project-ref yltzlvzgwkidbeqaoevp`
- **_shared/tenant.ts redeploy**: When modifying `_shared/tenant.ts`, ALL 29 edge functions that import from it need redeployment.

### Remaining Work
- 16 WIP gates awaiting QA verification (all have eng/ux fixes deployed)
- 2 BLOCKED gates (Google Calendar OAuth, SMS A2P registration)
- 1 FAILING gate (ai_handles_edge_cases — WS connection drops in test framework, not an eng issue)

### Next Priorities
1. QA verification of all WIP gates (handoffs filed)
2. Continue clearing WIP gates as QA verifies them
