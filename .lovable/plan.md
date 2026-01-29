
# Dashboard Layout Reconfiguration Plan
## Making the Dashboard More User-Friendly, Scannable & Premium

---

## Current State Analysis

The dashboard currently has these components stacked vertically:
1. **KnowledgeConflictBanner** - Alert for unresolved conflicts
2. **UsageThresholdBanner** - Warning when approaching limits
3. **GoLiveChecklist** - Setup steps (when not live)
4. **AgentControlCard** - Voice/SMS agent toggle
5. **DashboardByMode** - Mode-specific stats grid (4 cards)
6. **BusinessBrainStatusCard + QuickStatsCard** - 2-column grid
7. **RecentActivityCard + QuickLinksCard** - 2-column grid
8. **Copilot** - Floating assistant

### Current Issues:
- Too much vertical scrolling required
- Information hierarchy isn't immediately clear
- Agent control and key stats are separated
- Quick stats uses placeholder data (not real)
- Visual density makes it hard to scan quickly
- No clear "hero" section to ground the user

---

## New Layout Strategy

### Key Principles:
1. **Hero Zone First** - Big, clear agent status with key metric at top
2. **Reduce Scroll Depth** - Consolidate related information
3. **Clear Visual Hierarchy** - Primary → Secondary → Tertiary zones
4. **Mobile-First** - Single column that flows naturally on mobile
5. **Scan in 2 Seconds** - User should understand status at a glance

---

## New Dashboard Structure

```text
┌─────────────────────────────────────────────────────────────┐
│  BANNERS (only when needed)                                 │
│  • Knowledge Conflict Banner                                │
│  • Usage Threshold Banner                                   │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  HERO CARD                                                  │
│  ┌─────────────────────────────────────────────────────────┐│
│  │  [Icon] AI Agent Status           [LIVE / PAUSED badge] ││
│  │  "Answering calls 24/7"                    [Toggle]     ││
│  ├─────────────────────────────────────────────────────────┤│
│  │  📞 12 Calls  │  📅 5 Bookings  │  💰 $2.4k  │  🧠 85%  ││
│  │  Today        │  This Week      │  Recovered │  Ready   ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘

┌────────────────────────────┐ ┌────────────────────────────┐
│  TODAY'S QUEUE             │ │  QUICK ACTIONS             │
│  Mode-specific pending     │ │  Primary navigation tiles  │
│  items with counts         │ │  based on business mode    │
│  (compact stat cards)      │ │                            │
└────────────────────────────┘ └────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  RECENT ACTIVITY (Full Width)                               │
│  Last 4-5 interactions with clear status indicators        │
│  [View All →]                                               │
└─────────────────────────────────────────────────────────────┘

┌────────────────────────────┐ ┌────────────────────────────┐
│  BUSINESS BRAIN STATUS     │ │  SETUP PROGRESS            │
│  Readiness score + alerts  │ │  (or Go Live Checklist)    │
│  [Review →]                │ │  [Continue →]              │
└────────────────────────────┘ └────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  COPILOT (Floating FAB)                                     │
└─────────────────────────────────────────────────────────────┘
```

---

## Detailed Component Changes

### 1. New Hero Card Component

**New File: `src/components/dashboard/DashboardHeroCard.tsx`**

Combines AgentControlCard and QuickStatsCard into one prominent card:

**Structure:**
```
┌──────────────────────────────────────────────────────────────┐
│ Top Section (Agent Status)                                   │
│ ┌────────────────────────────────────────────────────────┐   │
│ │ [Icon] AI Agent    [LIVE badge]            [Toggle]    │   │
│ │ "Answering calls for {business_name}"                  │   │
│ │ [Test AI] [Configure]                                  │   │
│ └────────────────────────────────────────────────────────┘   │
├──────────────────────────────────────────────────────────────┤
│ Bottom Section (Key Metrics Strip)                           │
│ ┌────────────┬────────────┬────────────┬─────────────────┐   │
│ │ 📞 Calls   │ 📅 Booked  │ 💰 Revenue │ 🧠 AI Ready     │   │
│ │ 12 today   │ 5 this wk  │ $2.4k      │ 85%             │   │
│ └────────────┴────────────┴────────────┴─────────────────┘   │
└──────────────────────────────────────────────────────────────┘
```

**Features:**
- Gradient background when active (shows "alive" state)
- Animated ping indicator when live
- Inline mini-stats strip at bottom
- Copy phone number button in subtitle
- Real data from database (replace hardcoded values)

### 2. Simplified "Today's Queue" Section

**Modify: `src/components/dashboard/DashboardByMode.tsx`**

Change from 4 stat cards to a compact horizontal strip:

**Before:** 4 separate clickable cards in a grid
**After:** Single card with inline stats and pending/urgent badges

```
┌──────────────────────────────────────────────────────────────┐
│ 📋 Today's Queue                          [View All →]       │
├──────────────────────────────────────────────────────────────┤
│ ⏳ 3 Pending    │  🔴 1 Urgent    │  ✅ 8 Completed          │
│ [Click to view pending]                                      │
└──────────────────────────────────────────────────────────────┘
```

- Compact single row
- Click anywhere to navigate to relevant page
- Urgent items highlighted with red badge
- Mode-aware content (orders for food, jobs for dispatch, etc.)

### 3. Enhanced Quick Actions Grid

**Modify: `src/components/dashboard/QuickLinksCard.tsx`**

Make it more prominent with larger touch targets:

- 2x2 grid of action tiles
- Each tile: Icon + Label + Description
- Subtle hover lift effect
- Mode-aware actions shown first

### 4. Streamlined Recent Activity

**Modify: `src/components/dashboard/RecentActivityCard.tsx`**

Make it full-width with better visual hierarchy:

- Remove hardcoded demo data, use real database queries
- Show last 5 items (not 4)
- Better status indicators (colored dots, not just icons)
- Time displayed as relative ("2m ago")
- Click entire row to open detail

### 5. Compact GoLiveChecklist / Setup Card

**Modify: `src/components/dashboard/GoLiveChecklist.tsx`**

When not live, show as a secondary card (not prominent):

- Smaller, fits in 2-column layout
- Shows progress as ring/circle instead of progress bar
- Just 2-3 most important incomplete items visible
- "Continue Setup" button

### 6. LiveDashboard Layout Update

**Modify: `src/components/dashboard/LiveDashboard.tsx`**

New structure:
```tsx
<div className="space-y-6 max-w-5xl mx-auto">
  {/* Critical Banners - Stacked at top */}
  <KnowledgeConflictBanner />
  <UsageThresholdBanner />

  {/* HERO: Agent + Key Stats (full width) */}
  <DashboardHeroCard />

  {/* Two Column: Queue + Quick Actions */}
  <div className="grid md:grid-cols-2 gap-6">
    <TodayQueueCard />  {/* Mode-specific queue */}
    <QuickActionsCard /> {/* Quick links */}
  </div>

  {/* Full Width: Recent Activity */}
  <RecentActivityCard />

  {/* Two Column: Brain Status + Setup/Checklist */}
  <div className="grid md:grid-cols-2 gap-6">
    <BusinessBrainStatusCard />
    {!isLive && <GoLiveChecklist />}
    {isLive && <SetupCompleteBadge />}
  </div>

  {/* Copilot FAB */}
  <CopilotTrigger />
</div>
```

---

## Visual Improvements

### Hero Card Styling
- Active state: `bg-gradient-to-br from-primary/5 via-transparent to-primary/10`
- Border: `border-primary/30` when active
- Shadow: `shadow-lg shadow-primary/5` when active
- Paused state: Standard card with muted colors

### Metrics Strip
- Background: `bg-muted/50` subtle panel
- Dividers: Subtle vertical lines between metrics
- Icons: Small (h-4 w-4) in muted color
- Values: Bold, slightly larger

### Status Badges
- LIVE: Solid primary with pulse animation
- PAUSED: Secondary/outline variant
- URGENT: Destructive with count

---

## Data Fetching Updates

### QuickStatsCard → Real Data
Currently uses hardcoded values. Update to fetch:
- Calls today: `ai_call_sessions` where `started_at` is today
- Bookings this week: `bookings` where `created_at` is this week
- Revenue: Sum of `bookings.deposit_amount` this week
- AI Readiness: From `useBusinessContext` hook

### RecentActivityCard → Real Data
Currently uses hardcoded array. Update to fetch:
- Last 5 records combining calls, bookings, orders
- Order by timestamp descending
- Show real customer names/phones

---

## File Changes Summary

### New Files
1. `src/components/dashboard/DashboardHeroCard.tsx` - Combined agent control + stats

### Modified Files
2. `src/components/dashboard/LiveDashboard.tsx` - New layout structure
3. `src/components/dashboard/QuickStatsCard.tsx` - Real data fetching, inline layout
4. `src/components/dashboard/RecentActivityCard.tsx` - Real data, full width styling
5. `src/components/dashboard/QuickLinksCard.tsx` - Larger tiles, better styling
6. `src/components/dashboard/DashboardByMode.tsx` - Compact queue view
7. `src/components/dashboard/GoLiveChecklist.tsx` - Compact variant when secondary

---

## Mobile Layout

On mobile (< md breakpoint):
- All sections stack vertically
- Hero card: Metrics wrap to 2x2 grid
- Queue + Quick Actions: Stack vertically
- Touch targets: Minimum 44px height

---

## What Stays the Same

- All existing functionality
- All navigation destinations
- All data sources and backend logic
- Copilot behavior and content
- Banner trigger logic
- Agent toggle behavior
- Setup wizard (when shown instead of LiveDashboard)

---

## Result

After implementation:
- **2-second scan** to understand agent status and key metrics
- **Reduced scroll** by consolidating related info
- **Clear hierarchy** with hero card as focal point
- **Mobile-friendly** single-column flow
- **Premium feel** with subtle gradients and shadows
- **Real data** replacing placeholder values

