# Receptionist Dev - Cross-Session Brain

## Last Session: 2026-03-02 9:00 PM ET (receptionist_ux — admin preview + mode terminology)

### What Was Done
- **Admin Client Preview toggle** (commit 82082e3): Super admins can click Eye/EyeOff button on admin bar to hide all admin controls and see exact client experience. Uses existing `adminBarCollapsed` localStorage state.
- **Mode-aware terminology in 6 components**: WelcomeBanner ("customers" → `terms.customers`), AIAssistantPage ("booking appointments" → `getActiveVerb()`), EmptyDashboard (sales/medical mode-specific verbs), QuickLinksCard (removed hardcoded "Appointments" fallback), TestAIPage (booking phrase + appointment label dynamic).
- **New `getActiveVerb()` helper** in industryTerminology.ts: Returns present-participle forms like "scheduling jobs", "booking appointments", "taking orders" per appointmentLabel.

### Build Status
- Build: Clean (0 errors)
- Tests: 678/678 passing
- Commit: 82082e3
- Pushed to main

## Previous Session: 2026-03-02 8:49 PM ET (receptionist_eng — 4 critical QA bug fixes)

### What Was Done (Previous)
- **Fixed 4 critical bugs from QA HVAC Dashboard R2** (commit 75530c2, deployed to production):
  - Fix 1: **Desktop dashboard 0-data** — MetricsGrid used `tenant?.id` instead of `effectiveTenantId`. Admin testing showed 0/0/0 because queries hit wrong tenant. Also fixed useTenantConfig (SPINE file) to use `effectiveTenant ?? tenant`.
  - Fix 2: **Estimates RLS** — 7 competitive-features tables had `FOR ALL USING()` without `WITH CHECK`, blocking all INSERTs. Added WITH CHECK + service_role bypass to: estimates, service_agreements, time_entries, technician_locations, customer_equipment, integration_connections, review_requests.
  - Fix 3: **Lead stage update** — followup_status trigger only allowed 5 values (new, called_back, no_answer, completed, lost) but UI pipeline needed 'contacted' and 'quoted'. Expanded trigger. Also fixed UI to map 'won' → 'completed' and map 'completed'/'called_back' back to correct UI stages.
  - Fix 4: **Admin context loss** — AppLayout had incomplete route whitelist missing /app/jobs, /app/inventory, etc. Replaced with `/app/` prefix check. All /app/ pages now accessible (inline paywall handles non-subscribers).
- **Migration 20260302200000** applied via Management API (all 9 SQL statements verified)
- **ai_call_sessions** RLS also got WITH CHECK added

### Build Status
- Build: Clean (0 errors)
- Tests: 678/678 passing
- Commit: 75530c2
- Pushed to main, deployed to production

### MODE PROGRESS
- SERVICE: 25/42 QA-verified (60%) ← FOCUS
- DISPATCH: 0/42 (0%)
- FOOD: 0/42 (0%)
- MEDICAL: 0/42 (0%)
- SALES: 0/42 (0%)
- GENERAL: 0/42 (0%)

### Key Architecture Patterns
- **Super_admin auth**: TWO layers must both handle super_admin: (1) DB `has_tenant_access()` function (migration 20260301210000) and (2) edge function `requireAuthedTenant` in `_shared/tenant.ts`. Both now check `user_roles` for super_admin and allow any tenant.
- **AdminModeProvider is a SINGLETON in App.tsx**: NEVER put it inside layout components (AppLayout/AdminLayout). It must persist across all route changes. Layout components remount when switching between /admin/* and /app/*, destroying any providers they contain.
- **ai-plan-response**: Uses Anthropic Claude Haiku 4.5. Queries DB directly. Falls back gracefully if ANTHROPIC_API_KEY missing. FAQs+services always injected (commit 2c74dd1). Policy-type KB entries now in POLICIES section (commit cdf4655).
- **build-business-brain**: Queries 23 tables in parallel. Mode-specific knowledge only for matching mode. FAQs+services unconditional. Custom policies now in brain.policies.custom[] (commit cdf4655).
- **buildBusinessContext.ts policy flow**: Policy-type ai_knowledge_base entries are now promoted to the POLICIES section (not ADDITIONAL BUSINESS KNOWLEDGE). Non-policy supplementary items remain in ADDITIONAL BUSINESS KNOWLEDGE. This ensures the AI treats custom policies as hard constraints.
- **Booking customer linkage**: bookings table has NO customer_id. Link is `lead_id → leads.customer_id`. ALL booking lookups must go through leads table. dispatch_jobs and ai_call_sessions DO have customer_id.
- **tenant_id in agent tools**: MUST be `required: true` on ALL tools. Regression test guards this.
- **twilio_call_sid in transfer tool**: MUST be `required: true`.
- **booking_status enum**: Has BOTH 'canceled' and 'cancelled'. Use either.
- **ai_call_outcome enum**: booked, followup, lost, escalated, order, dispatch, message, lead_captured, referral_transfer. NO "cancellation" — use "followup" for cancel calls.
- **order_status enum**: pending, confirmed, preparing, ready, out_for_delivery, completed, cancelled. NO 'ready_for_pickup'.
- **RLS policy pattern**: All tenant-scoped tables need `FOR ALL USING(...) WITH CHECK(...)` + service_role bypass. Missing WITH CHECK blocks INSERT/UPDATE. 7 competitive-features tables fixed in 75530c2.
- **useTenantConfig uses effectiveTenant**: Changed from `tenant` to `effectiveTenant ?? tenant` so admin tenant switching shows correct mode/modules/industry. This is a SPINE file — changes affect all modes.
- **AppLayout route gating**: Uses `/app/` prefix check (not a manual whitelist). All /app/ routes accessible; inline paywall card handles non-subscribers.
- **followup_status valid values**: new, called_back, no_answer, completed, lost, contacted, quoted. DB trigger validates. UI maps: won→completed, contacted↔called_back.
- **Global hooks must fail silently**: useAgencyAccount, useMyAgencyApplication, useKnowledgeConflicts, useNotifications all run on every page via AppLayout. They MUST NOT throw — return null/[] on error. All must have `retry: false` and `staleTime > 0`. Regression test enforces this.
- **Mode-aware terminology pattern**: Use `useIndustryContext()` → `terms` for UI labels. For public pages (no auth), use `getTerminology(mode)` directly.
- **test_drives vs sales_leads**: `vehicle_interest` is a valid column on `sales_leads` but NOT on `test_drives`. PostgREST silently drops unknown INSERT columns (no error, just data loss). Schema safety tests guard all 5 entity tables with allowlists.
- **Edge function deployment**: Functions MUST be deployed after code changes. Use: `SUPABASE_ACCESS_TOKEN=$(grep SUPABASE_ACCESS_TOKEN .env | cut -d'"' -f2) npx supabase functions deploy [name] --project-ref yltzlvzgwkidbeqaoevp`
- **_shared/tenant.ts redeploy**: When modifying `_shared/tenant.ts`, ALL 29 edge functions that import from it need redeployment.
- **busy_blocks MUST be tenant-scoped**: All UPDATE/DELETE on busy_blocks must include .eq("tenant_id", tenantId). Cancel and reschedule functions both fixed in f0ef4c5.
- **Date parsing**: elevenlabs-create-booking and elevenlabs-reschedule-booking both handle: today, tomorrow, ISO, MM/DD/YYYY, MM/DD, "March 5th", "next Monday". Webhook persistBooking uses tenant timezone offset via getTimezoneOffset().

### Remaining Work
- 16 WIP gates awaiting QA verification (all have eng/ux fixes deployed, plus 4 new bug fixes from 75530c2)
- 2 BLOCKED gates (Google Calendar OAuth, SMS A2P registration)

### Next Priorities
1. QA verification of all WIP gates (handoff #249 filed)
2. dashboard/correct_mode_terminology (FAIL) — admin UI leaking, needs UX fix
3. ai_handles_edge_cases should now pass with fixed test scripts
