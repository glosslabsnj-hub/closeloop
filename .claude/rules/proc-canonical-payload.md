---
paths:
  - "supabase/functions/elevenlabs-webhook/**"
  - "supabase/functions/_shared/inputValidators*"
  - "supabase/functions/_shared/sanitizeName*"
---
# Behavioral Rules: Canonical Payload Extraction & Routing

When working on the elevenlabs-webhook or anything related to call data extraction and routing, ALWAYS follow these procedures.

## The Canonical Payload Is Sacred

The CanonicalPayload is the single source of truth for extracted call data. Changes here affect:
- Which entities get created (bookings, dispatch jobs, orders, etc.)
- Which handoff functions fire
- Which automation rules trigger
- Revenue attribution

**Treat changes to extraction/routing logic with the same care as Golden Path files.**

## When Modifying Extraction Logic

1. **Read the full `elevenlabs-webhook/index.ts`** before making changes
2. **Understand the processing pipeline** (in order):
   - Extract raw data from `analysis.data_collection` + transcript
   - Build CanonicalPayload with structured fields
   - Classify intent via scoring system
   - Normalize dates/times to ISO format
   - Resolve customer (upsert by phone_e164)
   - Deterministic routing (intent × enabled_modules)
   - Entity creation (ONLY if module enabled)
3. **NEVER skip normalization** — raw dates like "next Tuesday" must become `YYYY-MM-DD`
4. **NEVER allow null values** — coerce to empty strings

## Deterministic Routing Rules (NEVER VIOLATE)

```
intent "order"       → food_orders   (ONLY if food_orders module enabled)
intent "reservation" → reservations  (ONLY if enabled, fallback to bookings)
intent "booking"     → bookings      (ONLY if booking module enabled)
intent "dispatch"    → dispatch_jobs (ONLY if dispatch_queue module enabled)
intent "callback"    → NO entity     (lead/opportunity only)
intent "faq"         → NO entity     (lead/opportunity only)
intent "other"       → NO entity     (lead/opportunity only)
```

**CRITICAL RULE:** NEVER create entities for disabled modules. Always check `enabled_modules` first.

## When Adding a New Intent Type

Complete ALL of these steps:
1. Add to the `CanonicalPayload.intent` union type
2. Add extraction logic in `buildCanonicalPayload()`
3. Add keyword scoring in intent classification
4. Add routing case in `determineRoutingTarget()`
5. Add entity creation logic (if the intent creates an entity)
6. Add handoff function (if the entity needs delivery)
7. Update the ElevenLabs agent data collection fields to capture the new intent's data
8. Add tests for the new intent's routing logic

## When Debugging Extraction Issues

1. Check `analysis.data_collection` in the webhook payload — are the fields populated?
2. Check intent scoring — which keywords/fields contributed to the score?
3. Check normalization — did date/time parsing succeed?
4. Check `ai_event_logs` table — stages show where processing stopped
5. Check customer resolution — was the customer found/created correctly?

## Idempotency (CRITICAL)

- ElevenLabs may send the same webhook twice
- ALWAYS check `if (session.ended_at) return` early in processing
- NEVER skip the idempotency check when refactoring

## Phone Normalization

- ALWAYS use `normalizePhoneE164()` from `_shared`
- Customers table unique constraint: `(tenant_id, phone_e164)` — NOT raw phone
- Missing E.164 normalization causes duplicate customer records
