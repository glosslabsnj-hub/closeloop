

# Auto Repair Tenant: Full CRM Profile, Active Jobs, and Data Import

This plan covers three stages: (1) creating the missing database tables, (2) enriching the Customer Detail Sheet with vehicles, service history, and active jobs, and (3) wiring up the Jobs page so it's accessible from the sidebar.

---

## Stage 1: Database Tables

Three new tables need to be created (none exist today).

### `customer_vehicles`
Stores vehicles linked to a customer. An auto repair shop customer may have multiple vehicles.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| tenant_id | uuid FK tenants | RLS anchor |
| customer_id | uuid FK customers | Owner |
| year | smallint | nullable |
| make | text | e.g. "Honda" |
| model | text | e.g. "Civic" |
| color | text | nullable |
| vin | text | nullable, unique per tenant |
| license_plate | text | nullable |
| notes | text | nullable |
| created_at | timestamptz | default now() |
| updated_at | timestamptz | default now() |

RLS: tenant-scoped read/write for authenticated users with `has_tenant_access()`.

### `active_jobs`
Tracks work orders / repair jobs. The frontend hook (`useActiveJobs.ts`) already expects this schema.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| tenant_id | uuid FK tenants | |
| customer_id | uuid FK customers | nullable |
| vehicle_id | uuid FK customer_vehicles | nullable -- links job to specific vehicle |
| location_id | uuid | nullable |
| job_number | text | unique per tenant |
| title | text | e.g. "Brake replacement" |
| status | text | intake, in_progress, on_hold, completed, picked_up, cancelled |
| priority | text | normal, rush, urgent |
| notes | text | nullable |
| customer_name | text | nullable (denormalized for display) |
| customer_phone | text | nullable |
| metadata_json | jsonb | default '{}' |
| estimated_completion | timestamptz | nullable |
| actual_completion | timestamptz | nullable |
| intake_method | text | default 'manual' |
| source_session_id | uuid | nullable |
| notify_on_step_complete | boolean | default false |
| notify_on_all_complete | boolean | default true |
| is_active | boolean | default true |
| created_at | timestamptz | default now() |
| updated_at | timestamptz | default now() |

Plus an `updated_at` trigger, RLS policies, and realtime enabled.

### `job_service_items`
Individual service line items within a job (e.g. "Oil Change", "Tire Rotation").

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| job_id | uuid FK active_jobs ON DELETE CASCADE | |
| tenant_id | uuid FK tenants | |
| service_id | uuid | nullable (links to services table) |
| title | text | |
| status | text | pending, in_progress, completed, skipped |
| sort_order | int | default 0 |
| assigned_to | uuid | nullable |
| started_at | timestamptz | nullable |
| completed_at | timestamptz | nullable |
| notes | text | nullable |
| created_at | timestamptz | default now() |

RLS: same tenant-scoped pattern.

### `generate_job_number` function
A PL/pgSQL function that generates sequential job numbers per tenant (e.g. "JOB-001", "JOB-002").

---

## Stage 2: Enrich Customer Detail Sheet

**File: `src/components/customers/CustomerDetailSheet.tsx`**

Currently has 3 tabs: Calls, Bookings, Notes. Will be expanded to 5 tabs:

1. **Overview** (new default) -- Contact info, lifecycle tags, quick actions (replaces the current header area)
2. **Vehicles** (new) -- List of customer's vehicles with add/edit capability
3. **Jobs** (new) -- Active and past jobs for this customer, pulled from `active_jobs`
4. **Calls** (existing) -- Call history
5. **Notes** (existing) -- Free-form notes

### New hook: `src/hooks/useCustomerVehicles.ts`
- Fetches vehicles for a given `customer_id`
- CRUD mutations: add vehicle, update vehicle, delete vehicle
- Queries `customer_vehicles` table

### New component: `src/components/customers/VehiclesTab.tsx`
- Lists vehicles as cards showing Year Make Model, color, VIN, license plate
- "Add Vehicle" button opens an inline form
- Edit/delete actions per vehicle

### New component: `src/components/customers/CustomerJobsTab.tsx`
- Queries `active_jobs` where `customer_id` matches
- Shows job cards with status badge, job number, title, service items progress
- Click opens the existing `JobDetailSheet`

---

## Stage 3: Wire Up Jobs Page in Sidebar and Router

### Sidebar (`src/components/layouts/AppSidebar.tsx`)
Add to the `workspaceItems` block (after the existing capability checks):

```
if (caps.hasJobTracking) {
  workspaceItems.push({ href: "/app/jobs", label: "Active Jobs", icon: ClipboardCheck });
}
```

### Router
The `JobsPage` component exists at `src/pages/app/JobsPage.tsx` but is not registered in the router. Add the route:

```
{ path: "jobs", element: <JobsPage /> }
```

This requires finding the app routes file and adding the lazy import.

### Mobile nav (`src/components/layouts/AppLayout.tsx`)
Same pattern -- add Jobs to the mobile nav when `hasJobTracking` is true.

---

## Stage 4: CSV Import for Customers (bonus)

A `CSVImportDialog` already exists for jobs. A similar pattern will be added to the Customers page:

### New component: `src/components/customers/CustomerCSVImportDialog.tsx`
- Accepts CSV with columns: Name, Phone, Email, Vehicle Year, Vehicle Make, Vehicle Model, VIN, License Plate
- Parses CSV, normalizes phone to E.164
- For each row: upserts customer, then creates vehicle record if vehicle columns are present
- Shows preview table before import
- Progress indicator during import

### Customers page update
- Add "Import" dropdown button next to "Add Customer" (same pattern as JobsPage)

---

## Files Summary

### New files
1. `src/hooks/useCustomerVehicles.ts` -- CRUD hook for customer_vehicles
2. `src/components/customers/VehiclesTab.tsx` -- Vehicle list/add UI
3. `src/components/customers/CustomerJobsTab.tsx` -- Jobs history for a customer
4. `src/components/customers/CustomerCSVImportDialog.tsx` -- CSV import dialog

### Modified files
1. `src/components/customers/CustomerDetailSheet.tsx` -- Add Vehicles and Jobs tabs, restructure to 5-tab layout
2. `src/components/layouts/AppSidebar.tsx` -- Add Jobs to workspaceItems when hasJobTracking
3. `src/components/layouts/AppLayout.tsx` -- Add Jobs to mobile nav
4. Router file -- Add `/app/jobs` route pointing to existing JobsPage
5. `src/pages/app/CustomersPage.tsx` -- Add Import button

### Database migration
- Create `customer_vehicles` table with RLS
- Create `active_jobs` table with RLS + realtime
- Create `job_service_items` table with RLS + realtime
- Create `generate_job_number` function
- Create `updated_at` triggers for customer_vehicles and active_jobs

### Technical notes

**Vehicle-to-Job linking**: `active_jobs` has a `vehicle_id` column so when creating a job for a customer, the shop can select which vehicle the work is for. This connects the full chain: Customer -> Vehicle -> Job -> Service Items.

**Existing frontend code is ready**: `useActiveJobs.ts`, `JobsPage.tsx`, `JobCard.tsx`, `JobDetailSheet.tsx`, `NewJobDialog.tsx`, `CSVImportDialog.tsx` all already exist and expect the `active_jobs` / `job_service_items` schema. They just need the tables to exist in the database.

**RLS pattern**: All three tables use the same pattern as `customers` -- tenant-scoped via `has_tenant_access(tenant_id)` for authenticated users.
