

# Bookings + Dispatch UX Polish & Collapsible Sidebar Plan

## Executive Summary

This plan delivers three improvements:
1. **Bookings Page** - Enhanced clarity with helper text, tooltips, and better empty states
2. **Dispatch Page** - Improved job management UX with clearer labels and guidance
3. **Collapsible Sidebar** - Toggle button to collapse/expand the sidebar for better calendar viewing

All changes are UI/UX only - no database, edge function, or business logic changes.

---

## 1. Collapsible Sidebar

### Current State
- Fixed-width sidebar (w-64 / 256px)
- Always visible on desktop
- No way to collapse it for more screen space

### After
- Sidebar collapses to icon-only mode (w-14 / 56px)
- Toggle button in header to expand/collapse
- State persisted in localStorage
- Keyboard shortcut (Ctrl/Cmd + B) to toggle
- Smooth transition animation
- Tooltips on icons when collapsed

### Implementation

**File: `src/components/layouts/AppLayout.tsx`**

Changes:
1. Add `sidebarCollapsed` state with localStorage persistence
2. Add toggle button in header (PanelLeft icon)
3. Update sidebar width classes to transition between `w-64` and `w-14`
4. Update nav items to show icon-only when collapsed
5. Add tooltips on nav items when collapsed
6. Update main content margin to match sidebar width

```
┌─────────────────────────────────────────────────────────────────┐
│ [☰] CloseLoop                                    [🔔] [Avatar] │
├──────┬──────────────────────────────────────────────────────────┤
│ 🏠   │                                                          │
│ 📥   │                                                          │
│ 📅   │              Main Content Area                           │
│ 🚚   │              (Calendar gets more space)                  │
│ 🤖   │                                                          │
│ ⚙️   │                                                          │
└──────┴──────────────────────────────────────────────────────────┘
  ↑ Collapsed sidebar (icon only, with tooltips on hover)
```

---

## 2. Bookings Page UX Improvements

### Current Issues
- No guidance on how to create a booking from the calendar
- Legend at bottom may be missed
- Stats cards lack context
- Empty list state is minimal

### Changes

**File: `src/pages/app/BookingsPage.tsx`**

| Section | Change |
|---------|--------|
| Page subtitle | Update to: "Your calendar and upcoming appointments. Click any time slot to create a booking." |
| Stats cards | Add tooltips explaining each metric |
| Calendar card | Add a subtle instruction banner above: "Tip: Click any empty time slot to create a booking" |
| List empty state | Add: "When customers book through your AI receptionist or you create appointments, they'll appear here." |
| Legend | Move above the calendar and make it more prominent |

**File: `src/components/calendar/ScheduleCalendar.tsx`**

| Change |
|--------|
| Add keyboard shortcut hint: "Press → to navigate weeks" |
| Add helper text when calendar is empty for the week |

**File: `src/components/calendar/CalendarHeader.tsx`**

| Change |
|--------|
| Add tooltip on Week/Day toggle buttons explaining the views |

**File: `src/components/calendar/CreateBookingDialog.tsx`**

| Change |
|--------|
| Add helper text under phone field: "We'll use this to link the booking to the customer's record" |
| Add helper text under service dropdown: "Leave blank if unsure - you can update this later" |

---

## 3. Dispatch Page UX Improvements

### Current Issues
- Stats cards are small and lack context
- Priority badges don't explain urgency levels
- "New Job" button has no guidance
- Empty table state is minimal
- Status transitions aren't explained

### Changes

**File: `src/pages/app/DispatchPage.tsx`**

| Section | Change |
|---------|--------|
| Page subtitle | Update to: "Track and dispatch service calls to your team" |
| Urgent alert | Add tooltip: "Jobs marked 'urgent' have been escalated and need immediate attention" |
| Stats cards | Add descriptive labels: "Waiting for assignment", "Crew assigned", "On the way", "Working on site", "Finished today" |
| Priority badges | Add tooltips explaining each level (Low: "Can wait", Normal: "Standard timing", High: "Priority handling", Urgent: "Drop everything") |
| Status dropdown | Add helper text in each option explaining the transition |
| Empty table | Improve to: "No jobs yet. When customers call for service, your AI will capture the details and they'll appear here ready for dispatch." |
| Filter dropdown | Add helper text: "Filter jobs by their current status" |
| Table header | Add tooltips explaining columns (Job #, Priority, Customer, etc.) |

### Status Flow Explanation

Add a collapsible section or tooltip showing the job lifecycle:

```
Pending → Assigned → En Route → On Site → Completed
   ↓         ↓          ↓          ↓
Cancelled (can happen at any stage)
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/layouts/AppLayout.tsx` | Add collapsible sidebar with toggle, localStorage persistence |
| `src/pages/app/BookingsPage.tsx` | Page subtitle, stats tooltips, calendar tip, empty state enhancement |
| `src/pages/app/DispatchPage.tsx` | Page subtitle, stats labels, tooltips, empty state, status explanations |
| `src/components/calendar/ScheduleCalendar.tsx` | Legend position, keyboard hints, empty week state |
| `src/components/calendar/CalendarHeader.tsx` | Tooltips on view toggle buttons |
| `src/components/calendar/CreateBookingDialog.tsx` | Helper text for form fields |

---

## Technical Approach

### Sidebar Collapse Implementation

```typescript
// In AppLayout.tsx
const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
  return localStorage.getItem('sidebar-collapsed') === 'true';
});

const toggleSidebar = () => {
  const newState = !sidebarCollapsed;
  setSidebarCollapsed(newState);
  localStorage.setItem('sidebar-collapsed', String(newState));
};

// Keyboard shortcut
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
      e.preventDefault();
      toggleSidebar();
    }
  };
  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [sidebarCollapsed]);
```

### Sidebar Width Classes

```tsx
// Sidebar
<aside className={cn(
  "hidden md:flex flex-col fixed left-0 top-16 bottom-0 border-r bg-background transition-all duration-200",
  sidebarCollapsed ? "w-14" : "w-64"
)}>

// Main content margin
<main className={cn(
  "flex-1 pb-20 md:pb-0 min-h-[calc(100vh-4rem)] transition-all duration-200",
  sidebarCollapsed ? "md:ml-14" : "md:ml-64"
)}>
```

---

## Before/After Summary

### Sidebar
- **Before**: Fixed 256px width, always visible
- **After**: Collapsible to 56px, toggle in header, keyboard shortcut, state persisted

### Bookings Page
- **Before**: Minimal guidance, legend at bottom, sparse empty states
- **After**: Clear instructions to click time slots, tooltips on stats, prominent legend, helpful empty states

### Dispatch Page
- **Before**: Technical status names, minimal context, sparse empty state
- **After**: Descriptive labels, priority explanations, status flow guidance, welcoming empty state

---

## Constraints Respected

| Constraint | Status |
|------------|--------|
| No DB changes | Verified - only UI changes |
| No edge function changes | Verified - no backend modifications |
| No business logic changes | Verified - same functionality |
| No booking/dispatch flow changes | Verified - only adding helper text |
| No ElevenLabs payload changes | Verified - not touching AI context |

---

## 5-Minute Manual Test Checklist

After implementation:

1. **Sidebar Toggle**
   - Click toggle button - sidebar collapses to icons
   - Click again - sidebar expands
   - Hover icons when collapsed - tooltips appear
   - Refresh page - sidebar state persists
   - Press Ctrl/Cmd + B - sidebar toggles

2. **Bookings Page**
   - Calendar loads correctly
   - Click empty time slot - booking dialog opens
   - Helper text visible in dialog
   - Stats cards have tooltips (hover)
   - Legend is visible and clear
   - Empty list shows helpful message

3. **Dispatch Page**
   - Page loads with all stats
   - Hover priority badges - tooltips show
   - Hover stats cards - tooltips show
   - Filter dropdown works
   - Empty table shows helpful message
   - Status dropdown works for changing job status

4. **Mobile**
   - Sidebar toggle not visible (mobile uses bottom nav)
   - Bottom nav still works correctly
   - Bookings and Dispatch pages render properly

