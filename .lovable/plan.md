

# Simplify Dispatch Service Pricing + Fix Food Settings Bug

## Two Issues

### 1. Food "Order Settings" showing in Dispatch mode (Bug)
The "Order Settings" item appears under the Services tab even for dispatch-only tenants. This is a visibility bug in how section relevance is merged across tabs. When checking if `food-settings` is relevant, the system asks each tab's add-on hook. The services tab correctly says "no" (not a food business), but the coverage tab has no rule for `food-settings` at all, so it defaults to "yes" (no rule = always relevant). Since the merge uses OR logic, the section incorrectly shows up.

**Fix:** Change the merged `isRelevant` function to only return `true` if a section explicitly has a rule AND passes it, rather than defaulting to `true` when no rule exists in a different tab's context.

### 2. Dispatch Service Pricing is Confusing (UX Improvement)
The current service editor has good building blocks (flat rate, distance-tiered, variable/quote) but the flow needs clearer guidance so a towing business owner can set things up without guessing.

**Improvements:**
- Add a plain-English summary at the top of each pricing model explaining what it means in towing terms
- Add real-world towing examples inline (e.g., "Lockout: Flat $85" or "Local Tow: $125 base + $5/mile after 10 miles")
- Show a live "What the AI will quote" preview that updates as they fill in the pricing, using actual scenario examples (e.g., "A 15-mile tow would be quoted at $150")
- Add a "Common Setups" quick-action section at the top of pricing that lets owners pick from typical towing pricing patterns:
  - Flat rate (same price regardless)
  - Base + per mile (e.g., $125 + $5/mi after included miles)
  - Distance tiers (different rates for local vs. long-distance)
  - Quote required (owner calls back with price)
- Improve the distance tier UI with clearer labels and an automatic "catch-all" tier suggestion

## Technical Details

### Files Modified

**Bug Fix:**
- `src/pages/app/BusinessBrainPage.tsx` (lines ~178-184): Change `isRelevant` merge logic. Instead of OR-ing all tabs (where missing rules default to true), only return true if the section's owning tab confirms it.

**UX Improvements:**
- `src/components/brain/dispatch/DispatchServiceEditor.tsx`: 
  - Add scenario-based pricing examples that update live as the owner configures pricing
  - Add helper text explaining each pricing model in plain English with towing examples
  - Improve the distance tier section with better labels, auto-suggest for open-ended tiers, and inline example calculations
  - Show a "Sample Quote" card that computes what the AI would say for a 5-mile, 15-mile, and 30-mile job based on current settings

- `src/types/dispatchPricing.ts`: Update `generatePricingSummary` to produce richer example scenarios with actual dollar amounts for multiple distances

### No Database Changes
All changes are frontend-only. The existing `pricing_config_json` schema in the services table already supports all the pricing models needed.

### No Edge Function Changes
The backend pricing engine (`check_service_area`, `elevenlabs-create-dispatch-job`) already reads and applies these pricing configs correctly. This is purely about making the setup UI clearer for the business owner.

