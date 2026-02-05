
# AI Voice Agent Performance Investigation

## Summary of Issues Found

After analyzing the edge function logs, database state, and code paths, I've identified **three root causes** for your AI voice agent issues:

---

## Issue 1: Missing Database Function (Critical)

**Symptom:** 500 errors in `manage-session-locks` edge function

**Root Cause:** The migration `20260204120000_session_slot_locking.sql` was never applied to the database. This migration creates several critical functions:
- `fn_release_session_locks` ← **Missing, causing errors**
- `fn_extend_session_locks` ← Missing
- `fn_confirm_slot_from_session` ← Missing
- `fn_lock_offered_slots` ← Missing

**Evidence from logs:**
```
ERROR: Could not find the function public.fn_release_session_locks(_session_id) in the schema cache
```

**Impact:** Every time a call ends without a booking, the webhook tries to release slot locks and fails. While this is handled gracefully (locks expire anyway), it adds latency and generates errors.

---

## Issue 2: Geocoding Failures for Vague Addresses

**Symptom:** Addresses like "Route 539, mile marker 15, Monmouth County" are incorrectly geocoded, resulting in absurd distances (2954 miles instead of ~15 miles).

**Evidence from logs:**
```
[check-service-area] Tow distance calculated: 2954.4 miles
[check-service-area] tier=out_of_area
```

**Root Cause:** The Mapbox geocoder is interpreting "Route 539, mile marker 15" poorly. When a vague address fails to geocode accurately, the AI incorrectly tells callers they're "out of area."

**Current flow:**
1. Caller says "I'm on Route 539, mile marker 15"
2. ElevenLabs calls `check_service_area` with that address
3. Mapbox geocodes it to somewhere far away (wrong location)
4. System returns `tier=out_of_area` 
5. AI says customer is outside service area

---

## Issue 3: Latency from Multiple Serial API Calls

**Symptom:** AI takes too long to respond during service area checks

**Evidence:**
- `elevenlabs-check-service-area`: 6,466ms execution time
- `compute-distance-eta`: 2,864ms per call (called twice for dispatch + tow distance)

**Root Cause:** The `check_service_area` tool makes **two sequential** calls to `compute-distance-eta`:
1. First call: Base → Pickup (dispatch distance)
2. Second call: Pickup → Dropoff (tow distance)

Each call involves:
- Geocoding the address via Mapbox
- Route calculation via Mapbox Directions API
- Database lookups for tenant settings and pricing tiers

---

## Proposed Fixes

### Fix 1: Apply the Missing Database Migration
Create and apply the session locking functions that the migration file defines. This will eliminate the 500 errors.

**Technical approach:**
- Create the following functions via database migration:
  - `fn_release_session_locks`
  - `fn_extend_session_locks`
  - `fn_lock_offered_slots`
  - `fn_confirm_slot_from_session`
  - `fn_refresh_session_slots`

### Fix 2: Improve Geocoding Fallback for Vague Addresses
Add smarter handling when addresses fail to geocode accurately:

1. **Add state/region hints to geocoding requests**: When the pickup address doesn't include a state, append the tenant's base state (e.g., ", NJ") to improve accuracy.

2. **Validate geocoded results**: If the geocoded location is more than 2x the service radius from the tenant's base, flag it as "unverified" rather than "out of area."

3. **Return a graceful message**: Instead of hard "out of area," the AI should say: "I couldn't pinpoint that exact location. Could you give me a cross street or nearby landmark?"

**Changes to `compute-distance-eta/index.ts`:**
- Add state hint from tenant settings when geocoding
- Add proximity validation

**Changes to `elevenlabs-check-service-area/index.ts`:**
- Handle geocoding failures gracefully
- Return `in_area: true` with `needs_verification: true` flag for ambiguous addresses

### Fix 3: Optimize Latency with Parallel API Calls
Modify `elevenlabs-check-service-area` to execute the two distance calculations in parallel instead of serially.

**Current (serial):**
```typescript
const dispatchData = await fetch(computeEtaUrl, {...});  // ~600ms
// Wait for response
const towData = await fetch(computeEtaUrl, {...});      // ~600ms  
// Wait for response
// Total: ~1200ms
```

**Proposed (parallel):**
```typescript
const [dispatchData, towData] = await Promise.all([
  fetch(computeEtaUrl, {...}),  // ~600ms
  fetch(computeEtaUrl, {...}),  // ~600ms (parallel)
]);
// Total: ~600ms
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `supabase/migrations/` | Create new migration to add missing functions |
| `supabase/functions/compute-distance-eta/index.ts` | Add state hints and proximity validation |
| `supabase/functions/elevenlabs-check-service-area/index.ts` | Parallelize API calls, add graceful geocoding fallback |

---

## Expected Improvements

1. **Eliminate 500 errors** on session lock release
2. **Fix false "out of area" responses** for valid locations with vague addresses
3. **Reduce service area check latency** by 40-50% (from ~6s to ~3-4s)
4. **Better caller experience** with graceful fallbacks for ambiguous addresses
