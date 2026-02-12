

# Fix: Make the AI Actually Know Your Business

## The Root Problem

I traced the entire data flow from your database to ElevenLabs, and found the critical break:

**Your services and pricing ARE in the database** -- Oil Change starting at $45, Brake Service starting at $200, Diagnostic at $99, etc. -- but they **never reach the AI agent during real phone calls**.

Here's why: There are two paths calls can take to reach ElevenLabs:

1. **Web/Simulator path** (`elevenlabs-init`): Properly calls `buildBusinessContext()` which assembles all your services, pricing, FAQs, hours, policies, and 100+ other variables into a rich context package. This works correctly.

2. **Twilio phone call path** (`twilio-inbound`): **Skips `buildBusinessContext()` entirely** and hardcodes empty strings:
   ```
   service_summary: ""
   services_pricing: (not even included)
   policies_summary: ""
   faqs_summary: (not included)
   ```

So when someone calls your Twilio number and asks "How much is an oil change?", the AI literally has no data to work with. It doesn't know your services, your prices, your FAQs, your policies -- nothing. It's flying blind.

## The Fix

Wire `twilio-inbound` into the same `buildBusinessContext` + `buildDynamicVariables` pipeline that `elevenlabs-init` already uses successfully. This means when someone calls Smiles Auto Works, the AI will know:

- Oil Change starts at $45 (price varies by vehicle)
- Diagnostic is $99 flat
- Brake Service starts at $200
- Transmission Service requires a quote
- General Auto Repair requires a quote
- All your FAQs, policies, hours, and intake questions

## What Changes

### 1. `supabase/functions/twilio-inbound/index.ts` -- Wire up the Business Brain

**Current state (broken):** Lines 553-591 manually build a sparse `dynamicVariables` object with empty strings for all business knowledge fields.

**New approach:**
- Import `buildBusinessContext` and `buildDynamicVariables` from `_shared/buildBusinessContext.ts`
- Import `getAllVariableKeys` from `_shared/voiceContextContract.ts`
- After resolving the tenant and agent (Step 6), call `buildBusinessContext()` with the tenant ID, caller phone, and channel
- Use `buildDynamicVariables()` to produce the full set of 100+ context variables
- Merge the existing capability flags and caller-specific fields on top
- Use a timeout wrapper so context-building never delays TwiML response beyond Twilio's limit

The key code change replaces the hardcoded empty object with:

```typescript
// Build full business context (same pipeline as elevenlabs-init)
let richDynamicVars: Record<string, string> = {};
try {
  const supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const { context } = await buildBusinessContext(supabaseClient, {
    tenantId,
    locationId: null,
    customerId: null,
    channel: "voice",
    sessionId: null,
    callerPhone: callerPhoneE164,
    includeIntelligence: false, // Keep it fast
  });
  richDynamicVars = buildDynamicVariables(context, callerPhoneE164, null);
} catch (err) {
  console.warn("[twilio-inbound] Context build failed, using minimal vars:", err);
}

// Merge with call-specific fields (these override any context values)
const dynamicVariables: Record<string, string> = {
  ...richDynamicVars,
  tenant_id: tenantId,
  business_name: businessName,
  business_mode: businessMode,
  caller_phone: callerPhoneE164,
  caller_phone_last4: callerPhoneLast4,
  ai_behavior_mode: settings.ai_behavior_mode || "full_service",
  // ... capability flags stay as-is
};
```

**Timeout safety:** The context build will be wrapped in a `Promise.race` with a 4-second timeout. If it takes too long, the call still connects with minimal variables (current behavior) rather than hanging up. Twilio has a ~10 second response deadline, so 4 seconds for context + 4 seconds for ElevenLabs register-call stays within budget.

**Fallback:** If `buildBusinessContext` fails for any reason, the function falls back to the current empty-string behavior, so calls never break.

### 2. What This Means for Smiles Auto Works

After this fix, when someone calls and asks "How much is an oil change?", the AI will have:

- `services_pricing`: "Oil Change: starting at $45 | Diagnostic: $99 | Brake Service: starting at $200 | Tune-Up: starting at $150 | AC Repair: starting at $250 | Transmission Service: quote required | General Auto Repair: quote required"
- `service_summary`: A natural-language summary of all services
- `faqs_summary`: Any FAQs you've configured
- `policies_summary`: Your cancellation, deposit, refund policies
- `hours_today`: Today's actual hours
- `required_questions_summary`: What info to collect from callers
- `greeting_script`: Your custom greeting
- All pricing rules, modifiers, and business brain context

The AI can then say: "An oil change starts at forty-five dollars, but the price depends on your vehicle. What kind of car do you have?" -- exactly the behavior you described wanting.

### 3. Deployment

Redeploy: `twilio-inbound` only. No database changes needed.

### What does NOT change
- The `elevenlabs-init` path (already works correctly)
- The ElevenLabs prompt (already references these variables)
- Database schema (services are already stored correctly)
- Any frontend code

