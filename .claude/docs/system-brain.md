# Receptionist Dev - Cross-Session Brain

## Last Session: 2026-03-04 12:40 AM ET (receptionist_fix — terminology in ROI, help, AI behavior)

### What Was Done
- **ROI empty state terminology** (commit cebc3f0): `useROIDashboard` service mode now uses `getReadinessVerb()`/`getAutoBookSummary()` instead of hardcoded "Book appointments". Plumber sees "Schedule jobs via AI".
- **HelpGuideBookings** (commit cebc3f0): 8 hardcoded "appointment/booking" strings now use `useIndustryContext` terms. Plumber sees "Jobs & Calendar", "How Jobs Work", etc.
- **HelpGuidePhone** (commit cebc3f0): "book appointments" → `readinessVerb` ("schedule jobs" for plumber).
- **AIBehaviorModeSelector** (commit cebc3f0): Medical mode now uses dynamic `appointmentLabel` instead of hardcoded "appointments".
- Added 8 regression tests for non-appointment industry terminology.
- Build: Clean (0 errors), Tests: 1297/1297 passing
- Commit: cebc3f0, pushed + deployed (frontend)

### Build Status
- Build: Clean (0 errors)
- Tests: 1297/1297 passing
- Commit: cebc3f0
- Pushed to main + deployed

### MODE PROGRESS
- SERVICE: 35/42 QA-verified (83%) ← FOCUS (all eng work done, 6 awaiting QA, 3 blocked)
- DISPATCH: 0/42 (0%)
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
- **Booking customer linkage**: bookings table has NO customer_id. Link is `lead_id → leads.customer_id`.
- **tenant_id in agent tools**: MUST be `required: true` on ALL tools.
- **AI edge functions use Anthropic API**: ALL 12 use `ANTHROPIC_API_KEY` with model `claude-haiku-4-5-20251001`.
- **tenants table address**: Single `address` text field. No separate `city`/`state` columns.
- **Error recovery pattern**: React Query `refetch()` for retry. Each error state offers: Try again, Back to Dashboard, Contact Support. 84 regression tests.
- **resolveCapabilities**: Pure function in `_shared/resolveCapabilities.ts`. All 6 modes tested. 51 tests.

### Remaining Work
- SERVICE mode: 6 gates awaiting QA verification (booking_date_picker, estimates_save, booking_sms, callback_request, no_console_errors, error_states_have_recovery)
- SERVICE mode: 3 gates BLOCKED (Google Calendar OAuth, SMS A2P registration, transfer_to_human needs real call)
- All engineering work for SERVICE mode is DONE. Next mode: DISPATCH when orchestrator shifts.
