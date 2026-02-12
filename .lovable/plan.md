

# Fix: Smarter Geocoding for Dispatch Addresses

## The Real-World Problem

Callers don't always know their exact address. They might say:
- "I'm at Hamilton High West" (a school name -- no street address)
- "I'm on Route 33 near the Wawa" (landmark + road)
- "I broke down on I-195" (highway, no cross-street)
- "I'm in the Walmart parking lot on Route 130" (POI with road context)

Currently, when Mapbox can't find an exact match, it silently falls back to the **city center** (e.g., "Trenton, NJ") which looks like a valid result but gives wildly wrong distances.

## The Fix (3 Layers)

### Layer 1: Place-Type Guard (Catches the City-Center Problem)

After geocoding, inspect the `place_type` field on the result. If Mapbox returned a **city/region-level** match instead of an address or POI, don't trust it for distance:

- `address`, `poi` = **High confidence** -- use it
- `neighborhood`, `postcode`, `locality` = **Medium** -- use it but flag
- `place`, `region`, `district`, `country` = **Low** -- trigger POI retry

This is the core fix that would have caught the "Hamilton High West" issue. The school resolved to "Trenton" (place_type = `place`), and the code never noticed.

### Layer 2: POI Retry with Fuzzy Match

When a place-level result is detected, before giving up, try a **second geocode** restricted to `types=poi,address`. This catches schools, gas stations, shopping centers, and other landmarks that exist in Mapbox's POI database but get outranked by city-level matches in the general search.

If the POI retry finds something within a reasonable distance of the tenant's base (within 2x service radius), use it. Otherwise, flag as needing verification.

### Layer 3: Smart Verification Response

When geocoding confidence is low, instead of just returning `needs_verification: true` as a silent flag, include a `verification_hint` that tells the AI agent what to ask for:

- City-level fallback: "Can you give me a nearby cross-street or the street address?"
- Highway match: "Do you know what exit or mile marker you're near?"
- General low confidence: "Can you describe what's nearby -- like a gas station or intersection?"

This gives the voice agent specific, natural language to use instead of a generic "I couldn't find that."

## Technical Details

### File: `supabase/functions/compute-distance-eta/index.ts`

**Change 1 -- Destination geocoding block (~lines 442-473)**

After selecting `bestFeature`, add place-type inspection:

```
const placeType = bestFeature.place_type?.[0] || "unknown";

// City/region-level results are unreliable for distance
if (["place", "region", "country", "district"].includes(placeType)) {
  console.log(`[compute-distance-eta] Place-level result detected (${placeType}), trying POI retry`);
  
  // Retry with types=poi,address to find landmarks
  const poiUrl = `...&types=poi,address&limit=3`;
  const poiRes = await fetch(poiUrl);
  if (poiRes.ok) {
    const poiData = await poiRes.json();
    if (poiData.features?.length > 0) {
      // Use POI result if within reasonable distance of base
      bestFeature = poiData.features[0];
      // Re-extract coords from POI result
    }
  }
  
  // If still place-level, mark as low confidence
  geocodingConfidence = "low";
  needsVerification = true;
  verificationHint = "nearby cross-street or street address";
}
```

Add `place_type` to the existing log line for debugging.

**Change 2 -- Origin geocoding block (~lines 293-314)**

Apply the same place-type check to origin geocoding (used for tow distance calculations where the pickup is geocoded separately from the base).

**Change 3 -- Response shape (~lines 44-73)**

Add `verification_hint` to the response interface:
```
verification_hint?: string;  // e.g., "nearby cross-street"
```

**Change 4 -- Proximity sanity check (~lines 508-515)**

Tighten the existing sanity check: if route distance is more than the service radius (not 2x), flag as needing verification. A tow company with a 30-mile radius shouldn't silently accept a 45-mile result without questioning it.

### No Database Changes

This is purely edge function logic. No schema changes needed.

### Expected Behavior After Fix

**Scenario: Caller says "Hamilton High West High School"**
1. First geocode: returns "Trenton, NJ" (place_type = `place`, relevance = 1.0)
2. Place-type guard catches it -- `place` is not trusted
3. POI retry with `types=poi,address`: finds "Hamilton High School West" as POI with actual coordinates
4. Uses POI coordinates -- distance = ~3.2 miles (correct)

**Scenario: Caller says "I'm on Route 33"**
1. Geocode returns a road-level or place-level result
2. Place-type guard catches it
3. POI retry finds nothing specific
4. Returns `needs_verification: true` with hint: "Do you know what exit or cross-street you're near?"
5. Voice agent asks naturally for more detail

**Scenario: Caller gives exact address "123 Main St"**
1. Geocode returns address-level result (place_type = `address`)
2. Place-type guard passes -- high confidence
3. No retry needed, fast path

