
# Fix Plan: Add `required_inputs` to Database Enum

## Problem Summary
The "Policies & Rules" section shows "Failed to load configurations" because the `RequiredQuestionsEditor` component queries for `rule_type = 'required_inputs'`, but the database enum `intent_rule_type` doesn't include this value.

**Current valid enum values:**
- time_preference
- upsell_rule  
- discount_guardrail
- urgency_handling
- capacity_protection

**Missing value:** `required_inputs`

---

## Solution

### Step 1: Database Migration
Add `required_inputs` to the `intent_rule_type` enum.

```sql
ALTER TYPE intent_rule_type ADD VALUE IF NOT EXISTS 'required_inputs';
```

**Note:** PostgreSQL enum additions are safe — they append to the existing list without affecting existing data.

---

## What This Fixes
- The "Failed to load configurations" error will disappear
- The Required Questions editor will load properly
- Users will be able to configure what questions the AI must ask for each intent type (booking, dispatch, order, etc.)

---

## No Code Changes Required
The frontend code is already correct — it just needs the database to support the `required_inputs` enum value.

---

## Bonus: Fix TypeScript Build Errors
There are also some TypeScript build errors in the codebase that are unrelated to this issue but should be fixed:

1. **`usePricingRules.ts`** - Type casting needs `unknown` intermediate step
2. **`useServiceArea.ts`** - Type casting needs `unknown` intermediate step  
3. **`writeBrainFact.ts`** - Type casting needs `unknown` intermediate step
4. **`templateApplication.ts`** - Missing required fields and invalid enum value

These are separate issues but can be fixed in the same update if desired.

---

## Summary

| Item | Action |
|------|--------|
| Database | Add `required_inputs` to `intent_rule_type` enum |
| Frontend | No changes needed |
| Result | Required Questions editor works properly |
