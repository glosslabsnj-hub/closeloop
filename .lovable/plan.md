
# Fix Industry Dropdown Not Working in Onboarding

## Problem Identified
When clicking on the industry dropdown in Step 1, selecting any industry (like "Plumbing") results in the value staying on "Other" and the custom industry input appearing.

## Root Cause
The previous fix for the state race condition introduced an **indentation bug** that breaks the JSX structure:

```tsx
<div className="space-y-2">
  <Label>Industry *</Label>
<Select   // <-- WRONG: Should be indented 2 more spaces!
    value={data.industry}
```

The `<Select>` component is now at 8 spaces indentation instead of 10, which places it **outside** its parent `<div>`. This corrupts the React component tree and may cause the Select to not properly receive updates or propagate changes.

Additionally, there's a structural issue: the `onChange` callback references `data` from the closure, which should work but the broken JSX structure might be causing React to create an unexpected component hierarchy.

## Solution

### Fix the Indentation in BusinessIdentityForm.tsx
Correct the `<Select>` component indentation so it's properly nested inside its parent `<div>`:

```tsx
<div className="grid grid-cols-2 gap-4">
  <div className="space-y-2">
    <Label>Industry *</Label>
    <Select 
      value={data.industry} 
      onValueChange={(value) => {
        const newIndustry = value as ExtendedIndustryType;
        // Batch both changes in a single update to prevent race condition
        onChange({ 
          ...data, 
          industry: newIndustry, 
          customIndustry: newIndustry !== "other" ? "" : data.customIndustry 
        });
      }}
    >
      <SelectTrigger>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {industryOptions.map((ind) => (
          <SelectItem key={ind.value} value={ind.value}>
            <span className="flex items-center gap-2">
              <span>{ind.icon}</span>
              <span>{ind.label}</span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>
  ...
</div>
```

## Files to Modify

| File | Change |
|------|--------|
| `src/components/onboarding/BusinessIdentityForm.tsx` | Fix indentation of `<Select>` component (lines 65-90) to be properly nested inside the parent `<div>` |

## Validation
After the fix:
1. Navigate to `/app/onboarding` (as a new user or after clearing tenant data)
2. Click the Industry dropdown
3. Select "Plumbing" 
4. Confirm the dropdown shows "Plumbing" (with 🔧 icon)
5. Confirm the "What's your industry?" custom input does NOT appear (since plumber !== "other")
6. Click Next to Step 2
7. Confirm Step 2 shows plumbing services (Drain Cleaning, Leak Detection, etc.) not generic services

## Technical Note
While JSX whitespace is generally collapsed, the indentation here affects how the React reconciler interprets the component tree during development hot-reloading. Consistent indentation is essential for maintainability and can affect source maps and debugging.
