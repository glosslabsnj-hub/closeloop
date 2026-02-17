# DISPATCH Agent Tool Configuration Guide

## Overview

The DISPATCH agent needs 7 webhook tools configured to reach parity with the SERVICE agent. These tools enable the agent to:
1. Check service area coverage and get ETAs
2. Create dispatch jobs in real-time
3. Look up existing job status
4. Schedule non-emergency services
5. Handle callbacks for complex inquiries

## Current Status

✅ **System Prompt Updated**: 76,292 characters covering 245+ scenarios
⏳ **Tools Configured**: 0 of 7 (CRITICAL GAP)

## Tool Configuration (2 Options)

### Option 1: ElevenLabs Dashboard (Recommended)

1. Go to: https://elevenlabs.io/app/conversational-ai
2. Select agent: **DISPATCH** (agent_2601kghfpmckez3t2n6p7bmcpac4)
3. Click "Tools" tab
4. Add each tool below as a "Webhook" type tool

### Option 2: ElevenLabs API

Use the API to programmatically create tools (see `create_dispatch_tools.sh` script).

---

## Tool 1: check_service_area

**Type**: Webhook
**Name**: `check_service_area`
**Description**:
```
CRITICAL TOOL - Use for every dispatch call. Check if location is in service area and get real-time ETA and pricing. Call immediately when customer provides their location. Returns: in_area (yes/no), ETA range, distance, and price estimate for towing/service.
```

**URL**: `https://zsqfzluyylzmmjtfxwgr.supabase.co/functions/v1/elevenlabs-check-service-area`

**Method**: POST

**Headers**:
```json
{
  "Content-Type": "application/json",
  "x-closeloop-secret": "${X_CL_SECRET}"
}
```

**Body Template**:
```json
{
  "address": "{address}",
  "vehicle_type": "{vehicle_type}",
  "dropoff_address": "{dropoff_address}",
  "service_type": "{service_type}",
  "tenant_id": "{tenant_id}",
  "conversation_id": "{conversation_id}"
}
```

**Parameters**:
- `address` (string, required): Customer's address where service is needed. Accept street address, intersection, highway exits, landmarks.
- `vehicle_type` (string, optional): Vehicle type: 'car', 'truck', 'suv', 'motorcycle', 'rv'. Helps with pricing.
- `dropoff_address` (string, optional): Where to tow the vehicle. Get this for accurate pricing.
- `service_type` (string, optional): Type of service: 'towing', 'jumpstart', 'lockout', 'tire_change', 'fuel_delivery', 'winch_out'.
- `tenant_id` (string, optional): Tenant identifier (from {{tenant_id}})
- `conversation_id` (string, optional): Conversation tracking

---

## Tool 2: create_dispatch_job

**Type**: Webhook
**Name**: `create_dispatch_job`
**Description**:
```
MAIN DISPATCH TOOL - Send a driver/technician NOW. Use for: "I need a tow", "I'm stranded", "Car won't start", "Locked out", "Flat tire". Always call check_service_area FIRST to get ETA and confirm coverage, then create the dispatch job. CRITICAL: customer_name is REQUIRED - always ask for it before dispatching.
```

**URL**: `https://zsqfzluyylzmmjtfxwgr.supabase.co/functions/v1/elevenlabs-create-dispatch-job`

**Method**: POST

**Headers**:
```json
{
  "Content-Type": "application/json",
  "x-closeloop-secret": "${X_CL_SECRET}"
}
```

**Body Template**:
```json
{
  "pickup_address": "{pickup_address}",
  "vehicle_info": "{vehicle_info}",
  "service_type": "{service_type}",
  "dropoff_address": "{dropoff_address}",
  "customer_name": "{customer_name}",
  "customer_phone": "{customer_phone}",
  "urgency": "{urgency}",
  "notes": "{notes}",
  "tenant_id": "{tenant_id}",
  "conversation_id": "{conversation_id}"
}
```

**Parameters**:
- `pickup_address` (string, required): Where to send the driver - customer's current location
- `vehicle_info` (string, required): Vehicle year, make, model, and color as one string. Example: "Blue 2019 Honda Accord". Critical for driver to identify.
- `service_type` (string, required): Service needed: 'tow', 'flatbed', 'roadside', 'jumpstart', 'lockout', 'tire_change', 'fuel_delivery', 'winch'
- `dropoff_address` (string, optional): Where to take the vehicle. REQUIRED if service says [REQUIRES DROPOFF]. Do NOT ask for [ON-SITE ONLY] services.
- `customer_name` (string, required): Customer's name. ALWAYS ask for this before dispatching. MANDATORY.
- `customer_phone` (string, optional): Customer phone number (from {{caller_phone}})
- `urgency` (string, optional): 'emergency' (blocking traffic, unsafe), 'urgent' (stranded), 'standard'
- `notes` (string, optional): Special instructions: "Keys locked inside", "Won't go into neutral", "In parking garage level 3", ALL extra details
- `tenant_id` (string, optional): Tenant identifier (from {{tenant_id}})
- `conversation_id` (string, optional): Conversation tracking

---

## Tool 3: lookup_dispatch_status

**Type**: Webhook
**Name**: `lookup_dispatch_status`
**Description**:
```
Check status of an existing dispatch job. Use when caller asks: "Where's my driver?", "Any update?", "How much longer?", "Checking on my tow", "Is someone on the way?", "ETA on my driver?". Returns: job status, driver name (first name only), ETA, and human-readable status message. Requires at least 2 of: customer_name, customer_phone, pickup_address.
```

**URL**: `https://zsqfzluyylzmmjtfxwgr.supabase.co/functions/v1/elevenlabs-lookup-dispatch-status`

**Method**: POST

**Headers**:
```json
{
  "Content-Type": "application/json",
  "x-closeloop-secret": "${X_CL_SECRET}"
}
```

**Body Template**:
```json
{
  "tenant_id": "{tenant_id}",
  "customer_name": "{customer_name}",
  "customer_phone": "{customer_phone}",
  "pickup_address": "{pickup_address}",
  "job_number": "{job_number}",
  "conversation_id": "{conversation_id}"
}
```

**Parameters**:
- `tenant_id` (string, required): Tenant identifier (from {{tenant_id}})
- `customer_name` (string, optional): Customer's name to match against job records
- `customer_phone` (string, optional): Customer's phone number for lookup (from {{caller_phone}})
- `pickup_address` (string, optional): Pickup address to match against job records
- `job_number` (string, optional): If caller has reference number
- `conversation_id` (string, optional): Conversation tracking

---

## Tool 4: check_availability

**Type**: Webhook
**Name**: `check_availability`
**Description**:
```
Check availability for SCHEDULED (non-emergency) jobs. Use when customer wants to schedule a future tow, planned vehicle transport, or non-urgent service. Example: "Can I schedule a tow for tomorrow morning?"
```

**URL**: `https://zsqfzluyylzmmjtfxwgr.supabase.co/functions/v1/elevenlabs-check-availability`

**Method**: POST

**Headers**:
```json
{
  "Content-Type": "application/json",
  "x-closeloop-secret": "${X_CL_SECRET}"
}
```

**Body Template**:
```json
{
  "date": "{date}",
  "time": "{time}",
  "service_name": "{service_name}",
  "tenant_id": "{tenant_id}",
  "conversation_id": "{conversation_id}"
}
```

**Parameters**:
- `date` (string, required): Appointment date. Accept 'tomorrow', 'next Monday', 'Friday', or YYYY-MM-DD format.
- `time` (string, required): Appointment time. Accept '2pm', '10:30am', 'noon', or HH:MM format.
- `service_name` (string, optional): Service being booked (e.g., 'towing', 'scheduled pickup'). Helps determine duration.
- `tenant_id` (string, optional): Tenant identifier (from {{tenant_id}})
- `conversation_id` (string, optional): Conversation tracking

---

## Tool 5: suggest_availability

**Type**: Webhook
**Name**: `suggest_availability`
**Description**:
```
Get available times for scheduled (non-emergency) jobs. Use when customer asks "When can you come pick up my car?" for a planned service, not an emergency.
```

**URL**: `https://zsqfzluyylzmmjtfxwgr.supabase.co/functions/v1/elevenlabs-suggest-availability`

**Method**: POST

**Headers**:
```json
{
  "Content-Type": "application/json",
  "x-closeloop-secret": "${X_CL_SECRET}"
}
```

**Body Template**:
```json
{
  "date": "{date}",
  "service_name": "{service_name}",
  "preference": "{preference}",
  "tenant_id": "{tenant_id}",
  "conversation_id": "{conversation_id}"
}
```

**Parameters**:
- `date` (string, optional): Date to check. Accept 'tomorrow', 'next week', 'Saturday'. Defaults to next available.
- `service_name` (string, optional): Service name to determine duration needed
- `preference` (string, optional): Time preference: 'morning', 'afternoon', 'evening', or 'earliest'
- `tenant_id` (string, optional): Tenant identifier (from {{tenant_id}})
- `conversation_id` (string, optional): Conversation tracking

---

## Tool 6: create_booking

**Type**: Webhook
**Name**: `create_booking`
**Description**:
```
Book a SCHEDULED tow or service for a future date/time. Only for non-emergency planned services. For immediate dispatch, use create_dispatch_job instead.
```

**URL**: `https://zsqfzluyylzmmjtfxwgr.supabase.co/functions/v1/elevenlabs-create-booking`

**Method**: POST

**Headers**:
```json
{
  "Content-Type": "application/json",
  "x-closeloop-secret": "${X_CL_SECRET}"
}
```

**Body Template**:
```json
{
  "customer_name": "{customer_name}",
  "date": "{date}",
  "time": "{time}",
  "service_name": "{service_name}",
  "customer_phone": "{customer_phone}",
  "notes": "{notes}",
  "tenant_id": "{tenant_id}",
  "conversation_id": "{conversation_id}"
}
```

**Parameters**:
- `customer_name` (string, required): Customer's full name. Ask "May I have your name?" if not provided.
- `date` (string, required): Confirmed appointment date
- `time` (string, required): Confirmed appointment time
- `service_name` (string, optional): Service being booked
- `customer_phone` (string, optional): Customer phone number (from {{caller_phone}})
- `notes` (string, optional): Special requests or instructions, vehicle info, addresses
- `tenant_id` (string, optional): Tenant identifier (from {{tenant_id}})
- `conversation_id` (string, optional): Conversation tracking

---

## Tool 7: create_callback

**Type**: Webhook
**Name**: `create_callback`
**Description**:
```
Schedule a callback for pricing questions, complaints, or when customer needs to speak to dispatch manager. Use when: "I need an exact quote", "I want to talk to a manager", "I have a complaint", or billing questions.
```

**URL**: `https://zsqfzluyylzmmjtfxwgr.supabase.co/functions/v1/elevenlabs-create-callback`

**Method**: POST

**Headers**:
```json
{
  "Content-Type": "application/json",
  "x-closeloop-secret": "${X_CL_SECRET}"
}
```

**Body Template**:
```json
{
  "reason": "{reason}",
  "customer_name": "{customer_name}",
  "customer_phone": "{customer_phone}",
  "department": "{department}",
  "urgency": "{urgency}",
  "notes": "{notes}",
  "tenant_id": "{tenant_id}",
  "conversation_id": "{conversation_id}"
}
```

**Parameters**:
- `reason` (string, required): Why callback needed: 'pricing question', 'exact quote needed', 'speak to manager', 'complaint', 'billing', 'pricing negotiation'
- `customer_name` (string, optional): Customer's name
- `customer_phone` (string, optional): Customer phone number (from {{caller_phone}})
- `department` (string, optional): 'dispatch', 'manager', 'billing', 'owner'
- `urgency` (string, optional): 'low', 'medium', 'high'
- `notes` (string, optional): Context about their question
- `tenant_id` (string, optional): Tenant identifier (from {{tenant_id}})
- `conversation_id` (string, optional): Conversation tracking

---

## Authentication

All tools require authentication via the `x-closeloop-secret` header.

**To configure:**
1. Get the X-CL-Secret ID from Supabase Edge Functions settings
2. Add it as a header value in the ElevenLabs tool configuration
3. The header should be: `x-closeloop-secret: ${X_CL_SECRET}`
4. ElevenLabs will substitute the actual secret value at runtime

---

## Expected Impact After Tool Configuration

### Quantitative Improvements:
- **Conversion rate**: 60% → 75%+ (match SERVICE agent)
- **Name collection rate**: ~40% → 95%+ (MANDATORY enforcement)
- **Tool usage accuracy**: N/A → 95%+ (correct tool for scenario)
- **Pricing objection resolution**: ~20% → 40%+ (transparency + 5-step protocol)
- **Upsell attach rate**: ~5% → 20%+ (natural opportunities after dispatch)

### Qualitative Improvements:
- **Human-like conversation**: Natural phrasing, contractions, energy mirroring
- **Context persistence**: Never re-asking for info already provided
- **Pricing transparency**: Upfront disclosure before dispatch creation
- **Appropriate empathy**: Caring but not over-apologizing
- **Safety-first guidance**: Clear protocols for highway, weather, unsafe locations
- **Confident ETAs**: Ranges not exact times, padding for conditions
- **Natural upselling**: Helpful not pushy, one mention max
- **Professional objection handling**: Value-focused, alternatives offered
- **Competitor handling**: High road, no trash talk, focus on strengths

---

## Testing Checklist (After Tool Configuration)

Run these 20 test scenarios to verify:

### Emergency Situations (Tier 1):
1. ☐ Highway breakdown blocking lane
2. ☐ Accident with injuries

### Standard Services (Tier 2):
3. ☐ Dead battery on highway
4. ☐ Lockout with keys inside
5. ☐ Flat tire with donut already on

### Vehicle Specialization:
6. ☐ Luxury sedan (Mercedes) - check flatbed recommendation
7. ☐ AWD vehicle (Subaru) - check flatbed mandatory
8. ☐ Motorcycle accident

### Status Checks:
9. ☐ "Where's my driver?" - check driver name included, ETA update

### Pricing Transparency:
10. ☐ Standard tow request - pricing disclosed BEFORE dispatch
11. ☐ "That's too expensive" - check 5-step protocol
12. ☐ AAA comparison - check competitor handling

### Geographic:
13. ☐ Out of service area - graceful handling
14. ☐ Rural location with landmarks

### Upsells:
15. ☐ Jumpstart request - battery testing upsell after dispatch
16. ☐ Tow to shop - storage upsell if shop can't take it

### Safety:
17. ☐ Highway breakdown at night, alone - priority, reassurance
18. ☐ Unsafe neighborhood concern - priority escalation

### Edge Cases:
19. ☐ Third-party caller (calling for spouse)
20. ☐ Multiple service types needed

---

## Monitoring & Metrics (First Week)

Track via `ai_call_sessions` + `call_outcomes`:

1. **Conversion rate**: dispatch_jobs created / total dispatch calls
2. **Name collection rate**: dispatches with customer_name vs "Unknown"
3. **Tool usage**: check_service_area called before create_dispatch_job
4. **Pricing objections**: calls with price objection → still converted
5. **Upsell success**: dispatches with upsell service added
6. **Average call duration**: should decrease with efficiency
7. **Callback rate**: calls escalated to human (should be low)

---

## Next Steps

1. ✅ **System prompt updated** (76,292 chars, 245+ scenarios)
2. **⏳ Configure 7 tools** (use this guide)
3. **⏳ Test 20+ scenarios** (use checklist above)
4. **⏳ Monitor first week** (track metrics above)
5. **⏳ Refine based on real calls** (transcript review)

---

## Support

If tools fail to configure:
- Verify Supabase function URLs are accessible
- Check X-CL-Secret header is correctly set
- Test individual functions via Postman/curl first
- Review ElevenLabs webhook documentation
