---
paths:
  - "supabase/functions/_shared/tenant*"
  - "supabase/functions/_shared/cors*"
  - "supabase/functions/create-tenant/**"
  - "supabase/functions/seed-test-tenants/**"
  - "supabase/migrations/**"
  - "src/contexts/Auth*"
  - "src/contexts/AdminMode*"
  - "src/hooks/useTenantConfig*"
  - "src/hooks/useCapabilities*"
  - "src/hooks/useAuth*"
  - "src/pages/admin/**"
---
# Behavioral Rules: Multi-Tenant Operations

When working on tenant isolation, RLS policies, auth, or admin features, ALWAYS follow these procedures.

## Tenant Isolation Is Non-Negotiable

Every user-facing table MUST enforce tenant isolation via RLS. If I'm creating or modifying tables:

1. **ALWAYS add `tenant_id uuid REFERENCES tenants`** column
2. **ALWAYS add RLS policies** for SELECT, INSERT, UPDATE, DELETE
3. **ALWAYS add index** on `tenant_id` for query performance
4. **Test with non-admin user** — verify they only see their own tenant's data

## RLS Policy Patterns (use these, don't invent new ones)

```sql
-- Pattern 1 (preferred): Helper function
USING (has_tenant_access(auth.uid(), tenant_id))

-- Pattern 2: Direct join
USING (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()))

-- Pattern 3: Role-based (owner-only operations)
USING (id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid() AND role = 'owner'))
```

## Gotcha: RLS Silent Filtering

Missing `tenant_id` in WHERE clause does NOT error — it silently returns empty results. If a query returns nothing unexpectedly, CHECK:
1. Is `tenant_id` included in the query?
2. Is the user a member of the tenant in `tenant_users`?
3. Is the RLS policy correct on the table?

## Auth Patterns in Edge Functions

```typescript
// User-facing endpoints (RLS enforced):
const { tenant, supabase } = await requireAuthedTenant(req);

// Internal/system operations (RLS bypass):
const supabase = serviceClient();

// AI/webhook calls:
await requireInternalSecret(req);  // x-closeloop-secret header

// Admin operations:
await requireAdminSecret(req);     // x-admin-secret header
```

ALWAYS use the correct auth pattern. NEVER use `serviceClient()` for user-facing endpoints — it bypasses RLS.

## When Creating a New Table (Migration)

ALWAYS include in the migration:
1. `tenant_id uuid NOT NULL REFERENCES tenants(id)`
2. RLS enabled: `ALTER TABLE new_table ENABLE ROW LEVEL SECURITY;`
3. RLS policies for all operations (SELECT, INSERT, UPDATE, DELETE)
4. Index on tenant_id: `CREATE INDEX idx_new_table_tenant ON new_table(tenant_id);`
5. Updated_at trigger if the table supports updates

## When Working on Admin Features

- Admin routes require `super_admin` role — checked via `AdminLayout`
- Tenant switching: `AdminModeContext` + `useAdminTenantSwitch()`
- Switch resets ALL TanStack Query caches (stale data from previous tenant)
- NEVER expose admin endpoints without `requireAdminSecret()` check

## Customer Identity Rules

- `customers` table: UNIQUE constraint on `(tenant_id, phone_e164)`
- ALWAYS normalize phone to E.164 before insert/lookup
- Same physical person in different tenants = separate customer records
- Use `resolve_customer()` RPC for upsert with conflict detection
- Conflicts (name/email mismatch) go to `customer_merge_queue`

## Key Files

- Auth helpers: `supabase/functions/_shared/tenant.ts`
- CORS: `supabase/functions/_shared/cors.ts`
- Auth context: `src/contexts/AuthContext.tsx`
- Admin context: `src/contexts/AdminModeContext.tsx`
- Tenant hooks: `src/hooks/useTenantConfig.ts`, `src/hooks/useCapabilities.ts`
- Create tenant: `supabase/functions/create-tenant/index.ts`
- Admin pages: `src/pages/admin/` (7 pages)
