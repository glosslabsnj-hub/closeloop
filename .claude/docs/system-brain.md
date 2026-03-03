# Receptionist Dev - Cross-Session Brain

## Last Session: 2026-03-03 4:57 AM ET (receptionist_fix — cancel-dispatch verify_jwt + text-conversation tools + 98 tests)

### What Was Done
- **BUG FIX**: `elevenlabs-cancel-dispatch-job` missing `verify_jwt = false` in config.toml. Would cause 401 on all dispatch mode cancel calls. Same class as the 24-function outage (ea534fd). Fixed + deployed.
- **text-conversation**: Added `cancel_booking` + `reschedule_booking` tools to text simulator. QA can now test all 6 tool flows without voice calls.
- **98 new regression tests** (3 test files):
  - `verify-jwt-coverage.test.ts` (37 tests) — scans config.toml, prevents JWT outage regression
  - `text-conversation-tools.test.ts` (26 tests) — ensures all voice tools exposed in text simulator
  - `cancel-reschedule-safety.test.ts` (35 tests) — schema/param/enum safety
- Build: Clean (0 errors), Tests: 789/789 passing
- Commit: b1c736c, pushed to main, deployed (text-conversation + cancel-dispatch-job)

### Previous Session: 2026-03-03 4:46 AM ET (receptionist_ux — Jargon audit pass 2)
- 10 more jargon items replaced (24 total), ErrorBoundary support link added

### Build Status
- Build: Clean (0 errors)
- Tests: 789/789 passing
- Commit: b1c736c
- Pushed to main, deployed

### MODE PROGRESS
- SERVICE: 33/42 QA-verified (79%) ← FOCUS
- DISPATCH: 0/42 (0%)
- FOOD: 0/42 (0%)
- MEDICAL: 0/42 (0%)
- SALES: 0/42 (0%)
- GENERAL: 0/42 (0%)

### Key Architecture Patterns
- **verify_jwt = false**: Required for ALL ElevenLabs tool endpoints and internally-called functions in `config.toml`. Now covered by `verify-jwt-coverage.test.ts` (37 tests).
- **text-conversation**: Uses Claude tool-calling. Has 6 tools: create_booking, check_availability, create_callback, check_service_area, cancel_booking, reschedule_booking. Creates real DB records.
- **Booking module vs AI booking behavior**: The "booking" module controls infrastructure. `ai_booking_mode` controls auto-book vs request-callback.
- **Booking customer linkage**: bookings table has NO customer_id. Link is `lead_id → leads.customer_id`.
- **transfer_to_owner**: MUST have `twilio_call_sid` in required params.
- **tenant_id in agent tools**: MUST be `required: true` on ALL tools.
- **AI edge functions use Anthropic API**: ALL 12 use `ANTHROPIC_API_KEY` with model `claude-haiku-4-5-20251001`.
- **Service area validation**: Extracts US state from address, compares tenant vs customer, allows neighboring states.
- **tenants table address**: Single `address` text field. No separate `city`/`state` columns.

### Remaining Work
- QA verification: booking_creates_correctly, booking_sms_confirmation, service_area_validation
- QA verification: cancel_booking_works, reschedule_booking_works, callback_request_works (all now in_progress)
- QA verification: non_technical_usable, error_states_have_recovery, no_console_errors
- 2 BLOCKED gates (Google Calendar OAuth, SMS A2P registration)
- transfer_to_human_works cannot be tested via simulator (no real Twilio call SID)

### Next Priorities
1. QA re-test HVAC ai_testing round 3 (booking, cancel, reschedule, callback all testable now)
2. QA verify non_technical_usable + error_states_have_recovery gates
