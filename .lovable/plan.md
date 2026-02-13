

# Fix: Pass Weekly Hours Schedule to the AI Voice Agent

## Root Cause

Your business hours are stored in the **windows format** (`{closed: false, windows: [{open: "08:00", close: "16:30"}]}`), but the two functions that read them -- `getTodayHours()` and `normalizeHours()` -- only understand the **legacy flat format** (`{open: "08:00", close: "16:30"}`). This means:

- `hours_today` is always **empty** -- the AI doesn't know today's hours
- `tenant.hours` is always **empty** -- no structured hours reach the AI at all
- There is **no weekly schedule variable** -- even if today's hours worked, the AI can't check if Saturday or Sunday is open before suggesting an appointment

Your hours are: Mon-Fri 8:00 AM - 4:30 PM, Sat-Sun closed. The AI sees none of this.

## What Will Change

### 1. Fix `getTodayHours()` to handle the windows format
Update the function in `buildBusinessContext.ts` to extract `open/close` from `windows[0]` when the flat properties aren't present. This fixes the `hours_today` dynamic variable immediately.

### 2. Fix `normalizeHours()` to handle the windows format
Same fix -- when `dayData.open` is missing, look inside `dayData.windows[0]` for the times. This fixes the `tenant.hours` object in the BusinessContext.

### 3. Add a new `weekly_hours_schedule` dynamic variable
Add a new entry in `voiceContextContract.ts` that builds a speech-ready weekly summary from `tenant.hours`, e.g.:
> "Monday through Friday 8 AM to 4:30 PM, Saturday and Sunday closed"

This will be marked `includeInCompactJson: true` so it appears in the business brain JSON the AI reads.

### 4. Reference weekly hours in the agent prompt
Update the base prompt in `agentBasePrompts.ts` to include `{{weekly_hours_schedule}}` alongside `{{hours_today}}` so the AI knows the full week's schedule and can validate appointment days.

## Technical Details

### File: `supabase/functions/_shared/buildBusinessContext.ts`

**`getTodayHours()` (lines ~963-985)** -- Add windows format support:
```typescript
// After casting todayHours, resolve open/close from windows if needed
let open = todayHours.open;
let close = todayHours.close;
if (!open && !close && Array.isArray(todayHours.windows) && todayHours.windows.length > 0) {
  open = todayHours.windows[0].open;
  close = todayHours.windows[0].close;
}
```

**`normalizeHours()` (lines ~988-1007)** -- Same pattern:
```typescript
let open = dayData.open || "";
let close = dayData.close || "";
if (!open && !close && Array.isArray(dayData.windows) && dayData.windows.length > 0) {
  open = dayData.windows[0].open || "";
  close = dayData.windows[0].close || "";
}
```

**Add `buildWeeklyHoursSummary()` function** -- Similar to the existing impound lot `getImpoundLotHoursContext()` logic (lines 588-627), build a speech-ready string from the normalized hours:
- Groups consecutive days with same hours (e.g., "Monday through Friday 8 AM to 4:30 PM")
- Explicitly states closed days (e.g., "Saturday and Sunday closed")

### File: `supabase/functions/_shared/voiceContextContract.ts`

Add new variable after `hours_today`:
```typescript
{
  key: "weekly_hours_schedule",
  description: "Full weekly hours schedule for appointment validation",
  type: "string",
  source: (ctx) => buildWeeklyHoursSummary(ctx.tenant.hours),
  defaultValue: "",
  category: "hours",
  includeInCompactJson: true,
},
```

### File: `supabase/functions/_shared/agentBasePrompts.ts`

Update the context block that references hours to include:
```
- Hours Today: {{hours_today}}
- Weekly Schedule: {{weekly_hours_schedule}}
```

And add a scheduling rule:
```
IMPORTANT: Before suggesting any appointment day, verify it falls on a day when the business is open per the weekly schedule. Never offer times on closed days.
```

### Deployment
The `buildBusinessContext.ts`, `voiceContextContract.ts`, and `agentBasePrompts.ts` are shared modules used by edge functions like `twilio-inbound`, `register-call`, and `get-business-context`. Changes will take effect after the edge functions are redeployed (automatic).

## Expected Result
After this fix:
- `hours_today` will correctly show "8:00 AM - 4:30 PM" (or "Closed today" on weekends)
- `weekly_hours_schedule` will show "Monday through Friday 8 AM to 4:30 PM, Saturday and Sunday closed"
- The AI will check the weekly schedule before suggesting appointment times and will never offer Saturday or Sunday slots
