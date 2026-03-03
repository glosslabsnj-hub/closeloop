# Receptionist Dev - Cross-Session Brain

## Last Session: 2026-03-03 12:01 AM ET (receptionist_fix — Admin tenant context hardening)

### What Was Done
- **Hardened admin tenant context persistence on direct URL navigation** (commit 810d29f, deployed):
  1. `fetchAdminSettings` auto-create path now sets localStorage before early return (was missing, causing no synchronous backup on next reload)
  2. `effectiveTenantId` uses localStorage bridge during loading when `isSuperAdmin` hasn't been determined yet (prevents brief null window)
  3. Skip redundant tenant re-fetch in `fetchAdminSettings` when pre-fetch branch already loaded data (reduces extra renders + network calls)
- 7 new regression tests for effectiveTenantId bridge + auto-create localStorage
- Build: Clean (0 errors), Tests: 685/685 passing
- Handoff #272 (direct URL nav) resolved, #273 (mobile sidebar) already fixed by UX

### Previous Session: 2026-03-02 11:43 PM ET (receptionist_ux — Mobile sidebar fix)
- Fixed MobileSidebar at 375px: full-screen solid overlay → semi-transparent backdrop + 280px panel (commit fb24479)

### Build Status
- Build: Clean (0 errors)
- Tests: 685/685 passing
- Commit: 810d29f
- Pushed to main, deployed to production

### MODE PROGRESS
- SERVICE: 27/42 QA-verified (64%) ← FOCUS
- DISPATCH: 0/42 (0%)
- FOOD: 0/42 (0%)
- MEDICAL: 0/42 (0%)
- SALES: 0/42 (0%)
- GENERAL: 0/42 (0%)

### Key Architecture Patterns
- **Admin tenant context persistence (3-layer defense)**: (1) localStorage `flux_admin_active_tenant_id` set synchronously on every tenant switch + auto-create, (2) `effectiveTenantId` uses localStorage bridge during loading when `isSuperAdmin` not yet determined, (3) AppLayout redirect effects check localStorage as synchronous backup before any redirect. Commit 810d29f hardened all 3 layers.
- **fetchAdminSettings skipTenantFetch**: When pre-fetch branch already loaded tenant data, pass `skipTenantFetch=true` to avoid redundant DB queries + extra renders. Only the adminSettings DB row sync is needed.
- **Super_admin auth**: TWO layers must both handle super_admin: (1) DB `has_tenant_access()` function and (2) edge function `requireAuthedTenant` in `_shared/tenant.ts`. Both check `user_roles` for super_admin.
- **AdminModeProvider is a SINGLETON in App.tsx**: NEVER put it inside layout components. It must persist across all route changes.
- **ai-plan-response**: Uses Anthropic Claude Haiku 4.5. FAQs+services always injected. Policy-type KB entries in POLICIES section.
- **Booking customer linkage**: bookings table has NO customer_id. Link is `lead_id → leads.customer_id`.
- **tenant_id in agent tools**: MUST be `required: true` on ALL tools. Regression test guards this.
- **twilio_call_sid in transfer tool**: MUST be `required: true`.
- **booking_status enum**: Has BOTH 'canceled' and 'cancelled'. Use either.
- **ai_call_outcome enum**: booked, followup, lost, escalated, order, dispatch, message, lead_captured, referral_transfer.
- **order_status enum**: pending, confirmed, preparing, ready, out_for_delivery, completed, cancelled.
- **RLS policy pattern**: All tenant-scoped tables need `has_tenant_access()` with super_admin bypass + service_role bypass.
- **RLS MUST NOT reference auth.users**: Use `auth.jwt() ->> 'email'` or `auth.uid()` instead.
- **AppLayout route gating**: Uses `/app/` prefix check (not a manual whitelist). Inline paywall card handles non-subscribers.
- **Global hooks must fail silently**: useAgencyAccount, useMyAgencyApplication, useKnowledgeConflicts, useNotifications — all MUST NOT throw.
- **AI edge functions use Anthropic API**: ALL 12 use `ANTHROPIC_API_KEY` with `api.anthropic.com/v1/messages`, model `claude-haiku-4-5-20251001`.
- **Edge function deployment**: `SUPABASE_ACCESS_TOKEN=$(grep SUPABASE_ACCESS_TOKEN .env | cut -d'"' -f2) npx supabase functions deploy [name] --project-ref yltzlvzgwkidbeqaoevp`
- **Date parsing**: elevenlabs-create-booking and elevenlabs-reschedule-booking handle: today, tomorrow, ISO, MM/DD/YYYY, MM/DD, "March 5th", "next Monday".

### Remaining Work
- 15 WIP gates awaiting QA verification (all fixes deployed, handoffs filed)
- 2 BLOCKED gates (Google Calendar OAuth, SMS A2P registration)

### Next Priorities
1. QA verification of all WIP gates
2. Admin tenant context fix (810d29f) needs QA verification via direct URL navigation test
3. All other pending handoffs resolved
