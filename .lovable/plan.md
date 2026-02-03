

# Business Brain Dispatch & Service Overhaul

## Executive Summary

This plan redesigns the Business Brain for dispatch-based businesses (towing, HVAC, plumbing, locksmith, etc.) to make service setup, pricing rules, ETA configuration, and navigation intuitive and scalable. The core insight: dispatch services have **variable pricing based on real-world factors** (distance, vehicle type, urgency), which the current flat-service model doesn't support.

---

## Current State Analysis

| Area | Current State | Problem |
|------|---------------|---------|
| **Services** | Flat list with fixed/starting_at/quote-only pricing | No support for distance ranges, vehicle types, or conditional logic |
| **Pricing Rules** | Generic surcharge/discount/fee modifiers | Disconnected from service context; no inline examples |
| **ETA Configuration** | 4 separate fields (base, per-mile, min, max) | Confusing; no single "response time" concept |
| **Service Catalog UI** | 2-column card grid | Doesn't scale to 50+ services; no grouping or search |
| **Navigation** | Dual sidebars (main nav + Business Brain tabs) | Cramped workspace; Business Brain feels buried |

---

## Phase 1: Industry-Aware Dispatch Service Builder

### 1.1 New Data Model: Service Pricing Tiers

Extend the `services` table schema via `pricing_config_json` to support complex dispatch pricing:

```typescript
interface DispatchPricingConfig {
  pricing_model: "flat" | "distance_tiered" | "variable";
  
  // For distance-tiered (towing, delivery)
  distance_tiers?: Array<{
    min_miles: number;
    max_miles: number | null; // null = unlimited
    base_price: number;
    per_mile_price?: number;
  }>;
  
  // For variable pricing
  variables?: Array<{
    key: string; // "vehicle_type" | "fuel_type" | "urgency"
    modifiers: Array<{
      value: string; // "sedan" | "SUV" | "truck"
      price_adjustment: number; // +50 for SUV, +100 for truck
      adjustment_type: "fixed" | "percent";
    }>;
  }>;
  
  // Common fields
  min_price?: number;
  max_price?: number;
  destination_rules?: Array<{
    type: "customer_choice" | "nearest_shop" | "home";
    price_adjustment?: number;
  }>;
}
```

**Example for "Local Tow":**
```json
{
  "pricing_model": "distance_tiered",
  "distance_tiers": [
    { "min_miles": 0, "max_miles": 10, "base_price": 125, "per_mile_price": 0 },
    { "min_miles": 10, "max_miles": 25, "base_price": 125, "per_mile_price": 5 },
    { "min_miles": 25, "max_miles": null, "base_price": 200, "per_mile_price": 4 }
  ],
  "variables": [
    {
      "key": "vehicle_type",
      "modifiers": [
        { "value": "motorcycle", "price_adjustment": -25, "adjustment_type": "fixed" },
        { "value": "suv", "price_adjustment": 25, "adjustment_type": "fixed" },
        { "value": "truck", "price_adjustment": 50, "adjustment_type": "fixed" }
      ]
    }
  ],
  "min_price": 85
}
```

### 1.2 New Component: DispatchServiceEditor

Create a specialized service editor that replaces the generic `ServiceCatalogEditor` when `business_mode === "dispatch"`:

```
src/components/brain/DispatchServiceEditor.tsx
```

**UI Features:**

1. **Service Type Presets** - Quick-start templates for common dispatch services:
   - Tow (Local) / Tow (Long Distance)
   - Jump Start
   - Lockout
   - Tire Change
   - Fuel Delivery
   - Winch Out

2. **Step-by-Step Pricing Wizard**:
   - Step 1: "What's your base price for this service?"
   - Step 2: "Does price change based on distance?"
     - If yes: "What's included in your base price? (e.g., first 10 miles)"
     - "What do you charge per mile after that?"
   - Step 3: "Does vehicle type affect pricing?"
     - Show +/- adjustments by vehicle type
   - Step 4: Review with plain English summary

3. **Live AI Preview Panel**:
   ```
   "A local tow within 10 miles is $125. 
    After 10 miles, it's $5 per mile. 
    For trucks or SUVs, add $25-50."
   ```

### 1.3 Database Migration

```sql
ALTER TABLE services 
ADD COLUMN pricing_config_json JSONB DEFAULT NULL,
ADD COLUMN service_category TEXT DEFAULT NULL,
ADD COLUMN service_type TEXT DEFAULT NULL; -- "tow", "roadside", "recovery", etc.
```

---

## Phase 2: Industry-Aware Pricing Rules UX

### 2.1 Contextual Inline Explanations

Update `PricingRulesEditor.tsx` to show mode-specific examples and guidance:

```typescript
const PRICING_EXAMPLES: Record<BusinessMode, Array<{ rule: string; explanation: string }>> = {
  dispatch: [
    { rule: "After-Hours Surcharge", explanation: "Add $25 for calls after 6PM" },
    { rule: "Highway Mileage Rate", explanation: "Interstate miles at $3/mile vs $5/mile local" },
    { rule: "Heavy Vehicle Fee", explanation: "Trucks and RVs add 25% to base price" },
  ],
  food: [
    { rule: "Delivery Fee", explanation: "Add $5 for orders under $25" },
    { rule: "Catering Discount", explanation: "10% off orders over $200" },
  ],
  // ... other modes
};
```

### 2.2 Rule Priority Visualization

Show a "waterfall" view explaining which rules apply when:

```
text
     IF distance > 25 miles:      Highway Rate applies ($3/mi)
ELSE IF distance > 10 miles:      Standard Rate applies ($5/mi)
ELSE:                            Included in base price
     
     THEN IF vehicle = truck:     +$50 heavy vehicle
     THEN IF time is after 6PM:   +$25 after-hours
```

### 2.3 Rule Conflict Detection

Warn when rules overlap:
- "Weekend Surcharge" and "After-Hours Fee" both applying to Saturday 8PM
- Suggest: "Combine into 'Weekend Evening' rule?"

---

## Phase 3: Simplified ETA Configuration

### 3.1 New Mental Model: Response Time + Travel Time

Replace the 4-field technical setup with a 2-concept model that matches how business owners think:

| Concept | What It Means | Current Field Mapping |
|---------|---------------|----------------------|
| **Response Time** | "How long until your driver leaves the shop?" | `eta_base_minutes` |
| **Travel Time** | "Calculated automatically from Mapbox" | Computed via `distance_eta.ts` |

### 3.2 Redesigned ETA Section

```
src/components/business-brain/DispatchEtaSection.tsx
```

**UI Layout:**

```
text
     AVERAGE RESPONSE TIME
     How long does it typically take to dispatch a driver?
     
     [====30 mins====] slider (5-120 min range)
     
     "When someone calls, the AI will add travel time to this number."
     
     
     EXAMPLE ETA CALCULATION
     
     Customer in Oakville (12 miles away):
     - Your response time:     30 min
     - Travel time:            18 min (via Mapbox)
     - Quoted ETA:            "About 45-50 minutes"
     
     
     ADVANCED OPTIONS (collapsed by default)
     
     [ ] Round up to nearest:  [5 min ▼]
     [ ] Minimum ETA:          [15 min]
     [ ] Maximum ETA:          [90 min] (say "over an hour" after this)
```

### 3.3 AI Voice Script Integration

Show what the AI will actually say:

```
"We can have a driver to you in approximately 45 to 50 minutes."
```

Not:
```
"Your ETA is calculated as base_minutes plus per_mile_minutes times..."
```

---

## Phase 4: Scalable Service Catalog Layout

### 4.1 Category-Based Service Organization

Replace the flat grid with a collapsible category structure:

```
text
     TOWING SERVICES (4)                               [+ Add]
     Local Tow          $125 base + $5/mi     [Edit] [Duplicate] [...]
     Long Distance      Quote only            [Edit] [Duplicate] [...]
     Motorcycle Tow     $85 flat              [Edit] [Duplicate] [...]
     Heavy Duty         $250 base + $8/mi     [Edit] [Duplicate] [...]
     
     ROADSIDE SERVICES (5)                             [+ Add]
     Jump Start         $65 flat              [Edit] [Duplicate] [...]
     Tire Change        $85 flat              [Edit] [Duplicate] [...]
     Fuel Delivery      $55 + fuel cost       [Edit] [Duplicate] [...]
     Lockout            $75 flat              [Edit] [Duplicate] [...]
     Winch Out          $100+ (quote)         [Edit] [Duplicate] [...]
     
     ADD-ONS (2)                                       [+ Add]
     Wait Time          $1/min after 15min    [Edit] [Duplicate] [...]
     Storage            $45/day               [Edit] [Duplicate] [...]
```

### 4.2 Quick Actions

- **Duplicate**: Copy a service with "-Copy" suffix for fast creation
- **Bulk Edit**: Select multiple services to change pricing/status together
- **Search/Filter**: Type to filter services by name, category, or price

### 4.3 Implementation

```
src/components/brain/dispatch/
  DispatchServiceCatalog.tsx   -- Category-based layout
  ServiceCategoryCard.tsx      -- Collapsible category section
  ServiceRowItem.tsx           -- Compact service row with actions
  QuickDuplicateDialog.tsx     -- Fast duplication flow
  BulkEditPanel.tsx            -- Multi-select editing
```

---

## Phase 5: Navigation & Screen Real Estate

### 5.1 Auto-Collapse Main Sidebar in Business Brain

Modify `AppLayout.tsx` to auto-collapse the main sidebar when navigating to `/app/business-brain`:

```typescript
// In AppLayout.tsx
useEffect(() => {
  const isBusinessBrain = location.pathname === "/app/business-brain";
  if (isBusinessBrain && !sidebarCollapsed) {
    setSidebarCollapsed(true);
  }
}, [location.pathname]);
```

### 5.2 Compact Business Brain Tab Navigation

Replace the current 264px wide sidebar with a more compact design:

**Option A: Icon-Only Tab Bar (Top)**
```
text
[Profile] [Hours] [Services] [Area] [Availability] [Policies] [AI] [Knowledge]
     
(Icons with tooltips, selected tab shows label)
```

**Option B: Floating Tab Pills**
```
text
Profile & Identity | Operating Hours | Services & Menu | Service Area & ETA | ...
```

### 5.3 Focus Mode Toggle

Add a "Focus Mode" button in Business Brain header that:
- Hides main sidebar completely
- Maximizes content area
- Persists via localStorage
- Toggle back with Escape or button

---

## Implementation Phases

### Phase 1: Foundation (Week 1-2)

| Task | Files |
|------|-------|
| Add `pricing_config_json`, `service_category`, `service_type` to services table | Migration |
| Create `DispatchServiceEditor.tsx` with step-by-step wizard | New component |
| Add dispatch service presets (tow, jump start, lockout, etc.) | Template data |
| Update `BusinessBrainPage.tsx` to use dispatch editor when mode=dispatch | Conditional render |

### Phase 2: Pricing UX (Week 2-3)

| Task | Files |
|------|-------|
| Add mode-specific examples to `PricingRulesEditor.tsx` | Enhance existing |
| Add rule priority visualization component | New component |
| Add rule conflict detection logic | New utility |
| Update terminology for dispatch (rules = "pricing tiers") | `terminology.ts` |

### Phase 3: ETA Simplification (Week 3)

| Task | Files |
|------|-------|
| Create `DispatchEtaSection.tsx` with slider-based response time | New component |
| Add live example calculation with mock distance | New component |
| Add AI preview showing spoken ETA format | Integration |
| Collapse advanced options by default | UI refinement |

### Phase 4: Scalable Catalog (Week 4)

| Task | Files |
|------|-------|
| Create category-based `DispatchServiceCatalog.tsx` | New component |
| Add search/filter functionality | Integration |
| Add duplicate and bulk edit actions | New components |
| Add collapsible category headers | UI refinement |

### Phase 5: Navigation (Week 4-5)

| Task | Files |
|------|-------|
| Auto-collapse sidebar on Business Brain entry | `AppLayout.tsx` |
| Add Focus Mode toggle | `BusinessBrainPage.tsx` |
| Compact tab navigation option | `BusinessBrainPage.tsx` |

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/components/brain/dispatch/DispatchServiceEditor.tsx` | Step-by-step service wizard for dispatch |
| `src/components/brain/dispatch/DispatchServiceCatalog.tsx` | Category-based service list |
| `src/components/brain/dispatch/ServiceCategoryCard.tsx` | Collapsible category section |
| `src/components/brain/dispatch/ServiceRowItem.tsx` | Compact service row |
| `src/components/brain/dispatch/PricingTierBuilder.tsx` | Distance-tiered pricing UI |
| `src/components/brain/dispatch/VariableModifierEditor.tsx` | Vehicle type/urgency modifiers |
| `src/components/business-brain/DispatchEtaSection.tsx` | Simplified ETA config |
| `src/lib/dispatchPricing.ts` | Pricing calculation utilities |
| `src/hooks/useDispatchServices.ts` | Dispatch-specific service queries |

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/app/BusinessBrainPage.tsx` | Conditional render for dispatch mode; focus mode toggle |
| `src/components/layouts/AppLayout.tsx` | Auto-collapse sidebar for Business Brain |
| `src/components/knowledge/PricingRulesEditor.tsx` | Mode-specific examples and guidance |
| `src/components/business-brain/DistanceEtaSection.tsx` | Redirect to simplified version for dispatch |
| `src/lib/terminology.ts` | Add dispatch-specific pricing terminology |
| `src/lib/quoteEngine/rulesApply.ts` | Support new pricing_config_json structure |

---

## AI Preview Examples (By Mode)

### Dispatch/Towing

```
"A local tow within 10 miles is $125. After that, it's $5 per mile. 
 For trucks or large SUVs, there's an additional $25-50 depending on size.
 I can give you an exact quote once I have your pickup and drop-off locations."
```

### Service/Detailing

```
"Our full detail starts at $250 for sedans. 
 SUVs and trucks start at $300.
 That includes interior and exterior cleaning, plus a protective wax."
```

### Food/Restaurant

```
"We offer delivery within 5 miles for a $5 fee.
 Orders over $40 qualify for free delivery."
```

---

## Success Metrics

1. **Time to Configure Service**: < 3 minutes for a new dispatch service with tiered pricing
2. **ETA Accuracy**: Owner-reported satisfaction with quoted vs actual arrival times
3. **Scalability**: Catalog remains usable with 100+ services (search, categories)
4. **Screen Real Estate**: Business Brain content area expands by 40%+ in focus mode

---

## Technical Notes

- All new components follow existing patterns (React Query, shadcn/ui, Tailwind)
- Database changes use JSONB to avoid schema migrations for future pricing models
- Backward compatible: existing services with flat pricing continue to work
- Quote engine (`rulesApply.ts`) will be extended to support new `pricing_config_json`

