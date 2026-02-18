# Refactor Step 4: Runtime Intelligence Quote Engine

## Summary

This step implements a deterministic quote engine that calculates pricing at runtime with safe fallbacks and clear data requirements. The engine orchestrates area checking, pricing rules, and required questions to provide accurate quotes or ask for missing information.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        getQuote()                               │
│                   (Main Entry Point)                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐    ┌──────────────┐    ┌─────────────────┐    │
│  │ areaCheck() │───▶│ applyRules() │───▶│  QuoteResult    │    │
│  │             │    │              │    │                 │    │
│  │ - Location  │    │ - Advanced   │    │ - price         │    │
│  │ - Service   │    │ - Service    │    │ - voiceScript   │    │
│  │   Area      │    │ - Modifiers  │    │ - nextQuestion  │    │
│  └─────────────┘    └──────────────┘    └─────────────────┘    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Module Structure

```
src/lib/quoteEngine/
├── index.ts          # Public exports
├── quoteEngine.ts    # Main orchestration (getQuote, checkQuoteReadiness)
├── areaCheck.ts      # Service area validation
└── rulesApply.ts     # Pricing rules evaluation
```

## API Reference

### `getQuote(input, context)`

Main entry point for quote calculation.

```typescript
import { getQuote, type QuoteInput, type QuoteContext } from "@/lib/quoteEngine";

const input: QuoteInput = {
  tenantId: "uuid",
  serviceId: "uuid",           // Optional
  serviceName: "Towing",       // Optional
  customerLocation: {
    state: "CA",
    zip: "90210",
    distanceMiles: 15,         // Optional
  },
  answers: {
    miles: 15,
    vehicle_type: "sedan",
  },
};

const context: QuoteContext = {
  serviceArea,    // From useServiceArea()
  advancedRules,  // From tenant.pricing_rules_jsonb
  simpleRules,    // From usePricingRules()
  services,       // From useServices()
};

const result = getQuote(input, context);
```

### `QuoteResult`

```typescript
interface QuoteResult {
  quoteType: "exact" | "estimate" | "range" | "quote_only" | "out_of_area" | "unknown";
  success: boolean;
  price?: number;
  priceRange?: { min: number; max: number };
  voiceScript: string;           // Ready for AI to speak
  nextQuestion?: {
    key: string;
    label: string;
    askPrompt: string;
  };
  reason?: string;
  deepLink?: string;             // Where to configure pricing
  appliedModifiers?: Array<{     // Breakdown of surcharges/discounts
    name: string;
    type: "surcharge" | "discount" | "fee";
    amount: number;
  }>;
  breakdown?: {
    basePrice: number;
    modifiersTotal: number;
    finalPrice: number;
  };
  areaCheck: AreaCheckResult;
  pricingResult: RulesApplyResult;
  calculatedAt: string;
}
```

### `checkQuoteReadiness(context)`

Check if a tenant is ready to provide quotes.

```typescript
import { checkQuoteReadiness } from "@/lib/quoteEngine";

const readiness = checkQuoteReadiness(context);
// {
//   ready: true,
//   score: 85,
//   issues: [
//     { severity: "warning", message: "Service area not configured", deepLink: "/app/brain#service-area" }
//   ]
// }
```

## Pricing Waterfall Logic

The engine follows a strict waterfall to determine pricing:

```
1. Area Check
   └─ Is location serviceable?
      ├─ NO → Return "out_of_area"
      └─ YES (or unknown) → Continue

2. Advanced Pricing Rules
   └─ Any matching rules for this service?
      ├─ YES with all inputs → Calculate price
      ├─ YES but missing inputs → Return nextQuestion
      └─ NO → Continue

3. Service Base Price
   └─ Does service have price_amount?
      ├─ fixed → Return exact price
      ├─ starting_at → Return estimate price
      ├─ quote_only → Return "quote_only"
      └─ null → Continue

4. Apply Simple Modifiers
   └─ Any active surcharges/discounts/fees?
      └─ Apply to price from step 2 or 3

5. Unknown
   └─ Return "unknown" with deepLink to configure
```

## Pricing Rule Types

### Advanced Rules (pricing_rules_jsonb)

| Type | Description | Required Inputs |
|------|-------------|-----------------|
| `flat` | Fixed price regardless of inputs | None |
| `per-unit` | Multiply by quantity | `quantity` |
| `distance-based` | Base + ($/mile) with min/max | `miles` |
| `tiered` | Match value to tier brackets | `tier_value` or `miles` |
| `range-only` | Show price range, no exact | None |
| `quote-only` | Always require custom quote | None |

### Simple Modifiers (pricing_rules_json)

| Type | Description |
|------|-------------|
| `surcharge` | Add to price (% or $) |
| `discount` | Subtract from price (% or $) |
| `fee` | Add fixed fee (same as surcharge) |

Both types support service scoping:
- `service_id: null` → Applies to all services
- `service_id: "uuid"` → Applies only to that service

## Area Check Logic

The area check uses `isLocationServiceable()` from `useServiceArea.ts`:

```
1. Check Exclusions (always override)
   └─ Excluded state/zip/county? → NOT serviceable

2. Check State Line Restriction
   └─ no_cross_state_lines && different state? → NOT serviceable (unless explicitly included)

3. Mode-Specific Rules
   ├─ radius: distanceMiles <= radius_miles
   ├─ zips: zip in include.zips
   ├─ counties: county in include.counties
   └─ hybrid: ANY criterion passes
```

## Voice Script Examples

The `voiceScript` field is ready for the AI to speak:

| Scenario | Voice Script |
|----------|--------------|
| Exact price | "That will be $150.00." |
| Estimate | "That starts at $150.00." |
| Range | "That will be between $100.00 and $200.00." |
| Quote only | "We'll need to provide a custom quote for that. Let me get your information and we'll follow up with pricing." |
| Missing input | "What is the distance in miles?" |
| Out of area | "I'm sorry, but location is outside our 50 mile service radius. Would you like me to suggest an alternative?" |

## Business Brain Integration

### QuoteReadinessCard

Shows owners their quoting setup status:

```tsx
import { QuoteReadinessCard } from "@/components/brain/QuoteReadinessCard";

// Displays:
// - Readiness score (0-100%)
// - Ready/Not Ready badge
// - List of issues with "Fix" links
```

The card appears in Business Brain → Services & Pricing section.

### Readiness Checks

| Check | Severity | Condition |
|-------|----------|-----------|
| No services | Error | services.length === 0 |
| Services without prices | Warning | price_amount is null AND price_type !== "quote_only" |
| Service area not configured | Warning | No base address city set |
| No pricing rules | Info | No advanced or simple rules (only if services lack prices) |

## Files Created/Modified

### New Files

| File | Purpose |
|------|---------|
| `src/lib/quoteEngine/index.ts` | Public exports |
| `src/lib/quoteEngine/quoteEngine.ts` | Main orchestration |
| `src/lib/quoteEngine/areaCheck.ts` | Service area validation |
| `src/lib/quoteEngine/rulesApply.ts` | Pricing rules evaluation |
| `src/components/brain/QuoteReadinessCard.tsx` | UI for readiness display |

### Modified Files

| File | Change |
|------|--------|
| `src/pages/app/BusinessBrainPage.tsx` | Added QuoteReadinessCard to Services section |

## Usage in Agent Runtime

The quote engine is designed to be called from the agent runtime:

```typescript
// In buildBusinessContext or similar
import { getQuote, type QuoteContext } from "@/lib/quoteEngine";

// Build context from tenant data
const context: QuoteContext = {
  serviceArea: tenant.service_area_json,
  advancedRules: tenant.pricing_rules_jsonb || [],
  simpleRules: tenant.pricing_rules_json || [],
  services: await fetchServices(tenantId),
};

// Calculate quote during conversation
const result = getQuote({
  tenantId,
  serviceId: extractedPayload.service_id,
  serviceName: extractedPayload.service_requested,
  customerLocation: {
    state: extractedPayload.state,
    zip: extractedPayload.zip,
    distanceMiles: extractedPayload.miles,
  },
  answers: extractedPayload,
}, context);

// AI speaks the result
return result.voiceScript;
```

## Testing

### Manual Testing

1. **Test exact pricing**
   - Configure a service with fixed price
   - Request that service
   - Verify AI says "That will be $X.XX"

2. **Test distance-based pricing**
   - Configure distance-based rule (base + $/mile)
   - Provide miles in conversation
   - Verify calculated price

3. **Test missing inputs**
   - Configure rule requiring miles
   - Don't provide miles
   - Verify AI asks for miles

4. **Test out of area**
   - Configure 50-mile radius
   - Provide location 60 miles away
   - Verify AI says "outside our service area"

5. **Test modifiers**
   - Add 10% surcharge
   - Request service with $100 base price
   - Verify final price is $110

6. **Test readiness card**
   - Remove all services
   - See error in QuoteReadinessCard
   - Add services with prices
   - See score improve

## Architecture Notes

- **Deterministic**: Same inputs always produce same outputs (no AI randomness)
- **Safe fallbacks**: Always returns something (even if "unknown")
- **Voice-ready**: `voiceScript` is ready to speak without post-processing
- **Auditable**: Full breakdown of how price was calculated
- **Owner-actionable**: `deepLink` tells owner exactly where to fix issues
