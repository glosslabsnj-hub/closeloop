
# UI Polish & Busyness Slider Relevance Fix

## Issues Identified

### 1. ROI Performance Widget Layout Issues
**Location**: `src/components/dashboard/ROIPerformanceWidget.tsx`

**Problems**:
- On smaller screens, the 5-column metrics grid collapses to 2 columns, causing awkward layouts
- The "View Full Report" button in the ROI callout can extend outside its container
- Header text can overflow on narrow widths
- The grid gap and sizing doesn't account for small viewports properly

**Current Code Issues**:
```tsx
// Line 300 - Grid layout causes overlap on intermediate sizes
<div className="grid grid-cols-2 gap-5 md:grid-cols-5 md:gap-6 mt-5">
```

### 2. FAQ Section Layout in Business Brain
**Location**: `src/components/brain/BusinessFAQEditor.tsx` + `src/components/brain/SuggestedFAQButtons.tsx`

**Problems**:
- `SuggestedFAQButtons` component renders "Quick add common questions:" text + multiple buttons in the header
- The header layout (title/description + headerActions + Add button) doesn't have proper overflow handling
- Suggested FAQ buttons can wrap and push content off-screen

**Current Code Issues**:
```tsx
// KnowledgeSection.tsx line 66-71 - Header actions can overflow
<div className="flex items-center gap-2 shrink-0">
  {headerActions}  // This can be very wide
  <Button size="sm" onClick={onAdd}>
```

### 3. Busyness Slider Relevance
**Location**: `src/components/dashboard/BusynessSliderWidget.tsx` + `src/components/dashboard/LiveDashboard.tsx`

**Problems**:
- Currently shows for ALL business modes unconditionally
- Not relevant for appointment-based businesses (salons, auto detailing) where ETAs aren't quoted
- Only relevant for:
  - **Dispatch**: Always (ETA is core to the flow)
  - **Service with urgency_check flow**: Sometimes (when same-day/emergency dispatch is offered)
  - **Service with schedule_first flow**: Rarely (appointments are scheduled, not ETAs)
  - **Food**: Always (prep times affect delivery/pickup ETAs)

**Why It's Confusing**:
- A salon owner sees "Current Busyness: 0%" and has no idea what it does
- The "ETA +X min" indicator is meaningless for a business that books appointments 2 weeks out

## Solution Design

### Fix 1: ROI Performance Widget Responsive Layout

**Changes to `ROIPerformanceWidget.tsx`**:
1. Add `overflow-hidden` to the card container
2. Improve grid responsiveness: 1 column on mobile, 2 columns on sm, 4 columns on md, 5 columns on lg
3. Make the ROI callout span full width on mobile
4. Truncate header text properly
5. Make "View Full Report" button responsive

```tsx
// Improved grid layout
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4 lg:gap-6 mt-5">
```

### Fix 2: FAQ Section Header Layout

**Changes to `KnowledgeSection.tsx`**:
1. Move `headerActions` below the title/description instead of inline
2. Stack header elements vertically on mobile
3. Add `overflow-hidden` and `min-w-0` to prevent text overflow

**Changes to `SuggestedFAQButtons.tsx`**:
1. Make the component more compact
2. Limit visible suggestions to 3 on mobile
3. Use a collapsible/dropdown pattern for mobile

### Fix 3: Conditional Busyness Slider

**Changes to `LiveDashboard.tsx`**:
1. Add logic to conditionally show/hide the busyness slider based on:
   - `businessMode` (always show for dispatch and food)
   - `service_default_flow` setting (show for urgency_check/dispatch_first, hide for schedule_first)
   - `same_day_enabled` setting (if enabled, show the slider)

**Logic**:
```typescript
const showBusynessSlider = useMemo(() => {
  // Always show for dispatch and food - ETAs are core
  if (businessMode === "dispatch" || businessMode === "food") return true;
  
  // For service/medical/general, only show if same-day/urgent flow is enabled
  if (assistantSettings?.service_default_flow === "urgency_check" ||
      assistantSettings?.service_default_flow === "dispatch_first" ||
      assistantSettings?.same_day_enabled) {
    return true;
  }
  
  // Default: hide for appointment-first businesses
  return false;
}, [businessMode, assistantSettings]);
```

**Changes to `BusynessSliderWidget.tsx`**:
1. Add contextual help text based on business mode
2. Make it clearer what the slider affects

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/dashboard/ROIPerformanceWidget.tsx` | Fix grid layout, add overflow handling, improve responsiveness |
| `src/components/brain/shared/KnowledgeSection.tsx` | Fix header layout, stack elements on mobile |
| `src/components/brain/SuggestedFAQButtons.tsx` | Make more compact, limit visible on mobile |
| `src/components/dashboard/LiveDashboard.tsx` | Add conditional logic for busyness slider |
| `src/components/dashboard/BusynessSliderWidget.tsx` | Add contextual description based on mode |

## Technical Details

### ROI Widget Grid Fix (ROIPerformanceWidget.tsx)

**Before (lines 283-369)**:
- `grid-cols-2 md:grid-cols-5` causes 2-column layout on tablet which is cramped
- Header text can overflow
- ROI callout "View Full Report" can overflow

**After**:
- `grid-cols-1 xs:grid-cols-2 md:grid-cols-4 xl:grid-cols-5` for better breakpoints
- Header with `truncate` and `min-w-0`
- ROI callout moved to bottom row on mobile

### KnowledgeSection Header Fix

**Before**:
```tsx
<div className="flex items-center justify-between gap-4">
  <div className="min-w-0">
    <CardTitle>...</CardTitle>
    <CardDescription>...</CardDescription>
  </div>
  <div className="flex items-center gap-2 shrink-0">
    {headerActions}  // Can be very wide
    <Button>Add</Button>
  </div>
</div>
```

**After**:
```tsx
<div className="space-y-3">
  <div className="flex items-center justify-between gap-4">
    <div className="min-w-0">
      <CardTitle>...</CardTitle>
      <CardDescription>...</CardDescription>
    </div>
    <Button>Add</Button>
  </div>
  {headerActions && (
    <div className="overflow-hidden">{headerActions}</div>
  )}
</div>
```

### SuggestedFAQButtons Compact Layout

**Changes**:
- Use smaller chips instead of full buttons
- Limit to 3 visible on mobile, show all on desktop
- Add horizontal scroll on overflow instead of wrap

### Busyness Slider Conditional Logic

**New hook or inline logic in LiveDashboard**:
```typescript
const showBusynessSlider = useMemo(() => {
  // Dispatch/Food: Always show (ETA-driven)
  if (businessMode === "dispatch" || businessMode === "food") return true;
  
  // Service modes: Only if urgency/dispatch flow or same-day enabled
  const flow = assistantSettings?.service_default_flow;
  const sameDayEnabled = assistantSettings?.same_day_enabled;
  
  if (flow === "urgency_check" || flow === "dispatch_first") return true;
  if (sameDayEnabled) return true;
  
  return false;
}, [businessMode, assistantSettings]);
```

## Verification Steps

After implementation:
1. View dashboard on mobile (375px) - ROI widget should not overlap
2. View dashboard on tablet (768px) - Metrics should be readable
3. Expand FAQ section in Business Brain - Suggested FAQ buttons should not overflow
4. Switch between business modes and verify busyness slider visibility:
   - Dispatch business: Slider visible
   - Plumbing with urgency_check: Slider visible
   - Salon with schedule_first: Slider hidden
   - Restaurant: Slider visible
5. Resize browser to various widths - no layout breaks

## Summary

This fix addresses three interconnected issues:
1. **Professional ROI widget** with proper responsive layout
2. **Clean FAQ section** with non-overflowing suggested buttons
3. **Contextual busyness slider** that only shows when relevant to the business type

The changes maintain all existing functionality while making the UI more polished and reducing confusion for users whose businesses don't use real-time ETA calculations.
