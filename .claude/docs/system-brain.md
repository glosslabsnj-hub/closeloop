# Receptionist Dev - Cross-Session Brain

## Last Session: 2026-03-02 2:15 PM ET (receptionist_eng — edge fn deploy, duplicate services fix)

### What Was Done
- **Edge functions deployed**: ai-plan-response, build-business-brain, retrieve-knowledge all redeployed. Functions had been rewritten in code (commit edd0e7c) but never deployed to production — this was the root cause of AI Simulator failures.
- **Duplicate HVAC services fixed**: Cleaned 7 inactive duplicate services from Cool Comfort HVAC tenant (2403d98e). Root cause: onboarding Step 5b applied legacy industryTemplates on top of industryCatalog data.
- **Onboarding duplicate prevention**: Added guard in useOnboardingSubmit.ts Step 5b — skips legacy template merge when `getIndustryBySlug()` finds a catalog entry (Steps 2-5 already seed from authoritative catalog).
- **Console errors (#208)**: Confirmed already fixed in prior commits (bc70552, be71625). All 3 global hooks return safe defaults.

### Build Status
- Build: Clean (0 errors)
- Tests: 536/536 passing
- Commit: f2e51fa
- Pushed to main, deployed to app.getfluxdata.com
- Edge functions deployed: ai-plan-response, build-business-brain, retrieve-knowledge

### MODE PROGRESS
- SERVICE: 23/42 QA-verified (55%) ← FOCUS
- DISPATCH: 0/42 (0%)
- FOOD: 0/42 (0%)
- MEDICAL: 0/42 (0%)
- SALES: 0/42 (0%)
- GENERAL: 0/42 (0%)

### Key Architecture Patterns
- **ai-plan-response**: Uses Anthropic Claude Haiku 4.5 (not Lovable gateway). Queries DB directly.
- **build-business-brain**: Queries 23 tables in parallel. Mode-specific knowledge only for matching mode.
- **Onboarding template priority**: industryCatalog.ts is authoritative. Step 5b (legacy industryTemplates) SKIPPED when catalog entry exists. This prevents duplicate services.
- **tenant_id in agent tools**: MUST be `required: true` on ALL tools. Regression test guards this.
- **twilio_call_sid in transfer tool**: MUST be `required: true`.
- **booking_status enum**: Has BOTH 'canceled' and 'cancelled'. Use either.
- **order_status enum**: pending, confirmed, preparing, ready, out_for_delivery, completed, cancelled. NO 'ready_for_pickup'.
- **RLS policy pattern**: All tenant-scoped tables need explicit SELECT/INSERT/UPDATE/DELETE policies + service_role bypass.
- **Global hooks must fail silently**: useAgencyAccount, useMyAgencyApplication, useKnowledgeConflicts all run on every page via AppLayout. They MUST NOT throw — return null/[] on error.
- **Mode-aware terminology pattern**: Use `useIndustryContext()` → `terms` for UI labels. Never hardcode "Customer", "appointment", "Walk-in".
- **Edge function deployment**: Functions MUST be deployed after code changes. Code changes alone don't affect production. Use: `SUPABASE_ACCESS_TOKEN=$(grep SUPABASE_ACCESS_TOKEN .env | cut -d'"' -f2) npx supabase functions deploy [name] --project-ref yltzlvzgwkidbeqaoevp`
- **Stripe Billing Portal**: Requires portal configuration in Stripe Dashboard. Edge function is create-billing-portal-session.
- **Vitest file reads**: Use `@vitest-environment node` directive, import from `node:fs` and `node:path`.

### Remaining Work
- Plan/Billing settings tab: may want "Manage Billing" on settings page too (currently only on /app/usage)
- Developer Tools Last Call Context shows empty values (low priority)
- Stripe Customer Portal configuration needs to be set up in Stripe Dashboard
- RequiredQuestionsEditor still has 5 hardcoded "Customer Name" labels (need mode-aware helper, lower priority)

### Next Priorities
1. QA verification of edge function deployment + duplicate services fix
2. Continue clearing WIP gates for SERVICE mode
3. Stripe Dashboard: configure Customer Portal settings (Jack task)
