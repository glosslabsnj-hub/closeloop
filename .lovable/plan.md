

# Wire Up BusinessBrainHub Component

## Overview

Claude Code created a new **8-step Business Brain Hub** design that provides a simpler, more guided setup experience compared to the current 5-category dashboard. I'll replace the current `BrainDashboard` with the new `BusinessBrainHub` component while preserving all existing navigation and editor functionality.

## What Changes

### Current State
- `BusinessBrainPage.tsx` renders `BrainDashboard` (5 category cards in a grid)
- Navigation uses 5 categories: business, services, operations, ai-voice, training

### New State
- `BusinessBrainPage.tsx` will render `BusinessBrainHub` (8 step cards in a vertical list)
- Navigation uses 8 step section IDs that map to existing legacy aliases

## Technical Implementation

### File: `src/pages/app/BusinessBrainPage.tsx`

**Changes:**

1. **Update imports:**
   - Remove: `import { BrainDashboard } from "@/components/brain/dashboard/BrainDashboard"`
   - Add: `import { BusinessBrainHub } from "@/components/brain/hub"`

2. **Replace dashboard component:**
   - Change the `!activeSection` case to render `BusinessBrainHub` instead of `BrainDashboard`
   - Update prop: `onNavigate` → `onNavigateToSection` (the Hub uses a different prop name)

3. **Keep everything else unchanged:**
   - All section detail views remain the same
   - Legacy section aliases still work (already mapped in `LEGACY_SECTION_ALIASES`)
   - All editors and save logic preserved

### Navigation Mapping

The `BusinessBrainHub` uses these `sectionId` values from `hubStepsConfig.ts`:

| Step | sectionId | Resolves via LEGACY_SECTION_ALIASES to |
|------|-----------|----------------------------------------|
| Identity | `profile` | `business` |
| Hours | `hours` | `business` |
| Offerings | `services` | (direct match) |
| Coverage | `service-area` | `operations` |
| Calendar | `availability` | `business` |
| Policies | `policies` | `operations` |
| AI Setup | `ai-behavior` | `ai-voice` |
| Knowledge | `knowledge` | (direct match → training) |

The existing `LEGACY_SECTION_ALIASES` in `BusinessBrainPage.tsx` already handles this mapping, so navigation will work correctly.

## Code Changes

```text
Lines ~113-114: Update import
Lines ~318-321: Replace BrainDashboard with BusinessBrainHub
```

## What Stays the Same

- All section detail views (`BrainSectionDetail`, `BrainSectionDetailWrapper`)
- All editors (Services, Hours, Policies, etc.)
- URL parameter handling and legacy aliases
- Animation variants
- HIPAA warnings
- Add-on section logic

## Risk Assessment

**Low Risk:**
- This is a UI-only change (dashboard hub component swap)
- All navigation logic is already in place via legacy aliases
- Section detail views are completely unchanged
- No database or backend changes

## Testing After Implementation

1. Open `/app/business-brain` → Should see 8 vertical step cards
2. Click any step → Should navigate to the correct section editor
3. Click back → Should return to the 8-step hub
4. Verify progress tracking shows completion status

