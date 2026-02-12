

# Fix: DayAvailabilityTimeline Shows "Closed" Despite Valid Hours

## Problem
The `DayAvailabilityTimeline` component receives the raw `hours_json` day config from `AvailabilityHub`. It checks for `businessHours.open` and `businessHours.close`, but Dream Drive Auto's hours use the `windows` array format:

```text
What the component expects:  { open: "09:00", close: "17:00" }
What it actually receives:   { closed: false, windows: [{ open: "09:00", close: "17:00" }] }
```

Since `.open` is undefined, line 43 treats the day as closed.

## Fix

### Option A (Simplest -- normalize at the call site)
In `AvailabilityHub.tsx`, the `getHoursForDay` function already returns the raw config. We normalize it before passing to `DayAvailabilityTimeline`:

Change the `DayAvailabilityTimeline` props from receiving raw config to receiving the already-normalized `{ open, close }` output from `normalizeDayHours` (which already exists in `AvailabilityHub.tsx`).

### Changes

**`src/components/availability/AvailabilityHub.tsx`** -- normalize in `getHoursForDay`:
```typescript
const getHoursForDay = (date: Date) => {
  const dayName = DAY_MAP[date.getDay()];
  const raw = businessHours?.[dayName] || null;
  return normalizeDayHours(raw); // returns { open, close } or null
};
```

**`src/components/availability/DayAvailabilityTimeline.tsx`** -- update the props type to accept the normalized format (already `{ open: string; close: string } | null`), and simplify the closed check on line 43:
```typescript
// Before:
if (!businessHours || businessHours.closed || !businessHours.open || !businessHours.close)

// After:
if (!businessHours || !businessHours.open || !businessHours.close)
```

The `closed` check is no longer needed because `normalizeDayHours` already returns `null` for closed days.

### Result
- Today will show "9 AM - 5 PM" with 8 hourly slots instead of "Closed"
- Tomorrow and other days will also display correctly
- No changes to edge functions needed (already fixed in prior step)

