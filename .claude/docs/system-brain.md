# Receptionist Dev - Cross-Session Brain

## Last Session: 2026-03-03 6:02 PM ET (receptionist_fix — check-availability + terminology fixes)

### What Was Done
- **check-availability numeric hours comparison** (commit 1b457a6): CRITICAL bug — string comparison of "14:00" < "9:00" was TRUE (broken for non-padded times). Replaced with `timeToMinutes()` numeric comparison in both `check-availability` and `elevenlabs-check-availability`. Also replaced broken `getTimezoneOffset()` (used fragile `new Date(localeString)`) with reliable Intl `longOffset` pattern matching the 3 other edge functions.
- **ReportsROIPage terminology**: Added `useIndustryContext` — plumber now sees "jobs" not "bookings" in tooltips
- **ModeAwareQuestions localization**: Quick question labels dynamically use `appointmentLabel` — plumber sees "AI Books Jobs"
- **EstimateBuilder placeholder**: Industry-specific examples (plumber: "Whole-House Repipe" not "HVAC System Replacement")
- 15 new regression tests for timeToMinutes and numeric business hours comparison
- Build: Clean (0 errors), Tests: 1289/1289 passing
- Commit: 1b457a6, pushed + deployed (frontend + 2 edge functions)

### Build Status
- Build: Clean (0 errors)
- Tests: 1289/1289 passing
- Commit: 1b457a6
- Pushed to main + deployed

### MODE PROGRESS
- SERVICE: 35/42 QA-verified (83%) ← FOCUS
- DISPATCH: 0/42 (0%)
- FOOD: 0/42 (0%)
- MEDICAL: 0/42 (0%)
- SALES: 0/42 (0%)
- GENERAL: 0/42 (0%)

### Key Architecture Patterns
- **check-availability hours comparison**: Uses `timeToMinutes()` for numeric comparison (not string). Handles non-padded times like "9:00". Both `check-availability/index.ts` and `elevenlabs-check-availability/index.ts` use identical pattern. Covered by 15 regression tests in `tests/check-availability.test.ts`.
- **getTimezoneOffset (5 edge functions)**: All now use `Intl.DateTimeFormat` with `timeZoneName: "longOffset"`. Extracts offset from "GMT-05:00" format. DST-aware when `refDate` parameter is passed. Functions: check-availability, elevenlabs-check-availability, elevenlabs-create-booking, elevenlabs-reschedule-booking, elevenlabs-webhook.
- **_shared/terminology.ts**: Edge function helper `getAppointmentLabel(mode, industrySlug)` mirrors frontend `industryTerminology.ts` appointmentLabel resolution. Maps mode defaults (dispatch→"dispatch", food→"reservation", medical→"visit") + slug overrides (plumbing→"job", lawyer→"consultation", etc.). Used in booking-handoff and cron-appointment-reminders.
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
- QA verification: check-availability fix (handoff #367)
- QA verification: dashboard/onboarding terminology fixes (handoff #368)
- QA verification: brain/edits_reflect_in_ai_behavior (in_progress after commit 83bbb7d — CRITICAL gate)
- QA verification: complete_flow_works, smart_defaults_prefilled (both in_progress after commits 6136367 + 0f7e451)
- QA verification: callback_request_works, booking_sms_confirmation (in_progress)
- QA verification: non_technical_usable, error_states_have_recovery, no_console_errors (in_progress)
- 3 BLOCKED gates (Google Calendar OAuth, SMS A2P registration, transfer_to_human needs real call)
