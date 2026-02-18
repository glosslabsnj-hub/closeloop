# Go Live Checklist System

## 🎯 Overview

The **Go Live Checklist** is a comprehensive gating system that prevents users from activating their AI assistant until all required setup is complete. It uses a **server-side RPC** (`get_ai_readiness`) to compute a readiness score (0-100) and identify blocking issues.

## ✅ What Was Implemented

### **Core Infrastructure** (Already Existed)

1. **`useAIReadinessV2` Hook** (`src/hooks/useAIReadinessV2.ts`)
   - Calls `get_ai_readiness` RPC with tenant ID
   - Returns readiness score (0-100), P0/P1 flags, recommendations with deep links
   - `canGoLive` = score >= 85 AND no P0 flags
   - Caches for 30 seconds

2. **`get_ai_readiness` RPC** (Database Function)
   - Server-side computation based on business_mode
   - Checks tenant data, services, menu_items, policies, hours, FAQs
   - Returns P0 flags (blockers) and P1 flags (recommendations)
   - Each flag maps to a deep link for fixing

3. **`AIReadinessPanel` Component** (`src/components/dashboard/AIReadinessPanel.tsx`)
   - Full version: Shows score, P0/P1 lists with deep links, progress bar
   - Compact version: Banner with score badge and issue count
   - Color-coded by readiness level (green/amber/orange/red)

### **Enhanced/Refactored Components**

4. **`GoLiveChecklist` Component** (`src/components/dashboard/GoLiveChecklist.tsx`) - **REFACTORED**
   - **Before:** Used old `calculateReadinessFromContext` with hardcoded checks
   - **After:** Uses `useAIReadinessV2` hook for RPC-based scoring
   - Shows P0 blockers with deep links
   - Shows P1 recommendations (max 3)
   - Blocks "Go Live Now" button if `canGoLive` is false
   - Uses new `SectionCard` design primitive
   - Premium visual design with color-coded states

5. **`GoLivePage`** (`src/pages/app/GoLivePage.tsx`) - **Already Integrated**
   - Shows full `AIReadinessPanel` at top
   - Blocks subscription button if `!canGoLive`
   - Toast error if user tries to go live with P0 flags
   - Scrolls user to checklist on error

## 📊 How It Works

### **Readiness Scoring**

```typescript
// Server-side RPC computes score based on:
const score = baseScore + bonusPoints - penalties;

// Base requirements (by business mode):
- Business name, timezone, hours: Required
- Service mode: 3+ services with pricing
- Food mode: 10+ menu items with prices, ordering enabled
- Dispatch mode: Service area defined, intake fields
- Medical mode: HIPAA enabled, data retention configured

// Bonus points:
- More services/menu items
- Detailed descriptions
- FAQs (5+)
- Policies configured
- Objection responses

// P0 Flags (Must Fix to Go Live):
- Missing business name
- No services/menu items
- Missing pricing
- Ordering disabled (food mode)
- HIPAA disabled (medical mode)
- Missing critical intake fields

// P1 Flags (Recommended):
- Few FAQs (<5)
- Missing policies
- No objection responses
- Service area not defined
```

### **Data Flow**

```
User Action → Dashboard Loads
     ↓
LiveDashboard.tsx renders
     ↓
<AIReadinessPanel compact /> (banner)
<GoLiveChecklist /> (full card)
     ↓
useAIReadinessV2() hook
     ↓
supabase.rpc("get_ai_readiness", { tenant_uuid })
     ↓
Returns: { score, p0_flags, p1_flags, recommendations }
     ↓
Components render based on data:
  - canGoLive = score >= 85 AND p0_flags.length === 0
  - Button enabled/disabled
  - Issues displayed with deep links
```

### **Deep Links**

Each P0/P1 flag maps to a specific page:

```typescript
const deepLinks = {
  missing_business_name: "/app/settings",
  no_services: "/app/services",
  no_menu_items: "/app/menu-center",
  missing_faqs: "/app/business-brain",
  missing_policies: "/app/settings",
  ordering_disabled: "/app/settings",
  hipaa_disabled: "/app/settings",
  // ... etc
};
```

## 🎨 UI Components

### **1. AIReadinessPanel (Compact) - Dashboard Banner**

**Location:** Top of dashboard (always visible when score < 85 or P0 flags exist)

**Features:**
- Score badge with color coding
- Progress bar (1.5px height)
- P0 issue preview (first 3)
- "Fix Issues" or "Go Live" button

**Visual States:**
- **Ready (85%+, no P0):** Green border, emerald colors
- **Good (70-84%):** Amber border, yellow colors
- **Needs Work (50-69%):** Orange border
- **Critical (<50%):** Red border

```tsx
<AIReadinessPanel compact />
```

### **2. AIReadinessPanel (Full) - Go Live Page**

**Location:** `/app/go-live` (above pricing plans)

**Features:**
- Large score display (4xl font)
- Full P0 list with "Fix Now" buttons
- Full P1 list with "Improve" buttons
- Mode-specific requirements shown
- Progress bar (3px height)

```tsx
<AIReadinessPanel alwaysShow={true} />
```

### **3. GoLiveChecklist - Dashboard Card**

**Location:** Dashboard (only when `!go_live_enabled`)

**Features:**
- Score display (3xl font)
- Progress bar (2px height)
- P0 issues as clickable cards
- P1 recommendations (max 3)
- "Go Live Now" button (disabled if `!canGoLive`)
- Premium visual design with `SectionCard`

**States:**
- **Not Live + P0 Issues:** Red highlights, disabled button
- **Not Live + Ready:** Green highlights, enabled button
- **Live:** Success banner with "View Calls" link

```tsx
<GoLiveChecklist />
```

## 🔒 Blocking Logic

### **GoLivePage Button Block**

```typescript
const { canGoLive, p0Flags } = useAIReadinessV2();
const goLiveBlocked = !canGoLive;

// Button state
<Button
  disabled={goLiveBlocked}
  onClick={handleConfirm}
>
  {goLiveBlocked ? (
    <>
      <AlertTriangle />
      Fix Issues First
    </>
  ) : (
    <>
      Start 7-Day Free Trial
    </>
  )}
</Button>

// Click handler
const handleConfirm = async () => {
  if (goLiveBlocked) {
    toast({
      variant: "destructive",
      title: "Cannot Go Live Yet",
      description: `Please fix ${p0Flags.length} blocking issues first.`,
    });
    return;
  }

  // Proceed with subscription
  await createSubscription(selectedSku);
};
```

### **Dashboard Checklist Block**

```typescript
const { canGoLive, p0Flags } = useAIReadinessV2();

<Button
  disabled={!canGoLive}
  variant={canGoLive ? "default" : "secondary"}
  asChild={canGoLive}
>
  {canGoLive ? (
    <Link to="/app/go-live">
      <Rocket /> Go Live Now
    </Link>
  ) : (
    <>
      <XCircle />
      Fix {p0Flags.length} Issues First
    </>
  )}
</Button>
```

## 📱 Component Usage

### **Dashboard Integration**

```tsx
// src/components/dashboard/LiveDashboard.tsx
export function LiveDashboard() {
  return (
    <div className="space-y-6">
      {/* Compact banner - always shows when needed */}
      <AIReadinessPanel compact />

      {/* Other dashboard content */}
      <DashboardHeroCard />
      <TodaySnapshot />

      {/* Full checklist - only when not live */}
      {!isLive && <GoLiveChecklist />}
    </div>
  );
}
```

### **Go Live Page Integration**

```tsx
// src/pages/app/GoLivePage.tsx
export default function GoLivePage() {
  const { canGoLive, p0Flags } = useAIReadinessV2();
  const goLiveBlocked = !canGoLive;

  return (
    <div>
      {/* Full panel with all P0/P1 details */}
      <AIReadinessPanel alwaysShow={true} />

      {/* Blocking warning */}
      {goLiveBlocked && (
        <Card className="border-destructive">
          <CardContent>
            Finish {p0Flags.length} items to go live
          </CardContent>
        </Card>
      )}

      {/* Pricing plans */}
      <PricingTierSelection />

      {/* Blocked button */}
      <Button disabled={goLiveBlocked}>
        {goLiveBlocked ? "Fix Issues First" : "Start Free Trial"}
      </Button>
    </div>
  );
}
```

## 🎨 Visual Design

### **Color Coding**

```typescript
// Score-based colors
const getScoreColor = (score: number) => {
  if (score >= 85) return "text-emerald-500";    // Ready
  if (score >= 70) return "text-amber-500";      // Good
  if (score >= 50) return "text-orange-500";     // Needs work
  return "text-rose-500";                        // Critical
};

// P0 vs P1 visual treatment
const p0Style = "bg-rose-500/5 border-rose-500/20"; // Red/destructive
const p1Style = "bg-amber-500/5 border-amber-500/20"; // Amber/warning
```

### **Typography**

```typescript
// Score display
<div className="text-4xl font-bold text-emerald-500">85%</div>

// Section headers
<h4 className="font-medium text-rose-600">Must Fix (3)</h4>

// Issue labels
<span className="text-sm font-medium">Missing business name</span>
```

### **Interactive States**

```typescript
// Clickable issue cards
className="
  p-3 rounded-lg
  bg-rose-500/5 border border-rose-500/20
  hover:bg-rose-500/10
  transition-colors
  group
"

// Hover chevron
<ChevronRight className="
  text-muted-foreground
  group-hover:text-foreground
" />
```

## 🔄 Data Sources

### **No New Tables Required**

All data is derived from **existing tables**:

```sql
-- Checked by get_ai_readiness RPC:
SELECT * FROM tenants WHERE id = tenant_uuid;
SELECT * FROM services WHERE tenant_id = tenant_uuid;
SELECT * FROM menu_items WHERE tenant_id = tenant_uuid;
SELECT * FROM business_faqs WHERE tenant_id = tenant_uuid;
SELECT * FROM objection_responses WHERE tenant_id = tenant_uuid;
SELECT * FROM assistant_settings WHERE tenant_id = tenant_uuid;

-- Fields checked in tenants:
- name (P0 if null)
- timezone (P0 if null)
- hours_json (P0 if null/empty)
- business_mode
- cancellation_policy
- deposit_policy
- refund_policy
```

### **Mode-Specific Checks**

```typescript
// Service Mode
if (business_mode === "service") {
  // P0: Must have 3+ services with pricing
  const serviceCount = await getServiceCount(tenant_id);
  if (serviceCount < 3) p0Flags.push("few_services");

  // P0: Services must have prices
  const missingPrices = await getServicesWithoutPricing(tenant_id);
  if (missingPrices > 0) p0Flags.push("missing_pricing");
}

// Food Mode
if (business_mode === "food") {
  // P0: Must have 10+ menu items
  const menuCount = await getMenuItemCount(tenant_id);
  if (menuCount < 10) p0Flags.push("few_menu_items");

  // P0: Ordering must be enabled
  const orderingEnabled = await checkOrderingEnabled(tenant_id);
  if (!orderingEnabled) p0Flags.push("ordering_disabled");
}

// Medical Mode
if (business_mode === "medical") {
  // P0: HIPAA mode must be enabled
  const hipaaEnabled = await checkHipaaMode(tenant_id);
  if (!hipaaEnabled) p0Flags.push("hipaa_disabled");
}
```

## 📊 Example Flows

### **New User (Score: 30%)**

1. User completes onboarding
2. Dashboard shows:
   - `AIReadinessPanel` compact banner: "30% readiness, need 85% to go live"
   - `GoLiveChecklist`: Shows 5 P0 issues
   - Button: "Fix 5 Issues First" (disabled)
3. User clicks issue → Deep link to fix page
4. After fixing → Score updates to 60%
5. After fixing all P0 → Score 85%+, button enabled
6. User goes to `/app/go-live` → Can activate subscription

### **User Tries to Go Live Early**

1. User navigates to `/app/go-live`
2. `AIReadinessPanel` shows P0 list at top
3. User selects plan
4. Clicks "Start Free Trial"
5. Button is **disabled** (gray, not clickable)
6. Hover tooltip: "Fix issues above first"
7. Toast appears: "Cannot Go Live Yet - Fix 3 blocking issues"
8. User fixes issues → Button becomes enabled

### **User Ready to Go Live (Score: 90%)**

1. Dashboard shows:
   - `AIReadinessPanel` banner: "90% readiness - Ready to go live!"
   - `GoLiveChecklist`: Green badge "Ready"
   - Button: "Go Live Now" (enabled, green)
2. User clicks "Go Live Now"
3. Redirected to `/app/go-live`
4. `AIReadinessPanel` shows: "All requirements met!"
5. User selects plan and confirms
6. Subscription created successfully
7. Dashboard updates: "You're Live!" banner

## 🎯 Success Criteria

- ✅ **No hardcoded checks** - All logic in RPC
- ✅ **No new tables** - Uses existing tenant data
- ✅ **Deep links work** - Each issue navigates to fix page
- ✅ **Go Live blocked** - Button disabled until `canGoLive`
- ✅ **Visual feedback** - Color-coded by severity
- ✅ **Mode-specific** - Different checks per business_mode
- ✅ **Real-time updates** - 30s cache, refetch on focus
- ✅ **Premium UI** - Uses new design system primitives

## 📚 Files Modified

1. **`src/components/dashboard/GoLiveChecklist.tsx`**
   - Refactored to use `useAIReadinessV2` hook
   - Added `SectionCard` design primitive
   - Enhanced visual design with color coding
   - Shows P0/P1 issues with deep links
   - Blocks button when `!canGoLive`

**Files Already Using V2 System:**
- `src/hooks/useAIReadinessV2.ts` (hook)
- `src/components/dashboard/AIReadinessPanel.tsx` (panel component)
- `src/pages/app/GoLivePage.tsx` (go live page)
- `src/components/dashboard/LiveDashboard.tsx` (dashboard integration)

## 🚀 Next Steps (Optional Enhancements)

1. **Add more deep links** for specific issues
2. **Email notifications** when readiness hits 85%
3. **Progress tracking** over time (readiness history)
4. **A/B test messaging** for better conversion
5. **Guided tours** from checklist items to fix pages
6. **Bulk actions** to fix multiple issues at once

## 🎨 Design System Integration

The refactored `GoLiveChecklist` now uses our new **design system primitives**:

- **`SectionCard`** - Consistent card wrapper with variants
- **Color-coded states** - Emerald (ready), amber (recommended), rose (blocker)
- **Typography scale** - Consistent font sizes and weights
- **Interactive states** - Hover effects, transitions
- **Responsive layout** - Mobile-first flex patterns
- **Premium animations** - Smooth transitions, fade-ins

This ensures **visual consistency** across the entire app while maintaining the powerful **RPC-based blocking logic**.
