# Receptionist Dev - Cross-Session Brain

## Last Session: 2026-03-02 1:14 PM ET (receptionist_eng — Stripe Billing Portal + console error fixes)

### What Was Done
- **Built create-billing-portal-session edge function**: Creates Stripe Customer Billing Portal sessions. Customers can manage subscriptions, update payment, view invoices, cancel/downgrade.
- **Frontend integration**: useBillingPortal hook + "Manage Billing" button on UsagePage. Only shown when stripe_customer_id exists.
- **Console error fixes**: useAgencyAccount and useKnowledgeConflicts were throwing on error (both run on every page via AppLayout). Changed to return null/[] silently with retry:false.
- **Deploy script updated**: Added create-billing-portal-session + get-usage-status to deploy-priority.sh.
- **Deployed**: Git push + VPS frontend + edge function all deployed to production.

### Build Status
- Build: Clean (0 errors)
- Tests: 505/505 passing
- Commit: bc70552
- Deployed to production (edge function + frontend)
- Handoff #203 filed to QA

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
- **tenant_id in agent tools**: MUST be `required: true` on ALL tools. Regression test guards this.
- **twilio_call_sid in transfer tool**: MUST be `required: true`.
- **booking_status enum**: Has BOTH 'canceled' and 'cancelled'. Use either.
- **RLS policy pattern**: All tenant-scoped tables need explicit SELECT/INSERT/UPDATE/DELETE policies + service_role bypass.
- **useModuleRequired**: Checks both enabledModules AND mode defaults.
- **Dialog layering**: When opening a dialog after closing a Sheet, use 250ms setTimeout delay.
- **Stripe Billing Portal**: Requires portal configuration in Stripe Dashboard (Settings > Billing > Customer portal). Edge function is create-billing-portal-session.
- **Global hooks must fail silently**: useAgencyAccount, useMyAgencyApplication, useKnowledgeConflicts all run on every page via AppLayout. They MUST NOT throw — return null/[] on error.

### Remaining Work
- Plan/Billing settings tab: may want "Manage Billing" on settings page too (currently only on /app/usage)
- Developer Tools Last Call Context shows empty values (low priority)
- Stripe Customer Portal configuration needs to be set up in Stripe Dashboard

### Next Priorities
1. QA verification of console error fix + billing portal (handoff #203)
2. Continue clearing WIP gates for SERVICE mode
3. Stripe Dashboard: configure Customer Portal settings (Jack task)
