

# Fix: AI Agent Not Using Callback-Only Mode

## The Problem

When calling Smiles Auto Works, the AI tries to check availability and book appointments instead of just collecting information and creating a callback. This happens because the "callback-only" signal never reaches the AI agent.

## Root Cause

The system has all the right pieces but they're not connected:

- Smiles Auto Works has `callbackOnly: true` in its settings (set during onboarding)
- The AI prompt override for callback-only mode exists and is well-written
- The code that builds the AI's instructions looks for a field called `ai_behavior_mode` in the database
- **That field does not exist in the database** -- so it always defaults to "full service" mode
- The `callbackOnly` flag from settings is never checked by the voice system

In short: the AI never knows it should be in callback-only mode.

## The Fix (2 parts)

### Part 1: Add the missing database column

Add `ai_behavior_mode` column to the `assistant_settings` table with a default of `"full_service"`. Then set it to `"callback_only"` for the Smiles Auto Works tenant.

### Part 2: Auto-derive callback-only from capabilities

Update `buildBusinessContext` (the backend function that assembles the AI's instructions) so that even if `ai_behavior_mode` isn't explicitly set, it checks for the `callbackOnly` capability flag and automatically activates callback-only mode. This means:

- Any business onboarded as "callback only" will automatically get the right AI behavior
- No manual database updates needed for future businesses
- The explicit `ai_behavior_mode` column still works as an override

### What Changes

| What | Change |
|------|--------|
| Database | Add `ai_behavior_mode` column to `assistant_settings` |
| Database | Set Smiles Auto Works to `callback_only` |
| buildBusinessContext | Check `capabilities_json.callbackOnly` as fallback when `ai_behavior_mode` is not set |
| Redeploy | Re-deploy affected backend functions |

### Expected Result

After this fix, when someone calls Smiles Auto Works, the AI will:
1. Greet warmly as a real employee
2. Listen to what the caller needs (e.g., turbo replacement)
3. Answer general questions (hours, location, services)
4. Collect their name and confirm phone number
5. Say "I'll have someone call you back about that"
6. Create a callback record -- no booking, no availability checks

## Technical Details

**Migration SQL:**
```sql
ALTER TABLE assistant_settings
  ADD COLUMN IF NOT EXISTS ai_behavior_mode text DEFAULT 'full_service';

UPDATE assistant_settings
  SET ai_behavior_mode = 'callback_only'
  WHERE tenant_id IN (
    SELECT id FROM tenants
    WHERE capabilities_json->>'callbackOnly' = 'true'
  );
```

**buildBusinessContext change (line ~2306):**
```typescript
// Before:
ai_behavior_mode: (assistantSettings?.ai_behavior_mode as ...) || "full_service",

// After: also check capabilities_json for callbackOnly
ai_behavior_mode: (assistantSettings?.ai_behavior_mode as ...) 
  || (tenant?.capabilities_json?.callbackOnly === true ? "callback_only" : "full_service"),
```

**Files modified:**
- `supabase/functions/_shared/buildBusinessContext.ts` -- add capabilities fallback for ai_behavior_mode
- Database migration -- add column + backfill existing callback-only tenants
- Redeploy `build-business-brain`, `register-call`, and related functions

