# CloseLoop Audit Report: Mapbox ETA, Dynamic Variables, Edge Functions

**Date:** 2026-02-03
**Branch:** `audit/mapbox-eta-dynamic-vars-cleanup`

---

## A) FINDINGS (Inventory + Risks)

### 1. DB Schema Audit

| Table | RLS Enabled | RLS Forced | Policy | Trigger | Status |
|-------|-------------|------------|--------|---------|--------|
| `tenant_distance_settings` | ✅ Yes | ✅ Yes | `tenant_isolation_all` (is_tenant_member) | `update_updated_at` | ✅ PASS |
| `geocode_cache` | ✅ Yes | ✅ Yes | SELECT/INSERT/DELETE per tenant | N/A | ✅ PASS |
| `route_cache` | ✅ Yes | ✅ Yes | SELECT/INSERT/DELETE per tenant | N/A | ✅ PASS |
| `tenants` | ✅ Yes | ✅ Yes | `tenant_isolation_all` (is_tenant_member) | ✅ | ✅ PASS |
| `tenant_users` | ✅ Yes | - | Per-user policies | N/A | ✅ PASS |

**Schema Verification:**
- `is_tenant_member(uuid)` function exists and checks `tenant_users` membership
- `update_updated_at_column()` trigger function exists
- All cache tables use tenant-scoped keys (tenant_id in primary/unique index)
- HIPAA-safe: geocode_cache stores hashed addresses only

### 2. Mapbox Implementation Audit

| Check | File | Status | Notes |
|-------|------|--------|-------|
| Token read via env | `mapbox_distance.ts:119,246,390` | ✅ PASS | `Deno.env.get("MAPBOX_ACCESS_TOKEN")` |
| Token never logged | Both files | ✅ PASS | Only truncated tenant IDs logged |
| Geocoding API used | `mapbox_distance.ts:152` | ✅ PASS | `mapbox.places` endpoint |
| Directions API used | `mapbox_distance.ts:287` | ✅ PASS | `directions/v5/mapbox` endpoint |
| Default profile | `mapbox_distance.ts:470` | ✅ PASS | `mapbox/driving-traffic` default |
| Cache tenant-scoped | Both files | ✅ PASS | `tenant_id` always part of cache key |
| Error handling | Both files | ✅ PASS | Returns safe error objects, no crashes |

**RISK: Code Duplication**
- `distance_eta.ts` (876 lines) - Legacy multi-provider (Google, Mapbox, OSRM, fallback)
- `mapbox_distance.ts` (546 lines) - Clean Mapbox-only implementation

Both files implement Mapbox geocoding and directions. Recommend consolidating.

### 3. Dynamic Variables Contract Audit

**Registry Location:** `_shared/voiceContextContract.ts`

| Key | Exists | Type | Default | Used in Prompt | Compact JSON | HIPAA Redacted |
|-----|--------|------|---------|----------------|--------------|----------------|
| `tenant_id` | ✅ | string | "" | No | ✅ | No |
| `business_name` | ✅ | string | "Our Business" | Yes | ✅ | No |
| `business_mode` | ✅ | string | "general" | Yes | ✅ | No |
| `business_address` | ✅ | string | "" | Yes | ✅ | No |
| `location_summary` | ✅ | string | "" | Yes | ✅ | No |
| `service_area_summary` | ✅ | string | "" | Yes | ✅ | No |
| `hours_today` | ✅ | string | "" | Yes | ✅ | No |
| `services_pricing` | ✅ | string | "" | Yes | ✅ | No |
| `menu_summary` | ✅ | string | "" | Yes | ✅ | No |
| `pricing_rules_summary` | ✅ | string | "No pricing rules configured" | Yes | ✅ | No |
| `eta_rules_summary` | ✅ | string | "" | Yes | ✅ | No |
| `caller_phone` | ✅ | string | "" | No | No | ✅ Yes |
| `customer_id` | ✅ | string | "" | No | No | No |
| `memory_hints_summary` | ✅ | string | "" | No | No | ✅ Yes |
| `hipaa_mode` | ✅ | boolean | false | Yes | No | No |

**Contract Version:** `v1` (stamped in `buildDynamicVariablesFromRegistry`)

**PASS:** No nulls/undefined - all values coerced to proper types with defaults.

### 4. Edge Functions Auth Audit

| Function | Auth Type | JWT | Tenant Check | Secret | Status |
|----------|-----------|-----|--------------|--------|--------|
| `distance-eta-test` | Internal + JWT | ✅ | ✅ requireAuthedTenant | ✅ x-closeloop-secret | ✅ PASS |
| `twilio-inbound` | Public (Twilio) | N/A | By phone lookup | N/A | ✅ PASS |
| `elevenlabs-webhook` | Webhook | N/A | By session lookup | ElevenLabs signature | ✅ PASS |
| `create-tenant` | JWT | ✅ | N/A (creates membership) | N/A | ✅ PASS |
| `cleanup-test-users` | Admin | N/A | N/A | ✅ x-admin-secret | ✅ PASS |

**Auth Patterns:**
- `requireAuthedTenant()` - JWT validation + tenant membership check
- `requireInternalSecret()` - x-closeloop-secret header validation
- `requireAdminSecret()` - x-admin-secret header validation
- `serviceClient()` - Service role for cache writes (bypasses RLS)

---

## B) REQUIRED FIXES

### None Critical

No security vulnerabilities or contract mismatches found.

---

## C) OPTIONAL CLEANUP (Recommendations)

### 1. Consolidate Distance Utilities (LOW PRIORITY)

**Problem:** Two files doing similar work:
- `distance_eta.ts` - 876 lines, multi-provider
- `mapbox_distance.ts` - 546 lines, Mapbox-only

**Recommendation:**
- Keep `mapbox_distance.ts` as the clean implementation
- Deprecate `distance_eta.ts` gradually
- Update callers to use `mapbox_distance.ts` directly

**Justification:** Reduces maintenance burden, single source of truth.

**NOT doing now:** Would require testing all callers. Low risk to leave as-is.

### 2. Add Missing `eta_rounding_minutes` to `mapbox_distance.ts` (LOW PRIORITY)

**Problem:** `mapbox_distance.ts` doesn't read/apply `eta_rounding_minutes` from settings.

**Current behavior:** Rounds to nearest minute (line 507: `Math.round(etaMinutes)`)

**Schema has:** `eta_rounding_minutes` (default 5)

**Recommendation:** Add rounding support for consistency with `distance_eta.ts`.

---

## D) VERIFICATION COMMANDS + CHECKLIST

### SQL Verification Queries

```sql
-- 1. Verify tenant_distance_settings table exists with RLS
SELECT
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('tenant_distance_settings', 'geocode_cache', 'route_cache');

-- 2. Verify RLS policies
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('tenant_distance_settings', 'geocode_cache', 'route_cache');

-- 3. Verify is_tenant_member function
SELECT
  proname,
  prosecdef AS security_definer
FROM pg_proc
WHERE proname = 'is_tenant_member';

-- 4. Verify updated_at trigger on tenant_distance_settings
SELECT
  tgname,
  tgtype,
  proname AS function_name
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE tgrelid = 'public.tenant_distance_settings'::regclass;
```

### curl Commands for Testing

```bash
# 1. Test distance-eta-test endpoint (requires secrets)
curl -X POST https://<project>.supabase.co/functions/v1/distance-eta-test \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $USER_JWT" \
  -H "x-closeloop-secret: $CLOSELOOP_INTERNAL_SECRET" \
  -d '{
    "tenant_id": "<tenant-uuid>",
    "destination_address": "123 Main St, New York, NY 10001"
  }'

# 2. Second request should show cache hits
curl -X POST https://<project>.supabase.co/functions/v1/distance-eta-test \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $USER_JWT" \
  -H "x-closeloop-secret: $CLOSELOOP_INTERNAL_SECRET" \
  -d '{
    "tenant_id": "<tenant-uuid>",
    "destination_address": "123 Main St, New York, NY 10001"
  }'
# Expected: used_cache_geocode: true, used_cache_route: true
```

### 10-Minute End-to-End Checklist

- [ ] **1. Enable distance for tenant** (Supabase SQL Editor):
  ```sql
  UPDATE public.tenants
  SET
    distance_provider_enabled = true,
    distance_provider = 'mapbox',
    base_lat = 40.7128,
    base_lng = -74.0060,
    mapbox_route_profile = 'mapbox/driving-traffic'
  WHERE id = '<tenant-uuid>';
  ```

- [ ] **2. Verify MAPBOX_ACCESS_TOKEN is set** in Edge Functions secrets

- [ ] **3. Run distance-eta-test** with curl command above
  - Check: `result.ok = true`
  - Check: `result.provider_used = "mapbox"`
  - Check: `result.distance_miles` and `result.eta_minutes` are populated

- [ ] **4. Run second request** to verify caching
  - Check: `cache_status.geocode_hit = true`
  - Check: `cache_status.route_hit = true`

- [ ] **5. Verify dynamic variables** appear in simulator/debug
  - Check: `business_address` populated
  - Check: `eta_rules_summary` populated (if enabled)
  - Check: No null values in dynamic variables

---

## E) ROLLBACK PLAN

### If Issues Found:

1. **DB Issues:**
   - Migrations are additive (CREATE IF NOT EXISTS)
   - No destructive changes made

2. **Code Issues:**
   - Revert to `main` branch: `git checkout main`
   - No code changes made in this audit (read-only)

3. **Edge Function Issues:**
   - Functions not modified
   - Previous versions remain deployed

### Rollback Commands:

```bash
# Discard this branch
git checkout main
git branch -D audit/mapbox-eta-dynamic-vars-cleanup

# If changes were committed, revert
git revert HEAD
```

---

## Summary

| Area | Status | Risk Level |
|------|--------|------------|
| DB Schema & RLS | ✅ PASS | None |
| Mapbox Security | ✅ PASS | None |
| Mapbox Caching | ✅ PASS | None |
| Dynamic Variables | ✅ PASS | None |
| HIPAA Redaction | ✅ PASS | None |
| Edge Functions Auth | ✅ PASS | None |
| Code Duplication | ⚠️ Noted | Low |

**Overall Assessment:** System is secure, multi-tenant safe, and contract-compliant.
