
# Fix: Dispatch IVR Routing to Wrong Agent

## Root Cause

The `getAgentIdForCapabilities()` function in `agentResolver.ts` treats IVR selection "1" as "service/scheduling" universally. But the dispatch-specific IVR has different semantics:

- **Hybrid IVR**: 1 = Schedule appointment, 2 = Immediate/dispatch
- **Dispatch IVR**: 1 = Towing/roadside (dispatch), 2 = Impound lot

When Hawks Towing's caller presses 1, they get routed to the Service agent instead of the Dispatch agent. The Service agent doesn't know how to do dispatch intake, doesn't collect pickup addresses, and creates broken jobs.

## The Fix

### 1. Pass IVR context type to the agent resolver

**File**: `supabase/functions/twilio-inbound/index.ts`

Instead of passing raw `ivrSelection` to `getAgentIdForCapabilities`, pass the **resolved mode** directly so the dispatch IVR "1" maps to dispatch, not service.

Change the dispatch IVR routing block (lines 338-350) so that when `dispatchIvrMode === "ivr_routing"` and `digits === "1"`, the `ivrSelection` is NOT set (letting it fall through to capability-based dispatch resolution), or explicitly set the resolved agent mode.

Specifically:
- Dispatch IVR digit "1" (towing) should resolve to dispatch agent directly
- Dispatch IVR digit "2" (impound) should resolve to impound agent (already works)
- Hybrid IVR digits remain unchanged

```text
// Current (BROKEN):
if (dispatchIvrMode === "ivr_routing" && digits) {
    ivrSelection = digits; // "1" → service agent (WRONG)
}

// Fixed:
if (dispatchIvrMode === "ivr_routing" && digits === "1") {
    // Dispatch IVR "1" = towing/roadside → dispatch agent (not service)
    ivrSelection = undefined; // Let capability-based resolution pick dispatch
} else if (dispatchIvrMode === "ivr_routing" && digits === "2") {
    ivrSelection = "2"; // Impound agent
}
```

### 2. Update `getAgentIdForCapabilities` to accept a mode hint

**File**: `supabase/functions/_shared/agentResolver.ts`

Add a comment clarifying that `ivrSelection === "1"` is ONLY for hybrid IVR (scheduling path). This is already correct for hybrid -- the fix is in twilio-inbound not sending "1" for dispatch IVR calls.

No code change needed here, just documentation.

### 3. Redeploy edge functions

Redeploy `twilio-inbound` so the fix takes effect immediately.

## Files Changed

| File | Change |
|------|--------|
| `supabase/functions/twilio-inbound/index.ts` | Fix dispatch IVR digit "1" routing to use dispatch agent instead of service |

## Impact

- Hawks Towing calls will immediately route to the correct Dispatch agent
- The dispatch agent will properly collect pickup addresses, ask about drop-off for towing, and create dispatch jobs
- Impound IVR routing (digit "2") is unaffected
- Hybrid IVR routing for non-dispatch tenants is unaffected
- No database changes needed
