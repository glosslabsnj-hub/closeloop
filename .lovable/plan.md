

# Deep Dashboard & Onboarding Audit

## Executive Summary

After conducting a thorough audit of the entire onboarding-to-dashboard flow across all five business modes (Service, Dispatch, Food, Medical, General), I found that **the architecture is fundamentally sound** but there are **several gaps and inconsistencies** that could cause confusion for specific business types.

---

## Current Architecture Overview

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                           ONBOARDING FLOW                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│  Step 1: Business Mode Selection (service/dispatch/food/medical/general)    │
│  Step 2: Industry Selection (100+ industries with pre-configured templates) │
│  Step 3: Module Selection (capabilities based on mode)                       │
│  Step 4: Business Basics (name, hours, timezone, address)                    │
│  Step 5: Offerings (services OR menu OR dispatch services)                   │
│  Step 6: Policies & FAQs                                                     │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           DASHBOARD EXPERIENCE                               │
├─────────────────────────────────────────────────────────────────────────────┤
│  • LiveDashboard: Main view with mode-aware widgets                          │
│  • SetupWizard: Pre-live 3-step checklist (Phone → AI → Go Live)            │
│  • SetupProgressChecklist: 6-step checklist on dashboard                     │
│  • MetricsGrid: Mode-aware metrics (Orders vs Bookings vs Jobs)             │
│  • Navigation: Capability-driven nav items                                   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## What's Working Well

### 1. Industry → Mode → Capabilities Pipeline
- Industry selection automatically sets `business_mode` and `enabled_modules`
- `useCapabilities()` hook correctly resolves flags from `capabilities_json`
- `useTerminology()` hook provides mode-aware labels (booking/job/order/appointment)
- Navigation adapts based on capabilities (shows Dispatch Queue for dispatch, Orders for food, etc.)

### 2. Dashboard Widget Visibility
- `LeadRecoveryWidget` hidden for dispatch (correct - urgent leads don't wait)
- `BusynessSlider` shown only for ETA-relevant businesses (dispatch, food, same-day service)
- `MetricsGrid` shows mode-appropriate metrics (Jobs Pending vs Orders Today vs Bookings)

### 3. AI Readiness System
- Server-side RPC (`get_ai_readiness`) computes mode-aware score
- P0/P1 flags are mode-specific (e.g., `no_menu_items` for food, `missing_pickup_intake` for dispatch)
- Issue mapping routes users to correct Business Brain sections

---

## Issues Found

### Issue 1: SetupProgressChecklist is Too Generic
**Problem**: The 6-step checklist in `SetupProgressChecklist.tsx` is hardcoded and doesn't adapt to business mode:
- Shows "Add your services" for Food businesses (should be "Add your menu")
- Shows "Connect Phone → Test AI → Go Live" for all modes (dispatch may need different steps)
- Calendar connection step shows for dispatch/food even though it's marked as auto-complete

**Impact**: Food business owners see "Add your services" instead of "Add your menu items"

### Issue 2: Missing Mode-Specific Onboarding Guidance for Food
**Problem**: Food mode in Step 5 shows `FoodSetupEditor` but doesn't include:
- Menu item upload/entry (only shows ordering settings like delivery radius)
- Menu knowledge configuration
- Menu Center CTA or explanation

**Impact**: Food businesses complete onboarding without any actual menu items, then hit P0 blockers

### Issue 3: Dispatch Mode Missing Impound Lot Setup
**Problem**: Towing/dispatch businesses with `impound_lot` capability don't have:
- Impound lot address entry in onboarding
- Impound fee configuration in onboarding
- Impound-specific checklist items on dashboard

**Impact**: Towing businesses complete setup but can't answer impound-related calls until they manually find these settings

### Issue 4: Medical Mode Missing HIPAA Acknowledgment
**Problem**: Medical onboarding auto-enables HIPAA mode but:
- No explicit acknowledgment or consent during onboarding
- No explanation of what HIPAA mode means (no recordings, no transcripts)
- `hipaa_mode` flag set silently

**Impact**: Potential compliance concern; medical users should understand what they're enabling

### Issue 5: ROIPerformanceWidget Empty State Steps Not Mode-Aware
**Problem**: `ROIPerformanceWidget` has an empty state with 3 steps but these come from a hook that may not be mode-aware. If a food business has no orders, the messaging might not match their mental model.

### Issue 6: NeedsAttentionBanner Uses Generic Labels
**Problem**: The attention banner shows "new order" for food but uses `terms.pendingBooking` for bookings - this is working. However, knowledge gaps show generically as "knowledge gaps" regardless of mode.

---

## Recommended Fixes

### Fix 1: Make SetupProgressChecklist Mode-Aware
Update `SetupProgressChecklist.tsx` to:
- Use `useTerminology()` for the "Add your services/menu" step label
- Conditionally skip or auto-complete calendar step for dispatch/food
- Show impound-specific step for businesses with `hasImpoundLot`
- Show different step order for dispatch (Address → Services → ETA Rules → Test → Go Live)

### Fix 2: Add Menu Entry to Food Onboarding
In Step 5 for food mode:
- After `FoodSetupEditor`, add a section for quick menu item entry
- Allow uploading menu PDF or CSV
- Or link to Menu Center with "You can add menu items now or after setup"

### Fix 3: Add Impound Configuration to Dispatch Onboarding
For industries with `impound_lot` capability:
- Add impound lot address field to business basics
- Add impound fee configuration (daily rate, release fee)
- Show in setup checklist: "Configure impound lot"

### Fix 4: Add HIPAA Acknowledgment for Medical
In Step 3 (Modules) or Step 6 (Policies) for medical mode:
- Show explicit HIPAA mode callout with checkbox
- Explain: "For patient privacy, call recordings and full transcripts are disabled"
- Require acknowledgment before proceeding

### Fix 5: Mode-Aware ROI Empty State
Update `useROIDashboard` hook to return mode-specific:
- Steps (e.g., "Add menu items → Accept orders → See revenue" for food)
- Encouragement text
- Entity names

### Fix 6: Enhance SetupWizard with Mode Context
The current 3-step wizard (Phone → AI → Go Live) is fine but could benefit from:
- Mode-specific tips in each step
- Different readiness thresholds by mode (dispatch might need less FAQ coverage)

---

## Technical Implementation Plan

### Phase 1: Quick Wins (Low Risk)

#### 1.1 Update SetupProgressChecklist to use terminology
```typescript
// In SetupProgressChecklist.tsx
const terms = useTerminology();

const steps: SetupStep[] = [
  {
    id: "services",
    label: terms.addServicesStep, // "Add your services" or "Add your menu"
    description: terms.addServicesDescription,
    ...
  },
  // ...rest
];
```

#### 1.2 Add capability checks for calendar step
```typescript
// Skip calendar step for dispatch/food businesses
const skipCalendarStep = caps.isDispatchBusiness || caps.isFoodBusiness;
```

### Phase 2: Mode-Specific Onboarding Enhancements

#### 2.1 Food Mode: Add menu section to Step 5
Create a `MenuQuickAdd` component that allows:
- Adding 3-5 sample menu items inline
- Or uploading a menu file
- "Skip for now - I'll add menu items later" option

#### 2.2 Dispatch Mode: Add impound config for towing industries
In `OnboardingPage.tsx` Step 4:
- Check if `caps.hasImpoundLot` or industry is towing-related
- Show impound lot address and fee fields
- Save to `tenants.impound_lot_address` and `tenants.impound_fees_json`

#### 2.3 Medical Mode: Add HIPAA acknowledgment
In Step 3 (ModuleSelector) or Step 6:
- Show HIPAA warning card with checkbox
- Store acknowledgment timestamp: `hipaa_acknowledged_at`

### Phase 3: Dashboard Polish

#### 3.1 Update ROI widget empty state
Add `businessMode` awareness to `useROIDashboard`:
- Food: "Add menu → Take orders → Track revenue"
- Dispatch: "Add services → Complete jobs → Track earnings"
- Medical: "Add services → Book patients → Track revenue"

#### 3.2 Add mode-specific checklist items
For dispatch with impound: "Configure impound lot fees"
For food: "Upload your menu"
For medical: "Set up patient intake forms"

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/dashboard/SetupProgressChecklist.tsx` | Use terminology, add capability checks |
| `src/pages/app/OnboardingPage.tsx` | Add food menu section, impound config, HIPAA ack |
| `src/components/onboarding/FoodSetupEditor.tsx` | Add menu quick-add section |
| `src/components/onboarding/DispatchSetupEditor.tsx` | Add impound lot fields |
| `src/components/onboarding/MedicalSetupEditor.tsx` | Add HIPAA acknowledgment |
| `src/hooks/useROIDashboard.ts` | Add mode-aware empty state content |

---

## Priority Order

1. **High Priority**: SetupProgressChecklist terminology fix (affects all users)
2. **High Priority**: Food mode menu entry in onboarding (P0 blocker prevention)
3. **Medium Priority**: Dispatch impound lot configuration
4. **Medium Priority**: Medical HIPAA acknowledgment
5. **Low Priority**: ROI widget mode-aware empty states

---

## Validation Approach

After implementation, test each business type end-to-end:

1. **Service (Salon)**: Onboard → Dashboard shows bookings, calendar step visible
2. **Dispatch (Towing)**: Onboard → Dashboard shows jobs, impound config accessible
3. **Food (Restaurant)**: Onboard → Menu entry available, dashboard shows orders
4. **Medical (MedSpa)**: Onboard → HIPAA acknowledged, dashboard shows appointments
5. **General (Consulting)**: Onboard → Generic flow, callback-focused dashboard

