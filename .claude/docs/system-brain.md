# Receptionist Dev - Cross-Session Brain

## Last Session: 2026-03-02 11:29 AM ET (receptionist_eng — fix broken AI edge functions)

### What Was Done
- **Processed handoff #192**: AI Simulator + Brain Debugger completely broken. Both ai-plan-response and build-business-brain edge functions returning non-2xx.
- **Root cause found**: ai-plan-response used `LOVABLE_API_KEY` + `ai.gateway.lovable.dev` (old Lovable project AI gateway). That API key doesn't exist in the new Supabase project. build-business-brain was not in deploy-priority.sh, so never got redeployed with latest code.
- **Fixed ai-plan-response**: Replaced Lovable AI gateway with Anthropic Claude Haiku 4.5 API (`ANTHROPIC_API_KEY` + `api.anthropic.com/v1/messages`). Response format changed from OpenAI-compatible to Anthropic messages API.
- **Added build-business-brain to deploy-priority.sh**: Was missing from the deployment script entirely.
- **Deployed 3 edge functions**: ai-plan-response, build-business-brain, retrieve-knowledge — all fresh to production.
- **Frontend redeployed** to VPS.

### Build Status
- Build: Clean (0 errors)
- Tests: 406/406 passing
- Commit: 3b8737d
- Deployed to production (edge functions + frontend)
- Handoff #193 filed to QA (brain/edits_reflect_in_ai_behavior)

### MODE PROGRESS
- SERVICE: 23/42 QA-verified (55%) ← FOCUS
- DISPATCH: 0/42 (0%)
- FOOD: 0/42 (0%)
- MEDICAL: 0/42 (0%)
- SALES: 0/42 (0%)
- GENERAL: 0/42 (0%)

### Key Architecture Patterns
- **ai-plan-response**: Uses Anthropic Claude Haiku 4.5 (not Lovable gateway). Calls build-business-brain + retrieve-knowledge as sub-functions.
- **build-business-brain**: Queries 23 tables in parallel. Mode-specific knowledge (food/dispatch/medical) only included for matching mode.
- **tenant_id in agent tools**: MUST be `required: true` on ALL tools. Regression test guards this.
- **twilio_call_sid in transfer tool**: MUST be `required: true` — without it, transfer silently fails.
- **booking_status enum**: Has BOTH 'canceled' (American) and 'cancelled' (British). Use either.
- **Two HVAC tenants**: "Comfort Zone HVAC" (1c5cf729, QA) and "Cool Comfort HVAC" (2403d98e, seed).
- **RLS policy pattern**: All tenant-scoped tables need explicit SELECT/INSERT/UPDATE/DELETE policies + service_role bypass.
- **useModuleRequired**: Checks both enabledModules AND mode defaults — safe against capabilities resolution edge cases.
- **Dialog layering**: When opening a dialog after closing a Sheet, use 250ms setTimeout delay.

### Remaining Work
- Plan/Billing page: payment method integration with Stripe Customer Portal (needs edge function)
- Developer Tools Last Call Context shows empty values (low priority)

### Next Priorities
1. QA verification of brain/edits_reflect_in_ai_behavior (handoff #193)
2. Continue clearing WIP gates for SERVICE mode
3. Stripe Customer Portal edge function (future eng session)
