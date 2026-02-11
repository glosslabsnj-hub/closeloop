

# Implement Universal Onboarding & Post-Onboarding Intelligence — All 4 Phases

Implementing in Lovable, phase by phase, with testing between each phase.

---

## Phase 1: Fix Scenario Discovery Questions

**Goal:** Every industry sees only questions that make sense for their business. Add "callback only" path.

### Changes to `src/lib/scenarioQuestions.ts`:
- Narrow `walk-in-dropoffs` question to only show for `body_shop`, `auto_glass` slugs (tow-in language)
- Add new `vehicle-dropoffs` question for general auto service slugs (no towing mention)
- Add `ai-books-appointments` question to `serviceQuestions` at position 0: "Should the AI book appointments directly?" — maps to `aiBooksDirect` capability with `impliesModules: ["booking"]`
- Add `overridesBase?: boolean` flag to `ScenarioQuestion` type — when true and answer is false, removes the implied module even if it's in the base module set
- Update `deriveModulesFromScenario` to respect `overridesBase`
- Add `hasLongDurationJobs` question filtered to auto repair, body shop, and similar long-job industries

---

## Phase 2: Fix Scheduling Step

**Goal:** Realistic durations/buffers, hide booking config for callback-only users.

### Changes to `src/components/onboarding/SchedulingSetup.tsx`:
- Accept `scenarioAnswers` prop
- When `aiBooksDirect === false`: hide duration/buffer/same-day, show only business hours with explanatory note
- Expand duration options: add 180, 240, 480 min options when `hasLongDurationJobs` is true
- Expand buffer options: add 45, 60, 120 min options
- Add "Varies" option for variable-length jobs
- Update `getDefaultSchedulingPrefs` to use scenario answers for smarter defaults

### Changes to `src/pages/app/OnboardingPage.tsx`:
- Pass `scenarioAnswers` to `SchedulingSetup`

---

## Phase 3: Post-Onboarding Guided Walkthrough

**Goal:** After onboarding, user knows exactly what to do next.

### Changes to `src/components/onboarding/OnboardingComplete.tsx`:
- Make next steps dynamic based on mode and capabilities (callback-only skips calendar, dispatch shows coverage, etc.)
- Add "Quick Setup Guide" button

### New file: `src/components/brain/GuidedSetupOverlay.tsx`:
- Modal showing the 3-4 most important Brain sections for their mode with completion status
- Checks localStorage flag to only show once
- Each item links to the relevant Brain section

### Changes to Business Brain Hub:
- Show overlay on first visit or when `?guided=true`

---

## Phase 4: Brain Hub Capability-Aware Filtering

**Goal:** Business Brain only shows sections relevant to what the user configured.

### Changes to `src/components/brain/hub/hubStepsConfig.ts`:
- Add `hiddenWhenCapability?: string` field to `HubStep`
- Calendar step gets `hiddenWhenCapability: "aiBooksDirect"`
- Update `getOrderedSteps` to accept optional capabilities and filter accordingly

### Changes to Brain Hub component:
- Pass capabilities to `getOrderedSteps`

---

## Implementation Order

1. Phase 1 first (fixes the broken questions immediately)
2. Phase 2 (scheduling makes sense)
3. Phase 3 (post-onboarding guidance)
4. Phase 4 (brain filtering)

Each phase is independently testable. No database migrations needed — all frontend changes using existing `capabilities_json` storage.

