
# Dashboard UX Overhaul: "Command Center" Redesign

## Summary

A comprehensive overhaul to make every dashboard highly functional, decluttered, and immediately actionable for business owners. The goal is to create a unified "Command Center" experience where owners can monitor activity, take quick actions, check AI performance, and manage their day - all with real-time audio notifications for critical events.

---

## Core Design Principles

1. **At-a-Glance First**: Critical info visible without clicking
2. **One-Click Actions**: Reduce steps to complete common tasks
3. **Industry-Adaptive**: Pages adapt to business mode (Food, Service, Dispatch, Medical)
4. **Real-Time Alerts**: Audio + visual notifications for urgent items
5. **Mobile-First**: All layouts work on phone screens

---

## Phase 1: Main Dashboard Simplification

### Current Issues
- Too many cards competing for attention
- Knowledge/AI sections dominate when owners want to see activity
- Quick links don't show enough context

### Changes

**New "Today" Focus Layout:**
```text
+----------------------------------------------------------+
|  [AI Status: Live/Paused]  [Toggle]    [Notifications]   |
+----------------------------------------------------------+
|                                                          |
|  TODAY'S SNAPSHOT (4 metric cards - mode-adaptive)       |
|  [Calls/Orders]  [Bookings/Jobs]  [Revenue]  [AI Score]  |
|                                                          |
+----------------------------------------------------------+
|                                                          |
|  NEEDS ATTENTION BANNER (if any urgent items)            |
|  "3 new orders | 2 knowledge gaps | 1 pending booking"   |
|                                                          |
+---------------------------+------------------------------+
|                           |                              |
|  LIVE ACTIVITY FEED       |   QUICK ACTIONS              |
|  (Realtime updates)       |   - View Orders/Bookings     |
|  - New order received     |   - Test AI                  |
|  - Call answered          |   - Add Knowledge            |
|  - Booking confirmed      |   - View Schedule            |
|                           |                              |
+---------------------------+------------------------------+
```

**Key Improvements:**
- Remove `KnowledgeStatusBar` and `TeachAISection` from main dashboard (move to Business Brain)
- Add "Needs Attention" banner consolidating all urgent items
- Activity Feed shows last 10 items with clickable navigation
- Metric cards adapt by business mode:
  - **Food**: Orders Today, Pending Prep, Revenue, AI Score
  - **Service**: Calls Today, Bookings This Week, Revenue, AI Score
  - **Dispatch**: Jobs Pending, En Route, On Site, Completed Today
  - **Medical**: Intakes Today, Appointments, Follow-ups, AI Score

---

## Phase 2: Orders Page (Food Industry)

### Current Issues
- Data displaying as JSON in some cases
- Too many elements per order card
- No visual priority system

### Changes

**Streamlined Order Card:**
```text
+-----------------------------------------------------+
|  #1234   [PICKUP]   [PENDING]              $24.50   |
|  John D. | (555) 123-4567                           |
|  2x Margherita Pizza, 1x Pepsi                      |
|  "No onions please" [!]                             |
|  -------------------------------------------------  |
|  [Confirm]  [Start Prep]  [Print]      12:34 PM     |
+-----------------------------------------------------+
```

**Key Improvements:**
- Larger order numbers and status badges
- One-line item summary (expand to see full list)
- Special instructions get amber warning icon
- Primary action button changes based on status:
  - Pending -> "Confirm"
  - Confirmed -> "Start Prep"
  - Preparing -> "Mark Ready"
  - Ready -> "Complete"
- Audio chime for new orders (already partially implemented, enhance)

---

## Phase 3: Calls Page Cleanup

### Current Issues
- Table layout cramped on mobile
- JSON data sometimes visible
- "Webhook missing" confusing for non-technical users

### Changes

**Card-Based Call Log (Mobile-First):**
```text
+-----------------------------------------------------+
|  John Smith          Today, 2:34 PM        [BOOKED] |
|  (555) 123-4567                                     |
|  Requested: Haircut + Beard Trim                    |
|  "Looking for appointment this Saturday afternoon"  |
|  -------------------------------------------------  |
|  [View Details]  [Call Back]  [Edit]                |
+-----------------------------------------------------+
```

**Key Improvements:**
- Switch from table to card layout on mobile
- Keep table for desktop but with cleaner columns
- Replace "Webhook missing" with "Processing..." or "Tap to add details"
- Clean up any remaining JSON/gibberish in display
- Add "Call Back" quick action button

---

## Phase 4: Inbox Improvements

### Current Issues
- Functional but lacks visual hierarchy
- No quick actions visible in list

### Changes

**Enhanced Conversation Preview:**
- Show last message snippet (already there)
- Add quick action icons: [Reply] [Book] [Call]
- Show unread badge more prominently
- Add typing indicator for active AI conversations

---

## Phase 5: Unified Notification System

### New Features

1. **Audio Alerts** (configurable):
   - New order: Kitchen bell sound
   - Urgent job: Alert chime
   - New lead: Subtle notification
   - AI needs help: Distinct attention sound

2. **Toast Notifications**:
   - Slide in from top-right
   - Include quick action button
   - Auto-dismiss after 8 seconds (except critical)

3. **Notification Center Improvements**:
   - Expand notification types beyond knowledge uploads
   - Add: new orders, missed calls, booking requests, knowledge gaps
   - Group by category with counts

---

## Phase 6: Mobile Layout Fixes

### Current Issues
- Bottom nav shows only 5 items
- Some pages have horizontal scroll
- Touch targets too small on mobile

### Changes

1. **Bottom Navigation**:
   - Smart priority: Show most relevant items for business mode
   - "More" menu for additional items
   - Badge indicators for urgent items

2. **Touch Targets**:
   - Minimum 44x44px for all interactive elements
   - Increase padding on table rows
   - Larger action buttons

3. **Responsive Cards**:
   - Stack all cards vertically on mobile
   - Full-width buttons
   - Collapsible sections for less critical info

---

## Technical Implementation

### Files to Create
| File | Purpose |
|------|---------|
| `src/components/dashboard/TodaySnapshot.tsx` | Mode-adaptive metric cards |
| `src/components/dashboard/NeedsAttentionBanner.tsx` | Consolidated urgent items |
| `src/components/dashboard/LiveActivityFeed.tsx` | Enhanced realtime feed |
| `src/components/notifications/SoundManager.tsx` | Audio notification system |
| `src/hooks/useAudioNotifications.ts` | Sound preference management |

### Files to Modify
| File | Changes |
|------|---------|
| `src/components/dashboard/LiveDashboard.tsx` | Simplified layout, remove clutter |
| `src/pages/app/OrdersPage.tsx` | Enhanced order cards, better mobile |
| `src/pages/app/CallsPage.tsx` | Card layout for mobile, cleaner display |
| `src/pages/app/InboxPage.tsx` | Quick actions in list view |
| `src/components/layouts/AppLayout.tsx` | Smarter mobile nav |
| `src/hooks/useNotifications.ts` | Add audio support, expand types |

### Database Changes
- Add column to `assistant_settings`: `notification_sounds_enabled` (boolean, default true)
- Add column to `owner_notifications`: `sound_type` (text, nullable)

---

## Implementation Order

1. **Immediate Impact** (Phase 1 + 5):
   - Simplify main dashboard
   - Add audio notification system
   - Create "Needs Attention" banner

2. **Industry-Specific** (Phase 2):
   - Orders page cleanup for food businesses
   - Better data display and actions

3. **Communication Hub** (Phase 3 + 4):
   - Calls page card layout
   - Inbox quick actions

4. **Polish** (Phase 6):
   - Mobile layout refinements
   - Touch target improvements
   - Final testing across devices

---

## Expected Outcomes

- **50% fewer clicks** to complete common actions
- **Instant visibility** of what needs attention
- **Audio alerts** ensure no missed orders or urgent items
- **Consistent experience** across all business types
- **Mobile-friendly** for owners on the go

