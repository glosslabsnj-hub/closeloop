# Phase 2: Business Brain Reorganization — Implementation Record

## Status: COMPLETE

## Changes Made

### 2A. Tab Structure Standardized (All 6 Modes)
**File modified:** `src/config/brainModeLayout.ts`

**Old structure (5-6 tabs, inconsistent):**
- About You → Services → Operations → Your Rules → AI Training

**New structure (5 tabs, consistent across all modes):**
| Tab | Label | Contents |
|-----|-------|----------|
| 1 | Your Business | Business info, hours, calendar sync, templates |
| 2 | What You Offer | Service catalog, pricing, packages |
| 3 | How You Operate | Coverage, policies, delivery, dispatch ops |
| 4 | Train Your AI | Required questions, scripts, FAQs, objections, industry knowledge |
| 5 | AI Learning | Memory & insights (placeholder for Phase 5) |

**Mode-specific label variations:**
- Medical: Tab 1 = "Your Practice"
- Dispatch: Tab 2 = "Rates & Services", Tab 3 icon = MapPin
- Food: Tab 2 = "Menu & Pricing", Tab 3 icon = Truck
- Sales: Tab 2 = "Products & Pricing"

### 2B. Rules Tab Eliminated
The separate "Your Rules" / "Patient Policies" tab has been removed from all 6 modes. Its contents merged into:
- **Policies** → merged into "How You Operate" tab
- **Required Questions** → moved to "Train Your AI" tab as first item in "CALL ESSENTIALS" group

### 2C. Duplicate Distance Pricing Removed
**Before:** `distance-pricing` appeared in DISPATCH operations tab AND `distance-basis` in services tab (both routing to same `DistanceBasisSettings` component).
**After:** Only `distance-basis` remains in services "PRICING" group. `distance-pricing` removed from dispatch operations.

### 2D. Calendar Sync Added to All Modes
Previously only service and medical modes had `calendar-sync` in their "about" tab. Now all 6 modes include it under a "CALENDAR" group in tab 1.

### 2E. References Updated
**Files modified:**
- `src/pages/app/BusinessBrainPage.tsx`:
  - Removed `"rules"` from `ModeSectionId` type and `NEW_VALID_SECTIONS` array
  - Added `rules: "operations"` to `LEGACY_SECTION_ALIASES` for backward compatibility
  - Changed `policies` legacy alias from `"rules"` → `"operations"`
  - Removed `case "rules"` from `buildAddOnContent()`, merged policies add-ons into operations case
- `src/components/brain/layout/NextStepSuggestion.tsx`:
  - Updated "operations" next step to point to "training" (not removed "rules")
  - Removed "rules" entry from `NEXT_STEP_MAP`
  - Updated "service-area" next step from "rules" → "training"
- `src/components/brain/dashboard/BrainDashboard.tsx`:
  - Merged `case "rules"` policies summary into `case "operations"`
- `src/components/brain/layout/businessBrainNavConfig.ts`:
  - Kept `rules: "how-you-operate"` mapping with legacy comment

### 2F. Unused Imports Cleaned
- Removed `Shield` and `FileText` icon imports from `brainModeLayout.ts` (no longer used after rules tab removal)

### 2G. Backend — New Dynamic Variables for Phase 1 Data
**Files modified:**
- `supabase/functions/_shared/getBusinessBrainSnapshot.ts`:
  - Added `ai_guardrails`, `required_intake_fields`, `escalation_rules` to `AssistantSettingsSnapshot` interface
  - Updated data extraction and `getDefaultAssistantSettings()` with new fields
- `supabase/functions/_shared/buildBusinessContext.ts`:
  - Added `ai_guardrails`, `required_intake_fields`, `escalation_rules` to `BusinessContext.ai_settings` type and builder
- `supabase/functions/_shared/voiceContextContract.ts`:
  - Added 3 new dynamic variables:
    - `ai_guardrails` — owner-defined things AI should never promise
    - `required_intake_fields_summary` — speech-ready list of required info before booking
    - `escalation_rules_summary` — speech-ready summary of when AI should transfer to human
- `supabase/functions/_shared/agentBasePrompts.ts`:
  - Added `GUARDRAILS_AND_ESCALATION` prompt section using the 3 new dynamic variables
  - Injected into `buildPromptForCapabilities()` for all business modes

## Data Flow
```
assistant_settings.settings_json (DB)
  ↓
getBusinessBrainSnapshot() → AssistantSettingsSnapshot
  ↓
buildBusinessContext() → BusinessContext.ai_settings
  ↓
voiceContextContract.ts → Dynamic Variables
  ↓
agentBasePrompts.ts → ElevenLabs AI prompt
```

## Backward Compatibility
- Old `?section=rules` URLs resolve via `LEGACY_SECTION_ALIASES` to operations
- Old `SECTION_TO_CATEGORY` mapping kept for "rules" → "how-you-operate"
- `NextStepSuggestion` no longer suggests "rules" as a next step
- New fields default to sensible values (guardrails empty, intake = name+phone, escalation = default triggers)
