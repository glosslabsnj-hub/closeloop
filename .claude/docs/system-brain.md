# Receptionist Dev - Cross-Session Brain

## Last Session: 2026-03-02 11:43 PM ET (receptionist_ux — Mobile sidebar fix)

### What Was Done
- **Fixed critical mobile sidebar UX bug** (commit fb24479): MobileSidebar at 375px was a full-screen solid overlay (`fixed inset-0`) with no backdrop-click-to-close, trapping users. Replaced with standard mobile sidebar pattern: semi-transparent backdrop (z-99, click to dismiss) + 280px slide-from-left panel (z-100, max 85vw). File: `src/components/ui/animated-sidebar.tsx`.
- Build: Clean (0 errors), Tests: 678/678 passing

### Previous Session: 2026-03-02 11:36 PM ET (receptionist_eng — Lovable→Anthropic AI migration)

### What Was Done
- **Migrated ALL 12 AI edge functions from dead Lovable gateway to Anthropic API** (commit 939d30a, deployed):
  - ROOT CAUSE: LOVABLE_API_KEY was never configured on new Supabase project. All edge functions calling `ai.gateway.lovable.dev` returned 500 errors.
  - FIX: Replaced all 12 functions to use ANTHROPIC_API_KEY (already configured) with `api.anthropic.com/v1/messages`, model `claude-haiku-4-5-20251001`.
  - Functions fixed: partner-analysis (AI Insights page errors), ai-text-reply, generate-insights, parse-services-text, process-knowledge-upload (tool calling + vision), vin-ocr (vision), admin-marketing-chat (streaming with SSE translation), marketing-chat, admin-outreach-execute, admin-generate-ad-copy, admin-generate-social-batch, admin-outreach-response.
  - Zero LOVABLE_API_KEY references remain in the codebase.

### Build Status
- Build: Clean (0 errors)
- Tests: 678/678 passing
- Commit: 939d30a
- Pushed to main, deployed to production

### MODE PROGRESS
- SERVICE: 28/42 QA-verified (67%) ← FOCUS
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
- **RLS policy pattern**: All tenant-scoped tables need `FOR ALL USING(has_tenant_access(auth.uid(), tenant_id)) WITH CHECK(has_tenant_access(auth.uid(), tenant_id))` + service_role bypass. `has_tenant_access()` checks BOTH `tenant_users` AND `user_roles.super_admin`. Using `tenant_users`-only check causes 403 for super admins testing other tenants. 7 competitive-features tables fixed in 3887730.
- **RLS MUST NOT reference auth.users**: The `authenticated` role cannot SELECT from `auth.users`. Use `auth.jwt() ->> 'email'` or `auth.uid()` instead. Subqueries against auth.users in RLS policies cause "permission denied for table users" (HTTP 401). Fixed in agency_applications (commit 4f1b876).
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
- **AI edge functions use Anthropic API**: ALL 12 AI-powered edge functions now use `ANTHROPIC_API_KEY` with `api.anthropic.com/v1/messages` and model `claude-haiku-4-5-20251001`. NO more Lovable gateway. Response parsing: `content[0].text` for text, `content.find(b => b.type === 'tool_use').input` for tool calling, `type: "image"` with `source.type: "base64"` for vision. Streaming functions use SSE format translation (Anthropic → OpenAI format).

### Remaining Work
- 14 WIP gates awaiting QA verification (fixes deployed, handoffs filed)
- 2 BLOCKED gates (Google Calendar OAuth, SMS A2P registration)

### Next Priorities
1. QA verification of all WIP gates (handoffs #267-271 filed)
2. overall/no_console_errors now fixed (commit 4f1b876) — awaiting QA verification
3. All other pending handoffs resolved (booking picker, dashboard today, customers Active=0)
