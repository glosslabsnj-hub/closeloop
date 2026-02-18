# Mapbox Distance + ETA

## Overview

CloseLoop supports Mapbox-powered distance and ETA calculations for tenants. This feature enables:

- Geocoding customer addresses to coordinates
- Computing driving distance/time from tenant's base location
- Applying tenant-specific ETA rules (base time, per-mile additions, min/max clamps)
- Tenant-isolated caching for performance

## Required Environment Variables

Set these in Supabase Dashboard → Project Settings → Edge Functions:

| Variable | Description | Required |
|----------|-------------|----------|
| `MAPBOX_ACCESS_TOKEN` | Mapbox API access token | Yes |
| `CLOSELOOP_INTERNAL_SECRET` | Internal API secret for test endpoint | Yes |

### Getting a Mapbox Token

1. Create account at [mapbox.com](https://www.mapbox.com/)
2. Go to Account → Access tokens
3. Create a new token with these scopes:
   - `directions:read`
   - `geocoding:read`
4. Copy the token to your Supabase Edge Functions secrets

## Enabling for a Tenant

To enable Mapbox distance/ETA for a tenant:

```sql
UPDATE public.tenants
SET
  distance_provider_enabled = true,
  distance_provider = 'mapbox',
  base_lat = 40.7128,  -- Your business latitude
  base_lng = -74.0060, -- Your business longitude
  mapbox_route_profile = 'mapbox/driving-traffic',  -- Optional, default
  eta_base_minutes = 5,      -- Base prep time (optional)
  eta_per_mile_minutes = 0,  -- Extra time per mile (optional)
  eta_min_minutes = 15,      -- Minimum ETA floor (optional)
  eta_max_minutes = 90       -- Maximum ETA cap (optional)
WHERE id = 'your-tenant-uuid';
```

### Configuration Options

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `distance_provider_enabled` | boolean | false | Master switch for distance ETA |
| `distance_provider` | text | 'mapbox' | Provider: 'mapbox', 'google', 'none' |
| `base_lat` | numeric | NULL | Business location latitude |
| `base_lng` | numeric | NULL | Business location longitude |
| `mapbox_route_profile` | text | 'mapbox/driving-traffic' | Routing profile |
| `eta_base_minutes` | int | 0 | Base prep time added to all ETAs |
| `eta_per_mile_minutes` | numeric | 0 | Additional minutes per mile |
| `eta_min_minutes` | int | NULL | Minimum ETA floor |
| `eta_max_minutes` | int | NULL | Maximum ETA cap |

### Route Profiles

- `mapbox/driving-traffic` - Driving with live traffic (default)
- `mapbox/driving` - Driving without traffic
- `mapbox/walking` - Walking directions
- `mapbox/cycling` - Cycling directions

## Testing

### Internal Test Endpoint

Use the `distance-eta-test` endpoint to verify configuration:

```bash
curl -X POST https://<project>.supabase.co/functions/v1/distance-eta-test \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $USER_JWT" \
  -H "x-closeloop-secret: $CLOSELOOP_INTERNAL_SECRET" \
  -d '{
    "tenant_id": "your-tenant-uuid",
    "destination_address": "123 Main St, New York, NY 10001"
  }'
```

### Response

```json
{
  "test_mode": true,
  "tenant_id": "your-tenant-uuid",
  "destination_provided": "[ADDRESS PROVIDED]",
  "result": {
    "ok": true,
    "distance_miles": 5.23,
    "drive_minutes": 12.5,
    "eta_minutes": 18,
    "provider_used": "mapbox",
    "used_cache_geocode": false,
    "used_cache_route": false,
    "max_distance_exceeded": false,
    "error": null
  },
  "cache_status": {
    "geocode_hit": false,
    "route_hit": false
  }
}
```

### Error Responses

**Provider disabled:**
```json
{
  "result": {
    "ok": true,
    "distance_miles": null,
    "drive_minutes": null,
    "eta_minutes": null,
    "provider_used": "none",
    "error": null
  }
}
```

**Missing base coordinates:**
```json
{
  "result": {
    "ok": false,
    "error": "Tenant base coordinates (base_lat/base_lng) not configured"
  }
}
```

**Geocode failed:**
```json
{
  "result": {
    "ok": false,
    "error": "Address not found"
  }
}
```

## Caching

### Geocode Cache

- Table: `geocode_cache`
- TTL: 30 days
- Scope: Tenant-isolated (uses `tenant_id` + `address_hash`)
- RLS: Enforced via `is_tenant_member(tenant_id)`

### Route Cache

- Table: `route_cache`
- TTL: 7 days
- Scope: Tenant-isolated (uses `tenant_id` + coordinates)
- Precision: Coordinates rounded to 4 decimal places (~11m)
- RLS: Enforced via `is_tenant_member(tenant_id)`

### Cache Hits

The test endpoint reports cache status:
- `used_cache_geocode: true` - Address was found in geocode cache
- `used_cache_route: true` - Route was found in route cache

Second requests for the same address should show cache hits.

## Security

### Multi-tenant Isolation

- All cache entries are scoped to `tenant_id`
- RLS policies enforce tenant isolation
- Service role bypasses RLS but code enforces tenant scoping

### Test Endpoint Security

The `distance-eta-test` endpoint requires:
1. `x-closeloop-secret` header matching `CLOSELOOP_INTERNAL_SECRET`
2. Valid JWT in `Authorization: Bearer` header
3. JWT user must be a member of the requested tenant

### Privacy

- Full addresses are never logged
- Cache stores hashed addresses (geocode) or coordinates (route)
- Response redacts destination address

## Shared Utility

Import for use in other edge functions:

```typescript
import {
  geocodeAddress,
  routeDuration,
  computeTenantEta,
} from "../_shared/mapbox_distance.ts";

// Geocode only
const geo = await geocodeAddress({
  supabase,
  tenantId,
  inputText: "123 Main St, City, ST 12345",
});
// { ok: true, lat: 40.71, lng: -74.00, place_name: "...", used_cache: false }

// Route only
const route = await routeDuration({
  supabase,
  tenantId,
  origin: { lat: 40.71, lng: -74.00 },
  dest: { lat: 40.75, lng: -73.98 },
  profile: "driving-traffic",
});
// { ok: true, distance_meters: 5000, duration_seconds: 600, used_cache: false }

// Full ETA computation (reads tenant config)
const eta = await computeTenantEta({
  supabase,
  tenantId,
  destinationText: "123 Main St, City, ST 12345",
});
// { ok: true, distance_miles: 3.1, drive_minutes: 10, eta_minutes: 15, provider_used: "mapbox", ... }
```

## Related Files

- **Utility**: `supabase/functions/_shared/mapbox_distance.ts`
- **Test endpoint**: `supabase/functions/distance-eta-test/index.ts`
- **Migrations**:
  - `supabase/migrations/20260202160000_add_mapbox_distance_columns.sql`
  - `supabase/migrations/20260202160001_add_geocode_cache.sql`
  - `supabase/migrations/20260202160002_add_route_cache.sql`
- **Legacy utility**: `supabase/functions/_shared/distance_eta.ts` (Google provider)
