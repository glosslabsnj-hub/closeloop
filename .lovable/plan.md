

# Fix Twilio Number Provisioning for SKU-Based Pricing

## Problem Summary
Twilio phone numbers are not being provisioned for new users because the provisioning logic checks for exact matches against legacy plan codes (`"voice"`, `"both"`) while the new pricing model uses SKU-based codes (`"voice-200"`, `"both-200-500"`, etc.).

## Root Cause Analysis
| Location | Current Check | Fails For |
|----------|--------------|-----------|
| `OnboardingPage.tsx:416` | `["voice", "both"].includes(planCode)` | `"voice-200"`, `"both-200-500"` |
| `stripe-webhook/index.ts:83` | `["voice", "both"].includes(planCode)` | `"voice-200"`, `"both-200-500"` |

**Already Fixed:** `useSubscription.ts:131` correctly uses `hasVoiceFeature(sku)` which handles both legacy and new SKUs.

## Solution Overview

### A. Fix OnboardingPage.tsx (Client Trigger)
Replace the legacy check with the existing `hasVoiceFeature()` helper:

```typescript
// Before (line 416)
if (["voice", "both"].includes(planCode)) {

// After
import { hasVoiceFeature } from "@/config/pricing";
// ...
if (hasVoiceFeature(planCode)) {
```

### B. Fix stripe-webhook Edge Function (Server Backup Trigger)
Create a server-side version of `hasVoiceFeature()` and use it:

```typescript
// Add helper function at top of file
function hasVoiceFeature(planCode: string | null): boolean {
  if (!planCode) return false;
  return planCode.startsWith("voice") || planCode.startsWith("both");
}

// Replace line 83
if (tenantId && planCode && hasVoiceFeature(planCode)) {
```

### C. Create Shared Guard Function (Prevent Future Regressions)
Add a reusable `shouldProvisionTwilio()` function to both locations:

```typescript
function shouldProvisionTwilio(
  planSku: string | null,
  existingTwilioSid: string | null | undefined,
  existingPhoneNumber: string | null | undefined
): boolean {
  // Must have a voice-enabled plan
  if (!hasVoiceFeature(planSku)) return false;
  // Must not already have a number
  if (existingTwilioSid || existingPhoneNumber) return false;
  return true;
}
```

### D. Enhanced Logging
Add structured logs for observability:

**Client (OnboardingPage.tsx):**
```typescript
console.log("TwilioProvision: evaluating", { tenantId, planCode, hasVoice: hasVoiceFeature(planCode) });
// On skip: console.log("TwilioProvision: skipped", { reason: "no-voice-feature" });
// On success: console.log("TwilioProvision: success", { phone_e164, twilio_sid });
// On error: console.error("TwilioProvision: error", { message });
```

**Server (stripe-webhook):**
Same pattern, plus log to `twilio_event_logs` table on failure.

### E. Add Retry Button in PhoneNumberCard
Modify `PhoneNumberCard.tsx` to show "Provision Missing Number" button when:
- Tenant has a voice-enabled plan (`hasVoice` from subscription)
- No phone number exists

This is already partially implemented - the "Get Phone Number" button shows when no number exists. We'll enhance it to be more prominent for affected tenants.

## Files to Modify

| File | Change |
|------|--------|
| `src/pages/app/OnboardingPage.tsx` | Import `hasVoiceFeature`, replace legacy check at line 416 |
| `supabase/functions/stripe-webhook/index.ts` | Add `hasVoiceFeature()` helper, replace check at line 83 |
| `src/components/dashboard/PhoneNumberCard.tsx` | Add plan context check to show repair button for voice plans |

## Technical Details

### OnboardingPage.tsx Changes

**Line 1-30 (add import):**
```typescript
import { hasVoiceFeature } from "@/config/pricing";
```

**Lines 415-437 (replace provisioning block):**
```typescript
// Provision Twilio number for voice/both plans
const shouldProvision = hasVoiceFeature(planCode);
console.log("TwilioProvision: evaluating", { tenantId, planCode, shouldProvision });

if (shouldProvision) {
  try {
    console.log("TwilioProvision: start", { tenantId, planCode });
    const { data: provisionData, error: provisionError } = await supabase.functions.invoke(
      "provision-twilio-number",
      {
        body: { tenant_id: tenantId, number_type: "local" },
      }
    );

    if (provisionError) {
      console.error("TwilioProvision: error", { message: provisionError.message });
    } else if (provisionData?.success) {
      console.log("TwilioProvision: success", { 
        phone_e164: provisionData.phone_number,
        twilio_sid: provisionData.phone_sid 
      });
    } else {
      console.error("TwilioProvision: failed", { error: provisionData?.error });
    }
  } catch (provErr: any) {
    console.error("TwilioProvision: exception", { message: provErr?.message });
  }
} else {
  console.log("TwilioProvision: skipped", { reason: "no-voice-feature", planCode });
}
```

### stripe-webhook/index.ts Changes

**Add helper function after line 8:**
```typescript
// Determine if a plan SKU includes voice features
function hasVoiceFeature(planCode: string | null): boolean {
  if (!planCode) return false;
  return planCode.startsWith("voice") || planCode.startsWith("both");
}
```

**Replace lines 82-96:**
```typescript
// Provision phone number if conditions are met
const shouldProvision = hasVoiceFeature(planCode);
console.log(`TwilioProvision: evaluating tenant=${tenantId}, plan=${planCode}, shouldProvision=${shouldProvision}`);

if (tenantId && shouldProvision) {
  if (subscriptionStatus === "active" || subscriptionStatus === "trialing") {
    console.log(`TwilioProvision: start for tenant ${tenantId}`);
    
    // Call the provision function (already idempotent)
    const provisionResult = await provisionForwardingNumber(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, tenantId);
    
    if (provisionResult.success) {
      console.log(`TwilioProvision: success tenant=${tenantId} phone=${provisionResult.phone_number}`);
    } else {
      console.error(`TwilioProvision: error tenant=${tenantId} error=${provisionResult.error}`);
      // Log to twilio_event_logs for visibility
      await supabase.from("twilio_event_logs").insert({
        tenant_id: tenantId,
        event_type: "provision_failed",
        stage: "stripe_webhook",
        error_message: provisionResult.error,
      }).catch(e => console.error("Failed to log provision error:", e));
    }
  } else {
    console.log(`TwilioProvision: skipped tenant=${tenantId} reason=subscription-not-active status=${subscriptionStatus}`);
  }
} else if (tenantId && !shouldProvision) {
  console.log(`TwilioProvision: skipped tenant=${tenantId} reason=no-voice-feature plan=${planCode}`);
}
```

## Acceptance Tests

| Test | Expected Result |
|------|----------------|
| 1. New tenant selects "both-200-500" | Provisioning runs, `phone_numbers` row created, dashboard shows number |
| 2. Existing legacy tenant "both" | Unaffected, still provisions correctly |
| 3. Stripe webhook backup path | Provisions if client trigger fails |
| 4. Idempotency | Repeated calls don't buy multiple numbers |
| 5. Status after provisioning | `connect_status = "awaiting_first_call"` |

## Migration for Affected Tenants
The `PhoneNumberCard` already shows a "Get Phone Number" button when no number exists. Affected tenants with voice plans can click this button to trigger manual provisioning. No additional migration needed since:
1. The `provision-twilio-number` edge function is already idempotent
2. The button already calls this function
3. After this fix, new signups will work automatically

