

# Add "Sales" to Admin Mode Selector

## Problem
The admin mode switcher only shows 5 modes (Service, Dispatch, Food, Medical, General) but is missing the "Sales" mode that exists throughout the rest of the platform.

## Fix
One small change to `src/components/admin/AdminModeSelector.tsx` — add the Sales entry to the `MODES` array:

```typescript
{ value: "sales", label: "Sales", icon: DollarSign }
```

This requires importing `DollarSign` from lucide-react (already used elsewhere in the project like `BusinessModeSelector.tsx`).

## Files to Change
- **`src/components/admin/AdminModeSelector.tsx`** — Add Sales mode with DollarSign icon to the MODES array

No database or backend changes needed. The `BusinessMode` type already includes `"sales"`.

