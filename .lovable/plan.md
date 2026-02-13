

# Service Team Management + FieldEdge Integration

## Overview

This plan covers two connected features:

1. **Rebrand Fleet Management for service businesses** -- change "Fleet/Drivers" language to "Your Team/Technicians" and make the page about assigning daily jobs to crew members
2. **Crew member dashboard** -- let technicians log in and see their assigned jobs for the day
3. **FieldEdge integration** -- self-service setup where the tenant enters their own FieldEdge API credentials, enabling bidirectional booking sync

---

## Part 1: Service-Aware Team Page

### Problem
The current `/app/fleet` page uses dispatch language ("Drivers", "Vehicles", "Dispatch jobs") which doesn't fit service businesses like plumbing companies.

### Changes
- **FleetPage.tsx**: Detect business mode. For `service` mode, show "Your Team" header with "Manage your technicians and assign jobs" description. Hide the Vehicles section entirely (service businesses don't need fleet vehicles).
- **FleetDriversManager.tsx**: Mode-aware labels -- "Add Technician" instead of "Add Driver", "Crew & Technicians" instead of "Crew & Drivers"
- **Add a "Today's Assignments" section** below the team list showing active jobs grouped by technician, with drag-and-drop or dropdown assignment. This reads from `active_jobs` where `metadata_json.assigned_to` matches a `fleet_drivers.id`.

---

## Part 2: Crew Member Dashboard

### Problem
Crew members (technicians) who log in currently have no way to see jobs assigned to them from the Active Jobs board.

### How it works today
- `fleet_drivers` has a `user_id` column that links to an auth user
- `active_jobs` stores assignment in `metadata_json.assigned_to` (stores the `fleet_drivers.id`)
- `useDriverJobs` hook exists but only queries `dispatch_jobs`, not `active_jobs`

### Changes
- **New hook: `useCrewJobs.ts`** -- queries `active_jobs` where `metadata_json->>assigned_to` equals the current user's `fleet_drivers.id`. Returns today's jobs, upcoming jobs, and completed jobs.
- **Update the Dashboard** -- when a logged-in user has a `fleet_drivers` record and role is `driver`, show a "My Jobs" widget on their dashboard with their assigned jobs for the day, including customer name, phone, address, service items, and status.
- **Job status updates from crew** -- crew members can update job status (mark service items complete, update job status) directly from their view.

---

## Part 3: FieldEdge Integration (Self-Service)

### How FieldEdge API works
FieldEdge uses a partner API hosted on Azure API Management. Access requires API credentials (API key or OAuth). The tenant will provide their own credentials.

### Architecture (follows existing Tekmetric pattern)

```text
Tenant enters credentials
       |
       v
fieldedge-auth edge function
       |
       v
tenant_integrations table (provider: "fieldedge")
       |
       v
sync-fieldedge edge function (bidirectional)
       |
       +-- CloseLoop bookings --> FieldEdge work orders
       +-- FieldEdge dispatches --> CloseLoop active_jobs
       |
       v
cron-fieldedge-sync (every 5 min)
```

### New files

| File | Purpose |
|------|---------|
| `src/hooks/useFieldEdgeIntegration.ts` | Frontend hook (mirrors `useTekmetricIntegration.ts`) |
| `src/components/integrations/FieldEdgeSetupCard.tsx` | Self-service credential input UI on Integrations page |
| `supabase/functions/fieldedge-auth/index.ts` | Validates credentials, stores in `tenant_integrations` |
| `supabase/functions/sync-fieldedge/index.ts` | Bidirectional sync logic |
| `supabase/functions/cron-fieldedge-sync/index.ts` | Cron trigger for auto-sync |

### Sync logic

**Outbound (CloseLoop to FieldEdge):**
- When a booking is created with status `pending` or `confirmed`, push it to FieldEdge as a work order/dispatch
- Store FieldEdge's returned ID in `bookings.metadata_json.fieldedge_id` for dedup

**Inbound (FieldEdge to CloseLoop):**
- Poll FieldEdge for new/updated dispatches
- Map to `active_jobs` using `external_id = fieldedge:{dispatch_id}` (same dedup pattern as Tekmetric)
- Map FieldEdge statuses to internal statuses

### Self-service flow for the tenant
1. Tenant goes to Integrations page
2. Clicks "Connect FieldEdge"
3. Enters their FieldEdge API key (provided by FieldEdge to the contractor)
4. System validates credentials by making a test API call
5. On success, integration is active and sync begins

---

## Technical Details

### Database changes
- No new tables needed -- reuses `tenant_integrations` with `provider = 'fieldedge'`
- Add `external_id` column to `bookings` table (if not already present) for outbound dedup

### Edge function secrets
- FieldEdge credentials are stored per-tenant in `tenant_integrations.credentials_json` (encrypted at rest by the database), NOT as global secrets
- No global API keys needed since each tenant provides their own

### Files to modify
| File | Change |
|------|--------|
| `src/pages/app/FleetPage.tsx` | Mode-aware title/description, hide vehicles for service mode |
| `src/components/brain/dispatch/FleetDriversManager.tsx` | Mode-aware labels |
| `src/hooks/useCrewJobs.ts` | New hook for crew member job view |
| `src/hooks/useFieldEdgeIntegration.ts` | New hook mirroring Tekmetric pattern |
| `src/components/integrations/FieldEdgeSetupCard.tsx` | New self-service UI |
| `src/pages/app/IntegrationsPage.tsx` | Add FieldEdge card for service tenants |
| `supabase/functions/fieldedge-auth/index.ts` | New edge function |
| `supabase/functions/sync-fieldedge/index.ts` | New edge function |
| `supabase/functions/cron-fieldedge-sync/index.ts` | New edge function |

### Important note on FieldEdge API
FieldEdge's API is partner-only and documentation is behind a login wall. The edge functions will be built with the standard REST patterns (auth header, JSON endpoints) but **you may need to provide the exact FieldEdge API endpoint URLs and data format** once you or your client have access to their developer portal. The sync functions will be structured so that updating the endpoint URLs and field mappings is straightforward.
