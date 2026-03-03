# Receptionist Dev - Cross-Session Brain

## Last Session: 2026-03-03 5:28 AM ET (receptionist_eng — 4 bug fixes from QA handoffs)

### What Was Done
- **BUG FIX [ID:302]**: `create_callback` tool not invoked in Text Test. Root cause: tool description too narrow ("when you cannot handle their request directly"), Claude didn't realize it must invoke the tool for callback requests. Fixed: improved tool description, added `callbackCreated`/`callbackId` tracking, added system prompt supplement reinforcing tool usage rules.
- **BUG FIX [ID:305]**: Auth session drops on page navigation (full reload). Root cause: race condition where `getSession()` returns null before Supabase finishes localStorage recovery. Fixed: defensive retry in `AuthContext.initializeAuth` — if null returned but localStorage has session token, waits 300ms and retries once.
- **BUG FIX [ID:303]**: Emergency AI lacks empathy ("Actually give me your ZIP"). Added EMPATHY-FIRST RULE before urgent flow steps in `agentBasePrompts.ts` — safety emergencies (baby in heat, gas leak, etc.) must lead with empathy before data collection.
- **BUG FIX [ID:304]**: Call Test debug vars show "Not set". Pre-populated `DynamicVariablesDebugPanel` from `effectiveTenant` context before a call starts.
- Build: Clean (0 errors), Tests: 789/789 passing
- Commit: 89c51f9, pushed to main, deployed (frontend + text-conversation edge function)

### Build Status
- Build: Clean (0 errors)
- Tests: 789/789 passing
- Commit: 89c51f9
- Pushed to main, deployed

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

### Remaining Work
- QA verification: callback_request_works (in_progress), booking_sms_confirmation (WIP)
- QA verification: non_technical_usable, error_states_have_recovery, no_console_errors (all in_progress)
- 2 BLOCKED gates (Google Calendar OAuth, SMS A2P registration)
- transfer_to_human_works cannot be tested via simulator (no real Twilio call SID)
