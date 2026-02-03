

# Implementation Plan: Pickup-to-Dropoff Distance Pricing

## Summary

This plan adds the ability for the AI to calculate accurate tow pricing based on the **actual tow distance** (pickup to dropoff) rather than just the dispatch distance (base to pickup). Businesses can configure which distance measurement to use for pricing.

---

## Changes Overview

| Component | Change |
|-----------|--------|
| **Types** (`dispatchPricing.ts`) | Add `DistanceBasis` type and field to `DispatchPricingConfig` |
| **UI** (`DispatchServiceEditor.tsx`) | Add "Distance Measured From" dropdown for distance-tiered services |
| **Edge Function** (`check-service-area`) | Accept `dropoff_address`, calculate both distances, use correct one for pricing |
| **compute-distance-eta** | Add support for point-to-point distance (pickup → dropoff) |

---

## Technical Details

### 1. Schema Update: `src/types/dispatchPricing.ts`

Add new type and field:

```typescript
// New type for distance basis
export type DistanceBasis = 
  | "tow_distance"      // Pickup → Dropoff (most common for towing)
  | "dispatch_distance" // Base → Pickup (charge for coming to you)
  | "total_trip"        // Base → Pickup → Dropoff (full trip)
  | "flat";             // Ignore distance

// Update DispatchPricingConfig interface
export interface DispatchPricingConfig {
  pricing_model: PricingModel;
  
  // NEW: Which distance to use for pricing calculations
  distance_basis?: DistanceBasis; // Default: "tow_distance" for towing
  
  // ... existing fields unchanged ...
}
```

Also add a constant for the UI dropdown:

```typescript
export const DISTANCE_BASIS_OPTIONS = [
  { 
    value: "tow_distance", 
    label: "Tow Distance (pickup → dropoff)", 
    description: "Price based on how far the vehicle is towed" 
  },
  { 
    value: "dispatch_distance", 
    label: "Dispatch Distance (base → pickup)", 
    description: "Price based on how far we travel to reach customer" 
  },
  { 
    value: "total_trip", 
    label: "Total Trip (base → pickup → dropoff)", 
    description: "Price based on entire round trip distance" 
  },
] as const;
```

### 2. UI Update: `src/components/brain/dispatch/DispatchServiceEditor.tsx`

Add a dropdown after "Pricing Model" when `distance_tiered` is selected:

**Location:** Inside the "Distance Tiered Pricing" section (after line 405)

```text
┌─────────────────────────────────────────────────────┐
│ Pricing Model: [Distance-Based ▾]                   │
├─────────────────────────────────────────────────────┤
│ Distance Measured From:                             │
│ ┌─────────────────────────────────────────────────┐ │
│ │ [Tow Distance (pickup → dropoff) ▾]             │ │
│ └─────────────────────────────────────────────────┘ │
│                                                     │
│ (i) Price will be calculated based on how far the  │
│     vehicle is towed, not how far we travel to     │
│     reach the customer.                            │
│                                                     │
│ Distance Tiers                        [+ Add Tier] │
│ ┌─────────────────────────────────────────────────┐ │
│ │ 0-10 mi: $125 base                              │ │
│ │ 10+ mi:  $125 + $5/mile                         │ │
│ └─────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

### 3. Edge Function: `supabase/functions/elevenlabs-check-service-area/index.ts`

**New Parameters:**
- `dropoff_address` or `dropoff` - Optional destination address
- `vehicle_type` - Optional vehicle type for modifiers

**New Logic:**
1. Parse `dropoff_address` from request body
2. If provided, geocode it and calculate pickup → dropoff distance
3. Read `distance_basis` from service's pricing config
4. Apply pricing tiers to the correct distance measurement
5. Return detailed `price_breakdown` object

**New Response Fields:**
```typescript
interface ServiceAreaResponse {
  // Existing fields unchanged
  in_area: boolean;
  distance_miles: number | null;       // Dispatch distance (base → pickup)
  eta_minutes: number | null;
  eta_range: string;
  service_tier: "local" | "long_distance" | "out_of_area";
  pricing_note: string;
  local_radius_miles: number;
  message: string;
  
  // NEW fields
  tow_distance_miles: number | null;   // Pickup → Dropoff (when dropoff provided)
  dropoff_geocoded: string | null;     // Resolved dropoff address
  distance_basis_used: string;         // Which measurement was used for pricing
  price_breakdown: {                   // Detailed calculation
    base_price: number;
    distance_charge: number;
    distance_miles_charged: number;
    modifier_charges: { name: string; amount: number }[];
    total_estimate: number;
  } | null;
}
```

### 4. Edge Function: `supabase/functions/compute-distance-eta/index.ts`

Add support for point-to-point calculations (not just from base):

**New Parameters:**
- `origin_lat` / `origin_lng` - Optional origin point (defaults to tenant base)
- `origin_address_text` - Optional origin address to geocode

This allows the check-service-area function to call it for pickup → dropoff routes.

---

## Pricing Logic Flow

```text
1. AI collects pickup address
2. AI collects dropoff address  
3. AI calls check_service_area(address, dropoff_address, tenant_id)
4. Edge function:
   a. Geocode pickup → get pickup_lat, pickup_lng
   b. Geocode dropoff → get dropoff_lat, dropoff_lng
   c. Calculate dispatch_distance (base → pickup) for ETA
   d. Calculate tow_distance (pickup → dropoff) for pricing
   e. Find towing service and read distance_basis from config:
      - "tow_distance" → use tow_distance_miles
      - "dispatch_distance" → use dispatch_distance_miles  
      - "total_trip" → use dispatch + tow
   f. Apply distance tiers to get price
   g. Return pricing_note with calculated total
5. AI quotes the pricing_note directly
```

---

## Example Scenarios

### Scenario A: Tow Distance Pricing (Default)
**Config:** `distance_basis: "tow_distance"`

| Metric | Value |
|--------|-------|
| Base → Pickup | 8 miles |
| Pickup → Dropoff | 45 miles |
| Distance used for pricing | 45 miles |
| Tier matched | "Over 25 miles: $200 + $3.50/mi" |
| Calculation | $200 + (45-25) × $3.50 = $270 |
| AI says | "That's about a 45-mile tow. The rate would be around $270." |

### Scenario B: Dispatch Distance Pricing
**Config:** `distance_basis: "dispatch_distance"`

| Metric | Value |
|--------|-------|
| Base → Pickup | 8 miles |
| Pickup → Dropoff | 45 miles |
| Distance used for pricing | 8 miles |
| Tier matched | "0-10 miles: $85 flat" |
| AI says | "That's $85 for the local tow." |

---

## Files Modified

| File | Lines Changed |
|------|---------------|
| `src/types/dispatchPricing.ts` | ~25 new lines (type + options constant) |
| `src/components/brain/dispatch/DispatchServiceEditor.tsx` | ~40 new lines (dropdown + info text) |
| `supabase/functions/elevenlabs-check-service-area/index.ts` | ~100 lines modified (add dropoff logic) |
| `supabase/functions/compute-distance-eta/index.ts` | ~30 lines modified (add origin override) |

---

## Backward Compatibility

- If `distance_basis` is not set, defaults to `"tow_distance"` for towing category services
- If `dropoff_address` is not provided, uses dispatch distance (current behavior)
- Existing services work without modification
- ETA calculation always uses dispatch distance (unchanged)

---

## After Implementation

Once approved and implemented, you'll paste your current ElevenLabs prompt and I'll add:

1. Instructions to collect dropoff BEFORE calling `check_service_area`
2. Updated tool call example with `dropoff_address` parameter
3. Instructions to quote the `pricing_note` / `price_breakdown.total_estimate` directly

