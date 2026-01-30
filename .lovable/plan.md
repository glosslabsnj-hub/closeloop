
# Calendar View + Availability Detection Fix

## Summary
This plan addresses two issues:
1. **Calendar View**: Replace the current basic date picker with a full Google Calendar-style weekly/daily view showing all synced events with editing capabilities
2. **Availability Detection Bug**: The AI offered a conflicting time (12:30 PM) during an event that runs from 10 AM to 5:30 PM

---

## Part 1: Full Calendar View

### Current State
The Bookings page has a small date picker calendar that only lets you select a day to filter bookings. It does not show events visually on a timeline.

### Solution
Create a new unified Schedule page with a full calendar component that:
- Shows week and day views (like Google Calendar)
- Displays synced external events (busy blocks) as read-only colored blocks
- Shows bookings as editable events
- Allows clicking on empty slots to create new bookings
- Supports drag-and-drop to reschedule (future enhancement)

### Technical Approach

**New Components:**
- `src/components/calendar/ScheduleCalendar.tsx` - Main calendar grid component
- `src/components/calendar/CalendarEvent.tsx` - Individual event block
- `src/components/calendar/CalendarHeader.tsx` - Navigation (prev/next week, view toggle)
- `src/components/calendar/CreateBookingDialog.tsx` - Dialog for creating bookings from calendar

**Update:**
- `src/pages/app/BookingsPage.tsx` - Replace current view with the new calendar

**Data Sources:**
- `busy_blocks` table - External calendar events (show as gray/read-only)
- `bookings` table - Internal bookings (show as colored, editable)

### UI Layout
```text
+--------------------------------------------------+
| < Jan 27 - Feb 2, 2026 >    [Today] [Week] [Day] |
+--------------------------------------------------+
| Time | Mon 27 | Tue 28 | Wed 29 | Thu 30 | ...   |
+------+--------+--------+--------+--------+-------+
| 8AM  |        |        |        | [BUSY] |       |
| 9AM  |        |        |        | [BUSY] |       |
| 10AM | [Appt] |        |        | [BUSY] |       |
| 11AM | [Appt] |        |        | [BUSY] |       |
| 12PM |        |        |        | [BUSY] |       |
| ...  |        |        |        |        |       |
+------+--------+--------+--------+--------+-------+
```

---

## Part 2: Availability Detection Bug

### Root Cause Analysis

After investigating the database, I found:

| Field | UTC Value | Local (America/Los_Angeles) |
|-------|-----------|----------------------------|
| Synced busy block start | 15:30 UTC | 7:30 AM |
| Synced busy block end | 22:30 UTC | 2:30 PM |
| User expected start | - | 10:00 AM |
| User expected end | - | 5:30 PM |

**The synced event only covers 7:30 AM to 2:30 PM local time, not 10 AM to 5:30 PM.**

This means either:
1. The Google FreeBusy API returned incomplete data for that event
2. The event in the selected calendar ("TEST CALLENDER" / glosslabsnj@gmail.com) has different times than expected
3. The event is on a different calendar that wasn't selected for sync

### Investigation Needed
Before implementing fixes, we need to determine:
- Is the 10 AM - 5:30 PM event on the selected calendar or a different one?
- What does Google's freeBusy API actually return?

### Fixes to Implement

**1. Enhanced Sync Logging**
Add detailed logging to `sync-availability` to capture exactly what Google returns vs what gets stored.

**2. Manual Sync Trigger + Status**
Add a "Sync Now" button in the calendar connection UI that:
- Triggers an immediate sync
- Shows last sync time and count
- Displays any sync errors

**3. Busy Block Visibility in Calendar**
Show synced busy blocks in the new calendar view so users can verify what the AI "sees".

**4. Real-time Slot Query for AI**
Currently, the AI doesn't query actual available slots during conversations. The `buildBusinessContext` only passes general business info, not real-time availability.

**Fix:** When the AI needs to offer booking slots, it should:
1. Call the `fn_compute_available_slots` database function
2. Only offer slots that are truly available

This requires updating the ElevenLabs agent configuration to use a tool/function call for slot lookup.

---

## Files to Create/Edit

| File | Action | Purpose |
|------|--------|---------|
| `src/components/calendar/ScheduleCalendar.tsx` | Create | Main week/day calendar grid |
| `src/components/calendar/CalendarEvent.tsx` | Create | Individual event rendering |
| `src/components/calendar/CalendarHeader.tsx` | Create | Navigation and view controls |
| `src/components/calendar/DayColumn.tsx` | Create | Single day column in week view |
| `src/components/calendar/TimeGrid.tsx` | Create | Hour labels and grid lines |
| `src/components/calendar/CreateBookingDialog.tsx` | Create | Dialog to create booking from slot |
| `src/pages/app/BookingsPage.tsx` | Edit | Integrate new calendar |
| `src/hooks/useScheduleData.ts` | Create | Combined query for bookings + busy blocks |
| `supabase/functions/sync-availability/index.ts` | Edit | Add detailed logging |
| `src/components/settings/CalendarConnectionWizard.tsx` | Edit | Add "Sync Now" button with status |

---

## Implementation Order

1. **Calendar Infrastructure** - Build the core calendar components
2. **Data Integration** - Hook up bookings and busy blocks
3. **Create/Edit Actions** - Add click-to-book and edit dialogs
4. **Sync Improvements** - Better logging and manual sync trigger
5. **AI Slot Query** - Future: Real-time availability lookup for voice agent

---

## Technical Details

### Week View Calendar Component
The calendar will use CSS Grid with:
- 7 columns for days (8 if including time labels)
- Rows for each 30-minute slot (typically 8 AM to 6 PM = 20 rows)
- Events positioned using absolute positioning based on start/end times

### Event Positioning Logic
```text
top = (startHour - dayStartHour) * pixelsPerHour + (startMinutes / 60) * pixelsPerHour
height = durationMinutes / 60 * pixelsPerHour
```

### Color Coding
- External busy blocks: Gray with striped pattern
- Confirmed bookings: Primary color (blue/purple)
- Pending bookings: Amber/yellow
- Holds: Light blue with dashed border

---

## Outcome
After implementation:
1. Users see a professional weekly calendar showing all events
2. Busy blocks from synced calendars are visible
3. Users can click empty slots to create bookings
4. Manual sync option with clear status
5. Foundation for AI to query real-time availability
