
# Crew & Fleet Management with Driver Portal

## Overview

This plan implements a complete crew/driver management system for dispatch businesses with three key parts:

1. **Fleet Management** - Central place to manage crews/drivers and vehicles in Business Brain
2. **Smart Job Assignment** - Dropdowns in AssignJobDialog that pull from your fleet, with auto-linking between drivers and vehicles
3. **Driver Portal** - Separate authenticated experience for drivers to view their jobs, update status, and log impound vehicles

---

## What Already Exists

- **Onboarding Setup**: The `DispatchSetupEditor` already collects crews/vehicles as string arrays during onboarding, stored in tenant config
- **Dispatch Jobs Table**: Has `assigned_crew` and `assigned_vehicle` as text fields (not linked to proper entities)
- **User Roles**: Current roles are `owner`, `staff`, `super_admin` - no driver role yet
- **Impound Lot**: Full impound vehicle management exists, but no driver-specific quick-add flow

---

## Database Changes

### 1. New Tables

**`fleet_drivers`** - Crew members/drivers who can be assigned jobs
```text
id              UUID PRIMARY KEY
tenant_id       UUID → tenants.id
user_id         UUID NULLABLE → auth.users.id (nullable until invited)
full_name       TEXT NOT NULL
phone_e164      TEXT
email           TEXT
license_number  TEXT
license_expiry  DATE
status          ENUM('active', 'inactive', 'on_break')
default_vehicle_id  UUID NULLABLE → fleet_vehicles.id
photo_url       TEXT
created_at      TIMESTAMP
updated_at      TIMESTAMP
```

**`fleet_vehicles`** - Vehicles in the fleet
```text
id              UUID PRIMARY KEY
tenant_id       UUID → tenants.id
name            TEXT NOT NULL (e.g., "Truck #1", "Flatbed-01")
vehicle_type    TEXT (e.g., "flatbed", "wheel_lift", "heavy_duty")
license_plate   TEXT
vin             TEXT
year            INTEGER
make            TEXT
model           TEXT
status          ENUM('available', 'in_use', 'maintenance', 'retired')
capacity_notes  TEXT
photo_url       TEXT
current_driver_id  UUID NULLABLE → fleet_drivers.id
created_at      TIMESTAMP
updated_at      TIMESTAMP
```

### 2. New User Role

Add `driver` to the `user_role` enum:
```sql
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'driver';
```

### 3. Update dispatch_jobs

Add foreign key references (optional, for better data integrity):
```sql
ALTER TABLE dispatch_jobs 
ADD COLUMN driver_id UUID REFERENCES fleet_drivers(id),
ADD COLUMN vehicle_id UUID REFERENCES fleet_vehicles(id);
```

The existing `assigned_crew` and `assigned_vehicle` text fields will be kept for display purposes but the new ID fields will be the source of truth.

---

## Frontend Components

### Part 1: Fleet Management in Business Brain

**New Section: "Your Fleet" under Policies tab** (for dispatch mode only)

```text
+-----------------------------------------------+
|  👥  Crew & Drivers                           |
+-----------------------------------------------+
|  Add the people who can be assigned to jobs   |
|                                               |
|  ┌───────────────────────────────────────┐    |
|  │ 🧑 John D.        Active     Truck #1 │    |
|  │    📧 john@example.com  📞 555-1234   │    |
|  │    [Invite to Portal] [Edit] [Remove] │    |
|  └───────────────────────────────────────┘    |
|                                               |
|  [+ Add Driver]                               |
+-----------------------------------------------+
```

```text
+-----------------------------------------------+
|  🚚  Fleet Vehicles                           |
+-----------------------------------------------+
|  Vehicles that can be dispatched              |
|                                               |
|  ┌───────────────────────────────────────┐    |
|  │ 🚛 Truck #1       Available           │    |
|  │    2022 Ford F-550 Flatbed            │    |
|  │    Assigned: John D.                  │    |
|  │    [Edit] [Mark Maintenance]          │    |
|  └───────────────────────────────────────┘    |
|                                               |
|  [+ Add Vehicle]                              |
+-----------------------------------------------+
```

**New Files:**
- `src/components/brain/dispatch/FleetDriversManager.tsx`
- `src/components/brain/dispatch/FleetVehiclesManager.tsx`
- `src/components/brain/dispatch/DriverEditorDialog.tsx`
- `src/components/brain/dispatch/VehicleEditorDialog.tsx`

### Part 2: Enhanced Job Assignment

**Update `AssignJobDialog.tsx`**

Replace free-text inputs with Select dropdowns that:
1. Fetch drivers from `fleet_drivers` where `status = 'active'`
2. Fetch vehicles from `fleet_vehicles` where `status != 'retired'`
3. When a driver is selected, auto-populate their default vehicle
4. Allow dispatcher to override the vehicle if needed
5. Show driver's current status (available/on job)

```text
+-----------------------------------------------+
|  Assign Job #DSP-240206-ABC1                  |
+-----------------------------------------------+
|  Customer: John Smith                         |
|  Pickup: 123 Main St, Springfield             |
+-----------------------------------------------+
|                                               |
|  Driver *                                     |
|  ┌─────────────────────────────────────┐     |
|  │ ▼ John D. (Truck #1)                │     |
|  │   Mike S. (Van A)                   │     |
|  │   Sarah T. (no default vehicle)     │     |
|  └─────────────────────────────────────┘     |
|                                               |
|  Vehicle (auto-filled from driver)            |
|  ┌─────────────────────────────────────┐     |
|  │ ▼ Truck #1 - 2022 Ford F-550        │     |
|  └─────────────────────────────────────┘     |
|                                               |
|  [Cancel]            [Assign & Dispatch]      |
+-----------------------------------------------+
```

### Part 3: Driver Portal

**New Route: `/driver`**

A completely separate, mobile-first experience for drivers.

**New Layout: `DriverLayout.tsx`**
- Simplified navigation (no access to Business Brain, settings, etc.)
- Mobile-optimized bottom tab bar
- Only shows driver-relevant actions

**Driver Dashboard Features:**

1. **My Jobs** - List of assigned jobs with status
   - See job details (pickup, dropoff, customer info, notes)
   - Update job status (en_route → on_site → completed)
   - Call customer directly
   - Get directions via maps app

2. **Log Impound** - Quick-add form for impound vehicles
   - Tablet/phone-friendly large inputs
   - Camera capture for photos
   - License plate, VIN, vehicle details
   - Auto-link to dispatch job

3. **My Vehicle** - Select which vehicle they're driving today
   - Updates `fleet_vehicles.current_driver_id`
   - Updates `fleet_drivers.default_vehicle_id`

**New Files:**
- `src/pages/driver/DriverDashboard.tsx`
- `src/pages/driver/DriverJobsList.tsx`
- `src/pages/driver/DriverJobDetail.tsx`
- `src/pages/driver/DriverImpoundLog.tsx`
- `src/pages/driver/DriverVehicleSelect.tsx`
- `src/components/layouts/DriverLayout.tsx`

**Driver Authentication Flow:**

1. Owner invites driver from Fleet Management (enters email)
2. System creates `fleet_drivers` record with email
3. Sends invite email with signup link: `/driver/signup?token=xxx`
4. Driver signs up, gets `driver` role in `user_roles`
5. Driver logs in, sees `/driver` portal (not `/app`)
6. AuthContext detects `driver` role and redirects appropriately

---

## Technical Implementation

### Database Migration

```sql
-- Add driver role
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'driver';

-- Fleet drivers table
CREATE TABLE fleet_drivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  full_name TEXT NOT NULL,
  phone_e164 TEXT,
  email TEXT,
  license_number TEXT,
  license_expiry DATE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'on_break')),
  default_vehicle_id UUID,
  photo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Fleet vehicles table
CREATE TABLE fleet_vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  vehicle_type TEXT,
  license_plate TEXT,
  vin TEXT,
  year INTEGER,
  make TEXT,
  model TEXT,
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'in_use', 'maintenance', 'retired')),
  capacity_notes TEXT,
  photo_url TEXT,
  current_driver_id UUID REFERENCES fleet_drivers(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add FK from drivers to vehicles (after vehicles exist)
ALTER TABLE fleet_drivers 
ADD CONSTRAINT fleet_drivers_default_vehicle_fkey 
FOREIGN KEY (default_vehicle_id) REFERENCES fleet_vehicles(id);

-- Update dispatch_jobs for proper linking
ALTER TABLE dispatch_jobs 
ADD COLUMN driver_id UUID REFERENCES fleet_drivers(id),
ADD COLUMN vehicle_id UUID REFERENCES fleet_vehicles(id);

-- RLS policies
ALTER TABLE fleet_drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE fleet_vehicles ENABLE ROW LEVEL SECURITY;

-- Owners/staff can manage fleet
CREATE POLICY "Tenant users can view fleet_drivers" ON fleet_drivers
  FOR SELECT USING (
    tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid())
  );

CREATE POLICY "Tenant users can manage fleet_drivers" ON fleet_drivers
  FOR ALL USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users 
      WHERE user_id = auth.uid() AND role IN ('owner', 'staff')
    )
  );

-- Drivers can view their own record and their tenant's vehicles
CREATE POLICY "Drivers can view own record" ON fleet_drivers
  FOR SELECT USING (user_id = auth.uid());

-- Similar policies for fleet_vehicles...
```

### Routing Updates

```typescript
// App.tsx - Add driver routes
<Route element={<DriverLayout />}>
  <Route path="/driver" element={<DriverDashboard />} />
  <Route path="/driver/jobs" element={<DriverJobsList />} />
  <Route path="/driver/jobs/:id" element={<DriverJobDetail />} />
  <Route path="/driver/impound" element={<DriverImpoundLog />} />
  <Route path="/driver/vehicle" element={<DriverVehicleSelect />} />
</Route>
```

### AuthContext Updates

Detect driver role and provide appropriate routing:

```typescript
// In AuthContext
const isDriver = userRole === 'driver';

// In DriverLayout or ProtectedRoute
if (isDriver && !pathname.startsWith('/driver')) {
  return <Navigate to="/driver" />;
}
```

---

## Hooks & Queries

**New Hooks:**
- `useFleetDrivers()` - Fetch all drivers for the tenant
- `useFleetVehicles()` - Fetch all vehicles for the tenant
- `useDriverJobs()` - Fetch jobs assigned to current driver

---

## File Changes Summary

| File | Change |
|------|--------|
| Database migration | Create fleet_drivers, fleet_vehicles tables; add driver role |
| `src/App.tsx` | Add /driver routes with DriverLayout |
| `src/components/layouts/DriverLayout.tsx` | New driver-specific layout |
| `src/pages/driver/DriverDashboard.tsx` | Driver home with job summary |
| `src/pages/driver/DriverJobsList.tsx` | List of assigned jobs |
| `src/pages/driver/DriverJobDetail.tsx` | Full job details + status updates |
| `src/pages/driver/DriverImpoundLog.tsx` | Quick impound vehicle entry |
| `src/pages/driver/DriverVehicleSelect.tsx` | Select current vehicle |
| `src/components/brain/dispatch/FleetDriversManager.tsx` | Manage drivers in Brain |
| `src/components/brain/dispatch/FleetVehiclesManager.tsx` | Manage vehicles in Brain |
| `src/components/brain/dispatch/DriverEditorDialog.tsx` | Add/edit driver dialog |
| `src/components/brain/dispatch/VehicleEditorDialog.tsx` | Add/edit vehicle dialog |
| `src/components/dispatch/AssignJobDialog.tsx` | Replace inputs with dropdowns |
| `src/hooks/useFleetDrivers.ts` | Fleet drivers query hook |
| `src/hooks/useFleetVehicles.ts` | Fleet vehicles query hook |
| `src/hooks/useDriverJobs.ts` | Driver's assigned jobs hook |
| `src/contexts/AuthContext.tsx` | Add isDriver detection |
| `src/pages/app/BusinessBrainPage.tsx` | Add Fleet section for dispatch mode |

---

## Implementation Order

1. **Database First** - Create tables, add role, set up RLS
2. **Fleet Management UI** - Build the Brain section for drivers/vehicles
3. **Enhanced Assignment** - Update AssignJobDialog with dropdowns
4. **Driver Portal** - Build the separate driver experience
5. **Driver Invite Flow** - Email invites + signup

---

## Summary

This plan creates a proper fleet management system where:
- Business owners can add/manage drivers and vehicles in one organized place
- Dispatchers assign jobs with intelligent dropdowns that auto-link driver + vehicle
- Drivers get their own portal to see jobs, update status, and log impound vehicles
- Everything is properly authenticated with RLS protecting data
