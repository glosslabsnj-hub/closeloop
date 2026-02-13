
# Fix Calendar Selection: Keep Only the Secondary Calendar

## Problem
Your tenant currently has two calendars selected for syncing:
1. **TEST CALLENDER** (primary, glosslabsnj@gmail.com) -- shows "month follow-up" but NOT the drain cleaning
2. **TEST CALENDER** (secondary) -- shows the drain cleaning on Monday Feb 16 at 12 PM

You want only the secondary calendar (the one with the drain cleaning) to stay connected.

## What I'll Do

### Step 1: Update Calendar Selection
Update the active calendar connection's `config_json` to only include the secondary calendar (`TEST CALENDER`) in `selected_calendar_ids`, removing the primary one.

### Step 2: Clean Up Old Connections
There are 3 older/broken calendar connections (manual errors and duplicates) cluttering the database. I'll deactivate them so only your current active Google connection remains.

### Step 3: Re-sync Busy Blocks
Clear out existing busy blocks for your tenant and trigger a fresh sync so only events from the correct calendar appear on your schedule.

---

## Technical Details

- **Connection to update:** `41a3002a-4817-49bb-9185-06eb04aca1a8` (tenant `3b567b02`)
- **Calendar ID to keep:** `ef2085e76b646b80337c11915e5bbc73d88764670a4467579cf7508b6dc19295@group.calendar.google.com`
- **Calendar ID to remove:** `glosslabsnj@gmail.com`
- Old connections to deactivate: `0ad045ea`, `41450a1e`, `97f13672`, `0430b22a`
- After updating, call the `sync-availability` edge function to refresh busy blocks from only the selected calendar
