# Receptionist Dev - Cross-Session Brain

## Last Session: 2026-03-04 3:56 PM ET (receptionist_eng — dispatch hardening + critical auth fix)

### What Was Done
- **CRITICAL: Dispatch handoff auth fix** (commit 75d8b24): `elevenlabs-create-dispatch-job` and `create-dispatch-request` called `dispatch-handoff` with `Authorization: Bearer serviceKey`. But `dispatch-handoff.validateAccess` calls `requireAuthedTenant` which fails because service role key is NOT a user JWT. This silently broke ALL post-dispatch actions (audit, customer SMS, owner notifications, workflows). Fixed: switched to `x-closeloop-secret` header (matching booking-handoff pattern). Both edge functions redeployed.
- **DispatchMapView ErrorBoundary** (commit 6ec0529): Added ErrorBoundary around DispatchMapView in DispatchMapPage to prevent full page crash if Mapbox GL fails during initialization.
- **ActiveJobQueue status fix** (commit 6ec0529): Removed dead `in_progress` status color key, added `on_site` to match actual DB enum (pending/assigned/en_route/on_site/completed).
- **Dispatch audit**: Full audit of dispatch onboarding, dashboard, edge functions, brain config. All infrastructure verified complete.

### Build Status
- Build: Clean (0 errors)
- Tests: 1346/1346 passing
- Commit: 75d8b24
- Deployed to VPS + GitHub + 2 edge functions

### Console Statement Inventory (accurate count)
~206 console statements remain in src/ — 202 are in error-only catch blocks (acceptable), 4 non-error:
- AuthContext.tsx (2): admin settings fetch/create failures (catch blocks)
- AuthContext.tsx (1): setActiveTenantId guard — FIXED: now silent comment (was console.warn)
- CreateTestTenantDialog.tsx (1): assistant_settings create failure (catch block, admin-only)
- useDriverJobs.ts (1): ETA calculation failure
These are acceptable — they only fire on actual errors, not during normal operation.

### MODE PROGRESS
- SERVICE: 35/42 QA-verified (83%) ← FOCUS (all eng work done, 6 awaiting QA, 3 blocked)
- DISPATCH: 0/42 (0%) — infrastructure 85% ready, no QA gates created yet
- FOOD: 0/42 (0%)
- MEDICAL: 0/42 (0%)
- SALES: 0/42 (0%)
- GENERAL: 0/42 (0%)

### Key Architecture Patterns
- **dispatch-handoff auth**: Internal calls to `dispatch-handoff` MUST use `x-closeloop-secret` header, NOT `Authorization: Bearer serviceKey`. The service role key is not a user JWT and fails `requireAuthedTenant`. booking-handoff already used the correct pattern.
- **check-availability hours comparison**: Uses `timeToMinutes()` for numeric comparison (not string). Both `check-availability/index.ts` and `elevenlabs-check-availability/index.ts`. Covered by 15 regression tests.
- **getTimezoneOffset (5 edge functions)**: All use `Intl.DateTimeFormat` with `timeZoneName: "longOffset"`. Functions: check-availability, elevenlabs-check-availability, elevenlabs-create-booking, elevenlabs-reschedule-booking, elevenlabs-webhook.
- **_shared/terminology.ts**: Edge function helper `getAppointmentLabel(mode, industrySlug)` mirrors frontend `industryTerminology.ts`. Used in booking-handoff and cron-appointment-reminders.
- **applyAppointmentLabel**: `lib/terminology.ts` overlays industry `appointmentLabel` onto mode-level UI terms. Called in `useIndustryContext()`. Does NOT override if appointmentLabel is "appointment" or "booking" (defaults).
- **ROI page terminology**: `ReportsROIPage` overrides static `data.entityName` from `industryRevenueConfig.ts` with `terms.bookingsMetricLabel` from `useIndustryContext()`.
- **Service deletion with bookings**: `ServiceCatalogEditor.handleDelete` detects `bookings_service_id_fkey` FK errors and shows toast with "Deactivate" action.
- **verify_jwt = false**: Required for ALL ElevenLabs tool endpoints and internally-called functions in `config.toml`. Covered by `verify-jwt-coverage.test.ts` (37 tests).
- **text-conversation**: Uses canonical `systemPrompt` from `buildBusinessContext()` + Claude tool-calling. 6 tools.
- **Auth session retry**: `AuthContext.initializeAuth` retries once if `getSession()` returns null but localStorage has a session token.
- **Auth 429 backoff**: `fetchWithRateLimitRetry` in supabase/client.ts retries 429 responses with exponential backoff (2s/4s/8s).
- **Booking customer linkage**: bookings table has NO customer_id. Link is `lead_id → leads.customer_id`.
- **tenant_id in agent tools**: MUST be `required: true` on ALL tools.
- **AI edge functions use Anthropic API**: ALL 12 use `ANTHROPIC_API_KEY` with model `claude-haiku-4-5-20251001`.
- **tenants table address**: Single `address` text field. No separate `city`/`state` columns.
- **Error recovery pattern**: React Query `refetch()` for retry. Each error state offers: Try again, Back to Dashboard, Contact Support. 84 regression tests.
- **resolveCapabilities**: Pure function in `_shared/resolveCapabilities.ts`. All 6 modes tested. 51 tests.

### DISPATCH Mode Readiness (Audit 2026-03-04)
- Edge functions: 9 dispatch functions, all with verify_jwt=false
- ElevenLabs agent: 10 tools configured
- Pricing: 5 models, 27 presets, vehicle modifiers
- Onboarding: 5 dispatch industries
- Brain layout: Dispatch-specific tabs
- Terminology: All correct
- NOT built: Driver mobile app, real-time websockets, customer ETA tracking, proof-of-service

### Remaining Work
- SERVICE mode: 6 gates awaiting QA verification (booking_date_picker, estimates_save, booking_sms, callback_request, no_console_errors, error_states_have_recovery)
- SERVICE mode: 3 gates BLOCKED (Google Calendar OAuth, SMS A2P registration, transfer_to_human needs real call)
- All engineering work for SERVICE mode is DONE. Next mode: DISPATCH when orchestrator shifts.
