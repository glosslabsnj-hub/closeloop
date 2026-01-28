
# New Pricing Model Implementation Plan

## Overview

This plan updates the entire pricing system from the current flat-rate 3-tier model ($99/$199/$249.99) to a usage-based ladder system with included limits, overage billing, and multi-location support.

## Current State Analysis

**Current Pricing (to be replaced):**
- Text: $99/mo (flat-rate unlimited)
- Voice: $199/mo (flat-rate unlimited)
- Both: $249.99/mo (flat-rate unlimited)

**Files Requiring Updates:**
- `src/components/pricing/PricingCards.tsx` - Main pricing UI
- `src/pages/public/PricingPage.tsx` - Public pricing page
- `src/pages/public/LandingPage.tsx` - Landing page pricing section
- `src/pages/public/SignupPage.tsx` - Signup with plan selection
- `src/pages/app/GoLivePage.tsx` - Plan selection after onboarding
- `src/pages/app/SettingsPage.tsx` - Billing tab with plan display
- `src/hooks/useSubscription.ts` - Subscription creation logic
- `src/types/database.ts` - TypeScript types
- `supabase/functions/stripe-webhook/index.ts` - Stripe webhook handler
- Database schema (subscriptions table, new usage tracking tables)

---

## Phase 1: Create Centralized Pricing Configuration

### 1.1 Create `src/config/pricing.ts`

Single source of truth for all pricing data:

```typescript
// Tier definitions
export type PlanTier = "sms" | "voice" | "both";

// Ladder SKU codes
export type PlanSku = 
  // SMS tier
  | "sms-500" | "sms-1500" | "sms-3500"
  // Voice tier
  | "voice-200" | "voice-600" | "voice-1500"
  // Both tier
  | "both-200-500" | "both-600-1500" | "both-1500-3500";

export interface PlanLadderStep {
  sku: PlanSku;
  tier: PlanTier;
  name: string;
  price: number;
  includedMinutes: number | null;
  includedSmsSegments: number | null;
  overageMinuteRate: number | null;
  overageSmsRate: number;
  stripePriceId: string | null; // Populated after Stripe setup
}

export interface TierInfo {
  tier: PlanTier;
  displayName: string;
  startingPrice: number;
  description: string;
  features: string[];
  highlight?: boolean;
}

export const PRICING_CONFIG = {
  tiers: [...],
  ladderSteps: [...],
  locationAddOns: {
    smsOnly: 49,
    voiceOrBoth: 99,
  },
  trialDays: 7,
  includedInAllPlans: [
    "Business Brain (knowledge editing, FAQs, services, menu, policies)",
    "Integration syncing (webhook delivery + Google Sheets export)",
    "Handoff delivery for bookings, dispatch, and orders",
    "Multi-tenant dashboard with module gating",
  ],
};
```

---

## Phase 2: Database Schema Changes

### 2.1 Expand `plan_code` Enum

Replace current `["text", "voice", "both"]` with new ladder SKUs:

```sql
-- Create new enum with all ladder SKUs
ALTER TYPE public.plan_code ADD VALUE 'sms-500';
ALTER TYPE public.plan_code ADD VALUE 'sms-1500';
ALTER TYPE public.plan_code ADD VALUE 'sms-3500';
ALTER TYPE public.plan_code ADD VALUE 'voice-200';
ALTER TYPE public.plan_code ADD VALUE 'voice-600';
ALTER TYPE public.plan_code ADD VALUE 'voice-1500';
ALTER TYPE public.plan_code ADD VALUE 'both-200-500';
ALTER TYPE public.plan_code ADD VALUE 'both-600-1500';
ALTER TYPE public.plan_code ADD VALUE 'both-1500-3500';
```

### 2.2 Add `subscription_usage` Table

Track monthly usage per tenant:

```sql
CREATE TABLE subscription_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  billing_period_start timestamptz NOT NULL,
  billing_period_end timestamptz NOT NULL,
  voice_minutes_used integer DEFAULT 0,
  sms_segments_used integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(tenant_id, billing_period_start)
);
```

### 2.3 Add `tenant_locations` Table

Support multi-location add-ons:

```sql
CREATE TABLE tenant_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  location_name text NOT NULL,
  phone_number_id uuid REFERENCES phone_numbers(id),
  is_primary boolean DEFAULT false,
  monthly_fee_cents integer NOT NULL, -- 4900 or 9900
  stripe_subscription_item_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

### 2.4 Update `subscriptions` Table

Add fields for usage tracking and Stripe integration:

```sql
ALTER TABLE subscriptions ADD COLUMN included_minutes integer;
ALTER TABLE subscriptions ADD COLUMN included_sms_segments integer;
ALTER TABLE subscriptions ADD COLUMN overage_minute_rate_cents integer;
ALTER TABLE subscriptions ADD COLUMN overage_sms_rate_cents integer;
```

---

## Phase 3: Update UI Components

### 3.1 Rewrite `PricingCards.tsx`

Transform to show tier-based "starting at" pricing with expandable ladder options:

- Display 3 tier cards: SMS ($129), Voice ($249), Both ($299)
- Each card shows "starting at" price
- Click to expand shows ladder options within that tier
- Features list pulled from centralized config
- "What's included in all plans" section

### 3.2 Update `GoLivePage.tsx`

Two-step plan selection:
1. Choose tier (SMS, Voice, or Both)
2. Choose usage level within tier (ladder step)

Show included limits and overage rates clearly.

### 3.3 Update `SignupPage.tsx`

- Accept both tier and SKU in URL params (`?tier=voice&sku=voice-200`)
- Display selected plan with included limits
- Show overage rates

### 3.4 Update `SettingsPage.tsx` Billing Tab

- Show current plan SKU and tier
- Display included limits vs. current usage
- Show projected overage cost
- "Upgrade" button to next ladder step
- "Change Tier" button for tier switches

### 3.5 Update `LandingPage.tsx`

- Update pricing section with new "starting at" prices
- Update FAQ to remove "unlimited" claims
- Add usage/overage FAQ

### 3.6 Update `PricingPage.tsx`

- Same tier-based display as PricingCards
- Update FAQ section with usage-based answers

---

## Phase 4: Create Usage Tracking System

### 4.1 Create Edge Function: `track-usage`

Called after each call/SMS to increment usage counters:

```typescript
// POST /track-usage
// Body: { tenant_id, event_type: "voice_minute" | "sms_segment", quantity: number }
```

### 4.2 Update `twilio-inbound` Function

Track voice minutes when call ends (use call duration).

### 4.3 Update `ai-text-reply` Function

Track SMS segments sent (count based on message length).

### 4.4 Create Hook: `useUsage.ts`

Fetch current billing period usage:

```typescript
export function useUsage(tenantId: string | null) {
  // Returns: { voiceMinutesUsed, smsSegmentsUsed, includedMinutes, includedSms, projectedOverage, loading }
}
```

---

## Phase 5: Create Usage Dashboard Page

### 5.1 Create `src/pages/app/UsagePage.tsx`

New page at `/app/usage` showing:

- **Current Plan Card**: SKU, tier, price
- **Voice Usage** (if applicable):
  - Progress bar (used / included)
  - Minutes used this period
  - Projected overage cost
- **SMS Usage** (if applicable):
  - Progress bar (used / included)
  - Segments used this period
  - Projected overage cost
- **Upgrade Options**:
  - Next ladder step within tier
  - Comparison of cost vs. overage
- **Billing History** (future)

### 5.2 Add Navigation Link

Add "Usage" to Settings or as standalone nav item.

---

## Phase 6: Multi-Location Support

### 6.1 Create `src/components/settings/LocationsSettings.tsx`

UI for managing additional locations:

- List current locations with phone numbers
- "Add Location" button
- Shows monthly add-on fee ($49 or $99)
- Delete/deactivate location

### 6.2 Create Edge Function: `add-location`

- Verify active subscription
- Determine add-on price based on plan tier
- Provision new Twilio number
- Create subscription item in Stripe
- Insert into `tenant_locations`

### 6.3 Update `SettingsPage.tsx`

Add "Locations" tab for multi-location management.

---

## Phase 7: Update Subscription Logic

### 7.1 Update `useSubscription.ts`

- `createSubscription(sku: PlanSku)` instead of `planCode`
- Populate `included_minutes` and `included_sms_segments` from config
- Only provision Twilio number for voice/both tiers

### 7.2 Update `initialize_assistant_settings` Function

Map new SKUs to feature flags:

```sql
-- voice_ai_enabled = sku starts with 'voice' or 'both'
-- instant_text_enabled = sku starts with 'sms' or 'both'
```

---

## Phase 8: Stripe Integration Updates

### 8.1 Create Stripe Products & Prices (Manual or Script)

Create in Stripe Dashboard or via API:

**Products:**
- SMS Instant Respond
- AI Voice Receptionist
- Voice + SMS Bundle
- Location Add-On (SMS)
- Location Add-On (Voice/Both)

**Prices (one per ladder step):**
- sms-500: $129/mo
- sms-1500: $149/mo
- sms-3500: $199/mo
- voice-200: $249/mo
- voice-600: $299/mo
- voice-1500: $499/mo
- both-200-500: $299/mo
- both-600-1500: $399/mo
- both-1500-3500: $649/mo

### 8.2 Update `stripe-webhook/index.ts`

- Handle new SKU metadata
- Provision phone numbers for voice/both tiers only
- Handle usage reporting (Stripe metered billing for overages)

### 8.3 Store Price IDs

Add to `src/config/pricing.ts`:

```typescript
stripePriceIds: {
  "sms-500": "price_xxx",
  "sms-1500": "price_xxx",
  // ...
}
```

---

## Phase 9: Feature Enforcement

### 9.1 Update `useTenantConfig.ts`

Derive feature flags from plan SKU:

```typescript
const hasVoice = sku?.startsWith("voice") || sku?.startsWith("both");
const hasSms = sku?.startsWith("sms") || sku?.startsWith("both");
```

### 9.2 Update Phone Provisioning Logic

Only provision for voice/both plans:

```typescript
if (!hasVoice) {
  // Don't provision Twilio number
  // Hide phone-related UI
}
```

### 9.3 Enforce in Edge Functions

- `twilio-inbound`: Check voice entitlement before processing
- `ai-text-reply`: Check SMS entitlement before sending

---

## Phase 10: Testing & Validation

### 10.1 Create Pricing Tests

`src/test/pricing.test.ts`:

```typescript
describe("Pricing Config", () => {
  it("all ladder steps have valid prices", () => {...});
  it("all SKUs map to correct tier", () => {...});
  it("overage rates are correctly set", () => {...});
});
```

### 10.2 End-to-End Test Checklist

1. Sign up with SMS-500 plan
   - Verify no phone number provisioned
   - Verify SMS features enabled
   - Verify voice features disabled

2. Sign up with Voice-200 plan
   - Verify phone number provisioned
   - Verify voice features enabled
   - Verify SMS features enabled (voice plans include SMS follow-up)

3. Sign up with Both-200-500 plan
   - Verify phone number provisioned
   - Verify both features enabled

4. Upgrade within tier
   - SMS-500 to SMS-1500
   - Verify limits updated

5. Usage tracking
   - Make test call
   - Verify minutes tracked

---

## Implementation Order

**Week 1: Foundation**
1. Create `src/config/pricing.ts` (centralized config)
2. Database migrations (new tables, enum expansion)
3. Update TypeScript types

**Week 2: Core UI**
4. Rewrite `PricingCards.tsx`
5. Update `GoLivePage.tsx`
6. Update `SignupPage.tsx`
7. Update `LandingPage.tsx` and `PricingPage.tsx`

**Week 3: Usage & Billing**
8. Create usage tracking tables and functions
9. Create `UsagePage.tsx`
10. Update `SettingsPage.tsx` billing tab
11. Update `useSubscription.ts`

**Week 4: Advanced Features**
12. Multi-location UI and edge functions
13. Stripe integration (products, prices, webhook)
14. Feature enforcement
15. Testing

---

## Technical Details

### New Files to Create

| File | Purpose |
|------|---------|
| `src/config/pricing.ts` | Centralized pricing configuration |
| `src/pages/app/UsagePage.tsx` | Usage dashboard |
| `src/hooks/useUsage.ts` | Usage data fetching |
| `src/components/settings/LocationsSettings.tsx` | Multi-location management |
| `supabase/functions/track-usage/index.ts` | Usage tracking edge function |
| `supabase/functions/add-location/index.ts` | Location provisioning |
| `src/test/pricing.test.ts` | Pricing validation tests |

### Files to Update

| File | Changes |
|------|---------|
| `src/components/pricing/PricingCards.tsx` | Complete rewrite for tier/ladder display |
| `src/pages/public/PricingPage.tsx` | New FAQ content, tier display |
| `src/pages/public/LandingPage.tsx` | Update pricing section |
| `src/pages/public/SignupPage.tsx` | Handle new SKU codes |
| `src/pages/app/GoLivePage.tsx` | Two-step tier+SKU selection |
| `src/pages/app/SettingsPage.tsx` | Usage display, upgrade buttons |
| `src/hooks/useSubscription.ts` | New SKU handling, limits population |
| `src/types/database.ts` | New types for SKUs, usage |
| `supabase/functions/stripe-webhook/index.ts` | New SKU handling |
| `supabase/functions/twilio-inbound/index.ts` | Usage tracking |
| `supabase/functions/ai-text-reply/index.ts` | SMS segment tracking |

### Database Migrations

1. Expand `plan_code` enum with new SKUs
2. Create `subscription_usage` table
3. Create `tenant_locations` table
4. Add usage limit columns to `subscriptions`
5. Update `initialize_assistant_settings` function

---

## Summary

This plan transforms CloseLoop from flat-rate unlimited pricing to a sophisticated usage-based model with:

- **3 tiers** (SMS, Voice, Both) at different price points
- **3 ladder steps per tier** for usage scaling
- **Included limits** with overage billing
- **Multi-location support** with add-on pricing
- **Usage dashboard** for transparency
- **Single source of truth** in `pricing.ts`
- **Full Stripe integration** for billing

All changes maintain backward compatibility during migration and ensure no pricing information is scattered across the codebase.
