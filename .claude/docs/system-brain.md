# Receptionist Dev - Cross-Session Brain

## Last Session: 2026-03-03 7:56 AM ET (receptionist_fix — 115 regression tests)

### What Was Done
- **115 NEW REGRESSION TESTS**: Tests grew from 940 → 1055. Three new test files:
  - `appointment-label-overlay.test.ts` (65 tests): Full chain testing of `applyAppointmentLabel()` for all 6 modes, 12 industry types (plumber→job, dentist→visit, trainer→session, lawyer→consultation, etc.), booking verb helpers, getDynamicStepTitle, resolveCardTitle
  - `system-prompt-structure.test.ts` (40 tests): Guards `buildSystemPrompt` includes hours, FAQs, services, policies, tone, booking behavior, dispatch ETA, food ordering, HIPAA safety. Verifies text-conversation uses canonical buildBusinessContext (regression guard for handoffs #317/#321/#322)
  - `template-services-regression.test.ts` (+10 tests): Expanded to electrical, cleaning, landscaping, pest_control, auto_detailing, auto_repair, salon. Cross-industry data quality + FAQ/policy existence checks.
- Build: Clean (0 errors), Tests: 1055/1055 passing
- Commit: 8d4c7b7, pushed to main, deployed

### Build Status
- Build: Clean (0 errors)
- Tests: 1055/1055 passing
- Commit: 8d4c7b7
- Pushed to main + deployed

### MODE PROGRESS
- SERVICE: 32/42 QA-verified (76%) ← FOCUS
- DISPATCH: 0/42 (0%)
- FOOD: 0/42 (0%)
- MEDICAL: 0/42 (0%)
- SALES: 0/42 (0%)
- GENERAL: 0/42 (0%)

### Key Architecture Patterns
- **applyAppointmentLabel**: `lib/terminology.ts` function that overlays industry `appointmentLabel` onto mode-level UI terms. Called in `useIndustryContext()`. Affects booking/bookings/bookingCreated/bookingConfirmed/newBooking/viewBookings/pendingBooking/pendingBookings/bookingsMetricLabel/bookingsPageSubtitle. Does NOT override if appointmentLabel is "appointment" or "booking" (defaults) or already matches (e.g. dispatch "job"→"job").
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
- QA verification: terminology overlay (handoff #325 filed for plumbing term verification)
- QA verification: non_technical_usable, error_states_have_recovery, no_console_errors (in_progress after commit 0d190b6)
- 3 BLOCKED gates (Google Calendar OAuth, SMS A2P registration, transfer_to_human needs real call)
