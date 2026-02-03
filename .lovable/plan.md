
# Plan: Enable AI Agent to Quote Distance-Tiered Pricing ✅ IMPLEMENTED

## Overview
The dispatch AI agent can now communicate **distance-based pricing tiers** to customers based on their location. The "Long Distance Tow" service is configured in the Business Brain with the correct pricing structure:
- 11-25 miles: $200 base price
- Over 25 miles: +$3.50 per mile

However, this `pricing_config_json` data is not currently being passed to the voice AI context. This plan updates the backend to include tiered pricing in the AI's knowledge.

## Current Architecture
```text
+------------------+     +------------------------+     +------------------+
|  Business Brain  | --> | buildBusinessContext() | --> | ElevenLabs Agent |
|  (services table)|     |   (edge function)      |     |   (voice AI)     |
+------------------+     +------------------------+     +------------------+
         |                          |
         v                          v
  pricing_config_json         services_for_prompt
  (stored but ignored)        (only shows base price)
```

## What Changes

### 1. Include `pricing_config_json` in Services Query
**File:** `supabase/functions/_shared/buildBusinessContext.ts`

The services query currently doesn't fetch `pricing_config_json`. Adding it:
```sql
-- Current:
SELECT * FROM services WHERE tenant_id = ? AND is_active = true

-- After: pricing_config_json is included in the * but we need to ensure it's processed
```

### 2. Extend NormalizedService Interface
**File:** `supabase/functions/_shared/buildBusinessContext.ts`

Add tiered pricing fields to the normalized service type:
```typescript
interface NormalizedService {
  // ...existing fields...
  pricing_config: {
    model: "flat" | "distance_tiered" | "variable";
    distance_tiers?: Array<{
      min_miles: number;
      max_miles: number | null;
      base_price: number;
      per_mile_price?: number;
    }>;
  } | null;
}
```

### 3. Update `normalizeServices()` to Parse Dispatch Pricing
**File:** `supabase/functions/_shared/buildBusinessContext.ts`

Parse `pricing_config_json` when present:
- Extract distance tiers
- Store in the normalized structure
- Preserve for prompt building

### 4. Update `buildServicesForPrompt()` for Tiered Pricing
**File:** `supabase/functions/_shared/buildBusinessContext.ts`

Transform tiered pricing into AI-readable format:
```text
Current output:
• Long Distance Tow: Starting at $200 (final price varies), 180 min

New output:
• Long Distance Tow: Distance-tiered pricing:
  - 11-25 miles: $200 base
  - Over 25 miles: $200 + $3.50/mile
  Duration: 180 min
```

### 5. Update `check_service_area` Edge Function
**File:** `supabase/functions/elevenlabs-check-service-area/index.ts`

When the tool determines the customer is in `long_distance` tier, read the actual pricing config from the "Long Distance Tow" service and include it in `pricing_note`:

```typescript
// Current generic note:
"15 miles - Long Distance Tow. Quote varies by distance."

// New specific note:
"15 miles - Long Distance Tow applies. Base rate: $200 (11-25 miles). Over 25 miles adds $3.50/mile."
```

## Technical Details

### Files to Modify
1. `supabase/functions/_shared/buildBusinessContext.ts`
   - Add `pricing_config_json` to service select (already in `*` but needs processing)
   - Update `NormalizedService` interface
   - Update `normalizeServices()` function
   - Update `buildServicesForPrompt()` function

2. `supabase/functions/elevenlabs-check-service-area/index.ts`
   - Fetch towing services with `pricing_config_json`
   - Build dynamic `pricing_note` based on actual pricing tiers
   - Include specific tier info for the calculated distance

### New Service Format in AI Prompt
For dispatch services with distance-tiered pricing, the AI will see:

```text
SERVICES AND PRICING:
• Local Tow: $85 (exact price), 60 min [0-10 miles]
• Long Distance Tow: Distance-tiered:
  - 11-25 miles: $200 base
  - Over 25 miles: $200 base + $3.50/mile after mile 25
  Duration: 180 min
```

### check_service_area Response Enhancement
When called for a 15-mile location:
```json
{
  "in_area": true,
  "distance_miles": 15,
  "service_tier": "long_distance",
  "pricing_note": "At 15 miles, Long Distance Tow pricing applies: $200 base rate. If over 25 miles, add $3.50 per mile beyond mile 25.",
  "eta_minutes": 35
}
```

## Expected AI Behavior After Implementation

**Customer:** "I need a tow from downtown, about 15 miles away."

**AI Agent:** "I can help with that. At 15 miles, our Long Distance Tow service applies. The base rate is $200 for distances between 11 and 25 miles. If you're further out, we add $3.50 for each additional mile beyond 25. Can I get your exact pickup location?"

**Customer:** "What if I'm 30 miles away?"

**AI Agent:** "For 30 miles, you'd have the $200 base rate plus $3.50 for each mile over 25 - that's 5 extra miles at $3.50 each, so $17.50 additional. Your total would be around $217.50 plus any applicable fees."
