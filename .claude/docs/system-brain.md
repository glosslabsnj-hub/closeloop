# Receptionist Dev - Cross-Session Brain

## Last Session: 2026-03-02 6:52 PM ET (receptionist_eng — policy promotion fix)

### What Was Done
- **Fixed AI policy violation**: Policy-type `ai_knowledge_base` entries (e.g., "No Phone Quotes Over 500") were landing in weak "ADDITIONAL BUSINESS KNOWLEDGE" section of AI prompt. Promoted them to authoritative "POLICIES (MUST FOLLOW)" section in both `buildBusinessContext.ts` (ElevenLabs agent) and `ai-plan-response` (AI debugger). Also added `custom[]` array to `build-business-brain` brain.policies for downstream consumers.
- **Deployed**: ai-plan-response, build-business-brain, twilio-inbound, elevenlabs-webhook. Frontend to VPS.

### Build Status
- Build: Clean (0 errors)
- Tests: 661/661 passing
- Commit: cdf4655
- Pushed to main

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
