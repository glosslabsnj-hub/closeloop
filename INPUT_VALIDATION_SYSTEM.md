# Input Validation System

## Overview

The **Input Validation System** ensures required inputs meet quality standards beyond just "non-empty". Each field type has specific validation rules that the AI must enforce before proceeding with pricing, booking, or dispatch.

## Architecture

### 1. Validators (`supabase/functions/_shared/inputValidators.ts`)

Core validation functions for different data types:

```typescript
// Address validation - requires street number/cross streets + city/ZIP
validateAddress(value: string): ValidationResult

// Date validation - accepts specific dates, rejects vague terms
validateDate(value: string): ValidationResult

// Time validation - accepts specific times or general periods
validateTime(value: string): ValidationResult

// Miles/distance validation - requires numeric distance
validateMiles(value: string): ValidationResult

// Email validation - standard email format
validateEmail(value: string): ValidationResult

// Phone validation - requires 7+ digits
validatePhone(value: string): ValidationResult

// Party size validation - requires specific number
validatePartySize(value: string): ValidationResult
```

### 2. Automatic Field-Key Mapping

The `validateRequiredInput()` function automatically selects the right validator based on field key:

```typescript
validateRequiredInput("pickup_address", "downtown")
// → Uses validateAddress()
// → Returns: { valid: false, reason: "Address must include street number..." }

validateRequiredInput("reservation_date", "sometime next week")
// → Uses validateDate()
// → Returns: { valid: false, reason: "Please provide a specific date..." }

validateRequiredInput("customer_name", "John Smith")
// → Uses validateNonEmpty() (default)
// → Returns: { valid: true }
```

### 3. Intent Validation (`supabase/functions/_shared/validateIntentInputs.ts`)

High-level validation for complete intents:

```typescript
const validation = validateIntentInputs(
  "dispatch",
  extractedData,
  requiredQuestionsConfigs
);

if (!validation.isComplete) {
  console.log(validation.missingInputs);
  // [
  //   {
  //     key: "pickup_address",
  //     label: "Pickup Address (Exact)",
  //     reason: "Address must include street number OR cross streets...",
  //     ask_prompt: "What's the exact street address for pickup?"
  //   }
  // ]

  console.log(validation.nextPrompt);
  // "I need a more specific address with a street number and city..."
}
```

## Validation Rules

### Address Fields (pickup_address, dropoff_address, delivery_address)

**Valid:**
- `"123 Main Street, Chicago"` - street number + city
- `"123 Main St, 60601"` - street number + ZIP
- `"Corner of Main and Oak, Springfield"` - cross streets + city
- `"Main & 5th, 62701"` - cross streets + ZIP
- `"Exit 42 on I-94, Detroit"` - exit/marker + city

**Invalid:**
- `"downtown"` - too vague
- `"Main Street"` - no number or cross streets
- `"123 Main"` - no city or ZIP

**Re-ask Prompt:**
> "I need a more specific address with a street number and city (like '123 Main Street, Chicago') or nearest cross streets (like 'Main & Oak in Springfield'). What's the exact address?"

### Date Fields (reservation_date, preferred_date)

**Valid:**
- `"tomorrow"`, `"today"`, `"next Monday"`
- `"12/25"`, `"12/25/2024"`
- `"Dec 25"`, `"December 25th"`

**Invalid:**
- `"soon"`, `"later"`, `"sometime"`

**Re-ask Prompt:**
> "I need a specific date like 'tomorrow', 'December 25th', or '12/25'. What date works best?"

### Time Fields (reservation_time, preferred_time)

**Valid:**
- `"2pm"`, `"2:30pm"`, `"14:30"`
- `"morning"`, `"afternoon"`, `"evening"`
- `"around 2pm"`, `"before 3pm"`

**Invalid:**
- `"later"`, `"sometime"`, `"whenever"`

**Re-ask Prompt:**
> "I need a specific time like '2pm', 'morning', or 'around 3:00'. What time would work best?"

### Miles/Distance (estimated_miles)

**Valid:**
- `"5"`, `"5 miles"`, `"about 10 miles"`
- `"5-10 miles"` (range)

**Invalid:**
- `"not far"`, `"close by"` - no number
- `"1000 miles"` - unreasonably high

**Re-ask Prompt:**
> "I need an estimated distance in miles, like '5 miles' or 'about 10'. How far would you estimate?"

### Party Size (party_size)

**Valid:**
- `"2"`, `"4 people"`, `"party of 6"`

**Invalid:**
- `"a few"`, `"some people"` - not specific

**Re-ask Prompt:**
> "I need a specific number of people, like '2' or 'party of 4'. How many exactly?"

### Phone Numbers (customer_phone, phone)

**Valid:**
- `"555-1234"`, `"(555) 123-4567"`, `"555.123.4567"`
- `"+1 555 123 4567"`

**Invalid:**
- Fewer than 7 digits

**Re-ask Prompt:**
> "I need a complete phone number with area code, like '555-123-4567'. What's the full number?"

### Email (customer_email, email)

**Valid:**
- `"john@example.com"`

**Invalid:**
- Missing @ or domain

**Re-ask Prompt:**
> "I need a valid email address like 'yourname@example.com'. What's your email?"

## AI Prompt Integration

The AI receives validation instructions in `buildBusinessContext.ts` (lines 1117-1195):

```
VALIDATION REQUIREMENTS (CRITICAL - ENFORCE DATA QUALITY):
Required inputs must meet validation rules, not just be "non-empty":

1. ADDRESS FIELDS (pickup_address, dropoff_address, delivery_address):
   ✓ Valid: "123 Main Street, Chicago" (street number + city)
   ✓ Valid: "Corner of Main and Oak, Springfield" (cross streets + city)
   ✗ Invalid: "downtown" (too vague)
   → If invalid, re-ask: "I need a more specific address..."

2. DATE FIELDS (reservation_date, preferred_date):
   ✓ Valid: "tomorrow", "December 25th"
   ✗ Invalid: "soon", "later"
   → If invalid, re-ask: "I need a specific date..."

[... full validation rules for all field types ...]

RE-ASK WORKFLOW:
1. Customer provides vague/invalid input
2. You recognize it doesn't meet validation
3. You politely re-ask with specific guidance
4. Customer provides valid input
5. Continue to next required field
```

## UI Integration

### Settings UI (RequiredQuestionsEditor.tsx)

Each field editor now displays validation hints:

```tsx
{/* Validation Hint */}
{validationHint && (
  <div className="p-2 rounded bg-blue-500/10 border border-blue-500/20">
    <p className="text-xs font-medium text-blue-400 mb-1">
      {validationHint.type} Validation
    </p>
    <p className="text-xs text-muted-foreground">
      ✓ '123 Main St, Chicago' or ✓ 'Main & Oak, 62701'
    </p>
    <p className="text-xs text-muted-foreground">
      ✗ 'downtown' or ✗ '123 Main' (no city/ZIP)
    </p>
  </div>
)}
```

**Example for pickup_address field:**

![Validation Hint Example]
```
┌─────────────────────────────────────────┐
│ Address Validation                      │
│ ✓ '123 Main St, Chicago' or            │
│   ✓ 'Main & Oak, 62701'                │
│ ✗ 'downtown' or                        │
│   ✗ '123 Main' (no city/ZIP)           │
└─────────────────────────────────────────┘
```

## Usage in Extraction Workflow

### Example: Dispatch Request

```typescript
// 1. Extract data from conversation
const extractedData = {
  customer_name: "John Smith",
  customer_phone: "555-1234",
  pickup_address: "downtown", // INVALID
  dropoff_address: "123 Oak St, Chicago" // VALID
};

// 2. Validate against required questions config
const validation = validateIntentInputs(
  "dispatch",
  extractedData,
  requiredQuestionsConfigs
);

// 3. Check if complete
if (!validation.isComplete) {
  // 4. Get missing/invalid inputs
  console.log(validation.missingInputs);
  // [
  //   {
  //     key: "pickup_address",
  //     label: "Pickup Address (Exact)",
  //     reason: "Address must include a street number (e.g., '123 Main St') OR cross streets (e.g., 'Main & Oak') OR exit number (e.g., 'Exit 42 on I-94')",
  //     ask_prompt: "What's the exact street address for pickup? If you don't have the exact address, can you give me the nearest cross streets and city?"
  //   }
  // ]

  // 5. Build instruction for AI
  const instruction = buildMissingInputsInstruction(validation);
  console.log(instruction);
  // "IMPORTANT: You are missing 1 required input before you can provide pricing...
  //  NEXT REQUIRED INPUT:
  //  - Field: Pickup Address (Exact)
  //  - Status: Address must include a street number OR cross streets OR exit number
  //  - Ask: "I need a more specific address with a street number and city..."

  // 6. Inject into AI's next turn
  // (AI will re-ask with specific guidance)
}
```

### Example Conversation Flow

**Turn 1:**
```
Customer: "I need a tow"
AI: "I can help! What's the exact street address where your car is located?"
```

**Turn 2:**
```
Customer: "I'm downtown"
AI: [Extracts: pickup_address = "downtown"]
AI: [Validates: INVALID - too vague]
AI: "I need a more specific address with a street number and city, like '123 Main Street, Chicago'. Or if you don't know the exact address, can you tell me the nearest cross streets?"
```

**Turn 3:**
```
Customer: "I'm at Main and 5th in Springfield"
AI: [Extracts: pickup_address = "Main and 5th in Springfield"]
AI: [Validates: VALID - has cross streets + city]
AI: "Got it! And where would you like us to tow your vehicle?"
```

## Integration Points

### Where Validation Runs

1. **AI Response Generation** (real-time during conversation)
   - After extracting data from each turn
   - Before providing pricing/ETA/booking confirmation
   - Validates inputs and re-asks if invalid

2. **Extraction Layer** (post-conversation or mid-conversation checkpoints)
   - Validates extracted CanonicalPayload data
   - Flags missing/invalid required inputs
   - Can trigger follow-up automations

3. **Handoff Functions** (before creating bookings/orders/dispatches)
   - Final validation before writing to database
   - Ensures data quality for external integrations
   - Prevents incomplete records

### Files Modified

1. **`supabase/functions/_shared/inputValidators.ts`** (NEW)
   - Core validation functions
   - Field-key mapping logic
   - ~350 lines

2. **`supabase/functions/_shared/validateIntentInputs.ts`** (NEW)
   - Intent-level validation
   - Missing inputs detection
   - AI instruction builder
   - ~150 lines

3. **`supabase/functions/_shared/buildBusinessContext.ts`** (MODIFIED)
   - Added VALIDATION REQUIREMENTS section to AI prompt
   - Lines 1117-1195
   - Includes validation rules, re-ask workflow, and examples

4. **`src/components/settings/RequiredQuestionsEditor.tsx`** (MODIFIED)
   - Added `getValidationHint()` helper function
   - Added validation hint display in FieldEditor
   - Shows validation rules in UI for owner reference

## Benefits

### For AI
1. **Clear validation rules** - knows exactly what constitutes a valid input
2. **Specific re-ask prompts** - can guide customers to provide valid data
3. **Prevents garbage data** - won't accept "downtown" for address fields
4. **Consistent behavior** - same validation across all conversations

### For Business Owners
1. **Higher data quality** - complete, valid addresses/dates/times
2. **Accurate pricing** - pricing based on real addresses, not vague locations
3. **Fewer manual corrections** - AI collects proper data upfront
4. **Better integrations** - clean data flows to external systems

### For Customers
1. **Clear expectations** - AI explains what format is needed
2. **Faster resolution** - AI guides them to provide correct info
3. **Accurate quotes** - pricing based on actual addresses/distances
4. **Professional experience** - AI doesn't accept vague responses

## Testing Checklist

- [ ] Test address validation with valid inputs (street number + city)
- [ ] Test address validation with cross streets (Main & Oak)
- [ ] Test address validation with invalid inputs ("downtown")
- [ ] Test date validation with specific dates ("tomorrow", "12/25")
- [ ] Test date validation with vague terms ("soon", "later")
- [ ] Test time validation with specific times ("2pm", "morning")
- [ ] Test miles validation with numeric values ("5 miles")
- [ ] Test miles validation with vague terms ("not far")
- [ ] Test party size validation with numbers ("4 people")
- [ ] Test party size validation with vague terms ("a few")
- [ ] Test phone validation with various formats
- [ ] Test email validation with valid/invalid formats
- [ ] Test validateIntentInputs with dispatch intent
- [ ] Test checkRequiredInputs with missing fields
- [ ] Test checkRequiredInputs with invalid fields
- [ ] Verify validation hints appear in UI for address fields
- [ ] Verify validation hints appear in UI for date/time fields
- [ ] Test AI re-asking with specific validation guidance

## Future Enhancements

1. **Custom validation rules** - Let owners define regex patterns for custom fields
2. **Conditional validation** - Different rules based on other field values
3. **Multi-language validation** - Support for non-English addresses/dates
4. **AI-assisted correction** - AI suggests corrections ("Did you mean '123 Main St'?")
5. **Validation analytics** - Track which fields fail validation most often
6. **Fuzzy matching** - Accept close-enough inputs and confirm with customer
