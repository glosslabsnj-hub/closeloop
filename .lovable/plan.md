
# Plan: Admin Test Harness for Multi-Tenant Testing

## Problem Statement
Currently, browser-based Voice Agent tests always use the tenant from `AuthContext`, but the issue is that super admins need to test across **multiple different business modes** (dispatch, food, medical, service) without switching actual tenants. The demo tenant (`a0000000-0000-0000-0000-000000000001`) has been blocked by a tripwire, so we need a proper solution.

## Solution Overview
Create an admin-only test harness that allows super admins to:
1. Create new test tenants for each business mode
2. Switch between active test tenants
3. Persist their active tenant selection
4. Ensure ALL test calls and Business Brain edits use the selected tenant

---

## Architecture

```text
+------------------+       +--------------------+       +----------------------+
|  Admin Settings  |       |   Auth Context     |       |   Voice/Brain APIs   |
|  (new table)     | ----> |  (activeTenantId)  | ----> |  (tenant_id param)   |
+------------------+       +--------------------+       +----------------------+
        |                          |
        |  admin_active_tenant_id  |
        +--------------------------+
```

---

## Database Changes

### New Table: `admin_settings`

```sql
CREATE TABLE admin_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  admin_active_tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

-- RLS: Only super_admins can access their own row
ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins manage their own settings"
  ON admin_settings FOR ALL
  USING (
    user_id = auth.uid() AND 
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'super_admin')
  );
```

---

## Frontend Changes

### 1. New Component: `AdminTenantSwitcher.tsx`
Location: `src/components/admin/AdminTenantSwitcher.tsx`

Features:
- Dropdown showing all existing tenants
- "Create Test Tenant" button that opens a modal
- Visual indicator of current active tenant
- Persists selection to `admin_settings` table

```text
+-----------------------------------------------+
| [Flask Icon] Active Tenant: City Roadside     |
|                                          [v]  |
|  - City Roadside Rescue (dispatch)            |
|  - Brothers Pizza (food)                      |
|  - Blue Boxer Plumbing (service)              |
|  -------------------------------------------- |
|  [+ Create Test Tenant]                       |
+-----------------------------------------------+
```

### 2. Update AuthContext
Add new fields and methods:

```typescript
interface AuthContextType {
  // ... existing fields
  activeTenantId: string | null;  // For admins: the tenant being tested
  setActiveTenantId: (id: string) => Promise<void>;
  effectiveTenant: Tenant | null; // Either activeTenant or default tenant
}
```

The `effectiveTenant` will be:
- For super_admins: the `admin_active_tenant_id` from `admin_settings`
- For regular users: their normal `tenant` from `tenant_users`

### 3. Update AdminModeSwitcher
Enhance the existing component to:
- Show active tenant name clearly
- Move mode switching to a sub-menu per tenant
- Add "Create Test Tenant" action

### 4. New Component: `CreateTestTenantDialog.tsx`
Modal form with:
- Business name input
- Business mode dropdown (service/dispatch/food/medical/general)
- Timezone selector
- Optional: Seed with sample data checkbox

### 5. Update VoiceAgentTest.tsx
Change from:
```typescript
const { data, error } = await supabase.functions.invoke(
  "elevenlabs-conversation-token",
  { body: { tenantId: tenant?.id, ... } }
);
```

To:
```typescript
const { effectiveTenantId } = useAuth();
const { data, error } = await supabase.functions.invoke(
  "elevenlabs-conversation-token",
  { body: { tenantId: effectiveTenantId, ... } }
);
```

### 6. New Component: `DynamicVariablesDebugPanel.tsx`
Admin-only debug panel showing:
- Current `tenant_id` being sent
- All dynamic variables JSON
- Business name, mode, hours
- Visible only when `isSuperAdmin === true`

---

## Edge Function Changes

### 1. `elevenlabs-conversation-token/index.ts`
Already has tripwire for demo tenant. Need to:
- Add explicit error if `tenantId` is missing (return 400, not fallback)
- Log clear error message: `"tenant_id required for voice session"`

### 2. `elevenlabs-init/index.ts`
Already has tripwire. Same changes as above:
- Require explicit tenant_id
- No silent fallbacks

### 3. Remove demo fallback logic
In `buildBusinessContext.ts`, ensure there's no fallback to demo tenant.

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/components/admin/AdminTenantSwitcher.tsx` | Tenant selection dropdown |
| `src/components/admin/CreateTestTenantDialog.tsx` | Modal to create test tenants |
| `src/components/admin/DynamicVariablesDebugPanel.tsx` | Debug panel for AI context |

## Files to Modify

| File | Changes |
|------|---------|
| `src/contexts/AuthContext.tsx` | Add `activeTenantId`, `effectiveTenant`, `setActiveTenantId` |
| `src/components/admin/AdminModeSwitcher.tsx` | Integrate with tenant switcher |
| `src/components/ai/VoiceAgentTest.tsx` | Use `effectiveTenantId`, add debug panel |
| `src/components/simulator/CallSimulator.tsx` | Use `effectiveTenantId` |
| `supabase/functions/elevenlabs-conversation-token/index.ts` | Require tenant_id, return 400 if missing |
| `supabase/functions/elevenlabs-init/index.ts` | Same as above |

---

## Implementation Steps

1. **Database Migration**: Create `admin_settings` table with RLS

2. **AuthContext Updates**:
   - Add state for `adminSettings`
   - Add `effectiveTenantId` computed property
   - Add `setActiveTenantId()` function to persist selection

3. **Create AdminTenantSwitcher Component**:
   - Fetch all tenants (for super_admin only)
   - Show dropdown with current selection
   - Save selection to `admin_settings`

4. **Create CreateTestTenantDialog**:
   - Form for name, mode, timezone
   - Insert new tenant on submit
   - Auto-select as active tenant

5. **Update VoiceAgentTest**:
   - Import `effectiveTenantId` from AuthContext
   - Pass to `elevenlabs-conversation-token`
   - Add `DynamicVariablesDebugPanel`

6. **Edge Function Hardening**:
   - Return 400 if tenant_id missing
   - Clear error messages

---

## Security Considerations

- Only `super_admin` users can access `admin_settings`
- RLS policy enforces row-level access per user
- Test tenants are real tenants (same RLS rules apply)
- No demo fallbacks anywhere in voice pipeline

---

## Data Flow After Implementation

```text
1. Admin logs in → AuthContext fetches admin_settings.admin_active_tenant_id
2. Admin selects tenant → setActiveTenantId() saves to DB, updates context
3. Admin opens VoiceAgentTest → uses effectiveTenantId
4. Token endpoint receives real tenant_id → builds correct context
5. AI agent speaks with correct business knowledge
```
