
# Onboarding Depth, Multi-Crew Availability, Feature Access, and FAQ Duplication Fixes

## Status: ✅ COMPLETED

All 4 parts implemented:

### Part 1: Multi-Crew Capacity ✅
- Added `default_capacity` column to `tenants` (default 1)
- Updated `fn_compute_available_slots` to count bookings per slot vs capacity
- Edge function passes capacity to RPC
- Onboarding maps team size → capacity (solo=1, small=3, medium=9, large=20)
- `create-tenant` accepts `default_capacity`

### Part 2: Team Tab Post-Onboarding ✅
- Already calls `refreshTenant()` after onboarding (line 672)
- Discovery now includes "Multiple Staff" question with team size follow-up
- Team size from discovery overrides businessDetails for capability derivation

### Part 3: FAQ/Policy Deduplication ✅
- `SuggestedFAQButtons` now accepts `tenantPolicies` and filters out FAQ suggestions that overlap with cancellation/deposit/refund policies
- `BusinessFAQEditor` fetches tenant policies and shows a notice directing users to the Policies tab
- Passes policies to SuggestedFAQButtons for filtering

### Part 4: Deeper Onboarding Discovery ✅
- Added `ScenarioFollowUp` type to `scenarioQuestions.ts`
- "AI Books Appointments" → inline follow-up: "Auto-book instantly" vs "Require your approval"
- "Multiple Staff" → inline follow-up: team size selector (2-5, 6-15, 16+)
- `ScenarioDiscovery.tsx` renders animated follow-up radio groups inline
- `CommunicationPreferences` pre-selects booking mode from discovery answer
- OnboardingPage passes scenarioAnswers to CommunicationPreferences
