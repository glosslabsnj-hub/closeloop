/**
 * Deploy Dispatch Agent — Creates workspace tools + patches agent
 *
 * Dispatch is critical for home services (HVAC, plumbing, electrical) that need
 * emergency response capabilities alongside scheduled appointments.
 *
 * Usage: node scripts/deploy-dispatch-agent.mjs
 */

const API_KEY = "sk_2b27cfbfbc65aab7bfff4e370c598be68abcbe515e488d68";
const BASE_API = "https://api.elevenlabs.io/v1/convai";
const AGENT_ID = "agent_2601kghfpmckez3t2n6p7bmcpac4";
const SUPABASE_URL = "https://yltzlvzgwkidbeqaoevp.supabase.co/functions/v1";
const SECRET_ID = "9G30VIglbkIoULRKR7xD";

function prop(type, description) {
  return { type, description };
}

function makeToolPayload(name, description, url, properties, required) {
  return {
    tool_config: {
      type: "webhook",
      name,
      description,
      api_schema: {
        url,
        method: "POST",
        request_headers: {
          "content-type": "application/json",
          "x-cl-secret": { secret_id: SECRET_ID },
        },
        request_body_schema: {
          type: "object",
          properties,
          required,
        },
      },
    },
  };
}

async function createTool(payload) {
  const res = await fetch(`${BASE_API}/tools`, {
    method: "POST",
    headers: { "xi-api-key": API_KEY, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Create ${payload.tool_config.name} failed (${res.status}): ${text.substring(0, 300)}`);
  }
  const data = await res.json();
  return data.tool_id || data.id;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ============= 10 DISPATCH TOOLS =============

const TOOLS = [
  makeToolPayload(
    "check_availability",
    "Check availability for SCHEDULED (non-emergency) jobs. Use when customer wants to schedule a future tow, planned vehicle transport, or non-urgent service. Example: 'Can I schedule a tow for tomorrow morning?' Date must be YYYY-MM-DD, time must be HH:MM in 24h format.",
    `${SUPABASE_URL}/elevenlabs-check-availability`,
    {
      tenant_id: prop("string", "The tenant/business ID"),
      date: prop("string", "Date to check in YYYY-MM-DD format"),
      time: prop("string", "Time to check in HH:MM 24-hour format"),
      service_id: prop("string", "Optional service ID"),
      conversation_id: prop("string", "Conversation tracking ID"),
    },
    ["tenant_id", "date", "time"]
  ),

  makeToolPayload(
    "suggest_availability",
    "Get available times for scheduled (non-emergency) jobs. Use when customer asks 'When can you come pick up my car?' for a planned service, not an emergency.",
    `${SUPABASE_URL}/elevenlabs-suggest-availability`,
    {
      tenant_id: prop("string", "The tenant/business ID"),
      date: prop("string", "Date to find availability for in YYYY-MM-DD format"),
      service_id: prop("string", "Optional service ID for duration-aware scheduling"),
      time_preference: prop("string", "Caller's preference: 'morning', 'afternoon', 'evening', or 'any'"),
      conversation_id: prop("string", "Conversation tracking ID"),
    },
    ["tenant_id", "date"]
  ),

  makeToolPayload(
    "create_booking",
    "Book a SCHEDULED tow or service for a future date/time. Only for non-emergency planned services. For immediate dispatch, use create_dispatch_job instead. ONLY call after the caller explicitly confirms the time.",
    `${SUPABASE_URL}/elevenlabs-create-booking`,
    {
      tenant_id: prop("string", "The tenant/business ID"),
      customer_name: prop("string", "Caller's full name"),
      customer_phone: prop("string", "Caller's phone number"),
      service_name: prop("string", "Service being booked (e.g., 'Scheduled Tow', 'Vehicle Transport')"),
      service_id: prop("string", "Service ID if known"),
      date: prop("string", "Confirmed date in YYYY-MM-DD"),
      time: prop("string", "Confirmed time in HH:MM 24-hour format"),
      notes: prop("string", "Vehicle info, pickup/dropoff details, special instructions"),
      conversation_id: prop("string", "Conversation tracking ID"),
    },
    ["tenant_id", "customer_name", "customer_phone", "service_name", "date", "time"]
  ),

  makeToolPayload(
    "check_service_area",
    "CRITICAL TOOL - Use for every dispatch call. Check if location is in service area and get real-time ETA and pricing. Call immediately when customer provides their location. Returns: in_area (yes/no), ETA range, distance, and price estimate for towing.",
    `${SUPABASE_URL}/elevenlabs-check-service-area`,
    {
      tenant_id: prop("string", "The tenant/business ID"),
      address: prop("string", "Pickup location or customer address"),
      dropoff_address: prop("string", "Destination/dropoff address for towing, for accurate tow distance pricing"),
      vehicle_type: prop("string", "Type of vehicle: sedan, suv, truck, motorcycle, rv, heavy_duty"),
      conversation_id: prop("string", "Conversation tracking ID"),
    },
    ["tenant_id", "address"]
  ),

  makeToolPayload(
    "create_dispatch_job",
    "MAIN DISPATCH TOOL - Send a driver/technician NOW. Use for: 'I need a tow', 'I'm stranded', 'Car won't start', 'Locked out', 'Flat tire', 'No heat', 'Pipe burst'. Always call check_service_area FIRST to get ETA and confirm coverage, then create the dispatch job.",
    `${SUPABASE_URL}/elevenlabs-create-dispatch-job`,
    {
      tenant_id: prop("string", "The tenant/business ID"),
      customer_name: prop("string", "Caller's full name"),
      customer_phone: prop("string", "Caller's phone number"),
      pickup_address: prop("string", "Service location or pickup address"),
      dropoff_address: prop("string", "Dropoff/destination address if applicable (towing, delivery)"),
      job_type: prop("string", "Type: 'service_call', 'tow', 'roadside', 'delivery', 'emergency', 'other'"),
      urgency: prop("string", "Urgency: 'emergency', 'same_day', 'scheduled', 'low'"),
      vehicle_type: prop("string", "Vehicle type if relevant"),
      vehicle_info: prop("string", "Vehicle details: year, make, model, color"),
      drivable: prop("string", "'true' if vehicle can be driven, 'false' if not, '' if unknown"),
      problem_description: prop("string", "Description of the issue or service needed"),
      notes: prop("string", "Additional details: keys locked in, specific location notes, gate codes"),
      conversation_id: prop("string", "Conversation tracking ID"),
    },
    ["tenant_id", "customer_name", "customer_phone", "pickup_address"]
  ),

  makeToolPayload(
    "lookup_dispatch_status",
    "Check status of an existing dispatch job. Use when caller asks: 'Where's my driver?', 'Any update?', 'How much longer?', 'Is someone on the way?', 'ETA on my driver?'. Requires at least 2 of: customer_name, customer_phone, pickup_address.",
    `${SUPABASE_URL}/elevenlabs-lookup-dispatch-status`,
    {
      tenant_id: prop("string", "The tenant/business ID"),
      customer_name: prop("string", "Customer's name to match"),
      customer_phone: prop("string", "Customer's phone number"),
      pickup_address: prop("string", "Pickup address to match"),
      conversation_id: prop("string", "Conversation tracking ID"),
    },
    ["tenant_id"]
  ),

  makeToolPayload(
    "cancel_dispatch_job",
    "Cancel an existing dispatch job. Use when caller says 'Cancel my tow', 'I don't need the driver anymore', 'Cancel the job'. Finds by phone, name, or job number.",
    `${SUPABASE_URL}/elevenlabs-cancel-dispatch-job`,
    {
      tenant_id: prop("string", "The tenant/business ID"),
      customer_name: prop("string", "Name on the dispatch job"),
      customer_phone: prop("string", "Phone number on the job"),
      job_number: prop("string", "Job number if provided"),
      reason: prop("string", "Reason for cancellation"),
      conversation_id: prop("string", "Conversation tracking ID"),
    },
    ["tenant_id", "customer_phone"]
  ),

  makeToolPayload(
    "create_callback",
    "Schedule a callback for pricing questions, complaints, or when customer needs to speak to dispatch manager. Use when: 'I need an exact quote', 'I want to talk to a manager', 'I have a complaint', or billing questions.",
    `${SUPABASE_URL}/elevenlabs-create-callback`,
    {
      tenant_id: prop("string", "The tenant/business ID"),
      customer_name: prop("string", "Caller's full name"),
      customer_phone: prop("string", "Caller's phone number"),
      reason: prop("string", "Why callback needed: pricing, complaint, manager, billing"),
      department: prop("string", "'dispatch', 'manager', 'billing', 'owner'"),
      urgency: prop("string", "'low', 'medium', 'high'"),
      notes: prop("string", "Context about their question"),
      conversation_id: prop("string", "Conversation tracking ID"),
    },
    ["tenant_id", "customer_name", "customer_phone", "reason"]
  ),

  makeToolPayload(
    "lookup_active_job",
    "Look up status of an active job - vehicle in shop, in-progress service call, etc. Use when caller asks 'Is my car ready?', 'What's the status?', 'When will it be done?'",
    `${SUPABASE_URL}/elevenlabs-lookup-active-job`,
    {
      tenant_id: prop("string", "The tenant/business ID"),
      customer_phone: prop("string", "Caller's phone number"),
      customer_name: prop("string", "Customer name to match"),
      job_number: prop("string", "Job number if provided"),
      vehicle_description: prop("string", "Vehicle year/make/model if mentioned"),
      conversation_id: prop("string", "Conversation tracking ID"),
    },
    ["tenant_id"]
  ),

  makeToolPayload(
    "transfer_to_owner",
    "Transfer the live call to the business owner or dispatch manager. Use ONLY when the caller explicitly asks to speak with a person or the situation requires human judgment. Pauses the AI and connects via Twilio.",
    `${SUPABASE_URL}/elevenlabs-transfer-call`,
    {
      tenant_id: prop("string", "The tenant/business ID"),
      twilio_call_sid: prop("string", "The Twilio call SID"),
      reason: prop("string", "Why the transfer is needed"),
      customer_name: prop("string", "Caller's name if collected"),
      conversation_id: prop("string", "Conversation tracking ID"),
    },
    ["tenant_id", "twilio_call_sid"]
  ),
];

// ============= MAIN =============

async function main() {
  console.log("=".repeat(60));
  console.log("DEPLOYING DISPATCH AGENT");
  console.log(`Agent: ${AGENT_ID}`);
  console.log("=".repeat(60));

  // Step 1: Get current state
  console.log("\n1. Fetching current agent...");
  let res = await fetch(`${BASE_API}/agents/${AGENT_ID}`, {
    headers: { "xi-api-key": API_KEY },
  });
  const current = await res.json();
  const currentToolIds = current.conversation_config?.agent?.prompt?.tool_ids || [];
  console.log(`   Current tool_ids: ${currentToolIds.length}`);

  // Step 2: Clear stale tool_ids
  if (currentToolIds.length > 0) {
    console.log("\n2. Clearing stale tool_ids...");
    await fetch(`${BASE_API}/agents/${AGENT_ID}`, {
      method: "PATCH",
      headers: { "xi-api-key": API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({
        conversation_config: { agent: { prompt: { tool_ids: [] } } },
      }),
    });

    for (const tid of currentToolIds) {
      try {
        await fetch(`${BASE_API}/tools/${tid}`, {
          method: "DELETE",
          headers: { "xi-api-key": API_KEY },
        });
        console.log(`   Deleted: ${tid}`);
      } catch (e) {
        console.log(`   Skip: ${tid}`);
      }
    }
  }

  // Step 3: Create workspace tools
  console.log("\n3. Creating workspace tools...");
  const newToolIds = [];
  for (const payload of TOOLS) {
    const name = payload.tool_config.name;
    const toolId = await createTool(payload);
    console.log(`   ${name} -> ${toolId}`);
    newToolIds.push(toolId);
    await sleep(500);
  }
  console.log(`   Created ${newToolIds.length} tools.`);

  // Step 4: Assign to agent
  console.log("\n4. Patching agent with new tool_ids...");
  res = await fetch(`${BASE_API}/agents/${AGENT_ID}`, {
    method: "PATCH",
    headers: { "xi-api-key": API_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({
      conversation_config: {
        agent: {
          prompt: { tool_ids: newToolIds },
        },
      },
    }),
  });

  if (res.ok) {
    const data = await res.json();
    const tools = data.conversation_config?.agent?.prompt?.tools || [];
    const tids = data.conversation_config?.agent?.prompt?.tool_ids || [];
    console.log(`   SUCCESS: ${tools.length} tools resolved, ${tids.length} tool_ids`);
    console.log(`   Names: ${tools.map(t => t.name).join(", ")}`);
  } else {
    console.log(`   FAILED: ${res.status} ${(await res.text()).substring(0, 300)}`);
  }

  console.log("\n" + "=".repeat(60));
  console.log("DISPATCH AGENT DEPLOYED");
  console.log("=".repeat(60));
}

main().catch(e => {
  console.error("FATAL:", e.message);
  process.exit(1);
});
