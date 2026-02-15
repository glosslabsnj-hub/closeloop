

# Kimi AI Audit Implementation Plan

This plan addresses every actionable finding from the Kimi AI audit, organized into 3 phases by priority. Items that are already implemented or don't apply are noted.

---

## Phase 1: Critical Fixes (Week 1)

### 1A. Landing Page Improvements

**Hero Section Copy Update**
- Current: "Every call answered. Every lead captured."
- Change to: "Your AI Receptionist Works 24/7" with subtitle "Never miss a call. Never lose a lead. Voxly answers, qualifies, and books appointments while you focus on your business."
- File: `src/components/landing/HeroSection.tsx`

**CTA Enhancement**
- Current: "Start Free Trial" with no details
- Change to: "Start Your Free Trial" with sub-text: "14-day free trial -- No credit card required -- Setup in 10 minutes"
- File: `src/components/landing/HeroSection.tsx`

**Trust Signals Section (New)**
- Add a trust bar between Hero and Demo sections with security/compliance badges and integration partner logos (Google Calendar, Twilio, etc.)
- File: New component `src/components/landing/TrustSignalsBar.tsx`

**Demo Section** -- Already partially addressed. The `IndustryDemoPlayer` component exists. The audit notes "demo recording coming soon" but the component is already wired up. We'll verify the component has actual demo content and add placeholder call recordings if missing.

### 1B. Dashboard -- AI Status Card

**Add AI Status to Dashboard**
- The `AgentControlPanel` already shows AI status (active/paused). The audit wants this more prominent.
- Add a "Complete Setup" link when Business Brain is below 100%
- Add missed calls counter to MetricsGrid
- Add conversion rate metric
- Files: `src/components/dashboard/AgentControlPanel.tsx`, `src/components/dashboard/MetricsGrid.tsx`

### 1C. Business Brain -- Copy Fixes (Quick Wins)

**Rename confusing sections:**
- The audit calls out "Train Your AI" vs "AI Learning" confusion. Current mode-shaped tabs are: About, Services, Operations, Training, Intelligence.
- Rename "Training" tab label to "AI Personality & Responses" (or shorter: "AI Behavior")
- Rename "Intelligence" to "AI Insights" to merge the concept
- Files: `src/config/brainModeLayout.ts`, `src/components/brain/dashboard/BrainDashboard.tsx`

**Progress bar redesign:**
- Current: "76% complete" with generic progress bar
- Change to: "Step X of Y: [Current Section Name]" with time estimates and "Continue" CTA
- The `BrainNextStepsBar` component already exists -- enhance it with step numbering and time estimates
- File: `src/components/brain/dashboard/BrainNextStepsBar.tsx`

---

## Phase 2: UX Improvements (Week 2)

### 2A. Navigation Reorganization

**Sidebar Section Headers**
- Current: flat list with visual spacing between groups
- Add labeled section headers: "MAIN", "AI CENTER", "MANAGE"
- Move items into the grouping the audit recommends
- File: `src/components/layouts/AppSidebar.tsx`

```text
MAIN
  Dashboard
  Leads & Calls
  Customers
  Schedule / Dispatch / Orders (mode-dependent)

AI CENTER
  Business Brain
  Test Your AI
  AI Insights

MANAGE
  Integrations
  Reports
  Settings
  Help
```

### 2B. Business Brain -- Dependency Warnings

**Add blocking indicators:**
- Show which sections block AI activation
- Display dependency chain: Business Profile (complete) -> Services & Pricing (blocks activation) -> AI Behavior (blocks activation)
- Add to `BrainDashboard` as a compact status table
- File: `src/components/brain/dashboard/BrainDashboard.tsx`

### 2C. Simulator Enhancement

**Pre-loaded test scenarios:**
- Add industry-specific test prompts: "I need an emergency plumber", "How much do you charge?", "Can I book for tomorrow?"
- Add confidence score display to test results
- Files: `src/pages/app/SimulatorPage.tsx`, new component `src/components/simulator/ScenarioSelector.tsx`

### 2D. Contextual Help

**Add "Why is this important?" tooltips:**
- The `SECTION_GUIDANCE` config already has `why` text per section
- Surface these more prominently as inline tooltips on every Brain section header
- The `InlineFieldHelp` and `SectionTitleWithHelp` components already exist -- ensure they're used consistently
- Files: Various Brain editor components

---

## Phase 3: Polish & Design System (Week 3)

### 3A. Typography & Spacing Standardization

**Establish consistent hierarchy:**
- H1: 32px/700, H2: 24px/600, H3: 18px/600, Body: 14px/400, Caption: 12px/400
- Standardize card padding to 24px, section gap to 32px, element gap to 16px
- Add Tailwind utility classes or extend the theme config
- File: `tailwind.config.ts`, `src/index.css`

### 3B. Color Accent Consistency

- Verify warning states use amber, success uses green, errors use red consistently
- Already mostly in place via Tailwind theme -- audit for any hardcoded colors
- File: `tailwind.config.ts`

### 3C. Icon Consistency

- Audit all icon usage for mixed outlined/filled styles
- Standardize on Lucide (already the primary icon library)
- No new dependencies needed

### 3D. Settings Page Reorganization

**Group settings into categories:**
- Account: Team Members, Plan & Billing, Usage
- Notifications: Alert Preferences, Channels
- AI Features: SMS, Lead Recovery, Advanced
- Data & Privacy: Export, Privacy, Security
- File: `src/pages/app/SettingsPage.tsx`

---

## What's Already Done (No Action Needed)

These items from the audit are already implemented in the current codebase:

1. **Industry-specific messaging** -- The platform already uses mode-shaped navigation and industry terminology via `useIndustryContext`
2. **Guided onboarding flow** -- `GuidedSetupFlow` component exists with `guidedSetupSteps.ts` config
3. **Setup Wizard** -- `SetupWizard` component with accordion steps already exists
4. **Progress indicators** -- `BrainProgressIndicator`, `ReadinessRing`, completion hooks all exist
5. **Next action recommendations** -- `NextStepSuggestion` component already implemented
6. **Capability-gated UI** -- Sidebar already shows/hides items based on `useCapabilities`
7. **Dark theme** -- Already the default with proper color scheme

---

## Technical Details

### Files to Create
- `src/components/landing/TrustSignalsBar.tsx` -- Trust badges section
- `src/components/simulator/ScenarioSelector.tsx` -- Pre-loaded test scenarios

### Files to Modify
- `src/components/landing/HeroSection.tsx` -- Copy updates, CTA enhancement
- `src/components/layouts/AppSidebar.tsx` -- Section headers, regrouping
- `src/config/brainModeLayout.ts` -- Tab label renames
- `src/components/brain/dashboard/BrainDashboard.tsx` -- Dependency warnings, progress redesign
- `src/components/brain/dashboard/BrainNextStepsBar.tsx` -- Step numbering, time estimates
- `src/components/dashboard/MetricsGrid.tsx` -- Add missed calls, conversion rate
- `src/components/dashboard/AgentControlPanel.tsx` -- Setup completion link
- `src/pages/app/SimulatorPage.tsx` -- Scenario selector integration
- `src/pages/app/SettingsPage.tsx` -- Category reorganization
- `tailwind.config.ts` -- Typography/spacing tokens if needed

### No Database Changes Required

### Dependencies
- No new packages needed -- everything uses existing Lucide icons, Tailwind, and Radix primitives

