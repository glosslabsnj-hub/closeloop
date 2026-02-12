

# Fix: Dispatch Jobs Not Persisting After Calls

## Root Cause

The `elevenlabs-webhook` edge function tries to insert dispatch jobs with **4 columns that don't exist** on the `dispatch_jobs` table:

| Insert Uses | Table Actually Has | Fix |
|---|---|---|
| `distance_miles` | `dispatch_distance_miles` | Rename in insert |
| `estimated_eta_minutes` | `estimated_arrival_at` (timestamp) | Convert minutes to timestamp, or store in `description`/`notes` |
| `vehicle_type` | (doesn't exist on dispatch_jobs) | Store in `vehicle_make` or `description` |
| `drivable` | (doesn't exist on dispatch_jobs) | Store in `notes` or `description` |

The Postgres error `Could not find the 'distance_miles' column` kills the entire insert, so no dispatch job is ever created.

## Fix Plan

### 1. Add Missing Columns via Migration

Add `estimated_eta_minutes` and `drivable` to `dispatch_jobs` so we don't lose data. `vehicle_type` already doesn't map cleanly (the table has `vehicle_make`, `vehicle_model`, `vehicle_category`), so we'll map it to `vehicle_category`.

```sql
ALTER TABLE dispatch_jobs
  ADD COLUMN IF NOT EXISTS estimated_eta_minutes integer,
  ADD COLUMN IF NOT EXISTS drivable boolean;
```

### 2. Fix the Insert in `elevenlabs-webhook`

In `supabase/functions/elevenlabs-webhook/index.ts`, update the `persistDispatchJob` function (around line 2707-2725):

- `distance_miles` becomes `dispatch_distance_miles`
- `estimated_eta_minutes` stays (after migration adds column)
- `vehicle_type` maps to `vehicle_category`
- `drivable` stays (after migration adds column)

### 3. Fix the Pricing Type Definition

Update the `dispatchPricing` type (line 2682) to use `dispatch_distance_miles` instead of `distance_miles` for clarity, or just remap at insert time.

---

## About the Admin Phone / Same-Number Concern

Your hunch about using the same phone across tenants is **not the issue here**. The call routing worked correctly -- it found Hawks Towing, ran the conversation, and extracted the dispatch payload. The failure is purely a schema mismatch in the database insert. Once these columns are fixed, dispatch jobs will persist normally regardless of which phone you call from.

## Files Changed

- **Migration**: Add `estimated_eta_minutes` and `drivable` columns to `dispatch_jobs`
- **`supabase/functions/elevenlabs-webhook/index.ts`**: Fix column names in the `persistDispatchJob` insert (lines ~2707-2725)

