# Phase 3: Multi-Resource Availability & Scheduling — Implementation Record

## Status: COMPLETE (Foundation)

## What Was Built

This phase establishes the foundation for multi-staff scheduling. The full slot computation refactoring (making `fn_compute_available_slots` staff-aware) requires a Postgres RPC update that should be done via a separate DB migration when the feature is ready for production.

### 3A. Database: staff_members Table
**Migration:** `supabase/migrations/20260212000000_add_staff_members.sql`

```sql
CREATE TABLE staff_members (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  role TEXT DEFAULT 'staff' CHECK (role IN ('owner', 'manager', 'staff')),
  is_active BOOLEAN DEFAULT true,
  hours_json JSONB,           -- NULL = uses business hours
  service_ids UUID[],          -- NULL = all services
  calendar_connection_id UUID, -- per-staff calendar
  color TEXT,                  -- UI calendar display
  sort_order INTEGER DEFAULT 0,
  created_at/updated_at TIMESTAMPTZ
);
```

- RLS: tenant_users can SELECT, owners/managers can INSERT/UPDATE, owners can DELETE
- Index on `(tenant_id) WHERE is_active = true`
- `updated_at` trigger

### 3B. Database: staff_id on Bookings & Busy Blocks
- `ALTER TABLE bookings ADD COLUMN staff_id UUID REFERENCES staff_members(id)`
- `ALTER TABLE busy_blocks ADD COLUMN staff_id UUID REFERENCES staff_members(id)`
- Both nullable — `NULL` = tenant-level (backward compatible, solo operators)
- Indexes on `staff_id WHERE staff_id IS NOT NULL`

### 3C. Frontend: useStaffMembers Hook
**File:** `src/hooks/useStaffMembers.ts`

- `StaffMember` interface matching DB schema
- `useStaffMembers()` returns: staff, activeStaff, isLoading, createStaffMember, updateStaffMember, deleteStaffMember
- Uses TanStack React Query with `["staff_members", tenantId]` key
- CRUD mutations with toast notifications

### 3D. Frontend: StaffManagementEditor (Brain)
**File:** `src/components/brain/StaffManagementEditor.tsx`

- Collapsible card per staff member
- Add form with name + role
- Per-member editing: email, phone, active toggle, service assignment
- Service chips toggle (all services or pick specific)
- Color dots for calendar display
- Delete with confirmation

### 3E. Brain Registry & Layout Integration
**Files modified:**
- `src/config/brainSectionRegistry.ts` — Added "team" item to BUSINESS_ITEMS
- `src/config/brainModeLayout.ts` — Added "team" group to "Your Business" tab in all 6 modes
- `src/components/brain/layout/BrainEditorRenderer.tsx` — Added `case "team"` → `StaffManagementEditor`

### 3F. Backend: Staff-Aware Dynamic Variables
**Files modified:**
- `supabase/functions/_shared/voiceContextContract.ts`:
  - `team_size` (number) — count of active staff
  - `staff_names` (string) — comma-separated active staff names
- `supabase/functions/_shared/buildBusinessContext.ts`:
  - Added `staff_members` to `BusinessContext` interface
  - Fetches staff_members in the main `Promise.all` query
  - Includes staff data in context object

### 3G. Onboarding → Staff Migration Path
Team members entered during onboarding (Phase 1) are stored in `capabilities_json._team_members`. When the `staff_members` table is populated (via Brain editor), the canonical source becomes the DB table. The onboarding data serves as a seed that can be migrated.

## What's Still Needed (Future Work)

1. **Postgres RPC refactoring** — `fn_compute_available_slots` needs a `_staff_id` parameter and multi-staff UNION logic
2. **Per-staff busy blocks** — `elevenlabs-create-booking` should auto-assign to first available staff member
3. **Staff schedule view** — Column-per-staff calendar view in availability components
4. **Per-staff calendar sync** — Each staff member connects their own Google Calendar
5. **Onboarding migration** — Script to copy `_team_members` from capabilities_json into `staff_members` table

## Backward Compatibility
- Solo operators (no staff_members rows): everything works exactly as before
- `staff_id = NULL` on bookings/blocks: treated as tenant-level (current behavior)
- No migration of existing data needed — all new columns are nullable
- Dynamic variables default to 0 team size / empty names
