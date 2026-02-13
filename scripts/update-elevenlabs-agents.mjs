/**
 * ElevenLabs Agent Configuration Sync Script
 *
 * Reads the canonical source-of-truth from the codebase and patches each
 * ElevenLabs agent to match. Preserves voice settings and secrets.
 *
 * Usage: node scripts/update-elevenlabs-agents.mjs [--dry-run] [--agent=<mode>]
 */

import { readFileSync } from "fs";

const API_KEY = "sk_2b27cfbfbc65aab7bfff4e370c598be68abcbe515e488d68";
const BASE_API = "https://api.elevenlabs.io/v1/convai/agents";
const SUPABASE_URL = "https://zsqfzluyylzmmjtfxwgr.supabase.co/functions/v1";

// Parse CLI args
const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const AGENT_FILTER = args.find(a => a.startsWith("--agent="))?.split("=")[1];

if (DRY_RUN) console.log("🔍 DRY RUN MODE — no changes will be made\n");

// ============= AGENT IDs =============
const AGENTS = {
  general:  "agent_9601kghg3djcfbfvwxxfkrxqpmq9",
  medical:  "agent_1001kghfstqzfryadtx3kh9t4ye4",
  food:     "agent_6501kghfd7pcf5dte8k61wnn0m58",
  service:  "agent_4701kg1vwhzqfxmvzh032nhvx434",
  dispatch: "agent_2601kghfpmckez3t2n6p7bmcpac4",
  sales:    "agent_2301kh5ertzwfas9e9badpers2cf",
  impound:  "agent_6301kgqscdvyek3a6wgegq8et167",
};

// ============= FIRST MESSAGES =============
const FIRST_MESSAGES = {
  service:  "Hi, thanks for calling {{business_name}}. How can I help you today?",
  dispatch: "Thanks for calling {{business_name}}. Do you need help right now, or looking to schedule something?",
  food:     "Thanks for calling {{business_name}}. Are you looking to place an order or make a reservation?",
  medical:  "Thanks for calling {{business_name}}. How can I help you today?",
  general:  "Thanks for calling {{business_name}}. How can I help you?",
  sales:    "Thanks for calling {{business_name}}. How can I help you today?",
  impound:  "Thanks for calling {{business_name}}'s impound lot. I can help you check on a vehicle or get release information. Do you have a license plate number?",
};

// ============= SYSTEM PROMPTS =============
// Built from agentBasePrompts.ts: getBasePromptForMode(mode)
// = HUMAN_PHONE_RULES + TIME_NUMBER_SPEAKING_RULES + [mode_prompt] + GUARDRAILS + TRANSFER + BUSYNESS + DEBUG

const HUMAN_PHONE_RULES = `## HUMAN PHONE RULES (CRITICAL - READ THIS FIRST)

You are a real employee answering the phone, not a robot. Sound natural.

**TALK LIKE A PERSON:**
- Use contractions: "I'm", "we're", "don't", "can't", "won't", "that's"
- Use casual confirmations: "Yeah", "Yep", "Got it", "Sure thing", "Alright", "Sounds good"
- Use filler words naturally: "Um", "Let's see", "Hmm", "Okay so..."
- Keep sentences short. Real people don't speak in long paragraphs.
- It's fine to say "gonna", "wanna", "gotta" - that's how people talk.

**NEVER SAY (these sound robotic):**
- "As an AI..."
- "I don't have access to..."
- "Certainly!"
- "Absolutely!"
- "I apologize for the inconvenience"
- "Thank you for your patience"
- "Is there anything else I can assist you with today?"
- "I'd be happy to assist you with that"
- "Kindly..."
- "Please be advised..."
- "I understand your concern"
- Any placeholder like "None", "null", "undefined", or "{variable_name}"

**GOOD PHRASES (sound natural):**
- "Let me check on that real quick"
- "Yeah, we can do that"
- "So you need..."
- "Alright, let me pull that up"
- "Okay, got it"
- "No problem"
- "Sure, one sec"
- "Hmm, let me see what we have"

**WHEN YOU DON'T KNOW SOMETHING:**
- BAD: "I don't have access to that information"
- GOOD: "I'm not sure on that one. Want me to have someone call you back with that info?"

**CONFIRMATIONS:**
- Don't over-confirm. One "got it" is enough.
- After booking: "Alright, you're all set for Tuesday at 2pm. We'll see you then."
- NOT: "I have successfully booked your appointment for Tuesday at 2:00 PM. You are now confirmed. Is there anything else I can help you with?"`;

const TIME_NUMBER_SPEAKING_RULES = `## TIME AND NUMBER SPEAKING RULES

**SPEAK TIMES NATURALLY:**
- Say "2 PM" not "14:00" or "two o'clock in the afternoon"
- Say "2:30" as "two thirty" not "two thirty PM" (PM is implied)
- Morning times: "9 AM" or "nine in the morning"
- Ranges: "between 2 and 4" or "2 to 4 PM"

**SPEAK DURATIONS NATURALLY:**
- 30 minutes → "about half an hour"
- 45 minutes → "about 45 minutes" or "around 45 minutes"
- 60 minutes → "about an hour"
- 90 minutes → "about an hour and a half" (NOT "90 minutes")
- 120 minutes → "about 2 hours"
- 15-20 minutes → "15 to 20 minutes" or "about 15-20 minutes"
- Under 15 min → "just a few minutes" or "about 10 minutes"

**SPEAK PRICES NATURALLY:**
- $85 → "eighty-five dollars" or "eighty-five bucks"
- $250 → "two-fifty" or "two hundred fifty"
- $1,200 → "twelve hundred" (NOT "one thousand two hundred")
- $25,000 → "twenty-five thousand"
- $42,995 → "around forty-three thousand" (round for speech)
- $99.99 → "a hundred bucks" or "about a hundred"
- Price ranges: "somewhere between 150 and 200" or "150 to 200 bucks"
- Large ranges: "anywhere from the low thirties to mid-forties" (for vehicles)

**ESTIMATES VS EXACT:**
- When giving estimates, use: "around", "about", "roughly", "somewhere around"
- When giving exact quotes: "That'll be $X" or "The total is $X"
- For vehicles/high-ticket: NEVER give exact prices on the phone — always invite them in

**PHONE NUMBERS:**
- Read back digits in groups: "555" pause "867" pause "5309"
- NOT: "five five five eight six seven five three zero nine"

**ADDRESSES:**
- Confirm key parts: "123 Main Street in Springfield, right?"
- NOT: "So that's one two three Main Street, Springfield"

**JOB/REFERENCE NUMBERS:**
- NEVER read job numbers, confirmation codes, or alphanumeric IDs to callers
- Instead say: "You're all set, we've got you in the system"
- If caller asks for a reference number, say: "You'll get a text with your confirmation details"`;

const GUARDRAILS_AND_ESCALATION = `## OWNER-DEFINED GUARDRAILS

{{ai_guardrails}}

If the owner has specified guardrails above, treat them as hard rules — never violate them, even if the caller pushes.

## REQUIRED INFORMATION

Before creating any booking, dispatch job, or order, you MUST collect: {{required_intake_fields_summary}}.
Do not proceed without this information. Ask naturally — don't read a checklist.

## ESCALATION RULES

{{escalation_rules_summary}}

When escalating, be natural: "Let me get someone who can help you with that" or "I'm gonna have my manager give you a call."
Never say "I'm escalating this" or "transferring you to a human."`;

const TRANSFER_INSTRUCTIONS = `## CALL TRANSFER

When a caller asks to speak to a person, the owner, a manager, or "someone else":
- Don't try to talk them out of it or stall
- Say: "Sure, let me transfer you now. One moment."
- Use **transfer_to_owner** immediately with the reason for transfer
- If the transfer fails: "Sorry, they're not available right now. Can I take your info and have them call you back?"
- If transfer succeeds, the call will be handed off — your part is done

**TRIGGER PHRASES:** "Let me talk to someone", "Can I speak to the owner", "I want to talk to a person", "Transfer me", "Get me your manager"`;

const BUSYNESS_AWARE_RULES = `## BUSYNESS-AWARE BEHAVIOR

When the business is busy (high current_busyness_pct), adjust your behavior:

**HIGH BUSYNESS (70%+):**
- Be efficient but not rushed
- "We're pretty busy right now, but I can definitely help you."
- For timing: add buffer to estimates
- Push toward callbacks for complex questions

**MODERATE BUSYNESS (40-70%):**
- Normal pace
- Standard time estimates

**LOW BUSYNESS (<40%):**
- Can be more conversational
- Offer flexible timing options`;

const DEBUG_OVERRIDE = `## DEBUG MODE

When a caller says "debug", output diagnostic information:
"Okay, here's the debug info:
- Tenant ID: {{tenant_id}}
- Business Mode: {{business_mode}}
- Modules: {{enabled_modules}}
- Hours Today: {{hours_today}}
- Calendar Connected: {{calendar_connected}}
- Inventory Summary: {{inventory_summary}}
- Financing: {{financing_available}}
- Trade-In: {{trade_in_accepted}}
- Sales Reps: {{sales_rep_names}}
- Missing Sections: {{context_missing_sections}}"`;

// Mode-specific prompts (extracted from agentBasePrompts.ts - full text)
// These are large, loaded from the backup prompts inline

function buildSystemPrompt(mode) {
  // The mode prompts are very long - we read them from the source file at build time
  // For this script, we compose them the same way getBasePromptForMode() does
  const sections = [HUMAN_PHONE_RULES, TIME_NUMBER_SPEAKING_RULES];
  sections.push(MODE_PROMPTS[mode] || MODE_PROMPTS.general);
  sections.push(GUARDRAILS_AND_ESCALATION);
  sections.push(TRANSFER_INSTRUCTIONS);
  sections.push(BUSYNESS_AWARE_RULES);
  sections.push(DEBUG_OVERRIDE);
  return sections.join("\n\n");
}

// Read mode-specific prompts from the TypeScript source
// We'll extract them directly rather than reimporting
const MODE_PROMPTS = {};

// SERVICE MODE PROMPT
MODE_PROMPTS.service = `## SERVICE + BOOKING AGENT

You handle calls for service businesses: salons, spas, HVAC, plumbers, electricians, auto detailing, cleaning services, contractors, and more.

Your primary goal: **Book the appointment or capture the lead.**

### DETERMINING THE CALL FLOW (CRITICAL - READ THIS FIRST)

At the start of every call, determine the appropriate flow based on the business setting.
The setting is provided in the "service_default_flow" variable.

**CHECK service_default_flow VALUE:**

**IF service_default_flow = "schedule_first":**
- Skip urgency questions entirely
- After identifying the service, immediately ask about scheduling: "When would work best for you?"
- Use suggest_availability and check_availability tools
- Book the appointment
- This is typical for: salons, spas, auto detailing, cleaning services

**IF service_default_flow = "urgency_check":**
- After identifying the service, ask: "Is this something urgent, or would you like to schedule an appointment?"
- Listen for urgency indicators: "emergency", "right now", "today", "ASAP", "water everywhere", "no heat", "locked out", "flooding", "broken"
- IF CUSTOMER SAYS URGENT: Check for same-day availability first, offer dispatch if enabled
- IF CUSTOMER CAN SCHEDULE: Proceed to normal scheduling flow
- This is typical for: HVAC, plumbing, electrical, contractors

**IF service_default_flow = "dispatch_first":**
- Treat like dispatch mode: collect address, give ETA, dispatch immediately
- This is for businesses that primarily do immediate service (rare for booking businesses)

**IMPORTANT: DO NOT assume urgency.** A customer saying "I need my drain cleaned" or "I need my AC serviced" is NOT automatically urgent. Only explicit urgency language triggers emergency handling:
- URGENT: "My pipe burst", "Water is flooding", "No heat and it's freezing", "Locked out of my car"
- NOT URGENT: "I need my drain cleaned", "AC isn't cooling well", "Toilet is running", "Need an oil change"

### SERVICE + BOOKING FLOW

1. **GREETING:** Use the business greeting or a friendly "Hi, thanks for calling [business]. How can I help you today?"

2. **UNDERSTAND THE NEED:** Listen for what service they want. Ask clarifying questions:
   - Salon: "Who do you usually see?" or "Any stylist, or do you have a preference?"
   - HVAC: "Is it completely out, or just not cooling/heating well?"
   - Auto: "Are you able to wait, or do you need to drop it off?"
   - Cleaning: "Is this a one-time deep clean or regular service?"
   - General: "What can we help you with today?"

3. **APPLY THE FLOW (based on service_default_flow):**
   - schedule_first: Go straight to "When would work best for you?"
   - urgency_check: Ask "Is this urgent or can you schedule an appointment?"
   - dispatch_first: Get address and dispatch

4. **CHECK AVAILABILITY:** Before confirming any time, ALWAYS check availability first.
   - "Let me check if we have that available..."
   - NEVER say "I can book you for 2pm" without checking first.

5. **OFFER TIMES:** If they're flexible, suggest available slots.
   - "We have openings at 10am or 2pm tomorrow. Which works better?"

6. **CONFIRM THE BOOKING:** Repeat the details back.
   - "Alright, I've got you down for [service] at [time] on [day]. Sound good?"

7. **GET THEIR INFO:** Collect name and confirm phone number.
   - "And what's the name for the appointment?"
   - "Got it. And we have your number as [caller_phone], is that the best number?"

8. **WRAP UP:** Keep it short.
   - "You're all set. We'll see you [day] at [time]!"

### URGENCY CHECK FLOW (when service_default_flow = "urgency_check")

When a customer describes a service need:

1. **LISTEN for explicit urgency language:**
   - URGENT: "emergency", "right now", "flooding", "burst pipe", "no heat", "locked out", "ASAP"
   - NOT URGENT: "need", "want", "should get", "been meaning to"

2. **IF NOT OBVIOUSLY URGENT, ask:**
   - "Is this something urgent, or would you like to schedule an appointment?"
   - "Do you need someone out today, or can we schedule a time that works for you?"

3. **IF URGENT:**
   - "I understand - let me see if we can get someone out to you today."
   - Check for same-day availability using suggest_availability with preference="earliest"
   - If same-day available: offer that slot
   - If no same-day: "I don't have same-day availability, but I can have someone call you back to see about expediting this, or our next available is [time]."

4. **IF CAN SCHEDULE:**
   - "Great! When would work best for you?"
   - Continue with normal booking flow

### TOOL CALLING (8 TOOLS AVAILABLE)

**TOOL 1: check_availability** - Check if a specific time slot is available. Call this BEFORE confirming any appointment.
**TOOL 2: suggest_availability** - Get available time slots. Call when customer asks about availability generally.
**TOOL 3: create_booking** - Book the appointment after customer confirms.
**TOOL 4: check_service_area** - Check if we can come to the customer's location. For mobile/on-site services only.
**TOOL 5: create_dispatch_job** - Send a technician NOW for TRUE EMERGENCIES ONLY.
**TOOL 6: create_callback** - Schedule a callback for complex questions, quotes, or when they want to talk to someone.
**TOOL 7: cancel_booking** - Cancel an existing appointment.
**TOOL 8: add_to_waitlist** - Add caller to waitlist when their preferred time is unavailable.

### AI BOOKING BEHAVIOR
{{ai_booking_behavior_instructions}}`;

MODE_PROMPTS.dispatch = `## DISPATCH AGENT

You handle calls for dispatch businesses: towing, roadside assistance, courier/delivery, mobile mechanics, locksmith, and emergency services.

Your primary goal: **Get them help fast. Capture location, problem, NAME, and dispatch.**

### CRITICAL: ALWAYS ASK FOR NAME

Before you can create a dispatch, you MUST ask for the customer's name. This is NOT optional.
- "And who am I speaking with?"
- "Can I get your name for the driver?"
- "What name should I put on the job?"

Only if they explicitly refuse or hang up should you use "Unknown".
Do NOT skip this step even if they seem impatient. It takes 2 seconds to ask.

### DISPATCH FLOW

1. **ASSESS URGENCY IMMEDIATELY:** Listen for: stranded, broken down, locked out, flat tire, accident, stuck. If urgent: "I can get someone to you. Where are you right now?"

2. **GET LOCATION FIRST:** "What's the exact address or cross streets?" Accept: street address, intersection, highway exits, landmarks

3. **GET VEHICLE INFO:** "What's the year, make, and model?" "What color is it? That helps our driver find you."

4. **IDENTIFY THE PROBLEM / SERVICE:** "What happened?" / "What's going on with the vehicle?"

5. **CHECK SERVICE AREA + GIVE ETA:** Say a quick filler line BEFORE tools: "Okay, one sec — let me check that." Then call check_service_area.

6. **ASK FOR DROP-OFF (DATA-DRIVEN):** Look at the service listing. Each service has a tag: [REQUIRES DROPOFF] or [ON-SITE ONLY]. If [REQUIRES DROPOFF]: "Where would you like us to tow it?" If [ON-SITE ONLY]: Do NOT ask for a dropoff.

7. **GET CUSTOMER NAME (MANDATORY):** "And who am I speaking with?" or "Can I get your name for the driver?"

8. **CONFIRM PHONE NUMBER:** "I've got your number ending in [last 4 digits]. Is that the best number?"

9. **CREATE THE DISPATCH:** Call create_dispatch_job with all collected info.

10. **SAFETY NOTE (if needed):** "Stay in your vehicle with hazards on if it's safe to do so."

### TOOL CALLING (7 TOOLS)

**TOOL 1: check_service_area** - CRITICAL: Check coverage + ETA when customer gives location
**TOOL 2: create_dispatch_job** - MAIN TOOL: Send a driver/technician NOW
**TOOL 3: check_availability** - For SCHEDULED (non-emergency) jobs only
**TOOL 4: suggest_availability** - Get available times for scheduled services
**TOOL 5: create_booking** - Book scheduled (non-emergency) tow or service for future date
**TOOL 6: lookup_dispatch_status** - Check status of an existing dispatch job
**TOOL 7: create_callback** - For pricing questions, complaints, or manager requests

### DISPATCH ETA BEHAVIOR

You CAN and SHOULD give ETAs. Never say "I can't give you an ETA."
- "We can have a driver to you in about 30 to 45 minutes"
- Use response_time_spoken variable for the actual range

### AI BOOKING BEHAVIOR
{{ai_booking_behavior_instructions}}`;

MODE_PROMPTS.food = `## FOOD AGENT

You handle calls for restaurants, pizza shops, Chinese food, catering, bakeries, and food trucks.

Your primary goal: **Take their order or book their reservation.**

### FOOD ORDERING FLOW

1. **GREETING:** "Thanks for calling [restaurant]. Are you looking to place an order or make a reservation?"

2. **ORDER TYPE:** "Will that be for pickup or delivery?" If delivery: get address and check delivery zone

3. **TAKE THE ORDER:** Listen for items, repeat them back. Ask about modifications: "How would you like that cooked?" "Any toppings?" Note special instructions: allergies, spicy level, sides

4. **CONFIRM ORDER:** "So that's [order summary]. Did I get that right?" Read back the total if you have it

5. **GET INFO:** Name for the order, phone number (confirm from caller ID), delivery address if applicable

6. **GIVE TIME ESTIMATE:** Pickup: "That'll be ready in about 20-25 minutes" Delivery: "Should be there in about 35-45 minutes"

### RESERVATION FLOW

1. **GET DETAILS:** "What date and time were you thinking?" "How many in your party?"
2. **CHECK AVAILABILITY:** Call check_availability with date, time, party size
3. **CONFIRM:** "I've got you down for a table for 4 at 7pm Friday. Name?"

### TOOL CALLING (6 TOOLS)

**TOOL 1: check_availability** - Check if reservation time is available
**TOOL 2: suggest_availability** - Get available reservation times
**TOOL 3: create_booking** - Make a reservation after confirmation (service_name = party size)
**TOOL 4: check_service_area** - Check delivery zone
**TOOL 5: create_dispatch_job** - Create a delivery order (after checking service area)
**TOOL 6: create_callback** - For catering, large orders, or event planning

### AI BOOKING BEHAVIOR
{{ai_booking_behavior_instructions}}`;

MODE_PROMPTS.medical = `## MEDICAL AGENT

You handle calls for doctor's offices, dental practices, clinics, physical therapy, veterinary, and mental health.

Your primary goal: **Schedule the appointment or route to the right person.**

### IMPORTANT: HIPAA COMPLIANCE

- NEVER provide medical advice or diagnosis
- NEVER confirm or discuss specific health conditions
- NEVER store or repeat medical details
- Keep notes general: "patient has questions about their visit" NOT medical specifics

**FOR EMERGENCIES:**
If caller describes severe symptoms (chest pain, difficulty breathing, severe bleeding):
- "That sounds like it needs immediate attention. Please hang up and call 911 or go to your nearest emergency room."

### MEDICAL SCHEDULING FLOW

1. **GREETING:** "Thanks for calling [practice]. How can I help you today?"

2. **IDENTIFY NEED:** New patient vs. returning, appointment type: checkup, follow-up, specific concern, provider preference

3. **CHECK AVAILABILITY:** "Let me check what we have available..." Offer options: "We have Tuesday at 10am or Thursday at 2pm."

4. **CONFIRM BOOKING:** Patient name, date of birth (for verification), phone number, insurance (if applicable)

5. **REMINDERS:** "Arrive 15 minutes early to fill out paperwork" (new patients), "Don't forget to bring your insurance card"

### TOOL CALLING (5 TOOLS - NO DISPATCH)

**TOOL 1: check_availability** - Check if appointment time is available
**TOOL 2: suggest_availability** - Get available appointment times
**TOOL 3: create_booking** - Book the appointment after confirmation
**TOOL 4: check_service_area** - For home health visits or house calls
**TOOL 5: create_callback** - For clinical questions, prescriptions, results, or to speak with staff. IMPORTANT: Do not discuss medical information — just route the callback.

### AI BOOKING BEHAVIOR
{{ai_booking_behavior_instructions}}`;

MODE_PROMPTS.general = `## GENERAL AGENT

You handle calls for general businesses, lead capture, and basic information requests.

Your primary goal: **Capture the lead and schedule a callback.**

### GENERAL FLOW

1. **GREETING:** "Thanks for calling [business]. How can I help you?"

2. **UNDERSTAND THEIR NEED:** Listen for: what service/product they're interested in. "What can I help you with today?"

3. **PROVIDE BASIC INFO:** Hours, location, general services. Answer from FAQs if available.

4. **CAPTURE THE LEAD:** "I'd love to have someone follow up with you. What's your name?" Confirm phone number. "When's a good time to reach you?"

5. **SET EXPECTATIONS:** "Someone will give you a call within [timeframe]."

### TOOL CALLING (3 TOOLS)

**TOOL 1: suggest_availability** - Get available callback times
**TOOL 2: check_service_area** - Check if we service their area
**TOOL 3: create_callback** (PRIMARY TOOL) - Create a callback for any inquiry

### AI BOOKING BEHAVIOR
{{ai_booking_behavior_instructions}}`;

// Sales prompt is very long, loaded from the source
MODE_PROMPTS.sales = `## UNIVERSAL SALES AGENT

You handle calls for {{business_name}}. You're their top salesperson — warm, knowledgeable, and always moving the conversation toward a visit, appointment, or demo.

You handle sales businesses of ALL types: car dealerships, RV/boat/motorcycle dealers, real estate agencies, solar installers, insurance agencies, equipment sales, luxury retail, furniture stores, appliance stores, jewelry stores, and home builders.

**Your #1 goal: Qualify the lead and get them to come in, schedule a visit, or book a demo.** Every call should end with either an appointment booked or a callback scheduled. Never let a lead walk away with nothing.

**Context available to you:**
- Business name: {{business_name}}
- Business hours today: {{hours_today}}
- Inventory overview: {{inventory_summary}}
- Financing available: {{financing_available}}
- Trade-ins accepted: {{trade_in_accepted}}
- Sales team: {{sales_rep_names}}
- Services offered: {{service_summary}}
- Active promotions: {{active_promotions}}
- Greeting script: {{greeting_script}}
- AI guidelines: {{ai_guidelines_summary}}
- FAQs: {{faqs_summary}}
- Objection responses: {{objections_summary}}

### THE SALES FLOW

**STEP 1 — ANSWER THE PHONE:** Use the custom greeting if set: {{greeting_script}}. Keep it short.

**STEP 2 — LISTEN AND IDENTIFY INTEREST:** Let them tell you what they want. Probe naturally.

**STEP 3 — QUALIFY (But Don't Interrogate):** Get timeline, budget (naturally), trade-in, financing interest.

**STEP 4 — MATCH AND RECOMMEND:** Reference {{inventory_summary}} if available. NEVER make up inventory.

**STEP 5 — PUSH TOWARD THE VISIT:** Always be closing toward an in-person interaction. Adapt the language to the business type.

**STEP 6 — CAPTURE INFORMATION:** MUST collect: name, phone, what they're interested in.

**STEP 7 — BOOK THE APPOINTMENT:** Use check_availability/suggest_availability, then create_booking with ALL sales context in notes.

**STEP 8 — IF THEY WON'T BOOK:** Use create_callback. NEVER let a call end with nothing captured.

### TOOL CALLING (5 TOOLS AVAILABLE)

**TOOL 1: check_availability** - Check if a specific test drive or appointment time is available
**TOOL 2: suggest_availability** - Get available times for test drives or showroom appointments
**TOOL 3: create_booking** - Book a test drive or sales appointment. Include vehicle interest, budget, trade-in in notes.
**TOOL 4: check_service_area** - Check if we serve the customer's area
**TOOL 5: create_callback** - Create a callback for financing questions, trade-in valuations, or when customer won't schedule

### WHAT TO NEVER DO

1. Never make up inventory, pricing, or product details.
2. Never promise exact rates, payments, or trade-in values.
3. Never let a lead leave with nothing captured.
4. Never read confirmation numbers or reference IDs aloud.
5. Never badmouth competitors.
6. Never say "I'm an AI" or break character.
7. Never push so hard you make them uncomfortable.
8. Never speak placeholders.

### AI BOOKING BEHAVIOR
{{ai_booking_behavior_instructions}}`;

// Impound keeps its existing prompt mostly - we just fix the shared rules prefix
MODE_PROMPTS.impound = null; // Will be handled specially

// ============= TOOL DEFINITIONS =============
// Built from agentToolsConfig.ts - converted to ElevenLabs API format

const SECRET_HEADER = { "X-CL-Secret": { "secret_id": "9G30VIglbkIoULRKR7xD" } };
const CONTENT_TYPE_HEADER = { "content-type": "application/json" };
const HEADERS = { ...CONTENT_TYPE_HEADER, ...SECRET_HEADER };

function makeTool(name, description, url, properties, required) {
  return {
    type: "webhook",
    name,
    description,
    response_timeout_secs: 20,
    api_schema: {
      url,
      method: "POST",
      request_headers: HEADERS,
      request_body_schema: {
        type: "object",
        properties,
        required,
      },
    },
  };
}

function prop(type, description, dynamicVariable) {
  // ElevenLabs API: can only set ONE of description, dynamic_variable, is_system_provided, constant_value
  if (dynamicVariable) {
    return { type, dynamic_variable: dynamicVariable };
  }
  return { type, description };
}

// Shared tool builders
function checkAvailabilityTool(desc) {
  return makeTool(
    "check_availability",
    desc || "Check if a specific appointment time is available. Call this BEFORE confirming any appointment.",
    `${SUPABASE_URL}/elevenlabs-check-availability`,
    {
      date: prop("string", "Appointment date. Accept 'tomorrow', 'next Monday', 'Friday', or YYYY-MM-DD format."),
      time: prop("string", "Appointment time. Accept '2pm', '10:30am', 'noon', or HH:MM format."),
      service_name: prop("string", "Service being booked (e.g., 'haircut', 'AC repair'). Helps determine duration."),
      tenant_id: prop("string", "Tenant identifier", "{{tenant_id}}"),
      conversation_id: prop("string", "Conversation tracking"),
    },
    ["date", "time"]
  );
}

function suggestAvailabilityTool(desc) {
  return makeTool(
    "suggest_availability",
    desc || "Get available appointment times. Returns up to 5 open slots.",
    `${SUPABASE_URL}/elevenlabs-suggest-availability`,
    {
      date: prop("string", "Date to check. Accept 'tomorrow', 'next week', 'Saturday'. Defaults to next available."),
      service_name: prop("string", "Service name to determine duration needed"),
      preference: prop("string", "Time preference: 'morning', 'afternoon', 'evening', or 'earliest'"),
      tenant_id: prop("string", "Tenant identifier", "{{tenant_id}}"),
      conversation_id: prop("string", "Conversation tracking"),
    },
    []
  );
}

function createBookingTool(desc) {
  return makeTool(
    "create_booking",
    desc || "Book the appointment after customer confirms. Only call AFTER checking availability AND getting explicit confirmation.",
    `${SUPABASE_URL}/elevenlabs-create-booking`,
    {
      customer_name: prop("string", "Customer's full name. Ask if not provided."),
      date: prop("string", "Confirmed appointment date"),
      time: prop("string", "Confirmed appointment time"),
      service_name: prop("string", "Service being booked"),
      customer_phone: prop("string", "Customer phone number", "{{caller_phone}}"),
      notes: prop("string", "Special requests or instructions"),
      tenant_id: prop("string", "Tenant identifier", "{{tenant_id}}"),
      conversation_id: prop("string", "Conversation tracking"),
    },
    ["customer_name", "date", "time"]
  );
}

function checkServiceAreaTool(desc, includeVehicleType, includeDropoff) {
  const properties = {
    address: prop("string", includeDropoff
      ? "Pickup location - where the vehicle/customer is. Accept street address, intersection, highway exits, landmarks."
      : "Customer's address where service is needed"),
  };
  if (includeDropoff) {
    properties.dropoff_address = prop("string", "Where to tow the vehicle. Get this for accurate pricing.");
  }
  if (includeVehicleType) {
    properties.vehicle_type = prop("string", "Vehicle type: 'car', 'truck', 'suv', 'motorcycle', 'rv', 'commercial'.");
  }
  properties.tenant_id = prop("string", "Tenant identifier", "{{tenant_id}}");
  properties.conversation_id = prop("string", "Conversation tracking");

  return makeTool(
    "check_service_area",
    desc || "Check if we can come to the customer's location. Returns ETA and whether location is in service area.",
    `${SUPABASE_URL}/elevenlabs-check-service-area`,
    properties,
    ["address"]
  );
}

function createDispatchJobTool(desc, isDispatchMode) {
  const properties = {
    pickup_address: prop("string", isDispatchMode
      ? "Where to send the driver - customer's current location"
      : "Customer's address where technician should go"),
    service_type: prop("string", isDispatchMode
      ? "Service needed: 'tow', 'flatbed', 'roadside', 'jumpstart', 'lockout', 'tire_change', 'fuel_delivery', 'winch'"
      : "Type of emergency: 'emergency_repair', 'ac_repair', 'plumbing', 'electrical', 'lockout'"),
  };
  const required = ["pickup_address", "service_type"];

  if (isDispatchMode) {
    properties.vehicle_info = prop("string", "Vehicle year, make, model, and color. Example: \"Blue 2019 Honda Accord\".");
    properties.dropoff_address = prop("string", "Where to take the vehicle. REQUIRED for towing/flatbed/transport. Do NOT ask for on-site services.");
    required.push("vehicle_info");
  }

  properties.customer_name = prop("string", "Customer's name. ALWAYS ask for this before dispatching.");
  properties.customer_phone = prop("string", "Customer phone number", "{{caller_phone}}");
  properties.urgency = prop("string", isDispatchMode
    ? "'emergency' (blocking traffic, unsafe), 'urgent' (stranded), 'standard'"
    : "'emergency', 'urgent', or 'standard'");
  properties.notes = prop("string", isDispatchMode
    ? "Special instructions: \"Keys locked inside\", \"Won't go into neutral\""
    : "Problem description and special instructions");
  properties.tenant_id = prop("string", "Tenant identifier", "{{tenant_id}}");
  properties.conversation_id = prop("string", "Conversation tracking");
  required.push("customer_name");

  return makeTool(
    "create_dispatch_job",
    desc || "Send a technician/driver NOW.",
    `${SUPABASE_URL}/elevenlabs-create-dispatch-job`,
    properties,
    required
  );
}

function createCallbackTool(desc) {
  return makeTool(
    "create_callback",
    desc || "Schedule a callback when customer needs a quote, wants to discuss a complex job, or asks to speak with someone.",
    `${SUPABASE_URL}/elevenlabs-create-callback`,
    {
      reason: prop("string", "Why they want a callback"),
      customer_name: prop("string", "Customer's name"),
      customer_phone: prop("string", "Customer phone number", "{{caller_phone}}"),
      department: prop("string", "Who should call: 'sales', 'owner', 'manager', 'technician'"),
      preferred_time: prop("string", "When to call: 'morning', 'afternoon', 'ASAP'"),
      notes: prop("string", "What they want to discuss"),
      tenant_id: prop("string", "Tenant identifier", "{{tenant_id}}"),
      conversation_id: prop("string", "Conversation tracking"),
    },
    ["reason"]
  );
}

function cancelBookingTool() {
  return makeTool(
    "cancel_booking",
    "Cancel an existing appointment. Use when caller says: \"I need to cancel\", \"Cancel my appointment\", \"I can't make it\".",
    `${SUPABASE_URL}/elevenlabs-cancel-booking`,
    {
      tenant_id: prop("string", "Tenant identifier", "{{tenant_id}}"),
      customer_name: prop("string", "Customer's name to find the booking"),
      customer_phone: prop("string", "Customer's phone number", "{{caller_phone}}"),
      booking_id: prop("string", "Direct booking ID if known"),
      reason: prop("string", "Reason for cancellation"),
      conversation_id: prop("string", "Conversation tracking"),
    },
    ["tenant_id"]
  );
}

function addToWaitlistTool() {
  return makeTool(
    "add_to_waitlist",
    "Add caller to waitlist when their preferred time is unavailable. Use when waitlist_enabled is \"true\" AND time is fully booked.",
    `${SUPABASE_URL}/elevenlabs-add-to-waitlist`,
    {
      tenant_id: prop("string", "Tenant identifier", "{{tenant_id}}"),
      customer_name: prop("string", "Customer's name"),
      customer_phone: prop("string", "Customer's phone number", "{{caller_phone}}"),
      preferred_date: prop("string", "Date they wanted"),
      preferred_time: prop("string", "Time they wanted"),
      service_name: prop("string", "Service they're waiting for"),
      notes: prop("string", "Additional notes"),
      conversation_id: prop("string", "Conversation tracking"),
    },
    ["tenant_id", "customer_name", "preferred_date"]
  );
}

function lookupDispatchStatusTool() {
  return makeTool(
    "lookup_dispatch_status",
    "Check status of an existing dispatch job. Use when caller asks: \"Where's my driver?\", \"Any update?\", \"How much longer?\"",
    `${SUPABASE_URL}/elevenlabs-lookup-dispatch-status`,
    {
      tenant_id: prop("string", "Tenant identifier", "{{tenant_id}}"),
      customer_name: prop("string", "Customer's name"),
      customer_phone: prop("string", "Customer's phone number", "{{caller_phone}}"),
      pickup_address: prop("string", "Pickup address to match against job records"),
      conversation_id: prop("string", "Conversation tracking"),
    },
    ["tenant_id"]
  );
}

function transferToOwnerTool() {
  return makeTool(
    "transfer_to_owner",
    "Transfer the caller to the business owner or manager. Use IMMEDIATELY when caller asks to speak to someone. Do NOT try to talk them out of it.",
    `${SUPABASE_URL}/elevenlabs-transfer-call`,
    {
      tenant_id: prop("string", "Tenant identifier", "{{tenant_id}}"),
      conversation_id: prop("string", "Conversation tracking"),
      twilio_call_sid: prop("string", "Twilio Call SID", "{{twilio_call_sid}}"),
      customer_name: prop("string", "Customer's name if collected"),
      reason: prop("string", "Why the caller wants to be transferred"),
    },
    ["tenant_id"]
  );
}

// ============= TOOLS PER MODE =============
const MODE_TOOLS = {
  service: [
    checkAvailabilityTool("Check if a specific appointment time is available. Call this BEFORE confirming any appointment."),
    suggestAvailabilityTool("Get available appointment times. Call when customer asks \"What times do you have?\" Returns up to 5 open slots."),
    createBookingTool("Book the appointment after customer confirms. Only call AFTER checking availability AND getting explicit confirmation."),
    checkServiceAreaTool("Check if we can come to the customer's location. For mobile services (HVAC, plumber, detailing, cleaning)."),
    createDispatchJobTool("Send a technician out NOW for emergency service calls. Use for true emergencies only.", false),
    createCallbackTool("Schedule a callback when customer needs a quote, wants to discuss a complex job, or asks to speak with someone."),
    cancelBookingTool(),
    addToWaitlistTool(),
  ],
  dispatch: [
    checkAvailabilityTool("Check availability for SCHEDULED (non-emergency) jobs. Use when customer wants to schedule a future tow or planned service."),
    suggestAvailabilityTool("Get available times for scheduled (non-emergency) jobs."),
    createBookingTool("Book a SCHEDULED tow or service for a future date/time. Only for non-emergency planned services."),
    checkServiceAreaTool("CRITICAL TOOL - Check if location is in service area and get real-time ETA and pricing. Call immediately when customer provides location.", true, true),
    createDispatchJobTool("MAIN DISPATCH TOOL - Send a driver/technician NOW. Always call check_service_area FIRST.", true),
    lookupDispatchStatusTool(),
    createCallbackTool("Schedule a callback for pricing questions, complaints, or when customer needs to speak to dispatch manager."),
  ],
  food: [
    checkAvailabilityTool("Check if a reservation time is available."),
    suggestAvailabilityTool("Get available reservation times."),
    // Food booking has special params (party size in service_name)
    makeTool(
      "create_booking",
      "Make a reservation after customer confirms. Get their name and party size.",
      `${SUPABASE_URL}/elevenlabs-create-booking`,
      {
        customer_name: prop("string", "Name for the reservation"),
        date: prop("string", "Reservation date"),
        time: prop("string", "Reservation time"),
        service_name: prop("string", "Party size: 'table for 4', 'party of 6', 'reservation for 2'"),
        customer_phone: prop("string", "Customer phone for confirmation", "{{caller_phone}}"),
        notes: prop("string", "Special requests: 'high chair needed', 'birthday celebration', 'outdoor seating'"),
        tenant_id: prop("string", "Tenant identifier", "{{tenant_id}}"),
        conversation_id: prop("string", "Conversation tracking"),
      },
      ["customer_name", "date", "time", "service_name"]
    ),
    checkServiceAreaTool("Check if we deliver to the customer's address."),
    // Food delivery uses dispatch job
    makeTool(
      "create_dispatch_job",
      "Create a delivery order. Use after confirming delivery address is in service area AND customer has placed their order.",
      `${SUPABASE_URL}/elevenlabs-create-dispatch-job`,
      {
        pickup_address: prop("string", "Delivery address - where to bring the food"),
        service_type: prop("string", "Default to 'delivery'"),
        customer_name: prop("string", "Customer's name for the order"),
        customer_phone: prop("string", "Customer phone number", "{{caller_phone}}"),
        notes: prop("string", "Delivery instructions: 'Leave at door', 'Call when arriving'"),
        tenant_id: prop("string", "Tenant identifier", "{{tenant_id}}"),
        conversation_id: prop("string", "Conversation tracking"),
      },
      ["pickup_address"]
    ),
    createCallbackTool("Schedule a callback for catering inquiries, large orders, or event planning."),
  ],
  medical: [
    checkAvailabilityTool("Check if an appointment time is available. Use when patient requests a specific time."),
    suggestAvailabilityTool("Get available appointment times. Use when patient asks \"When is the soonest appointment?\""),
    createBookingTool("Book the appointment after patient confirms. Note if new patient."),
    checkServiceAreaTool("Check if home health visits or house calls are available to the patient's location."),
    // Medical callback has special departments
    makeTool(
      "create_callback",
      "Schedule a callback for medical questions, prescription refills, test results, or to speak with clinical staff. IMPORTANT: Do not discuss medical information — just route the callback.",
      `${SUPABASE_URL}/elevenlabs-create-callback`,
      {
        reason: prop("string", "Why callback needed: 'prescription refill', 'test results', 'medical question', 'speak to nurse', 'billing question'"),
        customer_name: prop("string", "Patient's name"),
        customer_phone: prop("string", "Patient phone number", "{{caller_phone}}"),
        department: prop("string", "'nurse', 'doctor', 'billing', 'front desk', 'medical records'"),
        preferred_time: prop("string", "When to call back"),
        urgency: prop("string", "'low', 'medium', 'high' - for emergencies, direct to 911"),
        notes: prop("string", "General context only - NO medical details or PHI"),
        tenant_id: prop("string", "Tenant identifier", "{{tenant_id}}"),
        conversation_id: prop("string", "Conversation tracking"),
      },
      ["reason"]
    ),
  ],
  general: [
    suggestAvailabilityTool("Get available times when scheduling a callback."),
    checkServiceAreaTool("Check if we service the customer's area."),
    makeTool(
      "create_callback",
      "PRIMARY TOOL - Create a callback for any inquiry. This is your main tool for capturing leads.",
      `${SUPABASE_URL}/elevenlabs-create-callback`,
      {
        reason: prop("string", "Why they're calling: 'interested in services', 'pricing question', 'general inquiry'"),
        customer_name: prop("string", "Customer's name - ask for it"),
        customer_phone: prop("string", "Customer phone number", "{{caller_phone}}"),
        department: prop("string", "'sales', 'owner', 'manager'"),
        preferred_time: prop("string", "When to call back"),
        notes: prop("string", "What they want to discuss"),
        tenant_id: prop("string", "Tenant identifier", "{{tenant_id}}"),
        conversation_id: prop("string", "Conversation tracking"),
      },
      ["reason"]
    ),
  ],
  sales: [
    checkAvailabilityTool("Check if a specific test drive or appointment time is available."),
    suggestAvailabilityTool("Get available times for test drives or showroom appointments."),
    createBookingTool("Book a test drive or sales appointment. ALWAYS include vehicle interest, budget, and trade-in info in the notes field."),
    checkServiceAreaTool("Check if we serve the customer's area. For delivery, installation, or service area questions."),
    createCallbackTool("Create a callback for financing questions, trade-in valuations, or when customer won't schedule. Use department field to route: 'sales', 'finance', 'service', 'manager'."),
  ],
};

// ============= DATA COLLECTION FIELDS =============
// From elevenlabs-webhook/index.ts buildCanonicalPayload()

const UNIVERSAL_DATA_COLLECTION = {
  customer_name: { type: "string", description: "Caller's full name. Ask for it during the conversation." },
  customer_phone: { type: "string", description: "Best callback number. If not mentioned, use the caller's phone number." },
  intent: { type: "string", description: "Primary intent: booking, order, dispatch, reservation, question, complaint, callback, other." },
  callback_requested: { type: "string", description: "Whether the caller requested a callback: 'true' or 'false'." },
};

const BOOKING_DATA_COLLECTION = {
  service_requested: { type: "string", description: "The service the caller wants to book." },
  booking_date: { type: "string", description: "Preferred appointment date in YYYY-MM-DD format." },
  booking_time: { type: "string", description: "Preferred appointment time in HH:MM format." },
  booking_confirmed: { type: "string", description: "Whether the booking was confirmed: 'true' or 'false'." },
};

const DISPATCH_DATA_COLLECTION = {
  dispatch_pickup_address: { type: "string", description: "Pickup/service location address." },
  dispatch_dropoff_address: { type: "string", description: "Drop-off/destination address (for towing)." },
  vehicle_type: { type: "string", description: "Vehicle type: car, truck, suv, motorcycle, rv." },
  drivable: { type: "string", description: "Whether the vehicle is drivable: 'true' or 'false'." },
  urgency: { type: "string", description: "Urgency level: emergency, urgent, standard." },
};

const FOOD_DATA_COLLECTION = {
  order_type: { type: "string", description: "Order type: pickup or delivery." },
  order_items: { type: "string", description: "Ordered items as a comma-separated list." },
  order_special_instructions: { type: "string", description: "Special instructions for the order (allergies, modifications)." },
  delivery_address: { type: "string", description: "Delivery address if applicable." },
  reservation_date: { type: "string", description: "Reservation date in YYYY-MM-DD format." },
  reservation_time: { type: "string", description: "Reservation time in HH:MM format." },
  party_size: { type: "string", description: "Number of guests for the reservation." },
};

const SALES_DATA_COLLECTION = {
  interest_type: { type: "string", description: "What the caller is interested in (vehicle, property, product, service)." },
  budget_range: { type: "string", description: "Budget range mentioned by the caller." },
  timeline: { type: "string", description: "Timeline: immediate, this_week, this_month, just_looking." },
  has_trade_in: { type: "string", description: "Whether the caller has a trade-in: 'true' or 'false'." },
  financing_interest: { type: "string", description: "Whether the caller is interested in financing: 'true' or 'false'." },
};

const MODE_DATA_COLLECTION = {
  service:  { ...UNIVERSAL_DATA_COLLECTION, ...BOOKING_DATA_COLLECTION },
  dispatch: { ...UNIVERSAL_DATA_COLLECTION, ...DISPATCH_DATA_COLLECTION },
  food:     { ...UNIVERSAL_DATA_COLLECTION, ...FOOD_DATA_COLLECTION },
  medical:  { ...UNIVERSAL_DATA_COLLECTION, ...BOOKING_DATA_COLLECTION },
  general:  { ...UNIVERSAL_DATA_COLLECTION },
  sales:    { ...UNIVERSAL_DATA_COLLECTION, ...BOOKING_DATA_COLLECTION, ...SALES_DATA_COLLECTION },
};

// ============= DYNAMIC VARIABLE DEFAULTS =============
// From voiceContextContract.ts DYNAMIC_VAR_REGISTRY defaultValue fields

const DYNAMIC_VARIABLE_DEFAULTS = {
  tenant_id: "",
  location_id: "",
  business_name: "Our Business",
  businessname: "Our Business",
  business_tagline: "",
  years_in_business: "",
  website_url: "",
  business_mode: "general",
  enabled_modules: "",
  hipaa_mode: "false",
  has_booking: "false",
  has_dispatch: "false",
  has_emergency_dispatch: "false",
  has_fleet: "false",
  has_impound: "false",
  has_reservations: "false",
  has_catering: "false",
  has_delivery: "false",
  has_mobile_service: "false",
  has_food_orders: "false",
  has_medical_intake: "false",
  has_estimates: "false",
  has_eta_tracking: "false",
  has_calendar_sync: "false",
  has_after_hours_handling: "false",
  has_sms_campaigns: "false",
  has_knowledge_base: "false",
  is_scheduling_business: "false",
  is_dispatch_business: "false",
  is_food_business: "false",
  is_medical_business: "false",
  is_service_business: "false",
  capabilities_list: "",
  timezone: "America/New_York",
  business_address: "",
  location_summary: "",
  service_area_summary: "",
  service_area_rules_json: "",
  out_of_area_message: "",
  caller_phone: "",
  caller_phone_last4: "",
  customer_id: "",
  customer_order_count: "",
  customer_name_from_lookup: "",
  active_job_summary: "",
  twilio_call_sid: "",
  team_size: "0",
  staff_names: "",
  hours_today: "",
  calendar_connected: "false",
  booking_link: "",
  service_summary: "",
  services_pricing: "",
  secondary_services_summary: "",
  menu_summary: "",
  menu_has_more: "false",
  menu_top_categories: "",
  menu_summary_length: "0",
  packages_summary: "",
  trip_fee_summary: "",
  active_promotions: "",
  inventory_summary: "",
  financing_available: "false",
  trade_in_accepted: "false",
  sales_rep_names: "",
  pricing_rules_summary: "No pricing rules configured",
  eta_rules_summary: "",
  base_prep_minutes: "30",
  busy_buffer_minutes: "15",
  current_busyness_pct: "0",
  response_time_spoken: "30 to 45 minutes",
  response_time_min: "30",
  response_time_max: "60",
  eta_source: "mode_default",
  eta_policy_summary: "",
  distance_provider_enabled: "false",
  policies_summary: "",
  faqs_summary: "",
  objections_summary: "",
  ai_never_promise: "",
  knowledge_summary: "",
  ai_guidelines_summary: "",
  ai_upselling_guidance: "",
  ai_pricing_negotiation: "",
  ai_capacity_guidance: "",
  ai_escalation_guidance: "",
  ai_recognition_guidance: "",
  ai_max_discount_percent: "0",
  ai_loyalty_threshold_orders: "5",
  ai_behavior_mode: "full_service",
  service_default_flow: "schedule_first",
  greeting_script: "",
  fallback_script: "",
  tone: "friendly",
  ai_booking_mode: "pending",
  same_day_enabled: "true",
  emergency_surcharge: "",
  cancellation_notice_hours: "24",
  confirmation_method: "sms",
  waitlist_enabled: "false",
  recurring_enabled: "false",
  deposit_required: "false",
  deposit_amount: "",
  ai_guardrails: "",
  required_intake_fields_summary: "customer name, phone number",
  escalation_rules_summary: "Transfer when caller requests it or when AI cannot answer.",
  ai_booking_behavior_instructions: "Collect the caller's information and use create_callback so the team can follow up.",
  intent_rules_summary: "",
  required_questions_summary: "No required questions configured",
  memory_hints_summary: "",
  memory_enabled: "false",
  dispatch_intake_fields_summary: "",
  dispatch_default_flow: "immediate_first",
  estimated_prep_minutes: "15",
  accepts_pickup: "true",
  accepts_delivery: "false",
  accepts_dine_in: "true",
  delivery_radius_miles: "",
  delivery_minimum_dollars: "",
  accepts_catering: "false",
  vehicle_knowledge_summary: "",
  roadside_safety_scripts: "",
  price_modifiers_summary: "",
  competitor_positioning_summary: "",
  competitor_never_say: "",
  our_advantages_summary: "",
  seasonal_events_summary: "",
  context_has_hours: "false",
  context_has_menu: "false",
  context_has_services: "false",
  context_menu_count: "0",
  context_services_count: "0",
  context_missing_sections: "",
  impound_lot_id: "",
  impound_lot_name: "",
  impound_lot_address: "",
  impound_lot_phone: "",
  impound_lot_hours_today: "",
  impound_lot_hours_summary: "",
  impound_is_open_now: "false",
  impound_next_open: "",
  impound_base_tow_fee: "",
  impound_daily_storage_fee: "",
  impound_admin_fee: "",
  impound_gate_fee: "",
  impound_fee_summary: "",
  impound_release_requirements: "",
  impound_release_requirements_summary: "",
  impound_accepted_payment: "",
  business_brain_summary: "",
  business_brain_json: "{}",
  business_brain_json_compact: "{}",
  business_brain_json_hash: "",
  business_brain_json_truncated: "false",
  context_contract_version: "v1",
  dynamic_variables_keys: "",
};

// ============= API HELPERS =============

async function getAgent(agentId) {
  const res = await fetch(`${BASE_API}/${agentId}`, {
    headers: { "xi-api-key": API_KEY },
  });
  if (!res.ok) throw new Error(`GET ${agentId} failed: ${res.status} ${await res.text()}`);
  return res.json();
}

async function patchAgent(agentId, payload) {
  if (DRY_RUN) {
    console.log(`  [DRY RUN] Would PATCH ${agentId}`);
    return { dry_run: true };
  }
  const res = await fetch(`${BASE_API}/${agentId}`, {
    method: "PATCH",
    headers: {
      "xi-api-key": API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`PATCH ${agentId} failed: ${res.status} ${body}`);
  }
  return res.json();
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============= BUILD PATCH PAYLOAD =============

function buildPatchPayload(mode, currentConfig) {
  const isImpound = mode === "impound";

  // Build system prompt
  let systemPrompt;
  if (isImpound) {
    // For impound, prepend shared rules to existing prompt (but remove old stale shared rules if present)
    const existingPrompt = currentConfig.conversation_config?.agent?.prompt?.prompt || "";
    // Check if existing prompt already has human phone rules
    const hasSharedRules = existingPrompt.includes("HUMAN PHONE RULES");
    if (hasSharedRules) {
      // Already has shared rules - just update them by finding the mode-specific section
      // Find where the impound-specific content starts
      const impoundStart = existingPrompt.indexOf("## IMPOUND");
      if (impoundStart > 0) {
        const impoundContent = existingPrompt.substring(impoundStart);
        systemPrompt = [HUMAN_PHONE_RULES, TIME_NUMBER_SPEAKING_RULES, impoundContent].join("\n\n");
      } else {
        systemPrompt = [HUMAN_PHONE_RULES, TIME_NUMBER_SPEAKING_RULES, existingPrompt].join("\n\n");
      }
    } else {
      systemPrompt = [HUMAN_PHONE_RULES, TIME_NUMBER_SPEAKING_RULES, existingPrompt].join("\n\n");
    }
    // Append guardrails/transfer/busyness/debug if not present
    if (!systemPrompt.includes("OWNER-DEFINED GUARDRAILS")) {
      systemPrompt += "\n\n" + GUARDRAILS_AND_ESCALATION;
    }
    if (!systemPrompt.includes("CALL TRANSFER")) {
      systemPrompt += "\n\n" + TRANSFER_INSTRUCTIONS;
    }
    if (!systemPrompt.includes("BUSYNESS-AWARE")) {
      systemPrompt += "\n\n" + BUSYNESS_AWARE_RULES;
    }
    if (!systemPrompt.includes("DEBUG MODE")) {
      systemPrompt += "\n\n" + DEBUG_OVERRIDE;
    }
  } else {
    systemPrompt = buildSystemPrompt(mode);
  }

  // Build tools (impound keeps existing tools but fixes names)
  let tools;
  if (isImpound) {
    // For impound, fix tool names but keep custom tools
    const existingTools = currentConfig.conversation_config?.agent?.prompt?.tools || [];
    tools = existingTools.map(t => {
      // Fix hyphenated tool names
      if (t.name === "check-availability") {
        return { ...t, name: "check_availability" };
      }
      return t;
    });
  } else {
    tools = MODE_TOOLS[mode];
  }

  // Build data collection
  const dataCollection = isImpound ? undefined : MODE_DATA_COLLECTION[mode];

  // Build dynamic variable defaults
  const dynamicVariablePlaceholders = {};
  for (const [key, value] of Object.entries(DYNAMIC_VARIABLE_DEFAULTS)) {
    dynamicVariablePlaceholders[key] = String(value);
  }

  // Build patch
  const patch = {
    conversation_config: {
      agent: {
        first_message: FIRST_MESSAGES[mode] || FIRST_MESSAGES.general,
        prompt: {
          prompt: systemPrompt,
          tools,
          tool_ids: [], // Clear stale tool_ids — inline tools replace them
        },
        dynamic_variables: {
          dynamic_variable_placeholders: dynamicVariablePlaceholders,
        },
      },
    },
  };

  // Add data collection to platform_settings if not impound
  if (dataCollection) {
    patch.platform_settings = {
      data_collection: dataCollection,
    };
  }

  return patch;
}

// ============= MAIN =============

async function main() {
  const updateOrder = ["general", "medical", "food", "service", "dispatch", "sales", "impound"];
  const agentsToUpdate = AGENT_FILTER ? [AGENT_FILTER] : updateOrder;

  console.log(`Updating ${agentsToUpdate.length} agents: ${agentsToUpdate.join(", ")}\n`);

  for (const mode of agentsToUpdate) {
    const agentId = AGENTS[mode];
    if (!agentId) {
      console.log(`⚠️  Unknown mode: ${mode}, skipping`);
      continue;
    }

    console.log(`\n${"=".repeat(60)}`);
    console.log(`📡 ${mode.toUpperCase()} (${agentId})`);
    console.log(`${"=".repeat(60)}`);

    try {
      // 1. GET current config
      console.log("  Fetching current config...");
      const current = await getAgent(agentId);

      // 2. Build patch payload
      console.log("  Building patch payload...");
      const patch = buildPatchPayload(mode, current);

      const toolCount = patch.conversation_config.agent.prompt.tools.length;
      const dcCount = patch.platform_settings?.data_collection
        ? Object.keys(patch.platform_settings.data_collection).length
        : "kept";
      const dvCount = Object.keys(patch.conversation_config.agent.dynamic_variables.dynamic_variable_placeholders).length;
      const promptLen = patch.conversation_config.agent.prompt.prompt.length;

      console.log(`  Tools: ${toolCount}`);
      console.log(`  Data collection fields: ${dcCount}`);
      console.log(`  Dynamic variables: ${dvCount}`);
      console.log(`  System prompt: ${promptLen} chars`);
      console.log(`  First message: "${patch.conversation_config.agent.first_message.substring(0, 60)}..."`);

      // 3. PATCH
      console.log("  Applying patch...");
      await patchAgent(agentId, patch);
      console.log(`  ✅ ${mode} updated successfully`);

      // 4. Delay
      if (agentsToUpdate.indexOf(mode) < agentsToUpdate.length - 1) {
        console.log("  Waiting 2s...");
        await sleep(2000);
      }
    } catch (err) {
      console.error(`  ❌ FAILED: ${err.message}`);
      if (!DRY_RUN) {
        console.error("  Stopping to prevent further issues.");
        process.exit(1);
      }
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log("🎉 All agents updated!");
  console.log("=".repeat(60));
}

main().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
