

# Fix: Remove Irrelevant Sidebar Items for Dispatch/Towing Businesses

## Problem
The sidebar currently shows **Time Tracking** and **Parts Inventory** for Hawks Towing (and all dispatch businesses) because the capability gates are too broad:

- **Time Tracking** gate: `hasBooking || hasDispatchQueue || hasJobTracking` -- any dispatch business sees it
- **Parts Inventory** gate: `hasJobTracking || hasDispatchQueue` -- any dispatch business sees it

A towing company has no use for time tracking or parts inventory. These features only make sense for businesses with `job_tracking` enabled (e.g., HVAC, plumbing, auto repair shops that track technician hours and parts used on jobs).

## The Fix

**File: `src/components/layouts/AppSidebar.tsx`**

Tighten the capability gates:

| Sidebar Item | Current Gate | New Gate | Reasoning |
|---|---|---|---|
| Time Tracking | `hasBooking \|\| hasDispatchQueue \|\| hasJobTracking` | `hasJobTracking` | Only job-tracking businesses (field service, repair) need to track technician hours |
| Parts Inventory | `hasJobTracking \|\| hasDispatchQueue` | `hasJobTracking` | Only businesses that track jobs need a parts inventory; towing/dispatch doesn't stock parts |

This is a two-line change. The Dispatch Map is already correctly gated (`hasDispatchQueue` only) and will remain visible -- its "Coming Soon" state is a separate issue (requires a Mapbox API key to activate).

## Impact
- Hawks Towing (and other pure dispatch businesses): Time Tracking and Parts Inventory disappear from the sidebar
- HVAC, plumbing, auto repair businesses (with `job_tracking` enabled): No change, both items remain visible
- No route or page changes needed -- the pages themselves already have `useModuleRequired` guards

