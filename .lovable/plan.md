

# Fix: Inbound Calls Going to Voicemail

## Problem Summary

When you call your Twilio number, the call fails and goes to voicemail because ElevenLabs is rejecting the request with a **422 error**. Additionally, the menu data and other industry-specific data are not being saved properly.

## Root Causes Identified

### Issue 1: ElevenLabs Rejects Array Data
The edge function sends `enabled_modules` as an array:
```json
"enabled_modules": ["ai_voice","food_orders","menu_knowledge","reservations","catering"]
```

But ElevenLabs **only accepts primitive types** (strings, numbers, booleans) for dynamic_variables. This causes the 422 error.

### Issue 2: Menu Items Not Saving
When you switched to Food mode, the menu items insertion silently failed. The logs show `has_menu_summary: false`. This means:
- The AI has no menu knowledge to work with
- Even if ElevenLabs accepted the call, it wouldn't know the restaurant's menu

### Issue 3: Silent Error Handling
The mode switcher logs errors to the console but doesn't surface them to you:
```typescript
if (error) console.error("Menu items insert error:", error);
// Silently continues...
```

## Solution

### Fix 1: Convert Arrays to Strings for ElevenLabs
In `twilio-inbound/index.ts`, convert the array to a comma-separated string before sending to ElevenLabs.

**Before:**
```typescript
enabled_modules: enabledModules,  // Array - causes 422
```

**After:**
```typescript
enabled_modules: enabledModules.join(","),  // String - "ai_voice,food_orders,..."
```

### Fix 2: Improve Error Handling in Mode Switcher
In `AdminModeSwitcher.tsx`, throw errors instead of just logging them so you see what went wrong:

**Before:**
```typescript
const { error } = await supabase.from("menu_items").insert(menuRecords);
if (error) console.error("Menu items insert error:", error);
```

**After:**
```typescript
const { error } = await supabase.from("menu_items").insert(menuRecords);
if (error) throw new Error(`Menu items: ${error.message}`);
```

### Fix 3: Re-insert Missing Data
After fixing the code, you'll need to switch modes again (toggle away from Food, then back to Food) to properly populate the menu items.

## Technical Details

### Files to Modify

1. **supabase/functions/twilio-inbound/index.ts**
   - Line ~312: Convert `enabled_modules` array to comma-separated string
   - Also convert any other array/object fields to string representations

2. **src/components/admin/AdminModeSwitcher.tsx**
   - Update all insert functions to throw errors on failure instead of silent logging
   - Add toast notifications for partial failures
   - Consider wrapping in a transaction for atomicity

### Testing After Fix

1. Re-deploy the edge function
2. Switch from Food mode to Service mode (clears data)
3. Switch back to Food mode (re-inserts menu items)
4. Call your Twilio number again - the AI should now answer as "Bella Italia Ristorante"

