

# Plan: Create Readiness Fix Center Page

## Problem
When users click "Fix Issues" on the AI Readiness banner in the dashboard, they are taken to the Go Live page which is primarily about choosing a pricing plan. Users expect to be taken directly to a page where they can fix the issues blocking them from going live.

## Solution Overview
Create a dedicated "Readiness Fix Center" page at `/app/readiness` that focuses entirely on helping users fix their AI readiness issues. The dashboard's "Fix Issues" button will route to this new page instead of the pricing page.

---

## What You'll See After This Change

1. **Dashboard "Fix Issues" Button**: Takes you to the new Readiness Fix Center
2. **Readiness Fix Center Page**: Shows:
   - Your current AI readiness score with a progress bar
   - P0 (Must Fix) issues with "Fix Now" deep links
   - P1 (Recommended) improvements with "Improve" deep links
   - A "Go Live" button that appears only when you're ready (score >= 85 and no P0 issues)

3. **Go Live Page**: Remains unchanged - only accessed when you're ready to choose a plan

---

## Technical Changes

### 1. Create New Page: `src/pages/app/ReadinessFixCenterPage.tsx`

A new page that displays:
- Full AI readiness score panel (reuses existing `AIReadinessPanel` component)
- Clear header explaining the purpose
- Navigation back to dashboard
- "Go Live" button only when ready (routes to `/app/go-live`)

### 2. Update Route: `src/App.tsx`

Add new route for the readiness fix center:
```
/app/readiness → ReadinessFixCenterPage
```

### 3. Update Dashboard Banner: `src/components/dashboard/AIReadinessPanel.tsx`

Change the "Fix Issues" button destination:
- **Before**: Routes to `/app/go-live`
- **After**: Routes to `/app/readiness`

---

## File Summary

| File | Change |
|------|--------|
| `src/pages/app/ReadinessFixCenterPage.tsx` | Create new page |
| `src/App.tsx` | Add `/app/readiness` route |
| `src/components/dashboard/AIReadinessPanel.tsx` | Update "Fix Issues" button to route to `/app/readiness` |

