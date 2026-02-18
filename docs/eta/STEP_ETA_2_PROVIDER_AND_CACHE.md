# ETA Engine Step 2: Mapbox Provider + Cache + Out-of-Area Enforcement

## Overview

Step 2 extends the baseline ETA estimator (Step 1) with:

1. **Mapbox Distance Provider** - Server-side route calculation via Edge Function
2. **Route Caching** - HIPAA-safe cache with hashed addresses and 7-day TTL
3. **Out-of-Area Enforcement** - Block requests beyond service radius
4. **Vague Address Handling** - Fallback to baseline when addresses are imprecise

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          ETA Flow (Step 2)                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────┐    ┌─────────────────┐    ┌─────────────────────────────┐ │
│  │ Client      │───▶│ estimateEta     │───▶│ eta-route Edge Function     │ │
│  │ (with       │    │ WithProvider    │    │ (Mapbox API)                │ │
│  │  addresses) │    │                 │    │                             │ │
│  └─────────────┘    └────────┬────────┘    └──────────────┬──────────────┘ │
│                              │                            │                │
│                              ▼                            ▼                │
│                    ┌─────────────────┐         ┌─────────────────────────┐ │
│                    │ Check cache     │◀───────▶│ eta_routes_cache        │ │
│                    │ (hash lookup)   │         │ (hashed addresses)      │ │
│                    └────────┬────────┘         └─────────────────────────┘ │
│                              │                                             │
│                              ▼                                             │
│                    ┌─────────────────┐                                     │
│                    │ Out-of-area?    │───▶ Block if > max_radius          │
│                    │ Vague address?  │───▶ Fallback to Step 1 baseline    │
│                    └────────┬────────┘                                     │
│                              │                                             │
│                              ▼                                             │
│                    ┌─────────────────┐                                     │
│                    │ Compute ETA     │                                     │
│                    │ range from      │                                     │
│                    │ duration        │                                     │
│                    └─────────────────┘                                     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Mapbox Edge Function

### Location: `supabase/functions/eta-route/index.ts`

### Endpoint

```
POST /functions/v1/eta-route
```

### Request Body

```json
{
  "origin_address": "123 Main St, Denver, CO 80202",
  "destination_address": "456 Oak Ave, Denver, CO 80203",
  "tenant_id": "uuid",
  "skip_cache": false  // Optional: bypass cache
}
```

### Response

```json
{
  "distance_miles": 5.23,
  "duration_minutes": 12,
  "confidence": "high",  // "high" | "medium" | "low"
  "provider": "mapbox",  // "mapbox" | "none"
  "cached": false,
  "error": null  // Error message if failed
}
```

### Confidence Levels

| Level | Geocode Precision | Use Case |
|-------|-------------------|----------|
| `high` | Address-level or POI | Exact address provided |
| `medium` | Place, neighborhood, or postcode | Partial address |
| `low` | Region, country, or ambiguous | Vague location |

## Route Caching

### Database Table: `eta_routes_cache`

```sql
CREATE TABLE eta_routes_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  origin_hash text NOT NULL,      -- SHA-256 of normalized address
  destination_hash text NOT NULL, -- SHA-256 of normalized address
  distance_miles numeric,
  duration_minutes integer,
  confidence text,
  provider text DEFAULT 'mapbox',
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + interval '7 days')
);
```

### HIPAA Compliance

- **No raw addresses stored** - Only SHA-256 hashes of normalized addresses
- **TTL enforcement** - Entries expire after 7 days
- **Tenant isolation** - RLS policies enforce tenant-specific access

### Hash Normalization

Addresses are normalized before hashing:
1. Convert to lowercase
2. Trim whitespace
3. Collapse multiple spaces to single space
4. Remove punctuation (periods, commas, hashes, hyphens, apostrophes)

Example:
```
"123 Main St., Denver, CO 80202" → "123 main st denver co 80202" → sha256(...)
```

## Extended ETA Policy

### New Fields in `eta_policy_jsonb`

```typescript
interface EtaPolicyExtended {
  // Step 1 fields (unchanged)
  default_range_minutes: { min: number; max: number };
  mode_overrides?: { [mode]: { range_minutes: {...} } };
  job_type_overrides?: { [type]: { range_minutes: {...} } };
  busyness_buffer_pct?: number;
  holiday_buffer_pct?: number;

  // Step 2 fields (new)
  provider_enabled?: boolean;           // Enable Mapbox routing
  max_service_radius_miles?: number;    // Out-of-area threshold
  allow_vague_address_fallback?: boolean; // Fallback or block on vague
  food_prep_minutes?: number;           // Prep time for food orders
  dispatch_response_minutes?: number;   // Response time before driving
  traffic_buffer_pct?: number;          // Traffic buffer on duration
}
```

### Example Configuration

```json
{
  "default_range_minutes": { "min": 30, "max": 60 },
  "provider_enabled": true,
  "max_service_radius_miles": 25,
  "allow_vague_address_fallback": true,
  "food_prep_minutes": 20,
  "dispatch_response_minutes": 5,
  "traffic_buffer_pct": 15
}
```

## ETA Computation Logic

### Food Mode

```
ETA = prep_time + driving_duration + traffic_buffer
```

Example with 20 min prep, 10 min drive, 15% traffic buffer:
- Base: 20 + 10 = 30 min
- With buffer: 30 × 1.15 = 34.5 min
- Range: 30-35 minutes

### Dispatch Mode

```
ETA = response_time + driving_duration + traffic_buffer
```

Example with 5 min response, 12 min drive, 15% traffic buffer:
- Base: 5 + 12 = 17 min
- With buffer: 17 × 1.15 = 19.5 min
- Range: 17-20 minutes

### Service Mode

```
ETA = driving_duration + traffic_buffer
```

(Technician assumed already scheduled/en route)

## Out-of-Area Handling

When `distance_miles > max_service_radius_miles`:

```typescript
return {
  status: "out_of_area",
  spoken: "Sorry, that location is outside our service area",
  out_of_area_message: "Location is 35.0 miles away, which exceeds our 25 mile service area.",
  distance_miles: 35.0,
  duration_minutes: 45,
  ...
}
```

## Vague Address Handling

### Detection Rules

An address is considered "vague" if:
- Less than 10 characters
- Starts with vague words: "near", "around", "somewhere", "by the", "close to"
- Only a zip code (e.g., "80202")
- Only city, state (e.g., "Denver, CO")
- No street number AND no street type word

### Behavior

| `allow_vague_address_fallback` | Vague Address | Result |
|-------------------------------|---------------|--------|
| `true` (default) | Detected | Fallback to Step 1 baseline |
| `false` | Detected | Block with message |

## Business Context Extension

### New Fields in `BusinessContext.eta`

```typescript
eta: {
  // Step 1 fields
  spoken: string;
  min_minutes: number;
  max_minutes: number;
  source: string;
  policy: EtaPolicyJson | null;

  // Step 2 fields (new)
  distance_provider_enabled: boolean;
  eta_policy_summary: string;
  eta_estimate_rules: {
    requires_exact_address: boolean;
    range_only: boolean;
    max_service_radius_miles: number | null;
  };
}
```

## Logging

### Event Types

| Event | When Logged | Payload |
|-------|-------------|---------|
| `eta_computed` | Successful route calculation | distance, duration, confidence, provider |
| `eta_fallback` | Provider failed or address vague | reason, baseline range |
| `eta_blocked_missing_address` | Address missing/vague, fallback disabled | - |
| `eta_out_of_area` | Distance exceeds max radius | distance, max_radius |

### HIPAA Safety

- No raw addresses in payloads
- Only hashed address keys for correlation
- City-only extraction for debugging

## Configuration

### Mapbox Token

Set `MAPBOX_ACCESS_TOKEN` in Supabase Edge Function secrets:

```bash
supabase secrets set MAPBOX_ACCESS_TOKEN=pk.eyJ1I...
```

Or in Lovable pipeline environment variables.

### Without Mapbox Token

System falls back to Step 1 baseline ranges. No errors, no route calculation.

## Testing

### Simulator Script

```bash
npx tsx scripts/simulateEta.ts
```

Tests:
1. Step 1 baseline scenarios (4 tests)
2. Step 2 provider scenarios (4 tests):
   - Dispatch route ETA with exact addresses
   - Food delivery ETA with exact addresses
   - Out-of-area (distance exceeds max radius)
   - Vague address → fallback

### Manual Testing

1. Configure Mapbox token in Supabase
2. Set `provider_enabled: true` in tenant's `eta_policy_jsonb`
3. Make test call with addresses
4. Check `ai_event_logs` for `eta_computed` events

## Files Changed

| File | Change |
|------|--------|
| `supabase/migrations/20260202000005_add_eta_routes_cache.sql` | New: Cache table |
| `supabase/functions/eta-route/index.ts` | New: Edge Function |
| `src/lib/eta/estimateEtaWithProvider.ts` | New: Provider-enhanced estimator |
| `src/lib/eta/index.ts` | Updated: Export new types/functions |
| `supabase/functions/_shared/buildBusinessContext.ts` | Extended: ETA policy + context |
| `src/lib/logging/logAiEvent.ts` | Extended: New event types |
| `scripts/simulateEta.ts` | Updated: Step 2 test scenarios |
| `docs/STEP_ETA_2_PROVIDER_AND_CACHE.md` | This documentation |

## Future Steps

- **Step 3**: Real-time traffic adjustments
- **Step 4**: Historical ETA accuracy tracking
- **Step 5**: Dynamic re-estimation during calls
