

# Fix Dispatch Job Assignment Error & Distance/Pricing Display

## Executive Summary
When assigning a driver to a dispatch job, the update fails with **"revenue_attributions_status_check" constraint violation**. Additionally, distance calculations and price breakdowns are not being populated on dispatch jobs.

---

## Issue 1: Revenue Attribution Trigger Error

### Root Cause
The `fn_attribution_on_dispatch_job()` database trigger is inserting `NEW.status` directly from `dispatch_jobs` into `revenue_attributions`. However, these tables use different status enumerations:

| `dispatch_jobs.status` | `revenue_attributions.status` (allowed) |
|------------------------|----------------------------------------|
| pending | pending |
| **assigned** | - |
| **en_route** | - |
| **on_site** | - |
| completed | completed |
| cancelled | cancelled |

When you assign a driver (status changes to "assigned"), the trigger tries to insert "assigned" into `revenue_attributions`, which fails the CHECK constraint.

### Fix
Modify the trigger to map dispatch job statuses to valid attribution statuses:
- `pending` → `pending`
- `assigned`, `en_route`, `on_site` → `pending` (still in progress)
- `completed` → `completed`
- `cancelled` → `cancelled`

---

## Issue 2: Missing Distance & Price Data

### Root Cause
The `elevenlabs-create-dispatch-job` function calls `elevenlabs-check-service-area` to calculate distances and pricing. However:

1. **Database shows all jobs have NULL distance/pricing columns** - suggesting the service area check is either not being called or failing silently
2. The service area function requires **base_address coordinates** for the tenant to calculate dispatch distance
3. Jobs appear to be created successfully but without distance data

### Investigation Needed
Check if tenant has `base_lat` and `base_lng` configured in `dispatch_settings`. Without these, no distance calculations can occur.

### Fix
1. Ensure the tenant has base address configured in Business Brain → Coverage & ETA
2. Verify the check-service-area function is being called and returning data
3. If the job was created without distance data (e.g., from a manual test), the UI correctly shows nothing

---

## Technical Implementation Plan

### Database Migration (Priority: Critical)

Fix the revenue attribution trigger to map statuses correctly:

```sql
CREATE OR REPLACE FUNCTION fn_attribution_on_dispatch_job()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  attribution_status text;
BEGIN
  IF NEW.session_id IS NOT NULL THEN
    -- Map dispatch job status to valid attribution status
    attribution_status := CASE 
      WHEN NEW.status IN ('completed') THEN 'completed'
      WHEN NEW.status IN ('cancelled') THEN 'cancelled'
      ELSE 'pending'  -- pending, assigned, en_route, on_site all map to pending
    END;
    
    INSERT INTO revenue_attributions (
      tenant_id, entity_type, entity_id, session_id,
      revenue_cents, status, attributed_at
    ) VALUES (
      NEW.tenant_id, 'dispatch_job', NEW.id, NEW.session_id,
      COALESCE(NEW.price_cents, 0), attribution_status, now()
    )
    ON CONFLICT (tenant_id, entity_type, entity_id)
    DO UPDATE SET
      revenue_cents = COALESCE(EXCLUDED.revenue_cents, revenue_attributions.revenue_cents, 0),
      status = EXCLUDED.status,
      updated_at = now();
  END IF;
  RETURN NEW;
END;
$$;
```

### UI Enhancement (Priority: Medium)

Update the `DispatchJobDetailsSheet` to show a helpful message when distance data is missing:

```text
// If no distance data, show guidance
if (!job.dispatch_distance_miles && !job.tow_distance_miles) {
  <div className="p-3 rounded-lg bg-muted/50">
    <p className="text-sm text-muted-foreground">
      Distance and pricing data will appear here when jobs are 
      created through AI calls with a base address configured.
    </p>
  </div>
}
```

### Verification Steps (Post-Implementation)

1. **Test job assignment**: Assign a driver to a pending job - should succeed without error
2. **Test status progression**: Move job through assigned → en_route → on_site → completed
3. **Verify attribution updates**: Check `revenue_attributions` table updates correctly on completion
4. **Test with AI call**: Make a test call with pickup address to verify distance calculation

---

## Files to Modify

| File | Change |
|------|--------|
| New migration SQL | Fix `fn_attribution_on_dispatch_job()` trigger |
| `src/components/dispatch/DispatchJobDetailsSheet.tsx` | Add "no distance data" guidance message |

---

## Risk Assessment

- **Low risk**: Trigger fix is purely additive - maps existing statuses to valid values
- **No data loss**: Attribution records will update correctly on job completion
- **Backward compatible**: Existing jobs unaffected

