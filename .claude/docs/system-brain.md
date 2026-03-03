# Receptionist Dev - Cross-Session Brain

## Last Session: 2026-03-03 7:36 AM ET (receptionist_eng — text simulator brain injection fix)

### What Was Done
- **TEXT SIMULATOR BRAIN FIX**: `text-conversation` edge function was using ElevenLabs agent template + `fillTemplate()` for the AI system prompt. The template lacked `{{variable}}` placeholders for hours, FAQs, greeting, policies — so none of that data appeared in the prompt. Root cause: ElevenLabs passes this data via dynamic variables (not template substitution), but `fillTemplate()` only works for explicitly referenced `{{vars}}`. **Fix**: Now uses the canonical `systemPrompt` from `buildBusinessContext()` which already includes all business data. Commit 83bbb7d.
- **BRAIN DEBUGGER REDEPLOYED**: `build-business-brain`, `ai-plan-response`, `retrieve-knowledge` all redeployed to production. QA reported non-2xx errors (handoff #318).
- 5 handoffs completed (#317, #318, #320, #321, #322). QA handoff #324 filed for verification.
- Build: Clean (0 errors), Tests: 940/940 passing
- Commit: 83bbb7d, pushed to main, deployed to production

### Build Status
- Build: Clean (0 errors)
- Tests: 940/940 passing
- Commit: 83bbb7d
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
- **text-conversation**: Uses canonical `systemPrompt` from `buildBusinessContext()` + Claude tool-calling. Has 6 tools: create_booking, check_availability, create_callback, check_service_area, cancel_booking, reschedule_booking. Tool descriptions must be explicit about WHEN to invoke. System prompt supplement reinforces tool usage. NO longer fetches ElevenLabs template.
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
- QA verification: brain/edits_reflect_in_ai_behavior (in_progress after commit 83bbb7d — CRITICAL gate)
- QA verification: complete_flow_works, smart_defaults_prefilled (both in_progress after commits 6136367 + 0f7e451)
- QA verification: callback_request_works, booking_sms_confirmation (in_progress)
- QA verification: non_technical_usable, error_states_have_recovery, no_console_errors (in_progress after commit 0d190b6)
- 3 BLOCKED gates (Google Calendar OAuth, SMS A2P registration, transfer_to_human needs real call)
