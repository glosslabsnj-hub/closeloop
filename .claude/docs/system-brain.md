# Receptionist Dev - Cross-Session Brain

## Last Session: 2026-03-03 5:53 AM ET (receptionist_fix — contextual errors + 143 regression tests)

### What Was Done
- **JARGON FIX**: Replaced 10 generic "Something went wrong" messages with contextual descriptions across 10 components (AIAssistantPage, GoLivePage, AgencyApplicationForm, LiveFAQList×3, SessionExpirationHandler, SharePortalLinkDialog, IntegrationConnectDialog). Also cleaned webhook/endpoint jargon in WebhookSetup + IntegrationGuide.
- **NEW TESTS**: 143 regression tests in 3 new files:
  - `error-recovery-patterns.test.ts` (84 tests): refetch pattern, contextual headings, recovery links, no window.location.reload
  - `jargon-regression.test.ts` (8 tests): forbidden error phrases scanner
  - `resolve-capabilities.test.ts` (51 tests): critical edge function had ZERO coverage
- Build: Clean (0 errors), Tests: 932/932 passing
- Commit: a99086c, pushed to main, deployed to production

### Build Status
- Build: Clean (0 errors)
- Tests: 932/932 passing
- Commit: a99086c
- Pushed to main + deployed

### MODE PROGRESS
- SERVICE: 34/42 QA-verified (81%) ← FOCUS
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

### Remaining Work
- QA verification: callback_request_works, booking_sms_confirmation, estimates_save_works, booking_date_picker_works (all in_progress)
- QA verification: non_technical_usable, error_states_have_recovery, no_console_errors (all in_progress)
- 3 BLOCKED gates (Google Calendar OAuth, SMS A2P registration, transfer_to_human needs real call)
