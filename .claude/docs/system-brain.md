# Receptionist Dev - Cross-Session Brain

## Last Session: 2026-03-03 2:18 AM ET (receptionist_fix — Customer-booking linkage + transfer params)

### What Was Done
- **Fixed customer-booking linkage** (commit b3a4feb): `useCustomerActivity` was querying leads by phone only (`.eq("phone", customerPhone)`). Changed to use `customer_id` FK as primary match with phone as OR fallback. Fixes QA handoff #279.
- **Fixed transfer_to_owner required params** (commit fead5c8): All 6 ElevenLabs deploy scripts had only `["tenant_id"]` as required for transfer_to_owner. Added `"twilio_call_sid"` to required array across all scripts. Without it, the agent may omit the call SID, causing transfer to fail silently.
- **Added 6 regression tests**: New test suite validates all deploy scripts have `twilio_call_sid` in required array for transfer_to_owner.
- Build: Clean (0 errors), Tests: 691/691 passing
- Deployed to production (app.getfluxdata.com returns 200)

### Previous Session: 2026-03-03 2:06 AM ET (receptionist_ux — Settings jargon audit)
- 14 jargon items fixed in Settings pages (commit 06fb7e0)

### Build Status
- Build: Clean (0 errors)
- Tests: 691/691 passing
- Commit: fead5c8
- Pushed to main

### MODE PROGRESS
- SERVICE: 30/42 QA-verified (71%) ← FOCUS
- DISPATCH: 0/42 (0%)
- FOOD: 0/42 (0%)
- MEDICAL: 0/42 (0%)
- SALES: 0/42 (0%)
- GENERAL: 0/42 (0%)

### Key Architecture Patterns
- **ai-plan-response**: Uses Anthropic Claude Haiku 4.5. Accepts `conversationHistory` array for multi-turn context. Injects current date/time in tenant timezone. FAQs+services always injected.
- **Booking module vs AI booking behavior**: The "booking" module controls infrastructure (DB routing, tool availability). The `ai_booking_mode` setting controls auto-book vs request-callback. `overridesBase: false` ensures module is never removed from base defaults.
- **elevenlabs-webhook module merging**: Mode-default modules are ALWAYS merged into tenant's enabled_modules. Empty array → full defaults.
- **Booking customer linkage**: bookings table has NO customer_id or customer_name. Link is `lead_id → leads.customer_id`. Frontend queries use `leads.customer_id` as primary match (NOT phone-only).
- **transfer_to_owner**: MUST have `twilio_call_sid` in required params. Without it, agent may omit SID → silent transfer failure → callback offered instead.
- **tenant_id in agent tools**: MUST be `required: true` on ALL tools.
- **AI edge functions use Anthropic API**: ALL 12 use `ANTHROPIC_API_KEY` with `api.anthropic.com/v1/messages`, model `claude-haiku-4-5-20251001`.
- **Edge function deployment**: `SUPABASE_ACCESS_TOKEN=$(grep SUPABASE_ACCESS_TOKEN .env | cut -d'"' -f2) npx supabase functions deploy [name] --project-ref yltzlvzgwkidbeqaoevp`
- **Admin tenant context persistence (3-layer defense)**: localStorage + effectiveTenantId bridge + AppLayout redirect backup.

### Remaining Work
- QA verification of ai_testing gates (booking creation, SMS, callbacks, simulator)
- QA verification of non_technical_usable gate (settings jargon fixes)
- QA verification of customer-booking linkage fix
- ElevenLabs agents need redeployment with updated transfer_to_owner required params
- 2 BLOCKED gates (Google Calendar OAuth, SMS A2P registration)
- transfer_to_human_works gate cannot be fully tested via simulator (no real Twilio call SID)

### Next Priorities
1. Eng: Redeploy ElevenLabs agents with updated transfer_to_owner required params
2. QA re-test of HVAC ai_testing round 2 (booking creation should now work)
3. QA verify customer detail bookings tab shows linked bookings
