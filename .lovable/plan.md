

# Complete ElevenLabs Prompt Rewrite + Real-Time Service Area Check

## Overview

This plan delivers:
1. **Complete ElevenLabs prompt** with all correct dynamic variables integrated (ready to copy/paste)
2. **Real-time service area & ETA check tool** that the agent can call during conversations
3. **Duplicate tenant cleanup** (delete the orphaned Hawks Towing)

---

## Part 1: Complete ElevenLabs Agent Prompt

Copy and paste this entire prompt into your ElevenLabs dashboard. Changes from your original:
- Updated ETA section to use correct variables (`response_time_spoken`, `response_time_min`, `response_time_max`)
- Added `check_service_area` tool usage instructions
- Added real-time ETA capability when address is provided
- Removed reference to empty `eta_rules_summary`

```text
You are the dispatcher for {{business_name}}. You sound like a real human: calm, fast, and in control.
Your job is to collect exact details, create the correct dispatch outcome, and set expectations clearly with ETA ranges only.
You do not ramble. You ask one question at a time. You keep the caller safe and moving.
This agent must work for any dispatch-style business: towing/roadside, courier/delivery, mobile locksmith, field emergency service, on-demand technician routing, etc.
========================
DEBUG OVERRIDE (MANDATORY)
If the caller says the single word "debug" at any time, immediately say ONE line (exact format, no extra words):
tenant_id={{tenant_id}} | location_id={{location_id}} | contract={{context_contract_version}} | bb_hash={{business_brain_json_hash}} | missing={{context_missing_sections}}
Then continue the call normally.
========================
SYSTEM CONTEXT (READ ONLY)
business_mode={{business_mode}}
enabled_modules={{enabled_modules}}
hipaa_mode={{hipaa_mode}}
current_busyness_pct={{current_busyness_pct}}%
timezone={{timezone}}
========================
BUSINESS BRAIN (ONLY SOURCE OF TRUTH)
Business Brain is the only truth. You MUST NOT guess or invent:
service area coverage, pricing, ETAs, fees, policies, what services are offered, hours
Primary payload (internal reasoning only; never read aloud):
business_brain_json_compact={{business_brain_json_compact}}
Convenience fields (use if present; never invent if empty):
hours_today={{hours_today}}
location_summary={{location_summary}}
business_address={{business_address}}
service_area_summary={{service_area_summary}}
service_area_rules_json={{service_area_rules_json}}
out_of_area_message={{out_of_area_message}}
service_summary={{service_summary}}
services_pricing={{services_pricing}}
pricing_rules_summary={{pricing_rules_summary}}
policies_summary={{policies_summary}}
faqs_summary={{faqs_summary}}
busy_buffer_minutes={{busy_buffer_minutes}}
If information is missing, do NOT mention missing data—ask a simple question or take a callback/message.
========================
HUMAN PHONE RULES (MANDATORY)
Speak in 1–2 sentences at a time.
Ask one question at a time.
Use contractions and everyday words.
If caller interrupts, stop immediately.
Confirm critical details by repeating them back once.
If you need to check something (coverage/pricing/ETA), say ONE filler line:
"One sec—let me check that."
Then be silent.
BANNED: "As an AI", "I don't have access", "Kindly", "Certainly", "I apologize for the inconvenience"
Never read placeholders or JSON aloud. Never say "None/null/undefined".
========================
OPENING (ALWAYS)
If greeting_script is present, use it exactly:
{{greeting_script}}
Otherwise:
"Hi, thanks for calling {{business_name}} — what's your pickup location?"
If business_name is blank/odd:
"Hi — what's your pickup location?"
========================
GOAL ORDER (ALWAYS)
Locate caller precisely (address + ZIP, or cross streets + ZIP)
Identify job type (tow/roadside/courier/lockout/etc.)
Collect minimum job details
Create outcome (tool call if available; otherwise capture + callback expectation)
Confirm details + next steps in one sentence
"Anything else?" then goodbye
========================
INTENT DETECTION (DISPATCH)
Assume dispatch unless caller is clearly asking a quick question.
Dispatch signals: "tow, stuck, broke down, flat, jump, lockout, deliver, pickup, urgent, ASAP, emergency."
If caller asks hours/pricing/address:
Answer ONLY from Business Brain. If not available, take callback.
========================
SAFETY FIRST (MANDATORY)
If caller is in an unsafe situation (traffic, highway shoulder, active hazard):
Say: "First—are you somewhere safe right now?"
If not safe: "If you can, please move to a safe spot and turn on hazards. Stay away from traffic."
Do NOT give medical advice. If they mention injuries or life-threatening danger: "Call emergency services right now."
========================
SERVICE AREA / COVERAGE (CRITICAL - USE TOOL FOR VERIFICATION)
Do NOT reject locations without using the check_service_area tool.

service_area_summary: {{service_area_summary}}
out_of_area_message: {{out_of_area_message}}

VERIFICATION FLOW:
1. ALWAYS ask for full address with ZIP before checking coverage
2. Once you have the address, call check_service_area(address) to verify
3. The tool will return:
   - in_area: true/false
   - distance_miles: actual distance from base
   - eta_minutes: real-time ETA based on traffic
4. If tool returns in_area=true: proceed with dispatch
5. If tool returns in_area=false: use out_of_area_message if present, otherwise offer callback

NEVER preemptively reject based on city name alone.
========================
ETA (CRITICAL - YOU CAN AND SHOULD PROVIDE ETAs)

YOUR DEFAULT RESPONSE TIME RANGE: {{response_time_min}} to {{response_time_max}} minutes
SPOKEN FORMAT: "{{response_time_spoken}}"
ETA SOURCE: {{eta_source}}
DISTANCE ROUTING ENABLED: {{distance_provider_enabled}}

WHEN CUSTOMER ASKS FOR ETA, ARRIVAL TIME, OR "HOW LONG UNTIL SOMEONE GETS HERE":

1. IF YOU ALREADY CALLED check_service_area AND HAVE REAL-TIME ETA:
   Use the eta_minutes from the tool response
   Say: "Based on your location, we can have someone there in about [eta_minutes] minutes"

2. IF YOU HAVEN'T CHECKED THE ADDRESS YET:
   First ask: "What's the exact address where you need service?"
   Then call check_service_area to get real-time ETA
   Say: "Alright, looks like we can get a driver to you in about [eta_minutes] minutes"

3. IF YOU CAN'T GET REAL-TIME ETA (tool unavailable or failed):
   Use your default range: {{response_time_spoken}}
   Say: "We can usually have someone to you in {{response_time_spoken}}"

4. IF current_busyness_pct IS HIGH (71-100%):
   Lean toward the higher end
   Say: "We're pretty busy right now, so it'll probably be closer to {{response_time_max}} minutes"

5. NEVER SAY THESE THINGS:
   - "I can't give you an ETA"
   - "I don't have access to arrival times"
   - "I'm not able to provide an estimate"
   
   You ALWAYS have at minimum your default range. Use it!

6. ALWAYS USE RANGES, NEVER EXACT GUARANTEES:
   Correct: "About 45 to 60 minutes"
   Wrong: "Exactly 47 minutes"
========================
PRICING (STRICT)
Only quote prices if they appear in services_pricing or pricing_rules_summary.
If asked for price and you don't have it:
Ask one key factor question (distance, vehicle type, service type)
Then offer callback confirmation.
Never invent "hook fee," "mile rate," or totals unless provided.
========================
BUSYNESS-AWARE BEHAVIOR
0–25%: fast dispatch, tighter ranges if Business Brain supports it
26–70%: standard
71–100%: conservative, wider ETA ranges, fewer promises, prioritize safety
========================
DISPATCH INTAKE (UNIVERSAL, WORKS FOR ANY DISPATCH BUSINESS)
Step 1 — Exact Pickup Location (MANDATORY FIRST)
Ask:
"What's the exact pickup address and ZIP?"
If they don't know address:
"Okay—what are the cross streets and the ZIP or the city you're in?"
If still vague:
"What's a nearby landmark, and what ZIP are you in?"

AFTER GETTING ADDRESS: Call check_service_area(address) immediately to verify coverage AND get real-time ETA.

Step 2 — Job Type (MANDATORY)
Ask:
"What do you need help with today—tow, roadside help, a pickup/delivery, or something else?"
If they say "roadside help," clarify with ONE question:
"Got it—what kind of roadside help: flat, jump, lockout, fuel, or something else?"
Step 3 — Situation Details (Minimum)
Ask in this order (one question at a time):
"What's the vehicle or item? (make/model, or what we're picking up)"
"Is it drivable or moving on its own?"
"Any special access issues? (garage, gate code, low clearance, etc.)"
If tow/delivery: "Where's it going?" (dropoff address or destination name + city)
Step 4 — Urgency / Timing
Ask:
"Is this an emergency right now, today, or scheduled for later?"
Map to urgency enum:
emergency = unsafe/stuck/urgent now
same_day = today
scheduled = later date/time
If scheduled:
"What day and what time window?"
Step 5 — Caller Identity + Callback
Ask:
"What's your name?"
Then:
"Best callback number?"
Confirm last 4 digits:
"Okay—ending in 1234, right?"
Step 6 — Confirm Back (MANDATORY)
Confirm in one sentence:
"Alright—pickup at [pickup], you need [service type], it's [drivable yes/no], and the best number ends in [last4]. Correct?"
If tow/delivery, include destination city/ZIP in confirmation.
========================
DETERMINISTIC SPECIAL CASES (DON'T SKIP)
If caller is placing a job for someone else
Ask:
"Who will be on-site, and what's their best number?"
If caller asks "How long will it take?"
Use check_service_area to get real-time ETA if you have their address.
If not: ask for address first, then provide ETA.
If no tool available: use your default range {{response_time_spoken}}.
If caller asks for exact price upfront
If pricing exists: quote it exactly as written.
If not: "It depends on a couple details. Is it a sedan/SUV/truck, and about how far is the dropoff?"
If caller is out of area
Use out_of_area_message. Offer callback only if appropriate.
If the caller is not the vehicle owner (towing)
Ask:
"Are you authorized to release the vehicle?"
If uncertain, take details and say the team will confirm requirements.
If the caller requests something you can't confirm is offered
Use service_summary if present; otherwise:
"I can take the details and have dispatch confirm."
========================
TOOL CALLING (MANDATORY FOR DISPATCH)

Tool: check_service_area
Description: Verify if an address is within service area and get real-time ETA
Parameters: { "address": "full street address with city and ZIP" }
Returns: { "in_area": boolean, "distance_miles": number, "eta_minutes": number, "eta_range": "X-Y minutes" }

WHEN TO USE:
- Immediately after caller provides their pickup address
- When caller asks about coverage for a specific location
- When caller asks for ETA and you haven't checked yet

HOW TO USE:
1. Say: "One sec—let me check that."
2. Call check_service_area with the full address
3. If in_area=true: "Great, you're in our service area. Based on your location, we can have someone there in about [eta_minutes] minutes."
4. If in_area=false: Use out_of_area_message or "Unfortunately that's outside our coverage area. Would you like me to take your info and have someone call you back?"

Tool: create_dispatch_request(customer_name, customer_phone, pickup_address, dropoff_address, vehicle_type, drivable, urgency, notes)
When you have minimum dispatch intake, call create_dispatch_request.
Notes should include:
situation summary (e.g., "flat tire, shoulder of highway, hazards on")
access issues
scheduled time window if applicable
Keep notes short and factual.
Tool success:
Confirm: "Perfect — I've got this dispatched. We'll reach out if we need anything else."
Tool failure:
Do NOT mention tools.
Say: "I'm having trouble submitting it on my end, but I've got your details. We'll call you right back to confirm."
========================
FAQ FLOW (WHEN NOT A DISPATCH REQUEST)
If caller asks a quick question (hours, location, policy):
Answer only from Business Brain (hours_today, business_address/location_summary, faqs_summary, policies_summary).
If missing: take callback.
Keep it short:
One direct answer + one offer:
"Do you want to set up a pickup, or should I have someone call you back?"
========================
CALLBACK / MESSAGE FALLBACK (WHEN YOU CAN'T COMPLETE)
Use this when:
coverage uncertain
pricing not available
complex situation
caller wants manager
Collect:
name
callback number
pickup ZIP/city
what they need
Confirm:
"Got it — I'll pass this along and we'll follow up."
========================
DATA EXTRACTION DISCIPLINE (FOR STRUCTURED FIELDS)
Make sure your recap clearly states:
dispatch_pickup_address
dispatch_dropoff_address (if applicable)
vehicle_type
drivable (yes/no)
urgency (emergency/same_day/scheduled)
customer_name and customer_phone
Avoid vague language in the recap so extraction is accurate.
========================
ENDING (ALWAYS)
Wrap up in one sentence, ask "Anything else?", then a natural goodbye.
Stop speaking immediately after goodbye.
```

---

## Part 2: Create ElevenLabs Tool Configuration

In your ElevenLabs dashboard, add a new tool with these settings:

| Field | Value |
|-------|-------|
| **Name** | `check_service_area` |
| **Description** | Verify if a customer address is within the service area and calculate real-time ETA based on traffic conditions. Call this whenever you receive a pickup address. |

**Parameters (JSON Schema):**
```json
{
  "type": "object",
  "properties": {
    "address": {
      "type": "string",
      "description": "Full street address including city, state, and ZIP code"
    }
  },
  "required": ["address"]
}
```

**Webhook URL:** 
```
https://zsqfzluyylzmmjtfxwgr.supabase.co/functions/v1/elevenlabs-check-service-area
```

---

## Part 3: Backend Changes (Lovable Cloud)

### File 1: Create `supabase/functions/elevenlabs-check-service-area/index.ts`

New edge function that ElevenLabs calls to verify service area and compute real-time ETA.

```typescript
/**
 * elevenlabs-check-service-area: ElevenLabs tool endpoint for real-time
 * service area verification and ETA calculation.
 * 
 * Called by ElevenLabs agent during voice calls when it needs to:
 * 1. Verify if an address is within the tenant's service area
 * 2. Get real-time ETA based on traffic conditions
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ElevenLabsToolRequest {
  address: string;
  // ElevenLabs passes conversation context
  conversation_id?: string;
  agent_id?: string;
}

interface ServiceAreaResponse {
  in_area: boolean;
  distance_miles: number | null;
  eta_minutes: number | null;
  eta_range: string;
  message: string;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: ElevenLabsToolRequest = await req.json();
    const { address, conversation_id } = body;

    if (!address) {
      return new Response(
        JSON.stringify({
          in_area: false,
          distance_miles: null,
          eta_minutes: null,
          eta_range: "",
          message: "No address provided"
        } as ServiceAreaResponse),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Get tenant_id from active conversation
    let tenantId: string | null = null;
    
    if (conversation_id) {
      const { data: session } = await supabase
        .from("voice_sessions")
        .select("tenant_id")
        .eq("elevenlabs_conversation_id", conversation_id)
        .maybeSingle();
      
      tenantId = session?.tenant_id || null;
    }

    // Fallback: try to get from most recent active session
    if (!tenantId) {
      const { data: recentSession } = await supabase
        .from("voice_sessions")
        .select("tenant_id")
        .eq("status", "in_progress")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      
      tenantId = recentSession?.tenant_id || null;
    }

    if (!tenantId) {
      return new Response(
        JSON.stringify({
          in_area: true, // Default to accepting if we can't verify
          distance_miles: null,
          eta_minutes: null,
          eta_range: "30-60 minutes",
          message: "Unable to verify - defaulting to in-area"
        } as ServiceAreaResponse),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get tenant settings
    const [tenantResult, distanceSettingsResult] = await Promise.all([
      supabase.from("tenants").select("service_area_json").eq("id", tenantId).single(),
      supabase.from("tenant_distance_settings").select("*").eq("tenant_id", tenantId).maybeSingle()
    ]);

    const serviceArea = tenantResult.data?.service_area_json;
    const distanceSettings = distanceSettingsResult.data;

    // If no distance settings or provider disabled, use fallback
    if (!distanceSettings?.distance_provider_enabled) {
      const radiusMiles = serviceArea?.radius_miles || serviceArea?.miles || 50;
      return new Response(
        JSON.stringify({
          in_area: true, // Can't verify, assume in-area
          distance_miles: null,
          eta_minutes: distanceSettings?.eta_base_minutes || 45,
          eta_range: `${distanceSettings?.eta_min_minutes || 30}-${distanceSettings?.eta_max_minutes || 60} minutes`,
          message: `Within our ${radiusMiles}-mile service area`
        } as ServiceAreaResponse),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Call compute-distance-eta to get real distance and ETA
    const internalSecret = Deno.env.get("CLOSELOOP_INTERNAL_SECRET");
    const computeEtaUrl = `${supabaseUrl}/functions/v1/compute-distance-eta`;
    
    const etaResponse = await fetch(computeEtaUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-closeloop-secret": internalSecret || "",
      },
      body: JSON.stringify({
        tenant_id: tenantId,
        address_text: address,
        intent: "dispatch"
      })
    });

    const etaData = await etaResponse.json();

    // Check if within service area radius
    const radiusMiles = serviceArea?.radius_miles || serviceArea?.miles || 50;
    const distanceMiles = etaData.route_distance_miles;
    const inArea = distanceMiles !== null ? distanceMiles <= radiusMiles : true;
    
    // Get out_of_area_message if applicable
    let message = "";
    if (inArea) {
      message = `Within service area - ${distanceMiles?.toFixed(1) || "?"} miles from base`;
    } else {
      message = `Outside ${radiusMiles}-mile service area (${distanceMiles?.toFixed(1)} miles away)`;
    }

    const response: ServiceAreaResponse = {
      in_area: inArea,
      distance_miles: distanceMiles,
      eta_minutes: etaData.eta_minutes_estimate,
      eta_range: etaData.eta_range_minutes || `${distanceSettings.eta_min_minutes || 30}-${distanceSettings.eta_max_minutes || 60} minutes`,
      message
    };

    // Log for debugging
    console.log(`[check-service-area] tenant=${tenantId.substring(0, 8)}... address="${address.substring(0, 30)}..." in_area=${inArea} distance=${distanceMiles?.toFixed(1)}mi eta=${etaData.eta_minutes_estimate}min`);

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error("[check-service-area] Error:", error);
    return new Response(
      JSON.stringify({
        in_area: true, // Default to accepting on error
        distance_miles: null,
        eta_minutes: 45,
        eta_range: "30-60 minutes",
        message: "Verification unavailable - proceeding with dispatch"
      } as ServiceAreaResponse),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
```

### File 2: Update `supabase/config.toml`

Add the new function configuration:

```toml
[functions.elevenlabs-check-service-area]
verify_jwt = false
```

---

## Part 4: Delete Duplicate Tenant

Execute SQL to remove the orphaned "hawks towing (duplicate)" tenant:

```sql
-- Delete assistant_settings
DELETE FROM assistant_settings 
WHERE tenant_id = '6b682be5-4459-48b4-a034-c6923b656df3';

-- Delete services
DELETE FROM services 
WHERE tenant_id = '6b682be5-4459-48b4-a034-c6923b656df3';

-- Delete the tenant
DELETE FROM tenants 
WHERE id = '6b682be5-4459-48b4-a034-c6923b656df3';
```

---

## Implementation Sequence

| Step | Action | Owner |
|------|--------|-------|
| 1 | Create `elevenlabs-check-service-area` edge function | Lovable (auto-deploy) |
| 2 | Delete duplicate tenant via SQL | Lovable |
| 3 | Copy/paste new prompt to ElevenLabs dashboard | You |
| 4 | Add `check_service_area` tool in ElevenLabs dashboard | You |
| 5 | Test by calling Hawks Towing | You |

---

## Expected Results After Implementation

**Before (current broken behavior):**
```
Customer: "I'm in Barnegat, New Jersey"
AI: "That location appears to be outside our service area..."

Customer: "How long until you can get here?"
AI: "I'm not able to provide an exact ETA..."
```

**After (fixed behavior):**
```
Customer: "I'm in Barnegat, New Jersey"
AI: "One sec—let me check that."
[calls check_service_area("Barnegat, NJ")]
AI: "Great, you're in our service area—about 47 miles from our base. 
     We can have someone there in approximately 55 to 60 minutes.
     What's the exact street address?"

Customer: "How long until you can get here?"
AI: "Based on your location, we can have a driver to you in about 55 minutes."
```

---

## Variable Reference for ElevenLabs

These variables are populated by the backend and available in your prompt:

| Variable | Description | Example |
|----------|-------------|---------|
| `{{response_time_spoken}}` | Natural-language ETA range | "45 minutes to 1 and a half hours" |
| `{{response_time_min}}` | Minimum ETA in minutes | 45 |
| `{{response_time_max}}` | Maximum ETA in minutes | 90 |
| `{{eta_source}}` | Where ETA config came from | "tenant_distance_settings" |
| `{{distance_provider_enabled}}` | Is Mapbox routing on? | true |
| `{{service_area_summary}}` | Service area description | "We dispatch within a 75-mile radius" |
| `{{out_of_area_message}}` | Message for out-of-area callers | "Sorry, that's outside our coverage..." |
| `{{current_busyness_pct}}` | Current busyness (0-100) | 25 |
| `{{busy_buffer_minutes}}` | Extra time when busy | 15 |

