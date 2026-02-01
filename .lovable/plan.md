
## Plan: Fix Business Name Overlapping Dashboard Button

### Problem Analysis

The user reports that when scrolled to the top of the dashboard, the business name in the header visually covers/overlaps the Dashboard button in the sidebar.

**Current Layout Structure:**
```text
+----------------------------------------------------------+
| [Logo] Business Name                    [Bell] [Avatar]  | ← Header (h-16, sticky, z-50)
+----------------------------------------------------------+
| [Dashboard]      |                                        |
| [Inbox]          |      Main Content Area                 | ← Sidebar starts at top-16
| [Calls]          |                                        |
| ...              |                                        |
+----------------------------------------------------------+
```

**Root Cause:**
The header contains a `Link` with the logo and business name (lines 186-191 in AppLayout.tsx):
```tsx
<Link to="/app/dashboard" className="flex items-center gap-3 hover-lift">
  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary shadow-sm">
    <Phone className="h-5 w-5 text-primary-foreground" />
  </div>
  <span className="font-bold text-lg hidden sm:inline">{tenant?.name || "CloseLoop"}</span>
</Link>
```

The sidebar begins at `top-16` which is exactly where the header ends, but because the header's business name is positioned at the left edge (matching where the sidebar is), and long business names can extend significantly, they appear to overlap visually with the sidebar's first item.

---

### Solution

Add visual separation between the header branding area and the sidebar navigation. Two complementary changes:

1. **Add top padding to the sidebar nav** - Create breathing room between the header bottom and the first nav item
2. **Optionally add a subtle separator** - Visual distinction between header zone and nav zone

---

### Implementation

**File: `src/components/layouts/AppLayout.tsx`**

**Change 1: Add top padding to sidebar navigation (line 230)**

Current:
```tsx
<nav className="flex-1 p-4 space-y-1 overflow-y-auto">
```

Updated:
```tsx
<nav className="flex-1 px-4 pt-6 pb-4 space-y-1 overflow-y-auto">
```

This changes `p-4` (16px all around) to `px-4 pt-6 pb-4`:
- Horizontal padding: 16px (unchanged)
- Top padding: 24px (increased from 16px) - creates clear separation from header
- Bottom padding: 16px (unchanged)

The extra 8px of top padding creates visual breathing room so the Dashboard button doesn't feel cramped against the header's business name zone.

---

### Visual Before/After

```text
BEFORE:                              AFTER:
+------------------------+           +------------------------+
| [Logo] Business Name   |           | [Logo] Business Name   |
+------------------------+           +------------------------+
| [Dashboard] ←too close |           |                        | ← breathing room
| [Inbox]                |           | [Dashboard]            |
| [Calls]                |           | [Inbox]                |
                                     | [Calls]                |
```

---

### Files to Modify

| File | Change |
|------|--------|
| `src/components/layouts/AppLayout.tsx` | Change sidebar nav padding from `p-4` to `px-4 pt-6 pb-4` |

---

### Technical Notes

- This is a minimal CSS-only change with no functional impact
- The change only affects desktop sidebar (hidden on mobile via `hidden md:flex`)
- Mobile bottom nav is unaffected
- The additional 8px (0.5rem) top padding creates clear visual hierarchy without wasting significant screen space

---

### Also Required: Fix Build Errors

There are several blocking build errors that need to be fixed for the app to work. These should be addressed as a separate concern:

1. **OnboardingPage.tsx (line 472)**: `businessIdentity` undefined → should be `industrySlug`
2. **BusynessRulesEditor.tsx / PricingRulesEditor.tsx**: Reference columns (`busyness_rules_jsonb`, `pricing_rules_jsonb`) that don't exist in the database schema yet
3. **IntentRulesManager.tsx / RequiredQuestionsEditor.tsx / useIntentRules.ts**: `required_inputs` rule type not in database enum

These errors are unrelated to the sidebar overlap issue but need database migrations to resolve.
