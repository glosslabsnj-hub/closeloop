# Receptionist Dev - Cross-Session Brain

## Last Session: 2026-03-02 4:22 PM ET (receptionist_ux — terminology + responsive fixes)

### What Was Done
- **LeadCard**: "Book Appointment" and "Convert to Customer" now use mode-aware terms
- **BookingBehaviorSettings**: 12 hardcoded strings replaced with mode-aware terms (title, description, radio labels, notifications, AI preview)
- **MetricsGrid**: Tighter mobile spacing at 375px (gap-2, p-2.5, text-xl, h-7 icons)
- **PageHeader**: Action buttons stack below title on mobile (flex-col sm:flex-row)
- **SettingsPage**: Mobile padding reduced (px-4 py-4 on mobile)
- **CustomersPage**: Filter dropdowns shrink to w-[104px] on mobile

### Build Status
- Build: Clean (0 errors)
- Tests: 626/626 passing
- Commit: 2332ab9
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
- **ai-plan-response**: Uses Anthropic Claude Haiku 4.5. Queries DB directly. Falls back gracefully if ANTHROPIC_API_KEY missing.
- **build-business-brain**: Queries 23 tables in parallel. Mode-specific knowledge only for matching mode.
- **Onboarding template priority**: industryCatalog.ts is authoritative. Step 5b (legacy industryTemplates) SKIPPED when catalog entry exists.
- **tenant_id in agent tools**: MUST be `required: true` on ALL tools. Regression test guards this.
- **twilio_call_sid in transfer tool**: MUST be `required: true`.
- **booking_status enum**: Has BOTH 'canceled' and 'cancelled'. Use either.
- **order_status enum**: pending, confirmed, preparing, ready, out_for_delivery, completed, cancelled. NO 'ready_for_pickup'.
- **RLS policy pattern**: All tenant-scoped tables need explicit SELECT/INSERT/UPDATE/DELETE policies + service_role bypass.
- **Global hooks must fail silently**: useAgencyAccount, useMyAgencyApplication, useKnowledgeConflicts all run on every page via AppLayout. They MUST NOT throw — return null/[] on error.
- **Mode-aware terminology pattern**: Use `useIndustryContext()` → `terms` for UI labels. Never hardcode "Customer", "appointment", "Walk-in".
- **Edge function deployment**: Functions MUST be deployed after code changes. Code changes alone don't affect production. Use: `SUPABASE_ACCESS_TOKEN=$(grep SUPABASE_ACCESS_TOKEN .env | cut -d'"' -f2) npx supabase functions deploy [name] --project-ref yltzlvzgwkidbeqaoevp`
- **Vitest file reads**: Use `@vitest-environment node` directive, import from `node:fs` and `node:path`.
- **_shared/tenant.ts redeploy**: When modifying `_shared/tenant.ts`, ALL 29 edge functions that import from it need redeployment. For targeted fixes, only redeploy the affected functions.

### Remaining Work
- 15 WIP gates awaiting QA verification (most have eng fixes deployed)
- 2 BLOCKED gates (Google Calendar OAuth, SMS A2P registration)
- 1 FAILING gate (ai_handles_edge_cases — WS connection drops in test framework, not an eng issue)
- Plan/Billing settings tab: "Manage Billing" on settings page (low priority)
- Stripe Customer Portal configuration (Jack task)

### Next Priorities
1. QA verification of AI Simulator fix (handoff #220 filed)
2. Continue clearing WIP gates as QA verifies them
3. Address console errors (handoff #219 to receptionist_fix)
