# Distance-aware ETA

## Overview

Distance-aware ETA enables CloseLoop tenants to configure driving distance/time computation between their base address and caller-provided addresses (pickup/delivery locations). This feature allows downstream edge functions to include distance-based travel time in ETA calculations.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Business Brain                               │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │           tenant_distance_settings                       │   │
│  │  - enabled (on/off)                                     │   │
│  │  - provider (google, mapbox, osrm, none)                │   │
│  │  - fallback_mode (none, per_mile)                       │   │
│  │  - eta_rounding_minutes (5, 10, 15...)                  │   │
│  │  - max_distance_miles (optional cutoff)                 │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Edge Functions                               │
│  - Read tenant's distance settings                              │
│  - Call distance provider API (platform keys)                   │
│  - Apply fallback if provider fails                             │
│  - Round ETA per tenant config                                  │
│  - Reject if beyond max_distance_miles                          │
└─────────────────────────────────────────────────────────────────┘
```

## Database Table

**Table**: `public.tenant_distance_settings`

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `tenant_id` | uuid PK | - | References tenants(id) |
| `enabled` | boolean | false | Whether distance ETA is active |
| `provider` | text | 'google' | Distance API provider |
| `fallback_mode` | text | 'none' | Behavior when provider fails |
| `fallback_minutes_per_mile` | numeric | 2.0 | Fallback estimation rate |
| `eta_rounding_minutes` | integer | 5 | Round ETA to nearest N minutes |
| `max_distance_miles` | numeric | NULL | Optional max service radius |
| `created_at` | timestamptz | now() | Creation timestamp |
| `updated_at` | timestamptz | now() | Auto-updated on changes |

### Provider Options

- `google` - Google Maps Distance Matrix API (default)
- `mapbox` - Mapbox Directions API (future)
- `osrm` - Open Source Routing Machine (future)
- `none` - Disabled, use fallback only

### Fallback Modes

- `none` - Return no distance estimate if provider fails
- `per_mile` - Estimate using straight-line distance × `fallback_minutes_per_mile`

## Environment Variables

**Platform secrets** (NOT stored in tenant rows):

| Variable | Description | Required |
|----------|-------------|----------|
| `GOOGLE_MAPS_API_KEY` | Google Maps Distance Matrix API key | Yes (if using google provider) |
| `MAPBOX_ACCESS_TOKEN` | Mapbox API token | Future |

These keys are managed at the platform level and never exposed to tenants.

## Security

- **RLS Enabled**: Tenants can only read/write their own settings
- **FORCE RLS**: Even table owner respects row-level security
- **Policy**: `tenant_isolation_all` using `is_tenant_member(tenant_id)`
- **No public/anon access**: Only authenticated users with tenant membership

## Verification

### Option 1: SQL Script

Run the verification script to check migration status:

```bash
# Via psql
psql $DATABASE_URL -f supabase/sql/verify_distance_settings.sql

# Or paste into Supabase SQL Editor
```

Expected output:

```
 check_name                  | ok   | details
-----------------------------+------+------------------------------------------
 table_exists                | t    | Table public.tenant_distance_settings exists
 rls_enabled                 | t    | RLS is ENABLED
 force_rls_enabled           | t    | FORCE RLS is ENABLED
 policy_tenant_isolation_all | t    | Policy tenant_isolation_all exists...
 no_public_policy            | t    | No anon/public policies (correct)
 updated_at_trigger          | t    | Trigger update_tenant_distance_settings_updated_at exists
 required_columns            | t    | tenant_id, enabled, provider, ...
-----------------------------+------+------------------------------------------
 SUMMARY                     | t    | 7/7 checks passed
```

### Option 2: Health Endpoint

Call the health-db edge function:

```bash
# Check tenant_distance_settings (default)
curl https://<project>.supabase.co/functions/v1/health-db

# Check a specific table
curl https://<project>.supabase.co/functions/v1/health-db?table=tenant_distance_settings
```

Response:

```json
{
  "ok": true,
  "timestamp": "2026-02-02T15:00:00.000Z",
  "checks": [
    { "check_name": "table_exists", "ok": true, "details": "..." },
    { "check_name": "rls_enabled", "ok": true, "details": "..." },
    ...
  ],
  "summary": "7/7 checks passed"
}
```

## Usage Example

### Enable Distance ETA for a Tenant

```sql
INSERT INTO public.tenant_distance_settings (
  tenant_id,
  enabled,
  provider,
  fallback_mode,
  eta_rounding_minutes,
  max_distance_miles
) VALUES (
  'your-tenant-uuid',
  true,
  'google',
  'per_mile',
  5,
  50
);
```

### Update Settings

```sql
UPDATE public.tenant_distance_settings
SET
  eta_rounding_minutes = 10,
  max_distance_miles = 75
WHERE tenant_id = 'your-tenant-uuid';
```

### Query Tenant's Settings (from Edge Function)

```typescript
const { data: distanceSettings } = await supabase
  .from("tenant_distance_settings")
  .select("*")
  .eq("tenant_id", tenantId)
  .single();

if (distanceSettings?.enabled) {
  // Compute distance-based ETA
}
```

## Related Files

- Migration: `supabase/migrations/20260202150000_add_tenant_distance_settings.sql`
- Verification: `supabase/sql/verify_distance_settings.sql`
- Health endpoint: `supabase/functions/health-db/index.ts`
- Documentation: `docs/distance-aware-eta.md` (this file)
