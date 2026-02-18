---
paths:
  - "supabase/functions/**"
---
# Canonical Payload Structure

The single source of truth for extracted call data:

```typescript
interface CanonicalPayload {
  intent: "order" | "reservation" | "booking" | "dispatch" | "callback" | "faq" | "other"
  customer: { name, phone_e164, email }
  order: { type: "pickup"|"delivery", items[], special_instructions, delivery_address, total_cents }
  reservation: { date (YYYY-MM-DD), time (HH:MM), party_size, notes }
  booking: { service_requested, service_id, preferred_date, preferred_time, confirmed }
  dispatch: { pickup_address, dropoff_address, vehicle_type, drivable, urgency, job_type }
  callback: { requested, best_time, message }
  quote?: { price?: QuoteResult, eta?: QuoteResult }
  _meta: { extraction_source, normalized_at, tenant_timezone, raw_data_collection_keys }
}
```
