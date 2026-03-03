# Receptionist Dev - Cross-Session Brain

## Last Session: 2026-03-02 7:40 PM ET (receptionist_eng — call flow audit + 6 bug fixes)

### What Was Done
- **Audited entire call flow** (booking-handoff, create-booking, webhook, reschedule, cancel, transfer, lookup) for production bugs
- **Fixed 6 edge function bugs** (commit f0ef4c5, all deployed to production):
  1. **CRITICAL: Webhook booking timezone** — persistBooking parsed dates as UTC instead of tenant timezone. Bookings were off by hours. Added getTimezoneOffset() and tenant timezone offset.
  2. **CRITICAL: Cancel-booking invalid enum** — outcome "cancellation" is not a valid ai_call_outcome value. Changed to "followup". Was causing silent DB update failure.
  3. **CRITICAL: Reschedule busy_blocks missing tenant_id** — UPDATE not scoped by tenant_id. Fixed with .eq("tenant_id", resolvedTenantId).
  4. **CRITICAL: Cancel busy_blocks missing tenant_id** — Same issue. Fixed.
  5. **MEDIUM: Transfer-call weak call_sid validation** — Didn't catch "undefined"/"null" string literals or short strings. Added stricter checks.
  6. **MEDIUM: Booking-handoff email null name** — customerName in email subject could be null. Added fallback to "Customer".
  7. **MEDIUM: Reschedule date parsing** — Only handled today/tomorrow/ISO. Ported robust parser from create-booking (MM/DD, "March 5th", "next Monday", etc.)
- **Fixed QA test framework** for ai_handles_edge_cases gate:
  - qa-test-scripts.md: `--scenario edge-cases` → `--tag edge-case` (was matching zero scenarios)
  - X05 garbage-input: Removed redundant waitForAgent step (caused WS timeout waiting for spontaneous response)
  - X07 long-message: Same fix
  - X08 mid-disconnect: Added steps 2-3 so disconnect actually triggers at currentStepIndex >= 2
- **Deployed 10 edge functions** total (5 recently changed + 5 bug fixes)
- **Deployed frontend** to VPS (verified 200)

### Build Status
- Build: Clean (0 errors)
- Tests: 671/671 passing
- Commit: f0ef4c5
- Pushed to main, deployed to production

### MODE PROGRESS
- SERVICE: 24/42 QA-verified (57%) ← FOCUS
- DISPATCH: 0/42 (0%)
- FOOD: 0/42 (0%)
- MEDICAL: 0/42 (0%)
- SALES: 0/42 (0%)
- GENERAL: 0/42 (0%)

### Key Architecture Patterns
- **Super_admin auth**: TWO layers must both handle super_admin: (1) DB `has_tenant_access()` function (migration 20260301210000) and (2) edge function `requireAuthedTenant` in `_shared/tenant.ts`. Both now check `user_roles` for super_admin and allow any tenant.
- **ai-plan-response**: Uses Anthropic Claude Haiku 4.5. Queries DB directly. Falls back gracefully if ANTHROPIC_API_KEY missing. FAQs+services always injected (commit 2c74dd1). Policy-type KB entries now in POLICIES section (commit cdf4655).
- **build-business-brain**: Queries 23 tables in parallel. Mode-specific knowledge only for matching mode. FAQs+services unconditional. Custom policies now in brain.policies.custom[] (commit cdf4655).
- **buildBusinessContext.ts policy flow**: Policy-type ai_knowledge_base entries are now promoted to the POLICIES section (not ADDITIONAL BUSINESS KNOWLEDGE). Non-policy supplementary items remain in ADDITIONAL BUSINESS KNOWLEDGE. This ensures the AI treats custom policies as hard constraints.
- **Booking customer linkage**: bookings table has NO customer_id. Link is `lead_id → leads.customer_id`. ALL booking lookups must go through leads table. dispatch_jobs and ai_call_sessions DO have customer_id.
- **tenant_id in agent tools**: MUST be `required: true` on ALL tools. Regression test guards this.
- **twilio_call_sid in transfer tool**: MUST be `required: true`.
- **booking_status enum**: Has BOTH 'canceled' and 'cancelled'. Use either.
- **ai_call_outcome enum**: booked, followup, lost, escalated, order, dispatch, message, lead_captured, referral_transfer. NO "cancellation" — use "followup" for cancel calls.
- **order_status enum**: pending, confirmed, preparing, ready, out_for_delivery, completed, cancelled. NO 'ready_for_pickup'.
- **RLS policy pattern**: All tenant-scoped tables need explicit SELECT/INSERT/UPDATE/DELETE policies + service_role bypass.
- **Global hooks must fail silently**: useAgencyAccount, useMyAgencyApplication, useKnowledgeConflicts, useNotifications all run on every page via AppLayout. They MUST NOT throw — return null/[] on error. All must have `retry: false` and `staleTime > 0`. Regression test enforces this.
- **Mode-aware terminology pattern**: Use `useIndustryContext()` → `terms` for UI labels. For public pages (no auth), use `getTerminology(mode)` directly.
- **test_drives vs sales_leads**: `vehicle_interest` is a valid column on `sales_leads` but NOT on `test_drives`. PostgREST silently drops unknown INSERT columns (no error, just data loss). Schema safety tests guard all 5 entity tables with allowlists.
- **Edge function deployment**: Functions MUST be deployed after code changes. Use: `SUPABASE_ACCESS_TOKEN=$(grep SUPABASE_ACCESS_TOKEN .env | cut -d'"' -f2) npx supabase functions deploy [name] --project-ref yltzlvzgwkidbeqaoevp`
- **_shared/tenant.ts redeploy**: When modifying `_shared/tenant.ts`, ALL 29 edge functions that import from it need redeployment.
- **busy_blocks MUST be tenant-scoped**: All UPDATE/DELETE on busy_blocks must include .eq("tenant_id", tenantId). Cancel and reschedule functions both fixed in f0ef4c5.
- **Date parsing**: elevenlabs-create-booking and elevenlabs-reschedule-booking both handle: today, tomorrow, ISO, MM/DD/YYYY, MM/DD, "March 5th", "next Monday". Webhook persistBooking uses tenant timezone offset via getTimezoneOffset().

### Remaining Work
- 16 WIP gates awaiting QA verification (all have eng/ux fixes deployed, plus 6 new bug fixes)
- 2 BLOCKED gates (Google Calendar OAuth, SMS A2P registration)
- ai_handles_edge_cases moved from FAIL → WIP (test framework fixed)

### Next Priorities
1. QA verification of all WIP gates (handoffs filed)
2. ai_handles_edge_cases should now pass with fixed test scripts
