---
paths:
  - "supabase/**"
---
# Golden Path — File-by-File Trace

## Step 1: Twilio Inbound (Entry Point)
**File:** `supabase/functions/twilio-inbound/index.ts`
- Parses Twilio form data (From, To, CallSid, Digits for IVR)
- Normalizes caller phone to E.164
- Looks up tenant via `phone_numbers` table by `to_number`
- Fetches tenant config + `assistant_settings` (voice_ai_enabled, dispatch_ivr_mode)
- IVR handling: hybrid capability → press 1=booking/2=dispatch; dispatch IVR → press 1=towing/2=impound
- Calls `buildBusinessContext()` → `buildDynamicVariablesFromRegistry()`
- POSTs to ElevenLabs `/v1/convai/twilio/register-call` with 300+ dynamic variables
- Extracts `conversation_id` from TwiML stream URL via regex
- Creates `ai_call_sessions` record with conversation_id + twilio_call_sid
- Returns TwiML XML to Twilio
- **Error handling:** ALL errors return HTTP 200 + hangup TwiML (non-negotiable)
- **Logging:** `logTwilioEvent()` to `twilio_event_logs`

## Step 2: ElevenLabs Conversation
- External ElevenLabs agent processes the call using dynamic_variables as context
- No CloseLoop code involved during conversation itself
- Agent uses tools defined in `agentToolsConfig.ts` for real-time actions (check availability, create booking, etc.)

## Step 3: ElevenLabs Webhook (Call Completion)
**File:** `supabase/functions/elevenlabs-webhook/index.ts`
1. **Signature verification** — HMAC-SHA256 with `ELEVENLABS_CONVAI_WEBHOOK_SECRET`, 5-min freshness window
2. **Session lookup** — by `elevenlabs_conversation_id`, fallback by tenant_id + caller_phone
3. **Idempotency** — if `ended_at` already set, skip duplicate processing
4. **Extract raw data** — from `analysis.data_collection` + server-side transcript extraction
5. **Build CanonicalPayload** — structured extraction with intent, customer, booking/order/dispatch/callback fields
6. **Classify intent** — scoring system: data_collection fields + transcript keywords + extracted data presence
7. **Normalize** — parse natural language dates/times to ISO, validate no nulls
8. **Customer resolution** — lookup by phone, create if new, source = "ai_call"
9. **Session update** — transcript, summary, outcome, extracted_payload, customer_id, ended_at
10. **Usage tracking** — POST to `track-usage` with voice_minutes
11. **Slot lock release** — if not booked, release calendar reservations
12. **Event triggers** — `record-audit-event`, `trigger-workflow` for "call.ended"
13. **Intelligence** — POST to `process-call-outcome` for pattern detection
14. **Observations** — record customer preferences, time patterns if memory_enabled

## Step 4: Deterministic Routing
**File:** `supabase/functions/elevenlabs-webhook/index.ts` — `determineRoutingTarget()`
- **order** → `food_orders` if `food_orders` module enabled
- **reservation** → `reservations` if enabled, fallback to `bookings`
- **booking** → `bookings` if `booking` module enabled
- **dispatch** → `dispatch_jobs` if `dispatch_queue` module enabled
- **callback/faq/other** → no entity created (leads/opportunities only)
- **RULE:** Never create entities for disabled modules

## Step 5: Handoff Functions
**Files:** `booking-handoff/index.ts`, `dispatch-handoff/index.ts`, `order-handoff/index.ts`
- Each follows same pattern: fetch entity → check handoff enabled → build payload → execute methods (webhook/email/SMS) → log attempts
- **booking-handoff:** HMAC-signed webhook + SMS via Twilio + audit event + observations
- **dispatch-handoff:** Same + urgent SMS if priority=high/urgent + confirmation_summary
- **order-handoff:** Same + PrintNode receipt printing option
- All log to `handoff_attempts` table with status (success/failed) + error_message

## Step 6: Automation Runs
- `trigger-workflow` function routes to automation engine
- Workflows use canonical payload + session context
- Automation rules table: trigger_event → destination_provider → action_type → field_mapping

## Step 7: Handoff Attempts Logged
- Table: `handoff_attempts` — entity_type, entity_id, method, status, error_message, response_code
- Queried by `check-handoff-failures` cron for retry/alerting
