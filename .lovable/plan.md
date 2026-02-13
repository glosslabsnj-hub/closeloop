

# Onboarding Depth, Multi-Crew Availability, Feature Access, and FAQ Duplication Fixes

## Problems Identified

1. **Onboarding Discovery is too shallow** -- Simple yes/no toggles don't capture nuance. For example, "Should AI book appointments?" is binary, but the user wants "yes, but require approval" which is only revealed in the NEXT step (AI Behavior). The flow doesn't explain this well, causing confusion.

2. **Team size selection doesn't unlock Team features reliably** -- The onboarding correctly sets `fleet_management: true` and `hasMultipleStaff: true` in `capabilities_json` (confirmed in DB for Blue Boxer Plumbing). However, the user reports the Team tab didn't appear. This is likely a timing/session issue where the sidebar doesn't re-render after onboarding completes, OR the `FleetPage` guard was blocking due to the previous bug (dispatch_queue check). The recent fix to FleetPage.tsx may have resolved this, but we need to verify and ensure `useModuleRequired` properly checks for `fleet_management`.

3. **Availability is tenant-wide, not per-crew-member** -- The slot computation (`fn_compute_available_slots`) checks a single set of `availability_slots` and `busy_blocks` for the tenant. With 9 crew members, a 9am slot should remain available until all crew members are booked. Currently the system treats availability as if there's one person.

4. **FAQ/Policy duplication** -- Cancellation policy is asked during onboarding (PolicyPreviewStep), stored in `tenants.cancellation_policy`, AND then the Business Brain shows "Commonly Asked Questions" (FAQs) where a similar cancellation FAQ exists. The user ends up answering the same question twice in different places.

5. **AI Training tab is confusing** -- The "Essentials" and FAQ sections overlap with policies, creating a disjointed experience.

---

## Part 1: Deeper, Contextual Onboarding Discovery

### Changes to ScenarioDiscovery

Instead of only yes/no toggles, add **follow-up context** for key questions. When a user answers "Yes" to certain questions, show an inline follow-up:

- **"Should AI book appointments?"** -- Yes toggles a sub-option: "Auto-book instantly" vs "Require your approval first" (currently this is deferred to Step 5, causing confusion)
- **"Do you have multiple technicians?"** -- Yes shows a follow-up: "How many crew members?" with the same solo/small/medium/large selector (reinforcing what was set in BusinessDetailsForm, or allowing correction)

### Files to modify
- `src/lib/scenarioQuestions.ts` -- Add `followUp` field to `ScenarioQuestion` type for inline sub-questions
- `src/components/onboarding/ScenarioDiscovery.tsx` -- Render follow-up inputs when parent question is toggled on
- `src/components/onboarding/CommunicationPreferences.tsx` -- Pre-select booking mode based on discovery answers (if user already answered "require approval" in discovery, auto-set `pending_approval`)

---

## Part 2: Multi-Crew Availability (Capacity-Aware Slots)

### Problem
`fn_compute_available_slots` treats the tenant as having a single resource. A plumbing company with 9 technicians should have 9x the capacity at any given time slot.

### Solution
Add a `capacity` concept to slot computation:

1. **New column on `tenants`**: `default_capacity` (integer, default 1) -- how many concurrent appointments can be handled
2. **Auto-set from onboarding**: When `hasMultipleStaff = true`, set `default_capacity` based on team size (small=3, medium=9, large=20)
3. **Update `fn_compute_available_slots`**: Instead of eliminating a slot when ANY booking exists, count bookings in that window and only eliminate the slot when bookings >= capacity
4. **Future enhancement**: Per-technician calendars (not in this phase -- this gives the 80% solution now)

### Files to modify
- New migration: Add `default_capacity` column to `tenants`
- `supabase/migrations/...` -- Update `fn_compute_available_slots` to check booking count vs capacity
- `src/pages/app/OnboardingPage.tsx` -- Set `default_capacity` based on team size during tenant creation
- `supabase/functions/compute-available-slots/index.ts` -- Pass capacity to RPC

---

## Part 3: Ensure Team Tab Appears Post-Onboarding

### Root cause
The `FleetPage.tsx` guard was recently updated to check for either `dispatch_queue` OR `fleet_management`. However, `useRouteGuard.ts` (line 14) still maps `/app/fleet` to ONLY `["fleet_management"]` -- this is actually correct and should work.

### Verification needed
The sidebar (`AppSidebar.tsx` line 105) correctly checks `caps.hasFleetManagement`. The DB confirms `fleet_management: true`. The issue may be that after onboarding, the auth context isn't refreshed. 

### Fix
- `src/pages/app/OnboardingPage.tsx` -- After completing onboarding, call `refreshTenant()` before navigating to dashboard, ensuring the sidebar picks up the new capabilities immediately
- Add a small delay or await the refresh to ensure sidebar renders with updated caps

---

## Part 4: Eliminate FAQ/Policy Duplication

### Problem
Cancellation policy is collected in:
1. Onboarding PolicyPreviewStep -> `tenants.cancellation_policy`
2. Business Brain Policies Editor -> `tenants.cancellation_policy` (same field, so this is fine -- it's editing the same data)
3. Business Brain FAQ Editor -> Suggested FAQ "What's your cancellation policy?" with a separate answer

The duplication is between the stored policy text and a separate FAQ entry that asks the same thing.

### Solution
- **Auto-generate FAQ from policy**: When `tenants.cancellation_policy` is set, auto-populate a system FAQ "What's your cancellation policy?" with the policy text, instead of asking the user to type it again
- **Remove "cancellation policy" from SuggestedFAQButtons**: If the tenant already has a cancellation policy set, don't suggest that FAQ
- **AI Training simplification**: Rename/reorganize the Brain tabs so "Essentials" focuses on knowledge gaps and "Policies" is the single source for cancellation/deposit/refund rules

### Files to modify
- `src/components/brain/SuggestedFAQButtons.tsx` -- Filter out FAQ suggestions that overlap with existing policies
- `src/components/brain/BusinessFAQEditor.tsx` -- Show a note: "Your cancellation policy is managed in the Policies tab" instead of duplicating
- `src/components/brain/layout/businessBrainNavConfig.ts` -- Clarify section descriptions to reduce confusion

---

## Technical Summary

| Area | Files | Type |
|------|-------|------|
| Deeper Discovery | `scenarioQuestions.ts`, `ScenarioDiscovery.tsx`, `CommunicationPreferences.tsx` | Modify |
| Multi-Crew Capacity | New migration, `fn_compute_available_slots`, `OnboardingPage.tsx`, `compute-available-slots/index.ts` | Migration + Modify |
| Team Tab Post-Onboarding | `OnboardingPage.tsx` | Modify |
| FAQ Deduplication | `SuggestedFAQButtons.tsx`, `BusinessFAQEditor.tsx`, `businessBrainNavConfig.ts` | Modify |

### Implementation order
1. Multi-crew capacity (DB migration first, then edge function update)
2. Team tab refresh fix (small change in onboarding completion)
3. FAQ deduplication (frontend only)
4. Deeper discovery questions (most complex UI change, saved for last)

