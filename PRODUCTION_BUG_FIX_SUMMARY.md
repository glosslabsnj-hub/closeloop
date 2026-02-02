# Production Bug Fix Summary

## Root Causes Identified

### PROBLEM 1: Business Brain Sections Show "failed to load"

**Schedule & Availability Section:**
- **Component:** `BusynessRulesEditor.tsx`
- **Root Cause:** Queries `tenants.busyness_rules_jsonb` column which doesn't exist in production DB
- **Error:** Supabase SELECT fails, component catches error and shows loading state but data never appears

**Services & Pricing Section:**
- **Component:** `PricingRulesEditor.tsx`
- **Root Cause:** Queries `tenants.pricing_rules_jsonb` column which doesn't exist in production DB
- **Error:** Supabase SELECT fails, component catches error and shows loading state but data never appears

**Policies & Rules Section:**
- **Component:** `AIBusinessPolicies.tsx`
- **Root Cause:** Queries `tenants.ai_policies_json` column which doesn't exist in production DB
- **Error:** Supabase SELECT fails, falls back to default policies but may show loading issues

### PROBLEM 2: Busyness Slider Save Failing

**Dashboard Busyness Slider:**
- **Component:** `DashboardHeroCard.tsx` (lines 176-211)
- **Root Cause:** Tries to UPDATE `tenants.busyness_rules_jsonb` which doesn't exist
- **Error Message:** "Save Failed, could not find the busyness_rules_jsonb column of tenants in the schema cache"
- **Impact:** Slider UI moves but value doesn't persist, shows toast error

## Solution

All issues are caused by **missing database columns**. The code is correct, migrations exist, but they haven't been applied to production.

### Files Modified

**Created:**
- `FIX_BUSINESS_BRAIN.sql` - Comprehensive idempotent migration to add all missing columns

### Migration Details

The migration adds these columns to `tenants` table:
1. `pricing_rules_jsonb` - Stores pricing rules configuration
2. `busyness_rules_jsonb` - Stores busyness/ETA rules
3. `ai_policies_json` - Stores AI business policies

Also adds to `assistant_settings` table:
4. `off_behavior` - Agent OFF behavior (FORWARD_OWNER/VOICEMAIL/CALLBACK_ONLY)
5. `owner_forward_number` - Phone number for forwarding
6. `owner_forward_verified` - Verification flag

## How to Apply the Fix

### Step 1: Run the Migration

1. Open your Supabase project in browser
2. Navigate to: **SQL Editor**
3. Click: **New query**
4. Copy the entire contents of `FIX_BUSINESS_BRAIN.sql`
5. Paste into the SQL editor
6. Click: **Run** (or press Ctrl+Enter)

### Step 2: Verify Success

You should see output like:
```
All migrations completed!

✓ pricing_rules_jsonb EXISTS
✓ busyness_rules_jsonb EXISTS
✓ ai_policies_json EXISTS
✓ off_behavior columns EXIST
```

### Step 3: Test the Fixes

**Test Business Brain:**
1. Navigate to `/app/business-brain`
2. Click on "Scheduling & Availability" → Should load without errors
3. Click on "Services & Pricing" → Should load without errors
4. Click on "Policies & Rules" → Should load without errors
5. Verify NO console errors in browser DevTools

**Test Busyness Slider:**
1. Navigate to dashboard
2. Drag busyness slider to a different value (e.g., 50%)
3. Should see toast: "Saved - Busyness level set to 50%"
4. Reload the page (hard refresh: Ctrl+Shift+R)
5. Verify slider is at the same position (50%)
6. Go to Business Brain → Scheduling & Availability
7. Verify busyness shows the same value (50%)

**Test Dashboard Integration:**
1. Change busyness in Business Brain to 75%
2. Click "Save Changes"
3. Go back to dashboard
4. Verify slider is at 75%
5. Confirms both UIs read/write same data source

## Technical Details

### Database Schema

**tenants.pricing_rules_jsonb:**
```typescript
{
  rules: [
    {
      type: "flat" | "per-unit" | "tiered" | "distance-based" | "range-only" | "quote-only",
      service_id: string | null,
      service_name: string,
      required_inputs: string[],
      config: { ...pricing config... }
    }
  ]
}
```

**tenants.busyness_rules_jsonb:**
```typescript
{
  base_prep_minutes: number,      // Base prep time (e.g., 30)
  busy_buffer_minutes: number,    // Extra buffer when busy (e.g., 15)
  manual_busyness_pct: number     // 0-100, user-controlled
}
```

**tenants.ai_policies_json:**
```typescript
{
  upsell: { enabled: boolean, guidance: string, thresholds: {...} },
  pricing: { enabled: boolean, guidance: string, thresholds: {...} },
  capacity: { enabled: boolean, guidance: string, thresholds: {...} },
  recognition: { enabled: boolean, guidance: string },
  escalation: { enabled: boolean, guidance: string }
}
```

### Shared Data Flow

Both Dashboard and Business Brain read/write the same fields:
- **Dashboard** (lines 176-211): Debounced slider → writes to `tenants.busyness_rules_jsonb`
- **Business Brain** (BusynessRulesEditor.tsx, lines 31-57): Loads from `tenants.busyness_rules_jsonb`
- **Single Source of Truth:** `tenants` table

### RLS/Policies

The migration doesn't add new RLS policies because:
- `tenants` table already has RLS enabled
- Existing policy allows authenticated users to SELECT/UPDATE their own tenant record
- No additional permissions needed

## Expected Behavior After Fix

### Business Brain:
- All sections load successfully
- No "failed to load" errors
- Data persists on save
- Loading states show briefly then display data

### Dashboard:
- Busyness slider saves successfully
- Toast shows "Saved - Busyness level set to X%"
- Value persists across page reloads
- No console errors

### Integration:
- Changes in Dashboard reflect in Business Brain
- Changes in Business Brain reflect in Dashboard
- Single source of truth enforced

## Rollback (if needed)

The migration is safe and only adds columns. If you need to rollback:

```sql
-- Remove columns (only if absolutely necessary)
ALTER TABLE public.tenants DROP COLUMN IF EXISTS pricing_rules_jsonb;
ALTER TABLE public.tenants DROP COLUMN IF EXISTS busyness_rules_jsonb;
ALTER TABLE public.tenants DROP COLUMN IF EXISTS ai_policies_json;
ALTER TABLE public.assistant_settings DROP COLUMN IF EXISTS off_behavior;
ALTER TABLE public.assistant_settings DROP COLUMN IF EXISTS owner_forward_number;
ALTER TABLE public.assistant_settings DROP COLUMN IF EXISTS owner_forward_verified;
DROP TYPE IF EXISTS public.off_behavior;
```

## Files Referenced

- `src/components/settings/BusynessRulesEditor.tsx` - Business Brain busyness editor
- `src/components/settings/PricingRulesEditor.tsx` - Business Brain pricing editor
- `src/components/settings/AIBusinessPolicies.tsx` - Business Brain policies editor
- `src/components/dashboard/DashboardHeroCard.tsx` - Dashboard with busyness slider
- `src/pages/app/BusinessBrainPage.tsx` - Main Business Brain page

## Next Steps

1. ✅ Run `FIX_BUSINESS_BRAIN.sql` in Supabase
2. ✅ Verify all 4 checks pass
3. ✅ Test Business Brain sections
4. ✅ Test dashboard busyness slider
5. ✅ Test cross-UI integration
6. ✅ Check browser console for errors (should be none)

## Support

If you encounter any issues:
1. Check Supabase logs for SQL errors
2. Check browser console for JavaScript errors
3. Verify the migration ran successfully (check verification output)
4. Ensure user is authenticated and has access to tenant record
