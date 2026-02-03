
# Fix: Connect ETA Settings to AI Voice Context

## Problem Summary

When you call Hawks Towing and ask for an ETA, the AI says it can't provide one, even though ETA is configured in Business Brain with:
- Response time: 55 minutes
- Distance provider: enabled
- Base location: set

**Root Cause**: The UI saves ETA settings to `tenant_distance_settings`, but the AI context builder tries to read from a non-existent `eta_policy_jsonb` column. The two systems are disconnected.

## Technical Diagnosis

| Component | What It Does | Status |
|-----------|--------------|--------|
| `DispatchEtaSection.tsx` (UI) | Saves settings to `tenant_distance_settings` | Working |
| `useTenantDistanceSettings.ts` (Hook) | CRUD for ETA settings | Working |
| `buildBusinessContext.ts` (Backend) | Reads `tenant.eta_policy_jsonb` | Broken - column doesn't exist |
| ElevenLabs System Prompt | No ETA instructions for dispatch | Missing |

## Solution: Wire ETA Settings to AI Context

### Phase 1: Fetch ETA Settings in buildBusinessContext

Add `tenant_distance_settings` to the parallel fetch in `buildBusinessContext.ts`:

```typescript
// Add to the parallel Promise.all at line ~1085
distanceSettingsResult = supabase
  .from("tenant_distance_settings")
  .select("*")
  .eq("tenant_id", tenantId)
  .maybeSingle();
```

Then use it to build the `eta` context:

```typescript
const distanceSettings = distanceSettingsResult.data;
const etaContext = computeEtaFromDistanceSettings(
  distanceSettings,
  tenant.business_mode
);
```

### Phase 2: Build Proper ETA Context for Dispatch

Create a new helper that reads `tenant_distance_settings`:

```typescript
function computeEtaFromDistanceSettings(
  settings: TenantDistanceSettings | null,
  businessMode: string
): BusinessContext["eta"] {
  // If no settings, use mode-appropriate defaults
  if (!settings) {
    return getDefaultEtaForMode(businessMode);
  }

  const responseMinutes = settings.eta_base_minutes || 30;
  const minEta = settings.eta_min_minutes || Math.max(15, responseMinutes - 15);
  const maxEta = settings.eta_max_minutes || responseMinutes + 30;
  
  // Format spoken ETA
  const spoken = maxEta <= 60
    ? `${responseMinutes} to ${maxEta} minutes`
    : `about ${Math.floor(maxEta / 60)} hour${maxEta >= 120 ? 's' : ''}`;

  return {
    spoken,
    min_minutes: minEta,
    max_minutes: maxEta,
    source: "tenant_distance_settings",
    distance_provider_enabled: settings.distance_provider_enabled,
    // ... other fields
  };
}
```

### Phase 3: Add ETA Instructions to System Prompt

For dispatch mode, add explicit ETA guidance to the system prompt:

```typescript
if (ctx.tenant.business_mode === "dispatch") {
  prompt += `DISPATCH ETA BEHAVIOR:

When a customer asks for an ETA or arrival time:

1. YOUR AVERAGE RESPONSE TIME IS: ${ctx.eta.min_minutes}-${ctx.eta.max_minutes} minutes
   - This is your dispatch + travel time estimate
   - Say: "We can have someone to you in ${ctx.eta.spoken}"

2. IF YOU HAVE THE CUSTOMER'S EXACT ADDRESS:
   - You can give a more specific estimate
   - Say: "Based on your location, our driver can be there in approximately X minutes"

3. IF YOU DON'T HAVE THE ADDRESS YET:
   - First ask for the address: "What's the exact address where you need service?"
   - Then give the ETA estimate

4. NEVER SAY:
   - "I can't give you an ETA" (you CAN - use the range above)
   - "I don't have access to arrival times"

5. ALWAYS USE RANGES:
   - ✅ "About 45 to 55 minutes"
   - ❌ "Exactly 47 minutes" (too precise)

`;
}
```

### Phase 4: Add ETA to Dynamic Variables

Update `voiceContextContract.ts` to include ETA variables:

```typescript
{
  key: "response_time_spoken",
  description: "Spoken ETA for customer (e.g., '45 to 55 minutes')",
  type: "string",
  source: "eta.spoken",
  defaultValue: "30 to 45 minutes",
  category: "pricing",
},
{
  key: "response_time_min",
  description: "Minimum ETA in minutes",
  type: "number",
  source: "eta.min_minutes",
  defaultValue: 30,
  category: "pricing",
},
{
  key: "response_time_max",
  description: "Maximum ETA in minutes",
  type: "number",
  source: "eta.max_minutes",
  defaultValue: 60,
  category: "pricing",
},
```

## Files to Modify

| File | Changes |
|------|---------|
| `supabase/functions/_shared/buildBusinessContext.ts` | Fetch `tenant_distance_settings`, build ETA from it, add dispatch ETA to system prompt |
| `supabase/functions/_shared/voiceContextContract.ts` | Add `response_time_spoken`, `response_time_min`, `response_time_max` variables |

## Expected Result After Fix

**Before (current broken behavior):**
```
Customer: "How long until someone can get here?"
AI: "I'm not able to provide an exact ETA..."
```

**After (fixed behavior):**
```
Customer: "How long until someone can get here?"
AI: "We can have a driver to you in approximately 45 to 55 minutes. 
     What's the exact address where you need service?"
```

## Verification Steps

1. Deploy the updated edge functions
2. Call +1-855-329-7357 while admin-switched to Hawks Towing
3. Ask "How long until someone can get here?"
4. AI should respond with the configured 55-minute response time (±buffer)
