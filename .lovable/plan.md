

# Mode-Aware Admin Tenant Switcher

## Overview
Add business mode filtering to the admin dashboard so super admins can:
1. Select a mode (service, dispatch, food, medical, general) 
2. Only see tenants matching that mode in the dropdown
3. Auto-populate that mode when creating new test tenants

## Architecture

### Current State
```text
AdminTenantSwitcher
├── Fetches ALL tenants (no mode filter)
├── Shows all in dropdown
└── CreateTestTenantDialog (mode is user-selected)
```

### Target State
```text
AdminLayout (header)
├── AdminModeSelector [NEW] - Tabs/buttons for mode selection
│   ├── Persists to admin_settings.admin_active_mode
│   └── Updates React context
└── AdminTenantSwitcher (refactored)
    ├── Fetches tenants WHERE business_mode = selectedMode
    ├── Shows filtered list
    └── CreateTestTenantDialog (mode is pre-set from selector)
```

---

## Implementation Plan

### 1. Database Migration
Add `admin_active_mode` column to `admin_settings`:

```sql
ALTER TABLE public.admin_settings 
ADD COLUMN admin_active_mode text DEFAULT 'service';
```

### 2. Create AdminModeContext (New Context)
Create a lightweight context to manage the selected admin mode across the admin dashboard.

**File:** `src/contexts/AdminModeContext.tsx`

```typescript
interface AdminModeContextType {
  selectedMode: BusinessMode;
  setSelectedMode: (mode: BusinessMode) => Promise<void>;
  isLoading: boolean;
}
```

- On mount: fetch `admin_active_mode` from `admin_settings`
- On change: upsert to `admin_settings` and update state
- Only active for super admins on admin routes

### 3. Create AdminModeSelector Component (New)
A horizontal tab bar or segmented control showing the 5 modes.

**File:** `src/components/admin/AdminModeSelector.tsx`

```text
┌─────────┬──────────┬──────┬─────────┬─────────┐
│ Service │ Dispatch │ Food │ Medical │ General │
└─────────┴──────────┴──────┴─────────┴─────────┘
     ↑ selected
```

- Uses icons from existing BUSINESS_MODES config
- Calls `setSelectedMode()` on click
- Shows loading spinner during mode switch
- Placed in AdminLayout header

### 4. Refactor AdminTenantSwitcher
Modify to filter tenants by selected mode:

```typescript
// Before
const { data: tenants } = await supabase
  .from("tenants")
  .select("id, name, business_mode, industry")
  .order("name");

// After  
const { data: tenants } = await supabase
  .from("tenants")
  .select("id, name, business_mode, industry")
  .eq("business_mode", selectedMode)  // Filter by mode
  .order("name");
```

- When mode changes, reset active tenant to first in filtered list (if current is no longer visible)
- Query key includes `selectedMode` for proper cache invalidation

### 5. Update CreateTestTenantDialog
Remove the mode selector and use the pre-selected mode:

```typescript
// Before
const [businessMode, setBusinessMode] = useState<BusinessMode>("service");

// After
interface Props {
  // ...existing props
  defaultMode: BusinessMode; // Passed from parent based on AdminModeContext
}

const businessMode = defaultMode; // No longer selectable
```

- Hide or disable the mode dropdown (or show as read-only)
- Mode is already determined by the current tab selection

### 6. Update AdminLayout
Wrap admin routes with `AdminModeProvider` and add the mode selector:

```tsx
<AdminModeProvider>
  <header>
    <AdminModeSelector />   {/* NEW - mode tabs */}
    <AdminTenantSwitcher /> {/* Existing - now filtered */}
  </header>
  <Outlet />
</AdminModeProvider>
```

---

## Data Flow

```text
1. Admin opens /admin/*
   ↓
2. AdminModeProvider fetches admin_settings.admin_active_mode
   ↓
3. AdminModeSelector renders with selectedMode highlighted
   ↓
4. AdminTenantSwitcher queries tenants WHERE business_mode = selectedMode
   ↓
5. Admin clicks "Dispatch" tab
   ↓
6. setSelectedMode("dispatch") → upsert to admin_settings
   ↓
7. AdminTenantSwitcher refetches with .eq("business_mode", "dispatch")
   ↓
8. Only dispatch tenants shown (e.g., "City Roadside Rescue")
   ↓
9. If current tenant is not dispatch, auto-select first dispatch tenant
   ↓
10. Admin clicks "Create Test Tenant" → mode is pre-set to "dispatch"
```

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `src/contexts/AdminModeContext.tsx` | **CREATE** - Mode state management |
| `src/components/admin/AdminModeSelector.tsx` | **CREATE** - Mode tab bar UI |
| `src/components/admin/AdminTenantSwitcher.tsx` | **MODIFY** - Add mode filter to query |
| `src/components/admin/CreateTestTenantDialog.tsx` | **MODIFY** - Accept defaultMode prop, hide selector |
| `src/components/layouts/AdminLayout.tsx` | **MODIFY** - Add provider and mode selector |

---

## Technical Details

### Context Provider Structure
```tsx
// AdminModeContext.tsx
export function AdminModeProvider({ children }) {
  const { user, isSuperAdmin } = useAuth();
  const [selectedMode, setSelectedModeState] = useState<BusinessMode>("service");
  const [isLoading, setIsLoading] = useState(true);

  // Fetch on mount
  useEffect(() => {
    if (!user || !isSuperAdmin) return;
    supabase
      .from("admin_settings")
      .select("admin_active_mode")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => {
        if (data?.admin_active_mode) {
          setSelectedModeState(data.admin_active_mode as BusinessMode);
        }
        setIsLoading(false);
      });
  }, [user, isSuperAdmin]);

  // Persist on change
  const setSelectedMode = async (mode: BusinessMode) => {
    setSelectedModeState(mode);
    await supabase.from("admin_settings").upsert({
      user_id: user.id,
      admin_active_mode: mode,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });
  };

  return (
    <AdminModeContext.Provider value={{ selectedMode, setSelectedMode, isLoading }}>
      {children}
    </AdminModeContext.Provider>
  );
}
```

### Auto-Switch Tenant Logic
When mode changes and current tenant doesn't match:
```typescript
// In AdminTenantSwitcher
useEffect(() => {
  const currentTenantMatchesMode = tenants?.find(
    t => t.id === effectiveTenantId && t.business_mode === selectedMode
  );
  
  if (!currentTenantMatchesMode && tenants?.length > 0) {
    // Auto-select first tenant of this mode
    const firstMatch = tenants.find(t => t.business_mode === selectedMode);
    if (firstMatch) {
      setActiveTenantId(firstMatch.id);
    }
  }
}, [selectedMode, tenants, effectiveTenantId]);
```

---

## User Experience

**Before:**
- See all tenants mixed together
- Manually check which mode each tenant is
- Manually select mode when creating test tenant

**After:**
- Click "Dispatch" tab → only see dispatch tenants
- Active tenant auto-switches to a dispatch tenant
- Click "Create Test Tenant" → mode is already "Dispatch"
- Click "Service" tab → switch back to service tenants

