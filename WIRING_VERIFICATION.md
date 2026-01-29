# Wiring Pass Verification Checklist

This document summarizes the wiring fixes and provides a step-by-step verification checklist.

## Changes Made

### A) Business Context Injection (Voice)
✅ **Already Implemented Correctly**
- `supabase/functions/_shared/buildBusinessContext.ts` - Canonical context builder
- Pulls: `tenants` (hours_json, policies_json, business_mode, enabled_modules, timezone, name), `services`, `menu_items`, `business_faqs`, `objection_responses`, `data_retention_settings`
- Context is injected into ElevenLabs via `buildDynamicVariables()` in `twilio-inbound`
- Snapshots stored in `ai_context_snapshots` and `ai_call_sessions.context_json`
- System prompt explicitly forbids saying "no access" when data exists

### B) Call Session Persistence (Customer Name / Summary / Extraction)
✅ **Already Implemented Correctly**
- `elevenlabs-webhook` processes `conversation.ended` events
- Resolves customer by E.164 phone using find-or-create logic
- Persists: `customer_id`, `caller_phone`, `twilio_call_sid`, `elevenlabs_conversation_id`, `summary`, `transcript`, `extracted_payload`, `outcome`
- Updates `customers.full_name` when captured during call
- `/app/calls` page queries with customer join: `customer:customers!ai_call_sessions_customer_id_fkey`

### C) Automations Execution
✅ **Fixed in This Session**
1. **Test Trigger Fixed**: `useTestAutomation` now properly fetches the automation rule to get `tenant_id` and `trigger_event`, then calls `trigger-workflow` with correct parameters
2. **Run History Updated**: `AutomationRunHistorySection` now shows both workflow runs and legacy automation runs in tabs
3. **UUID Fix**: Test triggers now use a valid UUID (`00000000-0000-0000-0000-000000000000`) instead of invalid strings

### Event Emission Points
All handoff functions correctly trigger workflows:
- `booking-handoff` → triggers `booking.created` or `booking.confirmed`
- `order-handoff` → triggers `order.created` or `order.confirmed`  
- `dispatch-handoff` → triggers `dispatch.created` or `dispatch.confirmed`
- `elevenlabs-webhook` → triggers `call.ended`

---

## Verification Checklist

### Pre-requisites
- [ ] Have a tenant with phone number provisioned
- [ ] Have services/menu configured in Business Brain
- [ ] Have at least one active workflow (e.g., `booking.created → send SMS`)

### Test 1: Voice AI Context Injection
1. [ ] Make an inbound call to your provisioned number
2. [ ] Ask the AI: "What are your hours?"
3. [ ] **Expected**: AI answers with actual business hours (NOT "I don't have access")
4. [ ] Ask the AI: "What services do you offer?" or "What's on the menu?"
5. [ ] **Expected**: AI lists actual services/menu items with pricing

### Test 2: Call Session Persistence
1. [ ] During the call, say your name: "My name is [Test Name]"
2. [ ] Request a service or place an order
3. [ ] End the call
4. [ ] Go to `/app/calls`
5. [ ] **Expected**: Call shows:
   - Customer name (the name you provided)
   - AI Summary of the conversation
   - Service requested / extracted payload
   - Linked customer record icon

### Test 3: Automation Workflow Execution
1. [ ] Create an active workflow with trigger `booking.created` or `order.created`
2. [ ] Create a booking or order (via AI call or manually)
3. [ ] Go to `/app/automations` → "Run History" tab → "Workflows" sub-tab
4. [ ] **Expected**: A workflow run appears with status "success" or "failed"
5. [ ] Click to expand and verify step execution details

### Test 4: Test Trigger (Dry Run)
1. [ ] Go to `/app/automations` → "Automations" tab
2. [ ] Create or select an automation rule
3. [ ] Click the "Play" (test) button
4. [ ] **Expected**: Toast shows "Test Complete (Dry Run)" with step count
5. [ ] Check "Run History" → "Workflows" tab for the test run

### Test 5: Customer Resolution
1. [ ] Make a call from a new phone number
2. [ ] Go to `/app/calls` after the call ends
3. [ ] **Expected**: Call shows customer linked
4. [ ] Make another call from the SAME phone number
5. [ ] **Expected**: Same customer is linked (no duplicate created)

---

## Food Mode Verification (Bella Italia Test)

### Pre-requisites
- Tenant: `Bella Italia Ristorante` (id: `b0000000-0000-0000-0000-000000000002`)
- Business mode: `food`
- Has 6 menu items with prices and modifiers
- Has hours configured (Mon closed, Tue-Sun open)

### Test 1: Hours Question
1. [ ] Call/test with the food tenant
2. [ ] Ask: "What time do you close?"
3. [ ] **Expected**: AI answers with actual hours (e.g., "We're open until 10 PM today" or "We close at 22:00")
4. [ ] AI does NOT say "I don't have access to hours"

### Test 2: Menu Knowledge
1. [ ] Ask: "What's on the menu?"
2. [ ] **Expected**: AI lists menu items with prices (Bruschetta $9.99, Margherita Pizza $15.99, etc.)
3. [ ] Ask about modifiers: "Can I get extra cheese on the pizza?"
4. [ ] **Expected**: AI confirms modifiers are available

### Test 3: Take an Order
1. [ ] Say: "I'd like to place an order for pickup"
2. [ ] **Expected**: AI asks for order items
3. [ ] Order: "I'll have the Margherita Pizza and a Tiramisu"
4. [ ] **Expected**: AI confirms items and prices, asks for name/phone
5. [ ] Provide name: "My name is John"
6. [ ] **Expected**: AI confirms order total and gives time estimate

### Test 4: Order Created in Database
1. [ ] After call ends, check `/app/orders`
2. [ ] **Expected**: Order appears with items: Margherita Pizza, Tiramisu
3. [ ] Order status is "confirmed" or "needs_followup"
4. [ ] Customer name shows "John"

### Test 5: Debug Context Verification
1. [ ] Go to `/debug/ai-context`
2. [ ] Find the browser_test snapshot for Bella Italia
3. [ ] **Expected**:
   - `context_has_hours: true`
   - `context_has_menu: true`  
   - `hours_today: 11:00 - 22:00` (or similar)
   - `menu_summary` shows all 6 items with prices
   - Golden Path tests pass for "Hours answerable" and "Menu items"

---

## Database Tables Used

| Table | Purpose |
|-------|---------|
| `ai_call_sessions` | Call records with context, summary, extracted_payload |
| `ai_context_snapshots` | Diagnostic snapshots of AI context per call |
| `ai_event_logs` | Lifecycle events (call_start, context_built, call_end, summary_saved) |
| `customers` | Customer records resolved by phone_e164 |
| `food_orders` | Orders created from AI calls in food mode |
| `menu_items` | Menu items for food mode tenants |
| `workflow_runs` | Workflow execution records |
| `automation_rules` | Legacy automation rules (simple trigger→action) |

---

## Troubleshooting

### "No access" to hours/services
- Check `ai_context_snapshots` for `missing_sections`
- Verify tenant has `hours_json` populated
- Verify services exist with `is_active = true`

### Call data not persisting
- Check `ai_event_logs` for `summary_save_error` stage
- Verify `elevenlabs_conversation_id` is being captured
- Check ElevenLabs webhook is configured correctly

### Workflow not triggering
- Verify workflow `status = 'active'` and `is_default = true`
- Verify trigger matches exactly (e.g., `booking.created`)
- Check `workflow_runs` for failed runs with error details
