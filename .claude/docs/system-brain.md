# Receptionist Dev - Cross-Session Brain

## Last Session: 2026-03-02 3:33 PM ET (receptionist_fix — dispatch column bugs, error boundaries, regression tests)

### What Was Done
- **7 wrong-column bugs fixed in dispatch edge functions**: elevenlabs-create-dispatch-job removed 6 non-existent columns from dispatch_jobs INSERT (dispatch_distance_miles, tow_distance_miles, total_distance_miles, service_tier, pricing_note, price_breakdown). elevenlabs-webhook changed vehicle_category→service_category and removed dispatch_distance_miles. These caused silent data loss.
- **3 error boundaries added**: GoLivePage, TestAIPage, AutomationsPage. All 18 critical pages now protected.
- **67 new regression tests**: edge-fn-schema-safety.test.ts (20), error-boundary-coverage.test.ts (36), mutation-schema-safety.test.ts (+11).

### Build Status
- Build: Clean (0 errors)
- Tests: 626/626 passing
- Commit: b9b0f1d
- Pushed to main, deployed to app.getfluxdata.com
- Edge functions deployed: elevenlabs-create-dispatch-job, elevenlabs-webhook

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
