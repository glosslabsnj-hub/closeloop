

# Fix Voice Agent Business Context Injection

## Summary

The voice agent is not receiving correct tenant business context because there are **two different context-building pathways** that are not aligned:

1. **`twilio-inbound`** (real phone calls) → Uses the canonical `buildBusinessContext()` from `_shared/buildBusinessContext.ts` ✅
2. **`elevenlabs-conversation-token`** (browser test calls) → Uses a **completely different, incomplete** inline context builder ❌

The browser test path only fetches basic tenant info (name, hours, booking URL) and misses: services, menu items, FAQs, objections, policies, modules, intake fields, and intelligence layers.

## Root Cause Analysis

### Current Flow for Browser Tests (`elevenlabs-conversation-token`)

The `elevenlabs-conversation-token` edge function fetches only:
- `tenants.name`
- `tenants.hours_json`
- `tenants.website_url`
- `assistant_settings.booking_url`
- `ai_assistants.greeting_script`, `fallback_script`

**Missing completely:**
- Services and pricing
- Menu items (for food mode)
- FAQs and objection responses
- Policies (cancellation, deposit, refund)
- Intake fields
- Enabled modules
- Intent rules
- Memory hints
- HIPAA settings
- AI never-promise list

### Current Flow for Real Calls (`twilio-inbound`)

Uses the canonical `buildBusinessContext()` which fetches everything correctly and injects it as `dynamic_variables` into the ElevenLabs register-call API.

**This is working correctly** - the issue is that browser tests bypass this entirely.

## Solution

### 1. Refactor `elevenlabs-conversation-token` to Use Canonical Builder

Replace the inline minimal context with the shared `buildBusinessContext()` function, matching what `twilio-inbound` does.

**Key changes:**
- Import `buildBusinessContext` and `storeContextSnapshot` from `_shared/buildBusinessContext.ts`
- Call `buildBusinessContext()` with `channel: "browser_test"`
- Use the same `buildDynamicVariables()` helper to flatten the context
- Store a context snapshot for debugging

### 2. Update Dynamic Variables for Browser Tests

The `buildDynamicVariables()` helper in `twilio-inbound` flattens the `BusinessContext` into key-value pairs for ElevenLabs. We need to either:
- **Option A:** Move `buildDynamicVariables()` into `_shared/buildBusinessContext.ts` and export it
- **Option B:** Duplicate the helper in `elevenlabs-conversation-token`

**Recommendation:** Option A - move to shared module for consistency.

### 3. Add Enhanced Logging (Dev Only)

Update `twilio-inbound` to log which context keys are present:

```typescript
console.log(`Context for tenant ${tenantId}:`, {
  business_name: context.tenant.business_name,
  business_mode: context.tenant.business_mode,
  services_count: context.offerings.services.length,
  menu_count: context.offerings.menu.length,
  faqs_count: context.knowledge.faqs.length,
  has_hours: Object.keys(context.tenant.hours).length > 0,
  has_policies: !!context.policies.cancellation,
  missing_sections: context._meta.missing_sections,
});
```

(This is already partially done - just need to ensure it's comprehensive)

### 4. Update AI Context Inspector Page

The debug page at `/debug/ai-context` already exists and shows the last 20 context snapshots. Enhancements needed:
- Add filter by channel (voice, sms, browser_test)
- Show a summary card with key metrics
- Add a "Test Context Now" button that calls `get-business-context` directly

## Implementation Details

### File: `supabase/functions/_shared/buildBusinessContext.ts`

**Changes:**
1. Export the `buildDynamicVariables()` function (currently it's private in `twilio-inbound`)
2. Add a helper function for browser tests specifically

Add new export at the end:

```typescript
export function buildDynamicVariables(
  ctx: BusinessContext, 
  callerPhoneE164: string, 
  customerId: string | null
): Record<string, string | number | boolean> {
  const enabledModulesArray: string[] = [];
  if (ctx.operations.modules.booking_enabled) enabledModulesArray.push("booking");
  if (ctx.operations.modules.dispatch_enabled) enabledModulesArray.push("dispatch_queue");
  if (ctx.operations.modules.orders_enabled) enabledModulesArray.push("food_orders");
  if (ctx.operations.modules.reservations_enabled) enabledModulesArray.push("reservations");
  if (ctx.operations.modules.catering_enabled) enabledModulesArray.push("catering");
  if (ctx.operations.modules.voice_enabled) enabledModulesArray.push("ai_voice");
  if (ctx.operations.modules.sms_enabled) enabledModulesArray.push("instant_text_back");
  if (ctx.operations.modules.medical_intake_enabled) enabledModulesArray.push("medical_intake");

  return {
    // Core identifiers
    tenant_id: ctx.tenant.tenant_id,
    location_id: ctx._meta.location_id || "",
    business_name: ctx.tenant.business_name || "Our Business",
    business_mode: ctx.tenant.business_mode,
    enabled_modules: enabledModulesArray.join(","),
    hipaa_mode: ctx.safety.hipaa_mode,
    timezone: ctx.tenant.timezone,
    
    // Caller info (respect PHI settings)
    caller_phone: ctx.safety.hipaa_mode ? "" : callerPhoneE164,
    customer_id: customerId || "",
    
    // Hours and availability
    hours_today: ctx.tenant.hours_today,
    calendar_connected: ctx.operations.availability.calendar_connected,
    booking_link: ctx.operations.availability.booking_url,
    
    // Business Brain content
    service_summary: ctx.offerings.services_summary,
    services_pricing: ctx.offerings.services_for_prompt,
    menu_summary: ctx.offerings.menu_summary,
    policies_summary: [
      ctx.policies.cancellation && `Cancellation: ${ctx.policies.cancellation}`,
      ctx.policies.deposit && `Deposit: ${ctx.policies.deposit}`,
      ctx.policies.payment_methods.length > 0 && `Payment: ${ctx.policies.payment_methods.join(", ")}`,
    ].filter(Boolean).join(". "),
    faqs_summary: ctx.knowledge.faqs_summary,
    
    // AI assistant settings
    greeting_script: ctx.ai_settings.greeting_script,
    fallback_script: ctx.ai_settings.fallback_script,
    tone: ctx.ai_settings.tone,
    
    // Intelligence layers
    intent_rules_summary: ctx.intelligence.intent_rules_summary,
    memory_hints_summary: ctx.safety.hipaa_mode ? "" : ctx.intelligence.memory_hints_summary,
    memory_enabled: ctx.intelligence.settings.memory_enabled,
  };
}
```

### File: `supabase/functions/elevenlabs-conversation-token/index.ts`

**Complete rewrite to use canonical builder:**

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { 
  buildBusinessContext, 
  storeContextSnapshot, 
  buildDynamicVariables 
} from "../_shared/buildBusinessContext.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ELEVENLABS_AGENT_ID = Deno.env.get("ELEVENLABS_AGENT_ID");
    const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY_2") || Deno.env.get("ELEVENLABS_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    // ... validation checks ...

    let tenantId: string | null = null;
    let locationId: string | null = null;
    
    try {
      const body = await req.json();
      tenantId = body.tenantId;
      locationId = body.locationId || null;
    } catch {
      // No body - continue without context
    }

    let dynamicVariables: Record<string, string | number | boolean> = {
      business_name: "our business",
      business_mode: "general",
      // ... minimal defaults ...
    };

    // If tenantId provided, build full business context
    if (tenantId && SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      const sessionId = `browser_test_${Date.now()}`;

      const { context } = await buildBusinessContext(supabase, {
        tenantId,
        locationId,
        customerId: null,
        channel: "browser_test",
        sessionId,
        callerPhone: null,
        includeIntelligence: true,
      });

      // Store snapshot for debugging
      await storeContextSnapshot(supabase, context);

      // Build flattened dynamic variables
      dynamicVariables = buildDynamicVariables(context, "browser_test", null);
      
      console.log("Browser test context built:", {
        tenant_id: tenantId,
        business_name: context.tenant.business_name,
        services_count: context.offerings.services.length,
        menu_count: context.offerings.menu.length,
        faqs_count: context.knowledge.faqs.length,
        missing_sections: context._meta.missing_sections,
      });
    }

    // Get signed URL from ElevenLabs
    const response = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=${ELEVENLABS_AGENT_ID}`,
      {
        method: "GET",
        headers: { "xi-api-key": ELEVENLABS_API_KEY },
      }
    );

    // ... rest of function ...

    return new Response(
      JSON.stringify({ 
        signedUrl: data.signed_url,
        dynamicVariables 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    // ... error handling ...
  }
});
```

### File: `supabase/functions/twilio-inbound/index.ts`

**Changes:**
1. Import `buildDynamicVariables` from shared module instead of defining inline
2. Keep existing functionality - just reduce duplication

### File: `src/pages/debug/AIContextInspectorPage.tsx`

**Enhancements:**
1. Add channel filter tabs (All / Voice / SMS / Browser Test)
2. Add a "Generate Test Context" button that calls `get-business-context` 
3. Show summary metrics at the top

## Files to Modify

| File | Changes |
|------|---------|
| `supabase/functions/_shared/buildBusinessContext.ts` | Export `buildDynamicVariables()` function |
| `supabase/functions/elevenlabs-conversation-token/index.ts` | Complete rewrite to use canonical builder |
| `supabase/functions/twilio-inbound/index.ts` | Import shared `buildDynamicVariables`, remove duplicate |
| `src/pages/debug/AIContextInspectorPage.tsx` | Add channel filter, test button, and summary metrics |

## Validation Checklist

After implementation, verify:

1. **Food tenant context** includes:
   - `menu_summary` with actual menu items
   - `hours_today` with correct hours
   - `enabled_modules` includes "food_orders"

2. **Service tenant context** includes:
   - `services_pricing` with full service list and prices
   - `service_summary` with summary text
   - FAQs and objections

3. **Browser test** stores context snapshot in `ai_context_snapshots` table

4. **`/debug/ai-context`** shows:
   - Snapshots from all channels
   - "Complete" badge when no missing sections
   - Golden path tests pass

## Testing Approach

1. Create a test tenant with food mode
2. Add menu items, hours, policies
3. Start a browser test call
4. Verify:
   - Console shows full context being injected
   - AI responds with menu knowledge
   - Context snapshot appears in debug page
   - No "missing_sections" in snapshot

