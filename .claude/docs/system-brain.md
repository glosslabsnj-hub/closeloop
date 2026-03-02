# Receptionist Dev - Cross-Session Brain

## Last Session: 2026-03-01 10:15 PM ET (receptionist_eng — 6 bug fixes + DB backfill + responsive)

### What Was Done
- **Console errors fixed**: `useMyAgencyApplication` was throwing 403 on every page (AppLayout). Now fails silently with `retry: false`. Also silenced `usePendingActions` and `useAgencySummary`.
- **PlanUpgradeCard**: Now uses `effectiveTenant` for super admin instead of `tenant`. Admin viewing another tenant's billing page now shows correct plan info.
- **create-tenant**: Subscription INSERT now includes `included_minutes`, `overage_minute_rate_cents`, `overage_sms_rate_cents`. Was creating rows with null values, breaking usage display.
- **Subscription backfill**: Updated 7 subscription rows to have `included_minutes: 200`, `overage_minute_rate_cents: 55`.
- **Responsive 375px**: Fixed mobile header (px-4→px-3, gap-3→gap-2), AgentControlPanel (px-5→px-3), MetricsGrid (p-5→p-3, text-2xl), PageContainer (overflow-x-hidden), NotificationBell (responsive dropdown width), NeedsAttentionBanner (truncate), EmptyDashboard (break-words).
- **Edge function deployed**: create-tenant

### Build Status
- Build: Clean (0 errors)
- Tests: 343/343 passing
- Commit: e8b5fda

### MODE PROGRESS
- SERVICE: 4/22 QA-verified (18%) ← FOCUS. Console errors + billing + responsive all addressed.
- DISPATCH: 0/22 (0%)
- FOOD: 0/22 (0%)
- MEDICAL: 0/22 (0%)
- SALES: 0/22 (0%)
- GENERAL: 0/22 (0%)

### Key Finding: Test Tenants Exist But No Slug Column
- All 6 test tenants ARE in Supabase (verified by name)
- The `tenants` table has NO `slug` column — QA tests looking up by slug all fail
- QA test harness needs to look up tenants by `name` instead of `slug`
- This blocks 6 functional gates (emergency, callback, cancel, reschedule, service_area)

### Database Changes Applied
- 7 subscriptions updated: included_minutes=200, overage_minute_rate_cents=55, overage_sms_rate_cents=0
- create-tenant now writes correct plan defaults on INSERT

### Architecture Notes
- `useMyAgencyApplication` runs on EVERY page via AppLayout (line 77). Must never throw.
- `PlanUpgradeCard` was using `tenant` (own) not `effectiveTenant` (switched). This is a common bug pattern in admin-switchable components — always check for `effectiveTenant ?? tenant`.
- `create-tenant` was defaulting to `plan_code: "voice"` (legacy). Now maps to `"base-200"` and includes PLAN_DEFAULTS for all SKUs.
- `has_tenant_access` super_admin bypass is confirmed working (tested via REST API).

### Next Priorities
1. QA re-verification of ALL service mode gates (handoff filed)
2. QA test harness needs to look up tenants by `name` not `slug` (handoff filed)
3. Console errors may still include Mapbox token warnings — not blocking
4. Remaining onboarding/mobile_375px gate needs test/sandbox mode
