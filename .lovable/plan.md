

# Three Improvements for Dispatch Business Brain

## 1. Remove Food and Medical Sections from Dispatch Mode (Bug Fix)

The previous fix updated the `isRelevant` logic, but some food/medical items are still appearing. The root cause is that the `SECTION_RELEVANCE` rules correctly gate `food-settings` and `medical-pricing`, but the `brainSectionRegistry.ts` entries reference these rules via `flags.isRelevant("food-settings")`. If your tenant has any food-related capability flag set (even accidentally from onboarding), those sections will show.

**Fix:**
- In `src/config/brainSectionRegistry.ts`, add an explicit mode check to the `isVisible` function for food and medical items, so they ONLY show when the primary mode matches (not just when a capability flag happens to be set)
- Items affected: `food-settings-svc`, `menu-sizes`, `daily-specials` (food), and `medical-pricing` (medical)
- Change from: `flags.isRelevant("food-settings")` 
- Change to: Also check that the business mode is `food` or that the business explicitly has food capabilities enabled

## 2. After-Hours, Weekend, and Holiday Pricing

The Price Modifiers editor already exists (`src/components/brain/PriceModifiersEditor.tsx`) with after-hours, weekend, and holiday surcharges built in. However, it's not prominently surfaced for dispatch businesses.

**Changes:**
- Ensure the "Price Adjustments" section appears by default for dispatch businesses (currently gated behind a capability flag `chargesTripFee` in `brainSectionRelevance.ts`)
- Update the relevance rule for `price-modifiers` to always show for dispatch mode, since after-hours and holiday surcharges are standard for towing
- No new components needed — the existing editor already supports time-of-day, urgency, equipment, and vehicle size modifiers with towing-specific suggestions

## 3. Service Area Configuration for Dropoff Locations

This is the most significant change. Currently `check_service_area` only validates the pickup address. For towing, the dropoff could be far away or outside the service area entirely.

**Changes:**

### Frontend (Configuration UI)
- Add a "Dropoff Coverage" setting to `DistanceBasisSettings.tsx` or a new small component in the Coverage/ETA section
- Three options the business can configure:
  1. **No dropoff check** — We'll tow anywhere the customer wants (default for most)
  2. **Same service area** — Dropoff must also be within our coverage radius
  3. **Extended radius** — Dropoff can be up to X miles beyond our normal area (with surcharge)
- Store this in `tenant_distance_settings` as `dropoff_coverage_mode` and `dropoff_max_miles`

### Backend (check-service-area edge function)
- Accept an optional `dropoff_address` parameter
- When provided AND the tenant has dropoff coverage rules configured, run a second geocode + distance check
- Return `dropoff_in_area: true/false` and `dropoff_distance_miles` in the response
- The AI agent prompt already asks for dropoff on towing services — this just validates it

### AI Context
- Update `build-business-brain` to include the dropoff coverage rule so the AI knows whether to warn callers about out-of-area dropoffs
- The AI can say things like "We can pick you up, but that dropoff is outside our normal area — there'd be an extra mileage charge"

## Technical Details

### Files to Modify

| File | Change |
|------|--------|
| `src/config/brainSectionRegistry.ts` | Add mode guard to food/medical `isVisible` functions |
| `src/config/brainSectionRelevance.ts` | Make `price-modifiers` always relevant for dispatch |
| `src/components/brain/dispatch/DistanceBasisSettings.tsx` | Add dropoff coverage mode selector |
| `src/hooks/useTenantDistanceSettings.ts` | Support new `dropoff_coverage_mode` and `dropoff_max_miles` fields |
| `supabase/functions/check-service-area/index.ts` | Accept and validate optional `dropoff_address` |
| `supabase/functions/_shared/getBusinessBrainSnapshot.ts` | Include dropoff coverage config in AI context |

### Database Migration
- Add columns to `tenant_distance_settings`:
  - `dropoff_coverage_mode` (text, default `'none'`) — values: `none`, `same_area`, `extended`
  - `dropoff_max_miles` (integer, nullable) — only used when mode is `extended`

### No Breaking Changes
- Existing dispatch jobs and pricing logic are unaffected
- The dropoff check is additive — if not configured, behavior stays the same
- Food/medical sections simply stop appearing for dispatch tenants
