

# Deep UX Audit & Simplification Plan

## Problem Statement
Business owners are overwhelmed by information that doesn't apply to them. While the capability-gating system exists and works at the sidebar level, there are still several surfaces where irrelevant or premature content leaks through, creating confusion during onboarding and daily use.

## Audit Findings

### What's Already Working Well
- **Sidebar:** Properly capability-gated -- dispatch businesses don't see Bookings, service businesses don't see Dispatch, etc.
- **Add-ons in Business Brain:** Now filtered by `compatibleModes` (fixed in previous session).
- **Onboarding phases:** Mode-aware questions, industry-aware service templates, conditional service area/hours.
- **Dashboard layouts:** Mode-specific (ServiceDashboardLayout, DispatchDashboardLayout, etc.).
- **Metrics grid:** Shows relevant KPIs per mode (Active Jobs for dispatch, Orders for food, etc.).
- **Hub steps:** Hidden by mode (Calendar hidden for dispatch/food, Coverage hidden for general).

### Gaps Found (Ranked by Impact)

#### 1. Settings Sidebar Shows Irrelevant Items
**Issue:** Every tenant sees "Revenue Tracking," "Automation Rules," "SMS Messaging," and "Lead Recovery" regardless of whether those features make sense for their business type or setup stage. A brand-new towing company seeing "Lead Recovery" and "Automation Rules" is confusing.

**Fix:** Gate settings nav items by capabilities:
- "Lead Recovery" -- only show when `hasLeadFollowUp` is true (already partially done but uses a mode check instead of capability).
- "Automation Rules" -- hide for `simple` complexity tier businesses by default (already collapsible, but should start collapsed for everyone until they have active automations).
- "Revenue Tracking" -- hide until tenant has actual call data (at least 1 call session logged).
- "SMS Messaging" -- SMS isn't live yet (`hasSmsFeature` always returns false). Show a "Coming Soon" badge or hide entirely until launched.

#### 2. Dashboard Shows Empty Widgets Before Any Data Exists
**Issue:** New tenants see empty charts, "0 Calls Today," "0 Bookings This Week" cards, and activity feeds with no content. This makes the product feel hollow rather than guiding them toward setup.

**Fix:** Add an "empty state" check to the LiveDashboard:
- If the tenant has zero call sessions ever, show a simplified "Get Started" dashboard instead of the full metrics grid + mode content area.
- The Get Started view should show: the Agent Control Panel (toggle), a prominent "Test Your AI" CTA, and the SmartChecklist (already used in SetupWizard).
- Once they have their first call, the full dashboard appears.

#### 3. Onboarding "Connect" Phase Shows Non-Functional Integrations
**Issue:** The Connect phase (Phase 6) shows integration cards for Jobber, QuickBooks, HubSpot, Square, Stripe -- but clicking "Connect" doesn't actually connect anything (the `onConnectIntegration` callback is likely a no-op). This sets false expectations.

**Fix:** Either:
- Remove the integration cards from onboarding entirely and replace with a simple "You can connect tools later from Settings > Integrations."
- Or clearly mark them as "Coming Soon" with disabled buttons.

#### 4. Business Brain Hub "Policies" Step Always Shows for All Modes
**Issue:** The "Policies & Intake" step is always visible in the Hub. For a simple callback-only business or a brand-new general business, "Policies & Intake" feels unnecessary and adds cognitive load. The step itself says "Cancellations, deposits, and required questions" which is irrelevant for businesses that don't book.

**Fix:** Add `hiddenWhenCallbackOnly: true` to the policies step in `hubStepsConfig.ts` (it already has this pattern for coverage and calendar). For callback-only businesses, policies should be tucked into the AI Scripts step or hidden entirely.

#### 5. Complexity Tier Not Consistently Applied
**Issue:** The complexity tier system (Simple/Standard/Complex) exists but is only used in the Settings sidebar for collapsing groups. It's not applied to:
- The Business Brain Hub (simple businesses still see all 8 steps)
- The dashboard (simple businesses see the same layout as enterprise ones)

**Fix:** For `simple` tier:
- Business Brain Hub: Collapse "Knowledge" and "AI Scripts" steps into an "Advanced" group at the bottom, auto-expanded only when incomplete.
- Settings: Already partially done. Ensure "Developer Tools" and "Danger Zone" are hidden (not just collapsed) for non-super-admin simple businesses.

---

## Implementation Plan

### Phase 1: Settings Sidebar Tightening (Quick Win)
**Files:** `src/components/settings/SettingsSidebar.tsx`, `src/pages/app/SettingsPage.tsx`

- Add capability-based visibility to "Revenue Tracking" (show only after first call data exists)
- Add "Coming Soon" badge to "SMS Messaging" since the feature isn't live
- Change "Lead Recovery" gating from mode-based to capability-based (`hasLeadFollowUp`)
- Hide "Developer Tools" and "Danger Zone" for non-super-admin users (keep for super admins)

### Phase 2: Empty Dashboard State
**Files:** `src/components/dashboard/LiveDashboard.tsx`, new `src/components/dashboard/EmptyDashboard.tsx`

- Query total call count for tenant
- If zero calls + not super admin: render a simplified "Get Started" card with:
  - Agent toggle (AgentControlPanel)
  - "Test Your AI" prominent CTA
  - SmartChecklist (existing component)
- Once first call comes in, switch to full dashboard automatically

### Phase 3: Onboarding Connect Phase Cleanup
**Files:** `src/components/onboarding/phases/OnboardingConnect.tsx`

- Replace non-functional integration cards with a simple informational message: "You can connect tools like QuickBooks, Stripe, and more from your Settings after setup."
- Keep Calendar connection (functional) and SMS notification phone (functional)
- Remove the `MODE_INTEGRATIONS` display for now

### Phase 4: Business Brain Hub Refinement
**Files:** `src/components/brain/hub/hubStepsConfig.ts`

- Add `hiddenWhenCallbackOnly: true` to the "policies" step
- For callback-only businesses, merge policy-related setup into the "AI Scripts" step guidance

### Phase 5: Complexity Tier Propagation
**Files:** `src/components/brain/hub/BusinessBrainHub.tsx`

- For `simple` tier tenants: group "Knowledge" and "AI Scripts" steps under an expandable "Advanced" section
- Show them collapsed by default but auto-expand if either is incomplete

---

## What This Does NOT Change
- Full customization flexibility: Every feature remains accessible. Nothing is permanently removed -- just surfaced at the right time.
- Capability gating logic: The existing `useCapabilities` hook and capability-first architecture stay intact.
- Onboarding flow structure: The 5-phase flow (Identity, How You Work, Offerings, Hours/Area, AI, Connect, Review) remains the same.
- Sidebar capability gates: Already properly implemented -- dispatch sees dispatch items, service sees service items, etc.

## Technical Notes
- Settings visibility changes use existing `caps` and `complexityTier` props already threaded through the SettingsSidebar.
- Empty dashboard state requires one additional query (total call count) which is lightweight.
- All changes are additive -- they add conditional rendering, not structural refactors.
- Estimated scope: ~5-7 files modified, 1 new component.

