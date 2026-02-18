---
paths:
  - "supabase/functions/booking-handoff/**"
  - "supabase/functions/dispatch-handoff/**"
  - "supabase/functions/order-handoff/**"
  - "supabase/functions/universal-delivery/**"
  - "supabase/functions/retry-failed-deliveries/**"
  - "supabase/functions/check-handoff-failures/**"
---
# Behavioral Rules: Handoff Functions

When working on ANY handoff function (booking, dispatch, order) or delivery infrastructure, ALWAYS follow these procedures.

## Standard Handoff Pattern (ALWAYS follow this order)

Every handoff function MUST implement this exact sequence:
1. **Fetch entity** — from DB with full context (customer, session, tenant config)
2. **Check handoff enabled** — verify `integration_id` exists, `handoff_enabled = true`
3. **Build payload** — structured JSON with all entity fields + metadata
4. **Execute delivery methods** — webhook, SMS, email (in parallel where possible)
5. **Log EVERY attempt** — to `handoff_attempts` table with status + error_message
6. **Record observations** — customer preferences, time patterns (if `memory_enabled`)
7. **Emit audit event** — to `ai_event_logs` and `trigger-workflow`

NEVER skip step 5. Even failed attempts must be logged.

## When Creating a New Handoff Function

1. **Copy the pattern** from `booking-handoff/index.ts` — don't start from scratch
2. **Implement ALL delivery methods** — webhook (HMAC-signed), SMS (via Twilio), email (logged-only for now)
3. **HMAC-sign all webhooks:**
   ```typescript
   const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payloadString));
   headers['X-CloseLoop-Signature'] = hmacHex;
   ```
4. **Log to `handoff_attempts`** for every method attempted:
   ```sql
   INSERT INTO handoff_attempts (tenant_id, entity_type, entity_id, method, status, error_message, response_code)
   ```
5. **Add to retry system** — ensure `retry-failed-deliveries` cron can pick up failures

## When Debugging Handoff Failures

Follow this diagnostic sequence:
1. Check `handoff_attempts` table — filter by `entity_id`, look at `error_message` and `response_code`
2. Check integration config — is `webhook_url` correct? Is `webhook_secret` set? Is `handoff_enabled = true`?
3. Check HMAC signature — does the external system validate the same way we sign?
4. Check Twilio logs — if SMS failed, check Twilio console for delivery status
5. Check `retry-failed-deliveries` logs — is the retry cron picking up the failure?

## Retry Logic

- Cron: `retry-failed-deliveries` runs every 5 minutes
- Exponential backoff: 5 min → 10 min → 20 min → 40 min → give up
- Max retries: 4 attempts
- After max retries: alert via `check-handoff-failures`
- ALWAYS log retry attempts to `handoff_attempts`

## Known Limitations

- **Email is placeholder** — logged but not actually sent. Needs Resend/SendGrid integration.
- **PrintNode** (order-handoff only) — receipt printing is optional, requires PrintNode integration config
- **Urgent SMS** (dispatch-handoff only) — sent immediately for `priority = high|urgent`

## Key Files

- Booking: `supabase/functions/booking-handoff/index.ts`
- Dispatch: `supabase/functions/dispatch-handoff/index.ts`
- Order: `supabase/functions/order-handoff/index.ts`
- Universal: `supabase/functions/universal-delivery/index.ts`
- Retry cron: `supabase/functions/retry-failed-deliveries/index.ts`
- Failure monitor: `supabase/functions/check-handoff-failures/index.ts`
