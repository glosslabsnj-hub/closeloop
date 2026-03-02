# Receptionist Dev - Cross-Session Brain

## Last Session: 2026-03-02 4:00 AM ET (receptionist_eng — 7 bug fixes + production deployment)

### What Was Done
- **PRODUCTION DEPLOYMENT**: Pushed 53 unpushed commits to GitHub. Deployed 27 edge functions to Supabase. ALL code is now live at app.getfluxdata.com.
- **Guided Setup false completion (HIGH)**: While useAIReadinessV2 is loading, p0Flags/p1Flags are empty arrays → all steps appear "complete" → celebration screen shows immediately. Fixed: only show celebration when `!readinessLoading && canGoLive`.
- **HVAC test tenant generic services (HIGH)**: testTenantMatrix had `serviceCount: 6` but no `customServices` for Cool Comfort HVAC. Seed function fell back to "Service 1-6". Added 6 HVAC services with realistic pricing, 7 FAQs, 3 objections.
- **Notification preferences RLS (MEDIUM)**: `notification_preferences` policy had `USING` but no `WITH CHECK` — all INSERT/UPDATE denied. Added `WITH CHECK` clause + super_admin bypass. Applied to Supabase via Management API.
- **Cross-mode intake fields (MEDIUM)**: `COMMON_INTAKE_FIELDS` included `vehicle_info` for all modes. Replaced with `getIntakeFieldsForMode()` — vehicle_info only shown for dispatch mode.
- **Tagline empty after onboarding (MEDIUM)**: `create-tenant` accepts tagline but onboarding never sent it. Now auto-generates `"Your trusted {industry} professionals"` during submission.
- **Cross-mode integrations (MEDIUM)**: Toast POS and Printer showed for HVAC. Added `modes` property to all SELF_SETUP and FEATURED_EXPERT integrations. IntegrationsPage filters by `businessMode`.

### Build Status
- Build: Clean (0 errors)
- Tests: 343/343 passing
- Commit: 12a0af9

### MODE PROGRESS
- SERVICE: 11/42 QA-verified (26%) ← FOCUS. 7 more fixes done, awaiting QA re-verification.
- DISPATCH: 0/42 (0%)
- FOOD: 0/42 (0%)
- MEDICAL: 0/42 (0%)
- SALES: 0/42 (0%)
- GENERAL: 0/42 (0%)

### Key Architecture Patterns
- **Readiness loading race condition**: useAIReadinessV2 returns empty flags while loading. Any component using flags to determine completion MUST check `loading` first. GuidedSetupFlow was the only place using flags without loading guard.
- **Test tenant data**: testTenantMatrix entries MUST include `customServices`, `customFaqs`, and `customObjections` for realistic seeded data. Without these, seed-test-tenants generates generic placeholders.
- **RLS WITH CHECK**: Every Supabase RLS policy using `FOR ALL` MUST have both `USING` (for SELECT/DELETE) and `WITH CHECK` (for INSERT/UPDATE). Without WITH CHECK, Postgres denies all writes.
- **Integration mode filtering**: `modes` property on integration cards controls visibility per business mode. Items without `modes` show for all modes (backward-compat).

### Database Changes Applied
- notification_preferences RLS: WITH CHECK added, super_admin bypass added

### Remaining Work
- ID:97 - Plan/Billing page only shows Multi-Location section — needs full billing UI
- Console errors from Mapbox token, other sources
- More test tenants need customServices (salon, plumber, detailing, cleaning, consultant)
- Existing Cool Comfort HVAC needs reseed to get new HVAC services

### Next Priorities
1. QA re-verification of all 7 fixes (handoff #117 filed)
2. Plan/Billing page needs payment method management + invoice history
3. Additional test tenant custom data for QA coverage
