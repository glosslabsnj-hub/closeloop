
# Multi-Industry Automated Testing Framework

## Summary

Create a comprehensive automated test suite that validates data extraction across **all 5 business modes**. This ensures that any parsing pattern issue (like the missing pizza) is caught before deployment—not discovered by a customer.

---

## Architecture: Industry-Agnostic Extraction Testing

### Current State

| Business Mode | Extraction Tests | Coverage |
|--------------|------------------|----------|
| Food | 33 tests | Pizza, pasta, drinks, totals |
| Service | 0 tests | No coverage |
| Dispatch | 0 tests | No coverage |
| Medical | 0 tests | No coverage |
| General | 0 tests | No coverage |

### Target State

| Business Mode | Test Categories | Example Scenarios |
|--------------|-----------------|-------------------|
| Food | 40+ tests | Pizza (all styles), pasta, drinks, Asian cuisine, Mexican, totals, modifiers |
| Service | 25+ tests | Appointment booking, service types, date/time extraction, pricing questions |
| Dispatch | 25+ tests | Location extraction, urgency detection, job types, vehicle info |
| Medical | 20+ tests | New patient detection, appointment types, HIPAA compliance, urgency |
| General | 15+ tests | Callback requests, message taking, inquiry classification |

---

## Implementation Plan

### Phase 1: Restructure Test Architecture

**Create modular test files:**

```text
supabase/functions/elevenlabs-webhook/
├── index.ts                           # Main webhook handler
├── extraction.test.ts                 # Food extraction (existing, enhanced)
├── extraction-service.test.ts         # NEW: Service mode tests
├── extraction-dispatch.test.ts        # NEW: Dispatch mode tests
├── extraction-medical.test.ts         # NEW: Medical mode tests
├── extraction-general.test.ts         # NEW: General mode tests
└── _shared/
    └── test-helpers.ts                # Shared test utilities
```

### Phase 2: Expand Food Mode Tests

Add coverage for more cuisine types:

**New test categories:**
- Asian restaurants (sushi, Chinese, Thai, Vietnamese)
- Mexican restaurants (tacos, burritos, bowls)
- American casual (burgers, wings, sandwiches)
- Bakery/cafe (coffee, pastries)
- Regional variations (spelling, pronunciation differences)

**Example new tests:**
```typescript
// Asian cuisine
Deno.test("Food: '2 california rolls and a miso soup'", ...)
Deno.test("Food: 'pad thai with extra peanuts'", ...)
Deno.test("Food: 'general tso chicken'", ...)

// Mexican
Deno.test("Food: '3 tacos al pastor'", ...)
Deno.test("Food: 'burrito bowl no beans'", ...)

// American
Deno.test("Food: 'double cheeseburger with fries'", ...)
Deno.test("Food: '10 piece wings buffalo'", ...)
```

### Phase 3: Create Service Mode Tests

Test booking-related extraction:

```typescript
// extraction-service.test.ts

Deno.test("Service: 'I need a haircut appointment'", () => {
  const result = extractServiceData([
    { role: "user", message: "I need a haircut appointment for tomorrow" }
  ]);
  assertEquals(result.service_requested, "haircut");
  assertExists(result.preferred_date);
});

Deno.test("Service: 'Schedule oil change for my Honda'", () => {
  const result = extractServiceData([
    { role: "user", message: "Can I schedule an oil change for my Honda Civic?" }
  ]);
  assertEquals(result.service_requested.includes("oil change"), true);
  assertEquals(result.vehicle, "Honda Civic");
});

Deno.test("Service: Date extraction - 'next Tuesday at 2pm'", () => {
  const result = extractServiceData([
    { role: "user", message: "I'd like to come in next Tuesday at 2pm" }
  ]);
  assertEquals(result.preferred_date, "Tuesday");
  assertEquals(result.preferred_time, "2pm");
});

Deno.test("Service: Callback request detection", () => {
  const result = extractServiceData([
    { role: "user", message: "Can someone call me back about pricing?" }
  ]);
  assertEquals(result.callback_requested, true);
});
```

### Phase 4: Create Dispatch Mode Tests

Test urgency and location extraction:

```typescript
// extraction-dispatch.test.ts

Deno.test("Dispatch: 'My car broke down on Highway 101'", () => {
  const result = extractDispatchData([
    { role: "user", message: "My car broke down on Highway 101 near exit 42" }
  ]);
  assertEquals(result.job_type, "tow");
  assertExists(result.pickup_address);
  assertEquals(result.urgency, "high");
});

Deno.test("Dispatch: 'I locked my keys in the car'", () => {
  const result = extractDispatchData([
    { role: "user", message: "I locked my keys in the car at the Walmart parking lot" }
  ]);
  assertEquals(result.job_type, "lockout");
});

Deno.test("Dispatch: 'Need a jump start'", () => {
  const result = extractDispatchData([
    { role: "user", message: "My battery's dead, I need a jump start" }
  ]);
  assertEquals(result.job_type, "jump_start");
});

Deno.test("Dispatch: Urgency words - 'ASAP', 'emergency'", () => {
  const result = extractDispatchData([
    { role: "user", message: "This is an emergency, I need help ASAP" }
  ]);
  assertEquals(result.urgency, "high");
});

Deno.test("Dispatch: Address extraction - '123 Main Street'", () => {
  const result = extractDispatchData([
    { role: "user", message: "I'm at 123 Main Street near the gas station" }
  ]);
  assertEquals(result.pickup_address.includes("123 Main Street"), true);
});
```

### Phase 5: Create Medical Mode Tests

Test HIPAA-aware extraction:

```typescript
// extraction-medical.test.ts

Deno.test("Medical: 'I'm a new patient'", () => {
  const result = extractMedicalData([
    { role: "user", message: "Hi, I'm a new patient looking to schedule a checkup" }
  ]);
  assertEquals(result.is_new_patient, true);
  assertEquals(result.appointment_type.includes("checkup"), true);
});

Deno.test("Medical: 'Annual physical' appointment type", () => {
  const result = extractMedicalData([
    { role: "user", message: "I need to schedule my annual physical" }
  ]);
  assertEquals(result.appointment_type.includes("physical"), true);
});

Deno.test("Medical: Preferred date extraction", () => {
  const result = extractMedicalData([
    { role: "user", message: "Do you have anything available next week?" }
  ]);
  assertExists(result.preferred_date);
});

Deno.test("Medical: NO PHI storage", () => {
  const result = extractMedicalData([
    { role: "user", message: "I've been having chest pains and shortness of breath" }
  ]);
  // Should NOT store symptoms (PHI)
  assertEquals(result.symptoms, undefined);
  assertEquals(result.medical_details, undefined);
});

Deno.test("Medical: Urgent detection - 'severe pain'", () => {
  const result = extractMedicalData([
    { role: "user", message: "I have severe pain in my abdomen" }
  ]);
  assertEquals(result.urgency, "urgent");
});
```

### Phase 6: Create General Mode Tests

Test callback/message handling:

```typescript
// extraction-general.test.ts

Deno.test("General: 'Leave a message'", () => {
  const result = extractGeneralData([
    { role: "user", message: "Can I leave a message for the manager?" }
  ]);
  assertEquals(result.message_requested, true);
});

Deno.test("General: 'Call me back at...'", () => {
  const result = extractGeneralData([
    { role: "user", message: "Can you have someone call me back at 555-1234?" }
  ]);
  assertEquals(result.callback_requested, true);
  assertEquals(result.callback_number.includes("5551234"), true);
});

Deno.test("General: Customer name extraction - 'My name is John'", () => {
  const result = extractGeneralData([
    { role: "user", message: "Hi, my name is John Smith" }
  ]);
  assertEquals(result.customer_name, "John Smith");
});

Deno.test("General: Reason for calling", () => {
  const result = extractGeneralData([
    { role: "user", message: "I'm calling about a billing issue" }
  ]);
  assertEquals(result.service_requested.includes("billing"), true);
});
```

---

## Technical Implementation

### Files to Create

| File | Purpose |
|------|---------|
| `supabase/functions/elevenlabs-webhook/extraction-service.test.ts` | Service mode tests (25+ cases) |
| `supabase/functions/elevenlabs-webhook/extraction-dispatch.test.ts` | Dispatch mode tests (25+ cases) |
| `supabase/functions/elevenlabs-webhook/extraction-medical.test.ts` | Medical mode tests (20+ cases) |
| `supabase/functions/elevenlabs-webhook/extraction-general.test.ts` | General mode tests (15+ cases) |
| `supabase/functions/elevenlabs-webhook/_shared/test-helpers.ts` | Shared utilities and mocks |

### Files to Modify

| File | Changes |
|------|---------|
| `supabase/functions/elevenlabs-webhook/extraction.test.ts` | Add cuisine variety tests, rename to clarify it's food-specific |
| `supabase/functions/elevenlabs-webhook/index.ts` | Refactor extraction functions to be importable for testing |

---

## Expanded Food Patterns

Add regex patterns for more cuisine types:

```typescript
// In parseNaturalLanguageItems function

// Asian cuisine patterns
const asianPatterns = [
  /(\d*)\s*(california|spicy tuna|salmon|dragon|rainbow)\s*roll/gi,
  /(\d*)\s*(miso|wonton|egg drop)\s*soup/gi,
  /(\d*)\s*(pad thai|lo mein|fried rice|chow mein)/gi,
  /(\d*)\s*(general tso|orange|kung pao|sesame)\s*chicken/gi,
  /(\d*)\s*(spring|egg|summer)\s*rolls?/gi,
];

// Mexican patterns
const mexicanPatterns = [
  /(\d*)\s*(tacos?\s+(?:al pastor|carnitas|asada|pollo|fish))/gi,
  /(\d*)\s*(burrito|quesadilla|enchilada|tostada|chimichanga)/gi,
  /(\d*)\s*(chips?\s*(?:and|&)?\s*(?:guac|salsa|queso))/gi,
];

// American casual patterns
const americanPatterns = [
  /(\d*)\s*((?:double|triple|single)?\s*(?:cheese)?burger)/gi,
  /(\d*)\s*(?:piece|pc)?\s*(chicken\s*(?:tenders?|nuggets?|strips?|fingers?))/gi,
  /(\d*)\s*(fries|onion rings|mozzarella sticks)/gi,
  /(\d*)\s*(hot dog|corn dog|pretzel)/gi,
];

// Bakery/cafe patterns
const cafePatterns = [
  /(\d*)\s*(latte|cappuccino|americano|espresso|macchiato)/gi,
  /(\d*)\s*(croissant|muffin|scone|bagel|danish)/gi,
  /(\d*)\s*(black|green|chai|iced)\s*tea/gi,
];
```

---

## Test Coverage Metrics

**Target: 150+ automated tests total**

| Category | Current | Target | Priority |
|----------|---------|--------|----------|
| Food (Italian) | 33 | 40 | Medium |
| Food (Asian) | 0 | 15 | High |
| Food (Mexican) | 0 | 10 | High |
| Food (American) | 0 | 10 | High |
| Food (Totals/Edge) | 5 | 10 | High |
| Service | 0 | 25 | High |
| Dispatch | 0 | 25 | High |
| Medical | 0 | 20 | High |
| General | 0 | 15 | Medium |

---

## CI/CD Integration

After test creation, tests can be run:
1. Manually via the Lovable test runner tool
2. Before each edge function deployment
3. As part of any PR that modifies extraction logic

---

## Expected Outcomes

1. **Catch bugs before customers do** - Regex pattern issues caught in tests
2. **Confidence in deployments** - Changes to extraction logic validated automatically
3. **Documentation by example** - Tests serve as documentation for what patterns are supported
4. **Faster iteration** - Add new patterns, run tests, deploy with confidence
5. **Cross-industry consistency** - All business modes have equal extraction quality

---

## Implementation Order

1. **Refactor extraction functions** - Make them importable for isolated testing
2. **Create test helpers** - Shared utilities for all test files
3. **Food tests expansion** - Add cuisine variety (highest impact for existing customers)
4. **Dispatch tests** - Critical for 24/7 urgent service businesses
5. **Service tests** - Core booking flow validation
6. **Medical tests** - HIPAA compliance validation
7. **General tests** - Catch-all fallback validation
