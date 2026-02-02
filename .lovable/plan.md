
# Expert ElevenLabs Agent Prompt for CloseLoop

## Overview
This plan creates a comprehensive, production-ready ChatGPT system prompt that transforms the model into an advanced ElevenLabs + CloseLoop expert. The prompt will contain ALL technical knowledge needed to understand, configure, debug, and extend the CloseLoop voice AI system.

---

## Prompt Structure

### 1. Identity & Expertise Declaration
- Role as an ElevenLabs Conversational AI Expert
- Deep specialization in CloseLoop's telephony architecture
- Knowledge domains: voice agents, webhooks, dynamic variables, TwiML, multi-tenant systems

### 2. ElevenLabs Platform Deep Knowledge

**Core Concepts:**
- Conversational AI agents (WebRTC vs WebSocket)
- Agent configuration (prompts, first messages, tools)
- Voice selection and customization
- Conversation lifecycle events
- Data collection fields and extraction

**Advanced Topics:**
- Conversation initiation client data webhook
- Post-call transcription webhooks
- HMAC-SHA256 signature verification (format: `t=timestamp,v0=hash`)
- Dynamic variables contract (all-string requirement)
- Prompt overrides and system prompt injection
- Tool calling (server-side and client-side)

**API Endpoints:**
- `POST /v1/convai/twilio/register-call` - Twilio integration
- `GET /v1/convai/conversation/token?agent_id=` - WebRTC token
- `GET /v1/convai/conversation/get-signed-url?agent_id=` - WebSocket URL

### 3. CloseLoop Architecture Encyclopedia

**Business Modes:**
```text
service   → booking-first (HVAC, plumbing, detailing)
dispatch  → urgent + location + queue (towing, roadside)
food      → orders + reservations + catering (restaurants)
medical   → intake + scheduling + HIPAA (clinics)
general   → callback/message, optional booking
```

**Enabled Modules:**
- `ai_voice`, `instant_text_back`, `booking`, `dispatch_queue`
- `food_orders`, `reservations`, `catering`, `menu_knowledge`
- `medical_intake`, `crm_export`

**Data Flow:**
```text
Phone Call → Twilio → twilio-inbound edge function
                ↓
    Lookup tenant by To number (phone_numbers table)
                ↓
    Build canonical BusinessContext (buildBusinessContext.ts)
                ↓
    Register call with ElevenLabs API (dynamic_variables + prompt)
                ↓
    Return TwiML to Twilio
                ↓
    AI conversation happens (tenant context injected)
                ↓
    ElevenLabs → elevenlabs-webhook (post_call_transcription)
                ↓
    Parse transcript, extract canonical payload
                ↓
    Customer resolution (phone_e164 deduplication)
                ↓
    Trigger workflows (call.ended, booking.created, etc.)
```

### 4. Dynamic Variables Contract (Complete Registry)

**Core Identifiers:**
- `tenant_id`, `location_id`, `business_name`, `businessname` (alias)
- `business_mode`, `enabled_modules`, `hipaa_mode`, `timezone`

**Location & Service Area:**
- `business_address`, `location_summary`, `service_area_summary`
- `out_of_area_message`, `service_area_rules_json`

**Caller Info:**
- `caller_phone`, `customer_id` (PHI - redacted in HIPAA mode)

**Hours & Availability:**
- `hours_today`, `calendar_connected`, `booking_link`

**Offerings:**
- `service_summary`, `services_pricing`, `menu_summary`
- `menu_has_more`, `menu_top_categories`, `menu_summary_length`

**Pricing & ETA:**
- `pricing_rules_summary`, `eta_rules_summary`
- `base_prep_minutes`, `busy_buffer_minutes`, `current_busyness_pct`

**Policies:**
- `policies_summary`, `faqs_summary`

**AI Settings:**
- `greeting_script`, `fallback_script`, `tone`

**Intelligence:**
- `intent_rules_summary`, `required_questions_summary`
- `memory_hints_summary`, `memory_enabled`

**Food Settings:**
- `estimated_prep_minutes`, `accepts_pickup`, `accepts_delivery`
- `accepts_dine_in`, `delivery_radius_miles`, `delivery_minimum_dollars`
- `accepts_catering`

**Debug Flags:**
- `context_has_hours`, `context_has_menu`, `context_has_services`
- `context_menu_count`, `context_services_count`, `context_missing_sections`

**Meta:**
- `business_brain_summary`, `business_brain_json`
- `business_brain_json_compact`, `business_brain_json_hash`
- `context_contract_version` (always "v1")

### 5. Data Collection Field Contract

**Universal Fields (cross-industry):**
```text
customer_name, customer_phone, intent
service_requested, booking_date, booking_time, booking_confirmed
order_items, order_modifiers, order_special_instructions
order_type (pickup|delivery), delivery_address
reservation_date, reservation_time, party_size
dispatch_pickup_address, dispatch_dropoff_address
vehicle_type, drivable, urgency (emergency|same_day|scheduled)
callback_requested
```

**Intent Enum:**
`booking | order | reservation | dispatch | callback | faq | unknown`

**Order Type Enum:**
`pickup | delivery`

### 6. Edge Functions Encyclopedia

**twilio-inbound:**
- Receives Twilio webhook, resolves tenant by phone
- Builds canonical BusinessContext
- Calls ElevenLabs register-call API
- Returns TwiML

**elevenlabs-conversation-token:**
- Browser simulator token endpoint
- Supports WebRTC (default) and WebSocket modes
- Validates tenant, builds dynamic variables
- Returns token + dynamicVariables + precomputedSlots

**elevenlabs-init:**
- Client Data Webhook for production calls
- Resolves tenant from To number
- Builds full business context
- Returns dynamic_variables JSON

**elevenlabs-webhook:**
- Post-call transcription handler
- HMAC signature verification
- Canonical payload extraction
- Customer resolution
- Workflow triggering

**compute-distance-eta:**
- Mapbox routing integration
- Distance-based ETA calculation
- Tenant-scoped settings

### 7. Voice Agent System Prompt Rules

**Human Phone Rules (must follow):**
- Speak like a real employee (warm, helpful, contractions)
- NEVER say: "As an AI", "I don't have access", "Kindly", "Certainly", "I apologize for the inconvenience"
- Ground all facts in Business Brain Truth
- If data is missing, ask ONE clarifying question

**Debug Routing Override:**
- Triggered by caller saying "debug"
- Output: tenant_id, business_mode, enabled_modules, hours_today, etc.

### 8. Webhook Security

**HMAC Verification Format:**
```text
Header: ElevenLabs-Signature: t=1234567890,v0=abc123...
Signed payload: {timestamp}.{raw_body}
Algorithm: HMAC-SHA256
Secret: ELEVENLABS_CONVAI_WEBHOOK_SECRET
```

**Constant-time comparison required for security**

### 9. Common Issues & Debugging

**1008 Policy Violation:**
- Missing dynamicVariables
- Missing businessname alias
- Null values in dynamic vars

**404 Not Found on Token:**
- Using conversation ID instead of token
- Wrong endpoint (POST vs GET)

**Tenant Not Resolved:**
- Phone number not in phone_numbers table
- Missing tenant.phone_public fallback

**No Context in Voice:**
- elevenlabs-init not configured as webhook
- Missing dynamic_variables in register-call

### 10. HIPAA Compliance

**When `hipaa_mode=true` (medical tenants only):**
- `store_recordings` = OFF
- `store_transcripts` = OFF
- PHI fields redacted from dynamic vars
- No diagnosis promises
- Urgent escalation for severe symptoms

---

## Technical Details Section

### Database Tables (Business Brain)
- `tenants`, `services`, `business_faqs`, `objection_responses`
- `ai_knowledge_base`, `assistant_settings`, `tenant_intelligence_settings`
- `business_intent_rules`, `required_questions`, `availability_slots`
- `pricing_rules`, `menu_items`, `menu_categories`, `food_order_settings`

### Event Logging
- `ai_call_sessions` - call records with extracted_payload
- `ai_event_logs` - stage-by-stage debugging
- `twilio_event_logs` - Twilio-specific events

### Customer Resolution
- Primary key: `phone_e164`
- Deduplicate on insert
- Update `updated_at` on repeat calls

---

## Prompt Output Format

The final prompt will be a single, self-contained system prompt that can be copied directly into ChatGPT or any compatible LLM interface.

