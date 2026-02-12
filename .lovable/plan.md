
# Fix: Availability Display, Lead Time, and Calendar Integration

## Problems Found

### 1. "Today: Closed" is wrong in the Business Brain
The `LiveSchedulePreview` component queries `availability_slots` which IS correctly populated (Mon-Fri 9-5, Sat 12-5). However, the `check-availability` edge function reads business hours using `dayHours.open` / `dayHours.close` format, while Dream Drive Auto's `hours_json` uses the newer `windows` array format:
```
// What the code expects:
{ "monday": { "open": "09:00", "close": "17:00" } }

// What Dream Drive actually has:
{ "monday": { "closed": false, "windows": [{ "open": "09:00", "close": "17:00" }] } }
```
This means `dayHours.open` returns `undefined`, causing the edge function to think the business is closed.

### 2. "Appointments require at least 1 hour notice"
The tenant's `min_lead_hours` is set to `1`. The owner wants the AI to always book appointments without any minimum notice restriction. We need to set `min_lead_hours` to `0`.

### 3. Calendar section should show connected + offer future integrations
Currently working but could be clearer about the Voxly Calendar being active while keeping the door open for Google/Outlook.

---

## Fix Plan

### Step 1: Update `min_lead_hours` to 0
Database update for Dream Drive Auto tenant to remove the advance booking restriction:
```sql
UPDATE tenants SET min_lead_hours = 0 WHERE id = '59debf18-1276-4c10-ae1b-6194a531540c';
```

### Step 2: Fix `hours_json` format handling in edge functions
Update `check-availability` and `availability-suggest` to handle BOTH `hours_json` formats:
- Legacy flat format: `{ open: "09:00", close: "17:00" }`
- Windows array format: `{ closed: false, windows: [{ open: "09:00", close: "17:00" }] }`

Add a helper function that normalizes either format into `{ open, close }` before use.

### Step 3: Fix `LiveSchedulePreview` to handle both formats
The preview component also needs the same normalization so it correctly displays "Open 9:00 AM - 5:00 PM" instead of "Closed".

### Step 4: Update Calendar section in Business Brain
In the Calendar tab, show:
- Current status: "Using Voxly Calendar" (with green checkmark)
- Option to switch to Google Calendar or Outlook (marked "Coming Soon")
- The schedule preview should correctly reflect seeded availability slots

---

## Technical Details

### hours_json normalizer (shared utility)
```typescript
function normalizeHours(dayConfig: any): { open: string; close: string } | null {
  if (!dayConfig || dayConfig.closed) return null;
  // Windows format
  if (dayConfig.windows?.length) {
    return { open: dayConfig.windows[0].open, close: dayConfig.windows[0].close };
  }
  // Legacy flat format
  if (dayConfig.open && dayConfig.close) {
    return { open: dayConfig.open, close: dayConfig.close };
  }
  return null;
}
```

### Files to modify
| File | Change |
|------|--------|
| `supabase/functions/check-availability/index.ts` | Add format normalizer for `hours_json` |
| `supabase/functions/availability-suggest/index.ts` | Same normalizer |
| `src/components/settings/LiveSchedulePreview.tsx` | Handle `windows` format in display |
| `src/components/availability/AvailabilityHub.tsx` | Handle `windows` format in display |
| Database | Set `min_lead_hours = 0` for Dream Drive Auto |

### What this fixes
- AI will book appointments at any time without minimum notice
- Business Brain will correctly show "Open 9 AM - 5 PM" for weekdays
- Calendar section properly reflects the Voxly Calendar connection
- Edge functions correctly handle both legacy and windows hours formats
