# Required Questions Runtime Wiring

## Overview

This document shows how Required Questions are wired into the runtime AI system so that the AI automatically collects required information before providing prices, ETAs, or completing transactions.

## Changes Made

### 1. buildBusinessContext.ts - Type Definitions

**Location:** Lines 42-60 in `supabase/functions/_shared/buildBusinessContext.ts`

Added new interfaces:

```typescript
export interface RequiredQuestionField {
  key: string;
  label: string;
  ask_prompt: string;
  why_needed: string;
}

export interface RequiredQuestionsConfig {
  intent: string;
  required_inputs: RequiredQuestionField[];
  optional_inputs: RequiredQuestionField[];
}
```

### 2. BusinessContext Interface Update

**Location:** Lines 126-137 in `buildBusinessContext.ts`

Added to `intelligence` section:

```typescript
intelligence: {
  settings: { ... },
  intent_rules: IntentRule[];
  intent_rules_summary: string;
  required_questions: RequiredQuestionsConfig[];      // NEW
  required_questions_summary: string;                 // NEW
  memory_hints: MemoryHint[];
  memory_hints_summary: string;
}
```

### 3. Summary Builder Function

**Location:** Lines 515-530 in `buildBusinessContext.ts`

Added new helper function:

```typescript
function buildRequiredQuestionsSummary(configs: RequiredQuestionsConfig[]): string {
  if (configs.length === 0) return "No required questions configured";

  const summaries: string[] = [];
  for (const config of configs) {
    const requiredCount = config.required_inputs.length;
    const optionalCount = config.optional_inputs.length;

    if (requiredCount > 0) {
      const fields = config.required_inputs.slice(0, 3).map(f => f.label).join(", ");
      summaries.push(`${config.intent}: ${requiredCount} required (${fields}${requiredCount > 3 ? '...' : ''})`);
    }
  }

  return summaries.length > 0 ? summaries.join("; ") : "No required questions configured";
}
```

**Example Output:**
```
"booking: 3 required (Customer Name, Phone Number, Service); order: 2 required (Customer Name, Phone Number)"
```

### 4. Data Fetching

**Location:** Lines 741-772 in `buildBusinessContext.ts`

Modified intent rules fetching to separate required_inputs rules:

```typescript
if (includeIntelligence) {
  const { data: rules } = await supabase
    .from("business_intent_rules")
    .select("id, name, rule_type, action_json, priority")
    .eq("tenant_id", tenantId)
    .eq("is_enabled", true)
    .eq("is_suggested", false)
    .order("priority", { ascending: false })
    .limit(10);

  if (rules && rules.length > 0) {
    // Separate regular intent rules from required questions
    intentRules = rules.filter(r => r.rule_type !== "required_inputs").map(r => ({
      id: r.id,
      name: r.name,
      rule_type: r.rule_type,
      action: r.action_json || {},
      priority: r.priority || 0,
    }));

    // Extract required questions rules
    requiredQuestions = rules
      .filter(r => r.rule_type === "required_inputs" && r.action_json)
      .map(r => r.action_json as unknown as RequiredQuestionsConfig)
      .filter(config => config.intent && Array.isArray(config.required_inputs));
  }
}
```

### 5. Context Assembly

**Location:** Lines 880-893 in `buildBusinessContext.ts`

Added to intelligence section of returned context:

```typescript
intelligence: {
  settings: { ... },
  intent_rules: intentRules,
  intent_rules_summary: buildIntentRulesSummary(intentRules),
  required_questions: requiredQuestions,                              // NEW
  required_questions_summary: buildRequiredQuestionsSummary(requiredQuestions),  // NEW
  memory_hints: memoryHints,
  memory_hints_summary: buildMemoryHintsSummary(memoryHints),
},
```

### 6. Dynamic Variables for ElevenLabs

**Location:** Lines 1250-1253 in `buildBusinessContext.ts`

Added to dynamic variables object:

```typescript
// Intelligence layers
intent_rules_summary: ctx.intelligence.intent_rules_summary || "",
required_questions_summary: ctx.intelligence.required_questions_summary || "No required questions configured",  // NEW
memory_hints_summary: ctx.safety.hipaa_mode ? "" : (ctx.intelligence.memory_hints_summary || ""),
memory_enabled: ctx.intelligence.settings.memory_enabled,
```

**Key:** Dynamic variable is `required_questions_summary` and is **NEVER null** (defaults to "No required questions configured")

### 7. AI Prompt Policy Update

**Location:** Lines 1073-1140 in `buildBusinessContext.ts`

Added new section to AI prompt (inserted after DECISION PRIORITY, before BEHAVIOR RULES):

```typescript
// Required questions
if (ctx.intelligence.required_questions.length > 0) {
  prompt += `REQUIRED QUESTIONS (CRITICAL - MUST COLLECT BEFORE PROVIDING PRICES/ETA/BOOKING):

Before you can provide a price quote, ETA, or complete a booking/order/dispatch, you MUST collect all required information first.

`;

  for (const config of ctx.intelligence.required_questions) {
    const intent = config.intent;
    const requiredFields = config.required_inputs || [];

    if (requiredFields.length > 0) {
      prompt += `FOR ${intent.toUpperCase()} REQUESTS, YOU MUST ASK:\\n`;

      for (const field of requiredFields) {
        prompt += `- ${field.label}: "${field.ask_prompt}"\\n`;
        if (field.why_needed) {
          prompt += `  (Why: ${field.why_needed})\\n`;
        }
      }

      prompt += `\\n`;
    }
  }

  prompt += `WORKFLOW:
1. Customer expresses intent (e.g., "I need a plumber" or "Can I book an appointment?")
2. YOU MUST ask each required question BEFORE providing pricing or confirming availability
3. Once you have ALL required inputs, THEN you can:
   - Provide exact pricing (if service has fixed price)
   - Provide estimate (if service is "starting at")
   - Check availability and confirm booking
   - Complete the order/dispatch

CORRECT EXAMPLE:
Customer: "How much does drain cleaning cost?"
You: "I'd be happy to help with that! May I have your name and phone number first?" [collect required inputs]
Customer: "Sure, it's John at 555-1234"
You: "Thanks John! And what's the address where you need the drain cleaning?" [continue collecting]
Customer: "123 Main St"
You: "Perfect! Drain cleaning is $149. When would work best for you?"

WRONG EXAMPLE:
Customer: "How much does drain cleaning cost?"
You: "Drain cleaning is $149" [WRONG - didn't collect required info first]

EXCEPTION: If customer ONLY asks for general information (hours, location, general services), you don't need all required fields. But for pricing, booking, ordering, or dispatch, you MUST collect required inputs first.

`;
}
```

## Exact Prompt Snippet (Example)

For a service business with booking intent configured:

```
REQUIRED QUESTIONS (CRITICAL - MUST COLLECT BEFORE PROVIDING PRICES/ETA/BOOKING):

Before you can provide a price quote, ETA, or complete a booking/order/dispatch, you MUST collect all required information first.

FOR BOOKING REQUESTS, YOU MUST ASK:
- Customer Name: "May I have your name please?"
  (Why: Required to identify the booking)
- Phone Number: "What's the best phone number to reach you at?"
  (Why: Required for booking confirmation and updates)
- Service: "Which service are you interested in?"
  (Why: Required to schedule the appropriate service)
- Address: "What's the address where you need service?"
  (Why: Required to dispatch technician)

WORKFLOW:
1. Customer expresses intent (e.g., "I need a plumber" or "Can I book an appointment?")
2. YOU MUST ask each required question BEFORE providing pricing or confirming availability
3. Once you have ALL required inputs, THEN you can:
   - Provide exact pricing (if service has fixed price)
   - Provide estimate (if service is "starting at")
   - Check availability and confirm booking
   - Complete the order/dispatch

CORRECT EXAMPLE:
Customer: "How much does drain cleaning cost?"
You: "I'd be happy to help with that! May I have your name and phone number first?" [collect required inputs]
Customer: "Sure, it's John at 555-1234"
You: "Thanks John! And what's the address where you need the drain cleaning?" [continue collecting]
Customer: "123 Main St"
You: "Perfect! Drain cleaning is $149. When would work best for you?"

WRONG EXAMPLE:
Customer: "How much does drain cleaning cost?"
You: "Drain cleaning is $149" [WRONG - didn't collect required info first]

EXCEPTION: If customer ONLY asks for general information (hours, location, general services), you don't need all required fields. But for pricing, booking, ordering, or dispatch, you MUST collect required inputs first.
```

## Data Flow

### Configuration → Runtime

1. **Owner configures** required questions in Settings → Required Questions
2. **Saved to database** in `business_intent_rules` table with `rule_type = 'required_inputs'`
3. **buildBusinessContext fetches** rules where `is_enabled = true`
4. **Separates** required_inputs rules from other intent rules
5. **Structures** into `RequiredQuestionsConfig[]` array
6. **Builds summary** for dynamic variables
7. **Adds to prompt** as explicit instructions for AI

### Runtime → AI Behavior

1. **twilio-inbound** calls `buildBusinessContext(tenantId, ...)`
2. **Context includes** `ctx.intelligence.required_questions`
3. **Prompt includes** REQUIRED QUESTIONS section with exact ask_prompts
4. **Dynamic variable** `required_questions_summary` sent to ElevenLabs
5. **AI sees instructions** and asks required questions before pricing
6. **Customer provides** required information
7. **AI then provides** pricing/ETA/booking confirmation

## Testing

### Verify Context Includes Rules

Check `/debug/ai-context` page or inspect `buildBusinessContext` output:

```typescript
{
  intelligence: {
    required_questions: [
      {
        intent: "booking",
        required_inputs: [
          { key: "customer_name", label: "Customer Name", ask_prompt: "May I have your name please?", why_needed: "Required to identify the booking" },
          { key: "customer_phone", label: "Phone Number", ask_prompt: "What's the best phone number to reach you at?", why_needed: "Required for booking confirmation" }
        ],
        optional_inputs: []
      }
    ],
    required_questions_summary: "booking: 2 required (Customer Name, Phone Number)"
  }
}
```

### Verify Dynamic Variables

ElevenLabs dynamic variables should include:

```json
{
  "required_questions_summary": "booking: 2 required (Customer Name, Phone Number)"
}
```

### Verify AI Behavior

**Test Case 1: Customer Asks for Price**

```
Customer: "How much does drain cleaning cost?"
Expected AI: "I'd be happy to help! May I have your name please?"
[AI collects all required fields]
Expected AI: "Perfect! Drain cleaning is $149. When would work best for you?"
```

**Test Case 2: Customer Books Without Providing Info**

```
Customer: "I want to book drain cleaning for tomorrow"
Expected AI: "Great! Let me get some information first. May I have your name?"
[AI collects all required fields]
Expected AI: "Thanks! Let me check availability for tomorrow..."
```

**Test Case 3: General Question (No Required Fields)**

```
Customer: "What are your business hours?"
Expected AI: "We're open Monday-Friday 9 AM to 5 PM"
[No required fields needed for general info]
```

## Integration Points

### Where Context is Built

- `supabase/functions/twilio-inbound/index.ts` - Voice calls
- `supabase/functions/ai-text-reply/index.ts` - SMS conversations
- `supabase/functions/elevenlabs-conversation-token/index.ts` - Browser simulator

All three call `buildBusinessContext()` and receive the same required questions configuration.

### Where Rules Are Created/Updated

- Settings page: `src/pages/app/SettingsPage.tsx` (section: "ai-rules")
- Component: `src/components/settings/RequiredQuestionsEditor.tsx`
- Database: `business_intent_rules` table

### Where Rules Are Retrieved

- `buildBusinessContext()` in `supabase/functions/_shared/buildBusinessContext.ts`
- Filters: `rule_type = 'required_inputs'` AND `is_enabled = true` AND `is_suggested = false`

## Benefits

### For AI

1. **Clear Instructions:** Knows exactly what to ask before pricing
2. **Consistent Behavior:** Always collects same info for same intent
3. **Validation:** Can check if all required fields are filled
4. **Error Handling:** Can reference why_needed when user refuses

### For Business Owners

1. **Completeness:** Never miss critical customer information
2. **Compliance:** Ensure required fields are always collected
3. **Customization:** Add business-specific questions
4. **Control:** Edit prompts to match brand voice

### For Customers

1. **Transparency:** Know why information is needed
2. **Efficiency:** AI asks in a logical order
3. **Accuracy:** Pricing/ETA based on complete information
4. **Trust:** Professional, consistent experience

## Files Modified

1. **`supabase/functions/_shared/buildBusinessContext.ts`**
   - Added type definitions (RequiredQuestionField, RequiredQuestionsConfig)
   - Added required_questions to BusinessContext interface
   - Added buildRequiredQuestionsSummary() helper
   - Modified data fetching to extract required_inputs rules
   - Added required_questions to context assembly
   - Added required_questions_summary to dynamic variables
   - Added REQUIRED QUESTIONS section to AI prompt

## No Breaking Changes

✅ **Backwards Compatible:** If no required questions configured, summary is "No required questions configured"
✅ **Non-Invasive:** Doesn't affect existing intent rules
✅ **Opt-In:** Only activates when owner configures required questions
✅ **Graceful Fallback:** AI still works without required questions

## Next Steps

1. Test with real calls to verify AI asks questions in correct order
2. Monitor call transcripts to ensure compliance
3. Add analytics to track how often required questions are skipped
4. Consider adding validation in extraction layer to flag missing required inputs
