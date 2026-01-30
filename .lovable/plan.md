
# Availability Setup UX Overhaul

## Problem Analysis

You're absolutely right. Currently the system has all the pieces for real-time availability:
- Weekly business hours
- Calendar sync (Google/Microsoft/ICS)
- Busy blocks from synced calendars
- The `fn_compute_available_slots` function that merges everything

But the **setup flow is broken and confusing**. A business owner has no clear path to:
1. Understand what the AI actually knows about their schedule
2. Connect their real calendar (not just set static hours)
3. Block specific times for today/tomorrow
4. See their actual availability in real-time

## Solution: Unified "My Availability" Hub

Create a dedicated, prominent availability management experience that consolidates everything into one clear section.

### New Availability Section Structure

```text
YOUR AVAILABILITY
├── Status Card (What AI Knows Now)
│   └── Real-time: "Open today 9am-5pm, 3 slots booked, 2 available"
│
├── Calendar Source
│   ├── "Your calendar isn't connected yet" [Connect Now]
│   └── OR: "Synced with Google Calendar ✓" [Manage]
│
├── Weekly Schedule (Base Hours)
│   └── Mon-Fri editor with toggle switches
│
├── This Week's Availability (Visual Timeline)
│   ├── Today: ████░░██ (busy blocks shown visually)
│   ├── Tomorrow: ██████░░ 
│   └── [Block Time] [View Full Calendar]
│
└── Quick Block
    └── "Block time for today/tomorrow" inline form
```

### Phase 1: Create "Availability Hub" Component

Replace the current fragmented setup with a unified `AvailabilityHub.tsx` component that:

**Top Section - Connection Status (Most Important)**
```text
┌─────────────────────────────────────────────────────────────────────┐
│  📅 YOUR SCHEDULE                                                   │
│                                                                     │
│  ⚠️ Calendar not connected                                          │
│  Your AI only knows your basic hours. Connect your calendar         │
│  so it can see meetings, appointments, and busy times.              │
│                                                                     │
│  [Connect Google Calendar] [Connect Outlook] [I'll manage manually] │
└─────────────────────────────────────────────────────────────────────┘
```

OR when connected:
```text
┌─────────────────────────────────────────────────────────────────────┐
│  📅 YOUR SCHEDULE                            Last synced: 5 min ago │
│                                                                     │
│  ✅ Connected to Google Calendar                                    │
│  AI sees your meetings and blocks those times automatically.        │
│                                                                     │
│  [Sync Now] [Manage Connection]                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Middle Section - Today & Tomorrow At-a-Glance**
```text
┌─────────────────────────────────────────────────────────────────────┐
│  TODAY'S AVAILABILITY                                 Thursday, Jan 30│
│                                                                     │
│  9 AM  ████████ Meeting (from calendar)                             │
│  10 AM ████████ John's Appointment (booking)                        │
│  11 AM ░░░░░░░░ Available                                           │
│  12 PM ░░░░░░░░ Available                                           │
│  1 PM  ████████ Lunch (blocked manually)                            │
│  2 PM  ░░░░░░░░ Available                                           │
│  3 PM  ░░░░░░░░ Available                                           │
│  4 PM  ████████ Client call (from calendar)                         │
│                                                                     │
│  [+ Block Time]                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Bottom Section - Weekly Base Hours**
The existing business hours editor, but reframed as "Your default weekly schedule"

### Phase 2: Add Quick Block Functionality

Add an inline "Block Time" dialog that lets owners quickly:
- Select today or tomorrow
- Pick start/end times
- Add an optional reason
- Save immediately

This creates a `busy_block` with type `manual_busy`.

### Phase 3: Visual Timeline Component

Create a `DayAvailabilityTimeline.tsx` component that:
- Shows hourly blocks from business open to close
- Colors blocks by type (calendar sync, booking, manual block, available)
- Clickable to block/unblock times

### Phase 4: Prominent Calendar Connection CTA

If no calendar is connected, show a **persistent banner** at the top of the availability section (and on the dashboard) explaining:
- Why connecting helps
- What happens when you connect
- Clear CTA buttons for each provider

### Phase 5: Settings Page Integration

Replace the current fragmented "Hours" section with the new Availability Hub, which contains:
1. Connection status + wizard trigger
2. Visual timeline for this week
3. Quick block functionality  
4. Base weekly hours editor

---

## Technical Implementation

### New Components

1. **`AvailabilityHub.tsx`** - Main container with all availability management
2. **`CalendarConnectionStatus.tsx`** - Shows sync status, last sync time, CTA to connect
3. **`DayAvailabilityTimeline.tsx`** - Visual hourly timeline showing availability
4. **`QuickBlockDialog.tsx`** - Simple form to block time slots

### Modified Components

1. **`SettingsPage.tsx`** - Replace hours section with AvailabilityHub
2. **`LiveSchedulePreview.tsx`** - Enhance to be more actionable (add "Block Time" button)

### Data Flow

```text
Calendar Connections → sync-availability Edge Function → busy_blocks table
                                                              ↓
Business Hours (hours_json or availability_slots) ────→ fn_compute_available_slots
                                                              ↓
                                                     Available Slots returned
                                                              ↓
                                                        AI uses for booking
```

The key insight: The AI already has access to real-time availability via the `busy_blocks` table. The problem is business owners don't have an easy way to:
1. See that availability visually
2. Connect their calendar (the wizard exists but is hidden)
3. Manually block times for today/tomorrow

---

## Mobile Considerations

- Timeline shows as a vertical scrollable list
- Quick block uses a bottom sheet
- Calendar connection uses full-screen wizard

---

## Expected Outcomes

After implementation, business owners will:

1. **Immediately see their AI's schedule understanding** - Visual timeline shows what's booked/available
2. **Connect their calendar in seconds** - Prominent CTAs with clear benefits explained
3. **Block times with one tap** - No need to navigate to a separate calendar app
4. **Understand the system** - Clear visual feedback on how calendar sync → AI availability
5. **Trust the AI more** - Can verify the AI knows about their real schedule
