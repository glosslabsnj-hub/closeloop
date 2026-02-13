

# Professional CRM & Scheduling Overhaul

## Problems Identified

1. **Leads Kanban is unprofessional** -- The Kanban board in the Unified Inbox (New/Contacted/Quoted/Won/Lost columns) is cluttered and unclear about WHY a lead is in a given stage
2. **Not every caller is a customer** -- Someone asking "what time do you close?" should NOT become a customer record. The system needs smarter filtering based on call outcome/intent
3. **Leads page is too generic** -- The "Request" column with `vehicle_or_context` feels automotive, not plumbing. Every mode needs contextually appropriate fields
4. **Calendar can't handle multi-staff** -- The calendar shows one flat view. With 9 employees going to 9 jobs at 9am, it becomes a visual mess with overlapping blocks and no way to tell who is assigned to what
5. **Scheduling page needs polish** -- The list view and pending approval banner need a more professional, dense layout
6. **Must work for ALL business modes** -- Plumber, salon, tow truck, restaurant, medical office -- each needs to feel purpose-built

---

## Part 1: Smart Lead Qualification (Not Every Caller = Customer)

### The Logic
Currently, `ai_call_sessions` produces outcomes: `booked`, `followup`, `lead_captured`, `dispatch`, `lost`. Many calls are informational (hours, directions, general questions) and produce no lead record.

The fix is to ensure the **Leads page only shows genuine leads** -- people who expressed interest in a service, requested a callback, or were captured by the AI. This is already partially handled since leads are created by the AI webhook only for qualifying outcomes, but the temperature scoring needs refinement:

- **Hot**: Outcome = `booked` or `dispatch`, OR status = `booked`/`won`, OR called within 24h with `followup`/`lead_captured` outcome
- **Warm**: Status = `contacted`/`qualified`, OR `lead_captured` outcome within 72h
- **Cold**: Older than 7 days with no progression, OR `followup` with no follow-through
- **Not a lead at all**: Informational calls that don't create lead records stay out entirely (already the case, but we'll add a note clarifying this)

### Changes
- Update `useLeadIntelligence.ts` to refine temperature computation with outcome-awareness
- Add an explanatory tooltip on each temperature badge showing WHY the lead is hot/warm/cold (e.g., "Called 2 hours ago, requested callback")

---

## Part 2: Leads Page -- Mode-Aware Professional Redesign

### Replace the Kanban with an enhanced table

The Kanban in the **Unified Inbox** (`LeadsKanbanView`) will be replaced with a cleaner pipeline summary bar (visual stage indicators at the top, but data displayed in a professional table below). The standalone **Leads Page** table is already close -- it needs these mode-specific improvements:

| Mode | "Request" Column Label | Example Values | Extra Column |
|------|----------------------|----------------|--------------|
| service (plumbing) | Service Needed | "Water heater repair", "Drain cleaning" | Address |
| dispatch | Job Request | "Tow needed", "Lockout" | Pickup Location |
| food | Order Interest | "Catering inquiry", "Large order" | -- |
| medical | Visit Reason | "New patient consult", "Follow-up" | Insurance |
| sales | Interest | "2024 Camry", "Trade-in inquiry" | Vehicle |

### Kanban Replacement in Unified Inbox
Replace the `LeadsKanbanView` component with a professional **Pipeline Summary + Table** view:
- Top bar: Visual pipeline stages with counts (New: 5 | Contacted: 3 | Quoted: 2 | Won: 1 | Lost: 0) as clickable filters
- Below: Same professional table layout as the Leads page, filtered by the selected stage
- Each row shows the temperature badge + a one-line reason (e.g., "Requested callback 2h ago")

---

## Part 3: Calendar -- Multi-Staff Support

### The Core Problem
The `bookings` table has no `staff_member_id` column. When 9 employees have 9 jobs at 9am, they all stack on top of each other in one column.

### Database Change
```sql
ALTER TABLE public.bookings 
  ADD COLUMN IF NOT EXISTS staff_member_id uuid REFERENCES public.staff_members(id);
```

But wait -- `staff_members` doesn't exist as a real table (the hook uses `as any` cast). We need to verify if the table exists or create it. Based on the code, it's cast with `as any` which means it may exist but isn't in the generated types. We'll work with whatever exists.

### Calendar Redesign: Staff-Grouped View

Add a new view mode to the calendar: **"By Team Member"**

- **Week view (current)**: Shows all events in time columns (good for solo operators)
- **Day + Staff view (new)**: When viewing a single day, shows one column PER staff member. Each column header shows the staff member's name and color. Unassigned bookings go in an "Unassigned" column.

This is the standard pattern used by ServiceTitan, Housecall Pro, and every professional field service tool.

```text
| Time  | Mike (Blue)      | Sarah (Green)    | Jake (Orange)    | Unassigned |
|-------|-----------------|-----------------|-----------------|------------|
| 9:00  | Water Heater    | Drain Clean     | Faucet Install  |            |
|       | 123 Oak St      | 456 Elm St      | 789 Pine Ave    |            |
| 10:00 |                 | Toilet Repair   |                 | Leak Check |
|       |                 | 321 Maple Dr    |                 | 654 Birch  |
```

### Implementation
- Update `ScheduleEvent` interface to include optional `staffMemberId` and `staffName`
- Update `useScheduleData` to join bookings with the staff member (if assigned)
- Create a new `StaffDayView` component that renders one `DayColumn` per active staff member
- Add a view toggle: "Timeline" (current week view) vs "Team" (staff-grouped day view)
- The `CalendarEvent` component will show the staff member's color as a left border accent

---

## Part 4: Bookings Page Professional Polish

### Pending Approval Banner
Add a prominent "Needs Attention" section at the top when there are pending bookings:
- Card with amber/warning styling
- Shows count + list of pending bookings with one-click approve buttons
- Collapses when empty

### Enhanced List View
Upgrade `BookingCard` to show:
- Staff member name (when assigned)
- Service address (from the linked lead/customer)
- Mode-aware labels throughout (using `terms`)
- Better visual hierarchy with date grouping (Today, Tomorrow, This Week, Later)

### Mode-Specific Adaptations
| Mode | Primary Sort | Extra Info Shown |
|------|-------------|-----------------|
| service | By date/time | Technician name, service address |
| dispatch | By urgency then time | Driver, pickup/dropoff |
| food | By prep time | Order items, delivery/pickup |
| medical | By provider | Patient, visit type |
| sales | By date/time | Prospect, interest |

---

## Part 5: Customers Page Refinements

The current Customers page is already well-structured. Small refinements:
- Mode-aware "Request" context in the detail sheet
- For plumbing: show service history (past jobs with dates and descriptions)
- Remove any automotive-specific language from default labels

---

## Technical Implementation Summary

### Database Migration
```sql
-- Add staff assignment to bookings
ALTER TABLE public.bookings 
  ADD COLUMN IF NOT EXISTS staff_member_id uuid;
```

### Files to Create
- `src/components/calendar/StaffDayView.tsx` -- Multi-column staff view for the calendar
- `src/components/leads/PipelineSummaryBar.tsx` -- Visual pipeline stage bar replacing the Kanban

### Files to Modify
- `src/hooks/useScheduleData.ts` -- Add staff member join to bookings query
- `src/components/calendar/ScheduleCalendar.tsx` -- Add "Team" view toggle, integrate StaffDayView
- `src/components/calendar/CalendarEvent.tsx` -- Show staff color/name
- `src/pages/app/BookingsPage.tsx` -- Add pending approval banner, date grouping, staff display
- `src/components/bookings/BookingCard.tsx` -- Show staff name, service address, mode-aware labels
- `src/pages/app/LeadsPage.tsx` -- Mode-aware context column, temperature reason tooltips
- `src/pages/app/UnifiedInboxPage.tsx` -- Replace `LeadsKanbanView` with `PipelineSummaryBar` + table
- `src/hooks/useLeadIntelligence.ts` -- Refine temperature with outcome-based reasoning, add `reason` field
- `src/hooks/useBookings.ts` -- Include staff member name in query

### No Changes Needed
- Terminology system (`terminology.ts`) already handles mode labels correctly
- Customer enrichment hooks are already in good shape

