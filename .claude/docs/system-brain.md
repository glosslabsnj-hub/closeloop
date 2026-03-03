# Receptionist Dev - Cross-Session Brain

## Last Session: 2026-03-03 6:27 AM ET (receptionist_ux — jargon pass 4 + plumbing terminology)

### What Was Done
- **JARGON PASS 4**: 15 more webhook/endpoint/payload instances replaced with plain English across 9 files (AutomationTemplatesSection, ElevenLabsInitWebhookCard, QuickActionsMenu, errorMessages, CallbackDeliverySettings, MedicalIntakeDeliverySettings, NodeConfigEditor, useIntegrations, FieldEdgeSetupCard).
- **FAQ PAYMENT TEXT**: Neutralized "We accept all major credit cards, debit cards, and cash" → generic wording that won't conflict with actual payment policy checkboxes. Fixes QA handoff #311.
- **PLUMBING BRAIN TERMINOLOGY**: `home_services` category now has `policiesCardTitle: "Service Policies"` (was inheriting generic "Booking Policies"). `getDynamicStepTitle` now uses terminology system for policies + knowledge steps — all 6 modes get correct labels from centralized data.
- Build: Clean (0 errors), Tests: 933/933 passing
- Commit: 0d190b6, pushed to main, deployed to production

### Build Status
- Build: Clean (0 errors)
- Tests: 933/933 passing
- Commit: 0d190b6
- Pushed to main + deployed

### MODE PROGRESS
- SERVICE: 32/42 QA-verified (76%) ← FOCUS
- DISPATCH: 0/42 (0%)
- FOOD: 0/42 (0%)
- MEDICAL: 0/42 (0%)
- SALES: 0/42 (0%)
- GENERAL: 0/42 (0%)

### Key Architecture Patterns
- **verify_jwt = false**: Required for ALL ElevenLabs tool endpoints and internally-called functions in `config.toml`. Covered by `verify-jwt-coverage.test.ts` (37 tests).
- **text-conversation**: Uses Claude tool-calling. Has 6 tools: create_booking, check_availability, create_callback, check_service_area, cancel_booking, reschedule_booking. Tool descriptions must be explicit about WHEN to invoke. System prompt supplement reinforces tool usage.
- **Auth session retry**: `AuthContext.initializeAuth` retries once if `getSession()` returns null but localStorage has a session token. Prevents false redirects to /login on full page reload.
- **Emergency empathy**: `agentBasePrompts.ts` has EMPATHY-FIRST RULE for safety emergencies. Empathy acknowledgment BEFORE data collection.
- **Booking module vs AI booking behavior**: The "booking" module controls infrastructure. `ai_booking_mode` controls auto-book vs request-callback.
- **Booking customer linkage**: bookings table has NO customer_id. Link is `lead_id → leads.customer_id`.
- **tenant_id in agent tools**: MUST be `required: true` on ALL tools.
- **AI edge functions use Anthropic API**: ALL 12 use `ANTHROPIC_API_KEY` with model `claude-haiku-4-5-20251001`.
- **tenants table address**: Single `address` text field. No separate `city`/`state` columns.
- **Error recovery pattern**: All data pages use React Query `refetch()` for retry (never `window.location.reload()`). Each error state offers: Try again, Back to Dashboard, Contact Support. Covered by 84 regression tests.
- **resolveCapabilities**: Pure function in `_shared/resolveCapabilities.ts`. Parses rawMode + enabled_modules + capabilities_json → Capabilities object. All 6 modes tested. Covered by 51 tests.
- **Onboarding re-entry**: `?force=true` URL param on `/app/onboarding` bypasses tenant redirect. Without it, completed tenants redirect to dashboard.
- **Sidebar subscription gating**: Sidebar passes `effectiveHasSubscription || !!tenant` to unlock nav for all tenants. Payment gate is on Go-Live page, not sidebar.
- **getDynamicStepTitle**: Uses terminology system (`terms.policiesCardTitle`, `terms.faqsCardTitle`) instead of hardcoded strings. All 6 modes resolve correct labels automatically.

### Remaining Work
- QA verification: complete_flow_works, smart_defaults_prefilled (both in_progress after commit 6136367)
- QA verification: callback_request_works, booking_sms_confirmation (in_progress)
- QA verification: non_technical_usable, error_states_have_recovery, no_console_errors (in_progress after commit 0d190b6)
- 3 BLOCKED gates (Google Calendar OAuth, SMS A2P registration, transfer_to_human needs real call)
- Pending fix handoffs: #310 (missing 2 plumbing services), #311 (payment method checkbox defaults)
