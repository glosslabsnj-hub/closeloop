
# Canonical Extraction Payload + Normalization + Guaranteed Routing

## Problem Analysis

Based on codebase exploration, I identified these issues:

1. **Inconsistent extracted_payload structure**: Current payloads use flat keys (`items_raw`, `delivery_address`) instead of a canonical nested structure
2. **ElevenLabs wrapped objects not always unwrapped**: Some orders show raw JSON objects in fields like `customer_name` and `order_type`
3. **Reservations not being created from calls**: All existing reservations have `session_id: null` - they were manually created, not from AI
4. **Natural language dates stored as strings**: Phrases like "next Friday" or "friday" not converted to ISO dates
5. **party_size stored as string**: Found `party_size: "25"` instead of integer `25`
6. **Missing intent field**: No explicit `intent` field in extracted_payload to drive routing

## Solution Architecture

```text
┌─────────────────────────────────────────────────────────────────────┐
│                    ElevenLabs Webhook Pipeline                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  1. Receive webhook payload                                         │
│              ↓                                                       │
│  2. Extract raw data from transcript + data_collection              │
│              ↓                                                       │
│  3. ★ NEW: buildCanonicalPayload()                                  │
│     - Always produces the SAME structure                            │
│     - All nested objects unwrapped                                  │
│              ↓                                                       │
│  4. ★ NEW: normalizeValues()                                        │
│     - party_size → parseInt()                                       │
│     - reservation.date → ISO YYYY-MM-DD                             │
│     - reservation.time → HH:MM 24-hour                              │
│     - Uses tenant timezone from context                             │
│              ↓                                                       │
│  5. Save to ai_call_sessions.extracted_payload                      │
│              ↓                                                       │
│  6. ★ ENHANCED: persistDerivedEntity()                              │
│     - Route based on intent field                                   │
│     - Always create entity (even with NULL date/time)               │
│     - Store original phrase in notes                                │
│              ↓                                                       │
│  7. Log event stages for debugging                                  │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

## Deliverables

### A) Canonical extracted_payload Schema

The schema will ALWAYS have this structure:

```json
{
  "intent": "order" | "reservation" | "booking" | "dispatch" | "callback" | "faq" | "other",
  "customer": {
    "name": "string | null",
    "phone_e164": "string | null", 
    "email": "string | null"
  },
  "order": {
    "type": "pickup" | "delivery" | null,
    "items": [
      {
        "name": "string",
        "quantity": "number",
        "size": "string | null",
        "modifiers": ["string"],
        "special_instructions": "string | null"
      }
    ],
    "special_instructions": "string | null",
    "delivery_address": "string | null",
    "requested_time": "string | null",
    "total_cents": "number | null"
  },
  "reservation": {
    "date": "YYYY-MM-DD | null",
    "time": "HH:MM | null",
    "party_size": "number | null",
    "notes": "string | null",
    "original_date_phrase": "string | null",
    "original_time_phrase": "string | null"
  },
  "booking": {
    "service_requested": "string | null",
    "service_id": "string | null",
    "preferred_date": "YYYY-MM-DD | null",
    "preferred_time": "HH:MM | null",
    "address": "string | null",
    "notes": "string | null",
    "confirmed": "boolean | null"
  },
  "dispatch": {
    "pickup_address": "string | null",
    "dropoff_address": "string | null",
    "vehicle_type": "string | null",
    "drivable": "boolean | null",
    "urgency": "normal" | "high" | "urgent",
    "notes": "string | null"
  },
  "callback": {
    "requested": "boolean | null",
    "best_time": "string | null",
    "message": "string | null"
  },
  "_meta": {
    "extraction_source": "elevenlabs" | "server_side",
    "normalized_at": "ISO timestamp",
    "tenant_timezone": "string"
  }
}
```

### B) Implementation Changes

#### File: `supabase/functions/elevenlabs-webhook/index.ts`

**1. New function: `buildCanonicalPayload()`**
- Takes raw dataCollection + transcript + businessMode
- Always returns the canonical shape above
- Uses `extractDataCollectionValue()` to unwrap all ElevenLabs nested objects
- Determines intent based on data presence

**2. New function: `normalizePayloadValues()`**
- Parses `reservation.party_size` to integer
- Converts natural dates to ISO using `parseNaturalDate()` with tenant timezone
- Converts natural times to 24-hour format using `parseNaturalTime()`
- Preserves original phrases in `original_date_phrase` / `original_time_phrase` for debugging

**3. Enhanced `parseNaturalDate()` function**
- Accept optional timezone parameter
- Handle edge cases: "this Friday" vs "next Friday"
- Return null-safe (never undefined)

**4. Enhanced `persistDerivedEntity()` router**
- Use canonical `intent` field for routing
- For reservations: ALWAYS create row even if date/time is null
  - Set `notes = original_date_phrase + original_time_phrase`
  - Set `status = 'pending'` to flag for manual review
- Include session_id FK in ALL created entities
- Log success/failure with entity_type + entity_id

**5. New event log stages**
- `extraction_canonicalized`: After building canonical payload
- `normalization_applied`: After normalizing values
- `derived_entity_created`: With entity_type, entity_id
- `derived_entity_skipped`: With reason (e.g., "intent=faq")

### C) Debug Page Improvements

#### File: `src/pages/debug/ExtractionDebugPage.tsx`

Add 4-panel view for selected session:
1. **Raw Extraction**: Show pre-canonical fields from data_collection
2. **Canonical Payload**: Show final canonical structure
3. **Normalized Values**: Highlight date/time/party_size transformations
4. **Derived Entity**: Show type, id, status, and link to entity page

### D) Files Changed Summary

| File | Change Type |
|------|-------------|
| `supabase/functions/elevenlabs-webhook/index.ts` | Major refactor: add canonical builder, normalizer, enhanced router |
| `src/pages/debug/ExtractionDebugPage.tsx` | UI: add 4-panel extraction view |
| `src/pages/app/OrdersPage.tsx` | No changes (already queries food_orders correctly) |
| `src/pages/app/ReservationsPage.tsx` | No changes (already queries reservations correctly) |

---

## Technical Details

### Canonical Builder Logic

```typescript
function buildCanonicalPayload(
  businessMode: string,
  dataCollection: Record<string, string>,
  transcript: TranscriptEntry[],
  extractedFromTranscript: Record<string, unknown>
): CanonicalPayload {
  // 1. Initialize empty canonical structure
  const payload: CanonicalPayload = {
    intent: "other",
    customer: { name: null, phone_e164: null, email: null },
    order: { type: null, items: [], ... },
    reservation: { date: null, time: null, party_size: null, notes: null },
    booking: { ... },
    dispatch: { ... },
    callback: { requested: null, best_time: null, message: null },
    _meta: { extraction_source: "elevenlabs", normalized_at: new Date().toISOString() }
  };

  // 2. Extract and unwrap customer info
  payload.customer.name = extractDataCollectionValue(dataCollection.customer_name) 
    || extractDataCollectionValue(dataCollection.name)
    || extractedFromTranscript.customer_name || null;

  // 3. Determine intent based on confirmed flags and business mode
  payload.intent = determineIntent(businessMode, dataCollection, extractedFromTranscript);

  // 4. Fill mode-specific sections
  switch (businessMode) {
    case "food":
      fillOrderSection(payload, dataCollection, extractedFromTranscript);
      fillReservationSection(payload, dataCollection, extractedFromTranscript);
      break;
    case "service":
      fillBookingSection(payload, dataCollection, extractedFromTranscript);
      break;
    // ... other modes
  }

  return payload;
}
```

### Normalization Logic

```typescript
function normalizePayloadValues(
  payload: CanonicalPayload,
  tenantTimezone: string
): CanonicalPayload {
  // 1. Normalize party_size to integer
  if (payload.reservation.party_size !== null) {
    const parsed = parseInt(String(payload.reservation.party_size), 10);
    payload.reservation.party_size = isNaN(parsed) ? null : parsed;
  }

  // 2. Normalize reservation date to ISO
  if (payload.reservation.date && !isISODate(payload.reservation.date)) {
    payload.reservation.original_date_phrase = payload.reservation.date;
    payload.reservation.date = parseNaturalDate(payload.reservation.date, tenantTimezone);
  }

  // 3. Normalize reservation time to HH:MM
  if (payload.reservation.time && !is24HourTime(payload.reservation.time)) {
    payload.reservation.original_time_phrase = payload.reservation.time;
    payload.reservation.time = parseNaturalTime(payload.reservation.time);
  }

  payload._meta.normalized_at = new Date().toISOString();
  payload._meta.tenant_timezone = tenantTimezone;
  
  return payload;
}
```

### Guaranteed Reservation Routing

```typescript
// In persistDerivedEntity()
case "reservation":
  // Even if date/time is null, CREATE the reservation
  const reservation = await supabase.from("reservations").insert({
    tenant_id: tenantId,
    session_id: sessionId, // Always link to call
    customer_id: customerId,
    customer_name: payload.customer.name || "Phone Customer",
    customer_phone: callerPhoneE164,
    party_size: payload.reservation.party_size || 2, // Default to 2 if not specified
    reservation_date: payload.reservation.date || new Date().toISOString().split("T")[0], // Default to today
    reservation_time: payload.reservation.time || "19:00", // Default to 7 PM
    special_requests: buildReservationNotes(payload.reservation),
    status: payload.reservation.date && payload.reservation.time ? "confirmed" : "pending", // Pending if incomplete
  }).select("id").single();

function buildReservationNotes(reservation: ReservationPayload): string {
  const parts: string[] = [];
  if (reservation.original_date_phrase) {
    parts.push(`Requested date: "${reservation.original_date_phrase}"`);
  }
  if (reservation.original_time_phrase) {
    parts.push(`Requested time: "${reservation.original_time_phrase}"`);
  }
  if (reservation.notes) {
    parts.push(reservation.notes);
  }
  return parts.join(". ") || null;
}
```

---

## Example Outputs

### Example 1: Pizza Order with Modifiers

**Input transcript**: "I'd like a large margherita pizza with extra cheese, well done, and a two liter Pepsi for pickup"

**Canonical extracted_payload**:
```json
{
  "intent": "order",
  "customer": { "name": null, "phone_e164": null, "email": null },
  "order": {
    "type": "pickup",
    "items": [
      {
        "name": "Large Margherita Pizza",
        "quantity": 1,
        "size": "large",
        "modifiers": ["extra cheese"],
        "special_instructions": "well done"
      },
      {
        "name": "Two Liter Pepsi",
        "quantity": 1,
        "size": null,
        "modifiers": [],
        "special_instructions": null
      }
    ],
    "special_instructions": null,
    "delivery_address": null,
    "requested_time": null,
    "total_cents": null
  },
  "reservation": { "date": null, "time": null, "party_size": null, "notes": null },
  "booking": { ... },
  "dispatch": { ... },
  "callback": { "requested": null, "best_time": null, "message": null },
  "_meta": { "extraction_source": "server_side", "normalized_at": "2026-01-30T15:30:00Z" }
}
```

### Example 2: Reservation "Next Friday Party of 25"

**Input transcript**: "I'd like to make a reservation for next Friday evening for a party of 25"

**Before normalization**:
```json
{
  "intent": "reservation",
  "reservation": {
    "date": "next friday",
    "time": "evening",
    "party_size": "25",
    "notes": null
  }
}
```

**After normalization** (assuming current date is 2026-01-30, tenant timezone America/New_York):
```json
{
  "intent": "reservation",
  "reservation": {
    "date": "2026-02-06",
    "time": "18:00",
    "party_size": 25,
    "notes": null,
    "original_date_phrase": "next friday",
    "original_time_phrase": "evening"
  },
  "_meta": {
    "normalized_at": "2026-01-30T15:30:00Z",
    "tenant_timezone": "America/New_York"
  }
}
```

---

## Verification Checklist

After implementation, verify:

| Check | Table | Query |
|-------|-------|-------|
| 1. Call has summary | `ai_call_sessions` | `SELECT summary FROM ai_call_sessions WHERE id = ?` |
| 2. Call has transcript | `ai_call_sessions` | `SELECT transcript FROM ai_call_sessions WHERE id = ?` |
| 3. Canonical payload saved | `ai_call_sessions` | `SELECT extracted_payload->'intent' FROM ai_call_sessions WHERE id = ?` |
| 4. Normalization logged | `ai_event_logs` | `SELECT * FROM ai_event_logs WHERE session_id = ? AND stage = 'normalization_applied'` |
| 5. Order created (food mode) | `food_orders` | `SELECT * FROM food_orders WHERE session_id = ?` |
| 6. Reservation created (food mode) | `reservations` | `SELECT * FROM reservations WHERE session_id = ?` |
| 7. Booking created (service mode) | `bookings` | `SELECT * FROM bookings WHERE session_id = ?` |
| 8. Dispatch job created (dispatch mode) | `dispatch_jobs` | `SELECT * FROM dispatch_jobs WHERE session_id = ?` |
| 9. Entity has correct types | All entity tables | `SELECT typeof(party_size), reservation_date, reservation_time FROM reservations WHERE session_id = ?` |
| 10. UI shows entity | `/app/orders`, `/app/reservations` | Visual verification |

### Debug Page Verification

1. Navigate to `/debug/extraction`
2. Select a recent call
3. Verify 4 panels display:
   - Raw Extraction (data_collection keys)
   - Canonical Payload (nested structure)
   - Normalized Values (ISO dates, integers)
   - Derived Entity (type + id + link)
