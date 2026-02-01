# Pricing Resolution Contract

## Overview

The **Pricing Resolution Contract** defines a deterministic waterfall for pricing lookup that the AI must follow. It ensures consistent, accurate pricing with clear fallbacks and proper logging when pricing cannot be determined.

## The Contract: Deterministic Waterfall

```
┌─────────────────────────────────────┐
│ Customer asks for pricing           │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│ STEP 1: Check Required Inputs      │
│ - Are all required inputs collected?│
│ - Are they VALID (not just present)?│
└──────────────┬──────────────────────┘
               │
          ┌────┴────┐
          │ Missing/ │
          │ Invalid? │
          └────┬────┘
               │ YES
               ▼
       ┌───────────────┐
       │ ASK FOR INPUTS│──► "I need the pickup address..."
       └───────────────┘
               │ NO (All valid)
               ▼
┌─────────────────────────────────────┐
│ STEP 2: Match Pricing Rules        │
│ - Check pricing_rules_jsonb         │
│ - Match service + required inputs   │
│ - Calculate price                   │
└──────────────┬──────────────────────┘
               │
          ┌────┴────┐
          │ Rule    │
          │ matched?│
          └────┬────┘
               │ YES
               ▼
       ┌───────────────┐
       │ PROVIDE PRICE │──► "That will be $90"
       └───────────────┘
               │ NO
               ▼
┌─────────────────────────────────────┐
│ STEP 3: Fallback to Service Price  │
│ - Check services table              │
│ - Use fixed/starting_at/quote_only  │
└──────────────┬──────────────────────┘
               │
          ┌────┴────┐
          │ Service │
          │ price?  │
          └────┬────┘
               │ YES
               ▼
       ┌───────────────┐
       │ PROVIDE PRICE │──► "Drain cleaning is $149"
       └───────────────┘
               │ NO
               ▼
┌─────────────────────────────────────┐
│ STEP 4: Unknown - Need More Info   │
│ - Log failure (reason + deep link)  │
│ - Ask for missing info OR           │
│ - Explain custom quote needed       │
└──────────────┬──────────────────────┘
               ▼
       ┌───────────────┐
       │ COLLECT INFO  │──► "Let me get your details..."
       └───────────────┘
```

## Implementation

### Core Function: `resolvePricing()`

**File:** [supabase/functions/_shared/pricingResolution.ts](supabase/functions/_shared/pricingResolution.ts)

```typescript
export function resolvePricing(
  serviceName: string | null,
  extractedData: Record<string, any>,
  pricingRules: PricingRule[],
  services: Service[],
  tenantId: string
): PricingResolutionResult
```

**Returns:**
```typescript
{
  success: boolean;
  price?: number;
  priceRange?: { min: number; max: number };
  priceType: "exact" | "estimate" | "range" | "quote_only" | "unknown";
  reason?: string;
  missingInputs?: Array<{ key: string; label: string; why: string }>;
  deepLink?: string;
  logData?: Record<string, any>;
}
```

### Pricing Rule Types

1. **Flat Rate**
   - Fixed price regardless of inputs
   - Example: "Drain cleaning: $149"

2. **Per-Unit**
   - Price × quantity
   - Example: "Oil change: $40/vehicle"

3. **Distance-Based**
   - Base price + (miles × price_per_mile)
   - Example: "Towing: $50 + $8/mile"
   - Required inputs: `miles` or `estimated_miles`

4. **Tiered**
   - Different prices based on value ranges
   - Example: "Towing: 0-5 miles = $75, 5-15 miles = $120, 15+ = $180"

5. **Range-Only**
   - Provides min-max range instead of exact price
   - Example: "Towing: $75-$180 depending on distance"

6. **Quote-Only**
   - Custom quote required, no automated pricing
   - Example: "Custom jobs require individual quotes"

## AI Prompt Integration

The AI receives the pricing contract in `buildBusinessContext.ts` (lines 1207-1268):

```
PRICING RESOLUTION CONTRACT (CRITICAL - FOLLOW DETERMINISTIC WATERFALL):

When a customer asks for pricing, you MUST follow this exact sequence:

STEP 1: CHECK REQUIRED INPUTS
- First, ensure ALL required inputs for the intent are collected AND VALID
- If any required inputs are missing or invalid, ask for them FIRST before attempting pricing
- Do NOT proceed to pricing until validation passes

STEP 2: MATCH PRICING RULES
- If pricing rules are configured, attempt to match and calculate:
  {pricing_rules_summary} (from dynamic variables)
- Example: Distance-based rule requires "miles" + "vehicle_type"
- If rule matches AND inputs are valid → Provide calculated price
- If rule is range-only → Provide price range
- If rule is quote-only → Explain that custom quote is needed

STEP 3: FALLBACK TO SERVICE PRICE
- If no pricing rule matched, check if service has fixed price
- Fixed price → Provide exact price: "That will be $X"
- Starting at price → Provide estimate: "That starts at $X"
- Quote only → Explain custom quote needed

STEP 4: UNKNOWN - COLLECT MORE INFO
- If neither pricing rules nor service price available → Ask for missing information
```

### Dynamic Variables

**Added to ElevenLabs dynamic_variables ([buildBusinessContext.ts:1507-1511](supabase/functions/_shared/buildBusinessContext.ts#L1507-L1511)):**

```typescript
{
  pricing_rules_summary: "Towing: distance-based (needs: miles, vehicle_type); Drain cleaning: flat rate; ...",
  base_prep_minutes: 30,
  busy_buffer_minutes: 15,
  current_busyness_pct: 0
}
```

**Summary Format:**
- `"No pricing rules configured"` - if no rules exist
- `"Towing: distance-based (needs: miles, vehicle_type); Drain cleaning: flat rate"` - shows first 5 rules
- `"Towing: distance-based (needs: miles); +3 more"` - indicates additional rules

## Example Scenarios

### Scenario 1: Distance-Based Towing (Success)

**Customer:** "How much to tow my car?"

**AI Process:**
```typescript
// Step 1: Check required inputs
requiredInputs = ["pickup_address", "dropoff_address", "miles"]
extractedData = {
  pickup_address: "123 Main St, Chicago",  // VALID
  dropoff_address: "456 Oak Ave, Chicago", // VALID
  miles: "5"                               // VALID
}
// ✓ All inputs valid

// Step 2: Match pricing rules
rule = {
  type: "distance-based",
  config: {
    base_price: 50,
    price_per_mile: 8,
    min_price: 50,
    max_price: 300
  }
}
price = 50 + (5 × 8) = 90
// ✓ Rule matched

result = {
  success: true,
  price: 90,
  priceType: "exact"
}
```

**AI Response:** "That will be $90 for a 5-mile tow from Main Street to Oak Avenue."

### Scenario 2: Missing Address (Step 1 Failure)

**Customer:** "How much to tow from downtown to the airport?"

**AI Process:**
```typescript
// Step 1: Check required inputs
requiredInputs = ["pickup_address", "dropoff_address", "miles"]
extractedData = {
  pickup_address: "downtown",  // INVALID - too vague
  dropoff_address: "airport"   // INVALID - too vague
}
// ✗ Inputs invalid

result = {
  success: false,
  priceType: "unknown",
  reason: "Missing or invalid required inputs for pricing",
  missingInputs: [
    {
      key: "pickup_address",
      label: "Pickup Address (Exact)",
      why: "Address must include street number OR cross streets..."
    }
  ]
}
```

**AI Response:** "I need a more specific address with a street number and city, like '123 Main Street, Chicago'. What's the exact address downtown where your car is?"

### Scenario 3: Fallback to Service Price (Step 3)

**Customer:** "How much for drain cleaning?"

**AI Process:**
```typescript
// Step 1: Check required inputs
// (Drain cleaning has no special required inputs beyond name/phone)
// ✓ All inputs valid

// Step 2: Match pricing rules
pricingRules = [] // No rules configured for drain cleaning
// ✗ No matching rule

// Step 3: Fallback to service price
service = {
  name: "Drain Cleaning",
  price: 149,
  pricing_type: "fixed"
}
// ✓ Service price found

result = {
  success: true,
  price: 149,
  priceType: "exact"
}
```

**AI Response:** "Drain cleaning is $149. When would work best for you?"

### Scenario 4: Unknown - No Configuration (Step 4)

**Customer:** "How much for custom plumbing work?"

**AI Process:**
```typescript
// Step 1: Check required inputs
// ✓ All inputs valid

// Step 2: Match pricing rules
pricingRules = [] // No rules for "custom plumbing"
// ✗ No matching rule

// Step 3: Fallback to service price
services = [] // "Custom plumbing" not in services list
// ✗ No service found

// Step 4: Unknown - need more info
result = {
  success: false,
  priceType: "unknown",
  reason: 'Service "Custom plumbing work" not found',
  deepLink: "/app/services"
}

// Log failure
logPricingFailure(result, {
  tenantId: "...",
  intent: "booking"
})
```

**AI Response:** "I'll need to provide a custom quote for that. Let me collect your details and we'll follow up with pricing."

**Logged to console:**
```json
{
  "level": "warn",
  "message": "Pricing resolution failed",
  "reason": "Service \"Custom plumbing work\" not found",
  "deepLink": "/app/services",
  "context": {
    "tenantId": "...",
    "intent": "booking"
  },
  "timestamp": "2026-02-01T10:30:00Z"
}
```

## Logging System

### When Failures Are Logged

Pricing failures are logged to console when:
1. Required inputs are missing or invalid
2. No pricing rules match
3. Service not found in services table
4. Service has no price configured

### Log Structure

```typescript
{
  level: "warn",
  message: "Pricing resolution failed",
  reason: string,                    // Human-readable reason
  missingInputs: string[],           // Array of missing field keys
  deepLink: string,                  // URL to fix configuration
  context: {
    tenantId: string,
    sessionId?: string,
    intent: string
  },
  logData: Record<string, any>,      // Additional debugging data
  timestamp: string                   // ISO 8601 timestamp
}
```

### Deep Link Generation

Deep links help owners fix configuration issues:

| Reason | Deep Link |
|--------|-----------|
| "No pricing rules configured" | `/app/settings?section=pricing-estimates&tab=pricing-rules` |
| "Service not found" | `/app/services` |
| "Service has no price" | `/app/services` |
| "Missing required information" | `/app/settings?section=ai-rules` |
| Other | `/app/settings?section=pricing-estimates` |

## Integration Points

### 1. Voice Calls (twilio-inbound)

```typescript
// Extract data from conversation
const extractedData = extractFromTranscript(messages);

// Resolve pricing
const pricingResult = resolvePricing(
  extractedData.service_name,
  extractedData,
  tenant.pricing_rules_jsonb.rules,
  services,
  tenantId
);

if (!pricingResult.success) {
  // Log failure
  logPricingFailure(pricingResult, {
    tenantId,
    sessionId,
    intent: extractedData.intent
  });

  // Inject missing inputs instruction into AI prompt
  const instruction = buildMissingInputsInstruction(pricingResult);
  // AI will ask for missing inputs in next turn
}
```

### 2. SMS Conversations (ai-text-reply)

Same flow as voice calls, but with text-based responses.

### 3. Post-Conversation Extraction

```typescript
// After conversation ends, validate CanonicalPayload
const pricingResult = resolvePricing(
  payload.service_name,
  payload,
  pricingRules,
  services,
  tenantId
);

if (!pricingResult.success) {
  // Flag payload as incomplete
  payload.validation_status = "incomplete";
  payload.validation_notes = pricingResult.reason;
  payload.deep_link = pricingResult.deepLink;
}
```

## Files Changed

1. **[supabase/functions/_shared/pricingResolution.ts](supabase/functions/_shared/pricingResolution.ts)** (NEW)
   - Core pricing resolution logic
   - ~350 lines
   - Functions: `resolvePricing()`, `formatPricingForVoice()`, `logPricingFailure()`

2. **[supabase/functions/_shared/buildBusinessContext.ts](supabase/functions/_shared/buildBusinessContext.ts)** (MODIFIED)
   - Added pricing section to BusinessContext interface (lines 152-158)
   - Added `buildPricingRulesSummary()` helper (lines 542-570)
   - Added pricing to context assembly (lines 935-938)
   - Added pricing_rules_summary to dynamic variables (lines 1507-1511)
   - Added PRICING RESOLUTION CONTRACT to AI prompt (lines 1207-1268)

3. **[PRICING_RESOLUTION_CONTRACT.md](PRICING_RESOLUTION_CONTRACT.md)** (NEW)
   - Complete documentation
   - Integration examples
   - Testing scenarios

## Benefits

### For AI
1. **Clear decision tree** - knows exactly what to do in each situation
2. **No ambiguity** - deterministic waterfall, not guesswork
3. **Proper fallbacks** - graceful degradation when data missing
4. **Validation-first** - won't quote wrong prices due to vague addresses

### For Business Owners
1. **Consistent pricing** - same logic every time
2. **Audit trail** - failures logged with deep links to fix
3. **Flexible configuration** - can use rules, service prices, or both
4. **Data quality** - AI won't accept invalid inputs

### For Customers
1. **Accurate quotes** - based on actual addresses, not estimates
2. **Clear guidance** - AI explains what info is needed
3. **No surprises** - pricing based on validated inputs
4. **Professional experience** - AI knows when it can/cannot price

## Testing Checklist

- [ ] Test distance-based pricing with valid addresses + miles
- [ ] Test distance-based pricing with vague addresses (should ask for details)
- [ ] Test flat rate pricing (should provide immediate price)
- [ ] Test service without pricing rules (should fallback to service price)
- [ ] Test service not in catalog (should explain custom quote needed)
- [ ] Test missing required inputs (should ask for them first)
- [ ] Test invalid inputs (should re-ask with validation guidance)
- [ ] Verify pricing failures are logged to console
- [ ] Verify deep links are correct for each failure type
- [ ] Test pricing_rules_summary appears in dynamic variables
- [ ] Test AI follows waterfall in correct order
- [ ] Test range-only pricing provides min-max
- [ ] Test quote-only pricing explains custom quote
- [ ] Verify logPricingFailure() writes structured JSON

## Future Enhancements

1. **Real-time distance calculation** - Use geocoding API to calculate actual miles
2. **Dynamic pricing** - Time-based surge pricing (peak hours cost more)
3. **Customer-specific pricing** - Loyalty discounts, volume pricing
4. **Multi-service bundling** - Package deals across multiple services
5. **Tax calculation** - Auto-calculate tax based on location
6. **Competitor pricing** - Compare to market rates and adjust
7. **AI-suggested pricing** - Learn from historical data to suggest optimal pricing
