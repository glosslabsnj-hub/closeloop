
# Fix Industry Template Loading in Onboarding

## Problem Summary
When a user selects "Plumbing" (or any industry) in Step 1 of onboarding, Step 2 still shows the generic "Other" template (with services like "Standard Service", "Premium Service") instead of the industry-specific template (with services like "Drain Cleaning", "Leak Detection", etc.).

**Root Cause**: A state update bug in `BusinessIdentityForm.tsx` where two separate `update()` calls in the same event handler cause the first update (industry change) to be overwritten by the second update (clearing customIndustry).

## Technical Analysis

### Current Flow (Broken)
1. User selects "Plumber" from dropdown
2. `onValueChange` callback fires
3. First call: `update('industry', 'plumber')` → triggers `onChange({...data, industry: 'plumber'})`
4. Second call: `update('customIndustry', '')` → triggers `onChange({...data, customIndustry: ''})` but uses the **old** `data` which still has `industry: 'other'`
5. The second call overwrites the first, leaving `industry: 'other'`
6. Template resolver loads the "other" (generic) template

### Additional Issue: Session Persistence
When a user refreshes during onboarding, all progress is lost because state is only held in React (not persisted). The `selectedIndustry` is stored in `sessionStorage` during signup, but the OnboardingPage never reads it.

## Solution

### 1. Fix State Update Race Condition
**File**: `src/components/onboarding/BusinessIdentityForm.tsx`

Update the `onValueChange` handler to batch both field changes into a single state update:
```typescript
onValueChange={(value) => {
  const newIndustry = value as ExtendedIndustryType;
  // Batch both changes in a single update to prevent race condition
  onChange({ 
    ...data, 
    industry: newIndustry, 
    customIndustry: newIndustry !== "other" ? "" : data.customIndustry 
  });
}}
```

### 2. Load Industry from sessionStorage
**File**: `src/pages/app/OnboardingPage.tsx`

On initial render, check if a `selectedIndustry` was stored during signup (from demo player flow):
```typescript
useEffect(() => {
  const storedIndustry = sessionStorage.getItem("selectedIndustry");
  if (storedIndustry && storedIndustry !== businessIdentity.industry) {
    // Validate it's a real industry key
    if (storedIndustry in industryConfigs) {
      setBusinessIdentity(prev => ({
        ...prev,
        industry: storedIndustry as ExtendedIndustryType
      }));
    }
    // Clear after use
    sessionStorage.removeItem("selectedIndustry");
  }
}, []); // Only on mount
```

### 3. Pass tenantId to ServiceUploader
**File**: `src/pages/app/OnboardingPage.tsx`

The `ServiceUploader` currently has no `tenantId` during onboarding (tenant isn't created yet). This breaks uploads. We need to either:
- Create a "draft" tenant at end of Step 1
- OR defer uploads until after tenant creation
- OR store uploads in sessionStorage/local for later processing

**Recommended approach**: Pass a flag to `ServiceUploader` indicating onboarding mode, and queue uploads for processing after tenant creation.

### 4. Improve Template Loading Logging
**File**: `src/lib/templateResolver.ts`

Add better console logging to help debug:
```typescript
console.log(`[templateResolver] Requested: ${industry}, Found: ${!!config}, Label: ${config?.label || 'NONE'}`);
```

## Files to Modify

| File | Change |
|------|--------|
| `src/components/onboarding/BusinessIdentityForm.tsx` | Fix race condition in industry selection handler |
| `src/pages/app/OnboardingPage.tsx` | Load industry from sessionStorage on mount; improve template loading useEffect |
| `src/lib/templateResolver.ts` | Add defensive logging |
| `src/components/onboarding/ServiceUploader.tsx` | Handle case where tenantId is not yet available (onboarding mode) |

## Validation Checklist

After implementation, verify:
1. Create account → select "Plumbing" in Step 1 → Step 2 shows plumbing services (Drain Cleaning, Leak Detection, etc.)
2. Create account → select "Auto Detailing" in Step 1 → Step 2 shows detailing services (Basic Wash, Interior Detail, etc.)
3. Browser refresh on Step 2 → industry and services are preserved (if persisted to sessionStorage)
4. Upload a pricing sheet in Step 2 → no errors, conflicts appear if differences found
5. Demo player → select an industry → signup → onboarding pre-fills that industry
