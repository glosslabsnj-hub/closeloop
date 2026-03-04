# Receptionist Dev - Cross-Session Brain

## Last Session: 2026-03-04 3:56 PM ET (receptionist_eng — console cleanup, dispatch audit)

### What Was Done
- **Console noise cleanup** (commit b453ec5): Removed debug console.log from templateResolver (fired every config lookup), writeBrainFact audit stub, useSubscription provisioning logs, AdminTestOnboardingPage, createDefaultWorkflows. 5 files, 28 lines removed.
- **DISPATCH mode audit**: Full infrastructure audit confirms 85% complete. All edge functions, config.toml verify_jwt, terminology, onboarding config, brain layout, pricing models — all correct. No fixes needed.
- **Deployed**: Frontend to VPS + pushed to GitHub successfully.
- Build: Clean (0 errors), Tests: 1299/1299 passing

### Build Status
- Build: Clean (0 errors)
- Tests: 1299/1299 passing
- Commit: b453ec5
- Deployed to VPS + pushed to GitHub

### MODE PROGRESS
- SERVICE: 35/42 QA-verified (83%) ← FOCUS (all eng work done, 6 awaiting QA, 3 blocked)
- DISPATCH: 0/42 (0%) — infrastructure 85% ready, no QA gates created yet
- FOOD: 0/42 (0%)
- MEDICAL: 0/42 (0%)
- SALES: 0/42 (0%)
- GENERAL: 0/42 (0%)

### Key Architecture Patterns
- **check-availability hours comparison**: Uses `timeToMinutes()` for numeric comparison (not string). Both `check-availability/index.ts` and `elevenlabs-check-availability/index.ts`. Covered by 15 regression tests.
- **getTimezoneOffset (5 edge functions)**: All use `Intl.DateTimeFormat` with `timeZoneName: "longOffset"`. Functions: check-availability, elevenlabs-check-availability, elevenlabs-create-booking, elevenlabs-reschedule-booking, elevenlabs-webhook.
- **_shared/terminology.ts**: Edge function helper `getAppointmentLabel(mode, industrySlug)` mirrors frontend `industryTerminology.ts`. Used in booking-handoff and cron-appointment-reminders.
- **applyAppointmentLabel**: `lib/terminology.ts` overlays industry `appointmentLabel` onto mode-level UI terms. Called in `useIndustryContext()`. Does NOT override if appointmentLabel is "appointment" or "booking" (defaults).
- **ROI page terminology**: `ReportsROIPage` overrides static `data.entityName` from `industryRevenueConfig.ts` with `terms.bookingsMetricLabel` from `useIndustryContext()`. This ensures plumber sees "Jobs", salon sees "Appointments", etc.
- **Service deletion with bookings**: `ServiceCatalogEditor.handleDelete` detects `bookings_service_id_fkey` FK errors and shows toast with "Deactivate" action. `ON DELETE RESTRICT` FK intentionally prevents silent data loss.
- **verify_jwt = false**: Required for ALL ElevenLabs tool endpoints and internally-called functions in `config.toml`. Covered by `verify-jwt-coverage.test.ts` (37 tests).
- **text-conversation**: Uses canonical `systemPrompt` from `buildBusinessContext()` + Claude tool-calling. 6 tools. System prompt supplement reinforces tool usage.
- **Auth session retry**: `AuthContext.initializeAuth` retries once if `getSession()` returns null but localStorage has a session token.
- **Auth 429 backoff**: `fetchWithRateLimitRetry` in supabase/client.ts retries 429 responses with exponential backoff (2s/4s/8s). Prevents auth death spiral.
- **Booking customer linkage**: bookings table has NO customer_id. Link is `lead_id → leads.customer_id`.
- **tenant_id in agent tools**: MUST be `required: true` on ALL tools.
- **AI edge functions use Anthropic API**: ALL 12 use `ANTHROPIC_API_KEY` with model `claude-haiku-4-5-20251001`.
- **tenants table address**: Single `address` text field. No separate `city`/`state` columns.
- **Error recovery pattern**: React Query `refetch()` for retry. Each error state offers: Try again, Back to Dashboard, Contact Support. 84 regression tests.
- **resolveCapabilities**: Pure function in `_shared/resolveCapabilities.ts`. All 6 modes tested. 51 tests.

### DISPATCH Mode Readiness (Audit 2026-03-04)
- Edge functions: 9 dispatch functions, all with verify_jwt=false
- ElevenLabs agent: 10 tools configured (check_service_area, create_dispatch_job, lookup_dispatch_status, cancel_dispatch_job, etc.)
- Pricing: 5 models (flat, distance_tiered, per_unit, package, variable), 27 presets, vehicle modifiers
- Onboarding: 5 dispatch industries (towing, roadside, courier, medical_transport, mobile_mechanic)
- Brain layout: Dispatch-specific tabs (Rates & Services, dispatch-zones, fleet management)
- Terminology: All correct (dispatch/driver/coverage zone, not appointment/team/service area)
- NOT built: Driver mobile app, real-time websockets, customer ETA tracking, proof-of-service

### Remaining Work
- SERVICE mode: 6 gates awaiting QA verification (booking_date_picker, estimates_save, booking_sms, callback_request, no_console_errors, error_states_have_recovery)
- SERVICE mode: 3 gates BLOCKED (Google Calendar OAuth, SMS A2P registration, transfer_to_human needs real call)
- All engineering work for SERVICE mode is DONE. Next mode: DISPATCH when orchestrator shifts.
