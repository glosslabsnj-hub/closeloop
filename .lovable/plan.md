

# Tekmetric Integration: Auto-Sync Repair Orders to Active Jobs

## What This Does For You

Instead of entering jobs twice (once in Tekmetric, once in CloseLoop), repair orders from Tekmetric will **automatically appear** in your Active Jobs board. You connect your Tekmetric account once, and from that point on:

- New repair orders in Tekmetric show up in CloseLoop within minutes
- Status changes in Tekmetric (Work In Progress, Complete, etc.) update automatically
- Customer and vehicle info comes along for the ride
- Each "job" within a Tekmetric repair order becomes a service step you can track

You can still remove or adjust anything in CloseLoop -- it's a one-way sync from Tekmetric into CloseLoop, not the other way around.

## How It Works

```text
Every 5 minutes (cron):

  Tekmetric API
       |
  GET /repair-orders?shop=X&updatedDateStart=lastSync
       |
       v
  [sync-tekmetric edge function]
       |
       +--> Match customer by phone/name
       |      If new: create in customers table
       |      If exists: update profile
       |
       +--> Match vehicle by VIN or Year/Make/Model
       |      If new: create in customer_vehicles
       |
       +--> Upsert into active_jobs
       |      RO# becomes job_number
       |      RO status maps to job status
       |      Each Tekmetric "job" becomes a job_service_item
       |
       v
  Active Jobs board shows it instantly (realtime)
```

## Setup Experience (One-Time)

In the Business Brain settings, under a new **Integrations** section, the owner:

1. Enters their Tekmetric API credentials (Client ID + Client Secret)
2. CloseLoop exchanges them for an access token
3. Picks which Tekmetric shop to sync from (if they have multiple)
4. Sync starts automatically

That's it. No ongoing maintenance.

## Status Mapping

| Tekmetric Status | CloseLoop Status |
|---|---|
| Estimate | intake |
| Work In Progress | in_progress |
| Complete | completed |
| Saved for Later | on_hold |
| Posted (invoiced) | picked_up |
| Deleted | cancelled |

## Technical Details

### 1. Database Changes

**New table: `tenant_integrations`**
Stores per-tenant integration credentials and sync state. One row per integration type per tenant.

- `tenant_id` (FK to tenants)
- `provider` (text, e.g., "tekmetric")
- `credentials_json` (jsonb, encrypted-at-rest -- stores access_token, shop_id)
- `config_json` (jsonb -- sync preferences, selected shop)
- `last_synced_at` (timestamptz)
- `sync_cursor` (text -- last updatedDate seen)
- `is_active` (boolean)
- RLS: tenant members only

### 2. New Edge Functions

**`sync-tekmetric/index.ts`** -- The main sync worker

- Called by cron every 5 minutes (or manually triggered)
- Fetches repair orders from Tekmetric API updated since `last_synced_at`
- For each repair order:
  - Resolves or creates the customer (by phone number match, per existing customer identity rules)
  - Resolves or creates the vehicle (by VIN or Year/Make/Model)
  - Upserts into `active_jobs` using `external_id` = `tekmetric:{ro_id}` to prevent duplicates
  - Maps each Tekmetric "job" (e.g., "Diagnostic Inspection", "Oil Change") into `job_service_items`
  - Maps status and label to CloseLoop equivalents
- Updates `last_synced_at` and `sync_cursor` on completion
- Logs sync stats: created, updated, skipped counts

**`tekmetric-auth/index.ts`** -- Token exchange

- Accepts Client ID + Client Secret from the frontend
- Exchanges for Tekmetric access token via OAuth
- Fetches available shops so the user can pick one
- Stores credentials in `tenant_integrations`

**`cron-tekmetric-sync/index.ts`** -- Cron trigger

- Runs every 5 minutes
- Queries all tenants with active Tekmetric integrations
- Calls `sync-tekmetric` for each one

### 3. Schema Addition to `active_jobs`

Add an `external_id` column (nullable text) to `active_jobs` for deduplication:
- Format: `tekmetric:{repair_order_id}`
- Unique constraint: `(tenant_id, external_id)` where external_id is not null
- This prevents duplicate jobs if the same RO is synced twice

### 4. Frontend: Integration Settings UI

**New component: `src/components/brain/integrations/TekmetricSetup.tsx`**

- Part of Business Brain settings
- Step 1: Enter Tekmetric Client ID + Client Secret
- Step 2: Select shop from dropdown (fetched from API)
- Step 3: Confirm -- sync starts
- Shows sync status: "Last synced 2 min ago -- 47 repair orders tracked"
- Toggle to pause/resume sync
- Manual "Sync Now" button

### 5. Active Jobs Board Updates

Jobs synced from Tekmetric will show a small "Tekmetric" badge so the owner knows it came from their shop software vs. manually created. The `intake_method` field will be set to `"tekmetric"` for these jobs.

### 6. Files to Create/Modify

| File | Action |
|---|---|
| Migration SQL | Add `external_id` to `active_jobs`, create `tenant_integrations` table |
| `supabase/functions/tekmetric-auth/index.ts` | New -- OAuth token exchange + shop listing |
| `supabase/functions/sync-tekmetric/index.ts` | New -- Main sync logic |
| `supabase/functions/cron-tekmetric-sync/index.ts` | New -- Cron trigger for all tenants |
| `src/components/brain/integrations/TekmetricSetup.tsx` | New -- Setup UI in Business Brain |
| `src/hooks/useTekmetricIntegration.ts` | New -- Hook for integration state |
| Business Brain coverage/integrations tab | Wire in TekmetricSetup component |
| `src/components/jobs/JobCard.tsx` | Show "Tekmetric" source badge |

### 7. Security Considerations

- Tekmetric credentials stored in `tenant_integrations` with RLS (tenant-scoped)
- Access token is long-lived (per Tekmetric docs), no refresh flow needed
- Sync runs server-side only (edge functions), never exposes credentials to frontend
- Customer phone normalization to E.164 before any lookup (per existing rules)

