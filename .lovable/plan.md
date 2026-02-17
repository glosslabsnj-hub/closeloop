

# Fix: Onboarding Sidebar Step Navigation

## Problem

The onboarding sidebar only allows clicking on **completed** steps (steps before the current one). Users cannot navigate back to review or edit answers on any visited step. Additionally, future steps are completely disabled with reduced opacity, providing no feedback when clicked.

## Root Cause

In `OnboardingProgress.tsx` (line 24):
```
const isClickable = isComplete && onStepClick;
```

And in `OnboardingPage.tsx` (line 850):
```
onStepClick={(s) => s < step && setStep(s)}
```

Both conditions restrict navigation to only completed (prior) steps. Once you move forward, you can go back, but the UX is unclear -- disabled steps look unresponsive and there's no visual affordance showing which steps are navigable.

## Solution

### 1. Allow navigation to any visited step (not just completed ones)

Update `OnboardingProgress.tsx`:
- Make any step at or before the current step clickable (visited steps)
- Add a hover cursor and subtle hover state for clickable steps
- Keep future steps visually disabled but add a tooltip: "Complete previous steps first"

### 2. Update OnboardingPage click handler

Update `OnboardingPage.tsx` line 850:
- Change from `s < step` to `s <= step` (allow clicking the current step too, as a no-op/reset)
- Actually, the key change: allow navigation to any step index less than or equal to current

### 3. Visual improvements to the sidebar

- Add a left accent bar on the active step for clearer identification
- Show descriptions for completed steps (currently only shown for active step) on hover
- Make completed steps show a green checkmark (already done) with clearer "click to edit" affordance

## Files to Change

- `src/components/onboarding/OnboardingProgress.tsx` -- Update clickable logic, add hover states
- `src/pages/app/OnboardingPage.tsx` -- Update `onStepClick` handler to allow revisiting completed steps

## Technical Details

**OnboardingProgress.tsx changes:**
- `isClickable` becomes `(stepNumber <= currentStep) && !!onStepClick` instead of `isComplete && onStepClick`
- Add hover effect: `hover:bg-muted/50` for all clickable steps
- Keep future steps with `opacity-50 cursor-not-allowed`

**OnboardingPage.tsx changes:**
- Line 850: Change `onStepClick={(s) => s < step && setStep(s)}` to `onStepClick={(s) => setStep(s)}` (the component already gates which steps are clickable)

No database changes needed. No new dependencies.

