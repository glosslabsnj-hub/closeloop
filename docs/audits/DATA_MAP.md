# CloseLoop Data Map

This document maps UI pages to database tables and edge functions.

## Page → Table Mappings

| Page | Primary Tables | Read/Write |
|------|----------------|------------|
| Dashboard | `ai_call_sessions`, `bookings`, `assistant_settings`, `subscriptions` | Read |
| Calls | `ai_call_sessions`, `customers` | Read/Write |
| Leads | `leads`, `customers` | Read/Write |
| Bookings | `bookings`, `busy_blocks`, `services`, `leads` | Read/Write |
| Dispatch | `dispatch_jobs`, `customers` | Read/Write |
| Orders | `food_orders`, `order_items`, `customers` | Read/Write |
| Menu Center | `menu_items`, `menu_categories` | Read/Write |
| Reservations | `reservations`, `customers` | Read/Write |
| Catering | `catering_requests`, `customers` | Read/Write |
| Medical Intake | `medical_intakes`, `customers` | Read/Write |
| Services | `services` | Read/Write |
| Business Brain | `business_faqs`, `objection_responses`, `ai_knowledge_base`, `knowledge_gaps`, `knowledge_uploads`, `knowledge_conflicts`, `business_memory` | Read/Write |
| Automations | `workflows`, `workflow_nodes`, `automation_rules`, `automation_runs` | Read/Write |
| Integrations | `integrations`, `routing_rules` | Read/Write |
| Settings | `tenants`, `assistant_settings`, `availability_slots`, `booking_delivery_settings`, `dispatch_delivery_settings`, `intelligence_settings` | Read/Write |
| Usage | `subscriptions`, `usage_events` | Read |
| Simulator | — (uses edge functions) | — |
| Go-Live | `subscriptions` | Write |
| Onboarding | `tenants`, `tenant_users`, `assistant_settings` | Write |

## Edge Function → Event Mappings

| Function | Trigger | Tables Written |
|----------|---------|----------------|
| `twilio-inbound` | Twilio POST to webhook | `ai_call_sessions` (insert) |
| `elevenlabs-webhook` | ElevenLabs POST | `ai_call_sessions` (update: summary, transcript), `customers` (upsert), `opportunities` (insert) |
| `elevenlabs-init` | ElevenLabs GET/POST | — (returns TwiML) |
| `booking-handoff` | workflow trigger | `handoff_attempts` (insert) |
| `dispatch-handoff` | workflow trigger | `handoff_attempts` (insert), `dispatch_jobs` (insert) |
| `order-handoff` | workflow trigger | `handoff_attempts` (insert) |
| `trigger-workflow` | Internal | `automation_runs` (insert/update) |
| `universal-delivery` | workflow trigger | `handoff_attempts` (insert) |
| `provision-twilio-number` | User action | `phone_numbers` (insert), `assistant_settings` (update) |
| `create-calendar-event` | booking confirm | `calendar_connections` (read), external calendar |
| `sync-availability` | cron / user action | `busy_blocks` (upsert), `calendar_connections` (read) |
| `process-knowledge-upload` | file upload | `knowledge_uploads` (update), `knowledge_suggestions` (insert) |
| `build-business-brain` | onboarding / update | `ai_knowledge_base` (upsert) |
| `stripe-webhook` | Stripe POST | `subscriptions` (update), `usage_events` (insert) |
| `track-usage` | call/sms events | `usage_events` (insert) |

## Event Flow: Inbound Call

```
Phone Call → Twilio → twilio-inbound
                        ↓
              ElevenLabs register-call
                        ↓
              Return TwiML to Twilio
                        ↓
              AI conversation happens
                        ↓
              ElevenLabs → elevenlabs-webhook
                        ↓
              Parse transcript, extract data
                        ↓
              Update ai_call_sessions
                        ↓
              Resolve/create customer
                        ↓
              Create opportunity if extracted
                        ↓
              Trigger workflow (if configured)
                        ↓
              Handoff delivery (SMS/email/webhook)
```

## Event Flow: Booking Creation

```
AI extracts booking intent
        ↓
booking-handoff triggered
        ↓
Create/update customer
        ↓
Insert booking row
        ↓
Insert busy_block row
        ↓
(Optional) Create calendar event
        ↓
trigger-workflow: booking.created
        ↓
Execute active workflows
        ↓
Send confirmations (SMS/email)
```

## Module → Table Dependencies

| Module | Required Tables |
|--------|-----------------|
| `ai_voice` | `ai_call_sessions`, `ai_assistants`, `ai_event_logs` |
| `booking` | `bookings`, `busy_blocks`, `availability_slots` |
| `dispatch_queue` | `dispatch_jobs` |
| `food_orders` | `food_orders`, `order_items`, `menu_items` |
| `reservations` | `reservations` |
| `catering` | `catering_requests` |
| `medical_intake` | `medical_intakes` |
| `menu_knowledge` | `menu_items`, `menu_categories` |

## Key Indexes for Performance

- `ai_call_sessions`: `tenant_id`, `started_at DESC`, `elevenlabs_conversation_id`
- `customers`: `tenant_id`, `phone_e164` (unique per tenant)
- `bookings`: `tenant_id`, `start_at`, `status`
- `busy_blocks`: `tenant_id`, `start_at`, `end_at`, `is_active`
- `dispatch_jobs`: `tenant_id`, `created_at DESC`, `status`
- `food_orders`: `tenant_id`, `created_at DESC`, `status`
