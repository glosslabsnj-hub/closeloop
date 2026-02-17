/**
 * Clean deploy:
 * 1. Clear tool_ids from agent
 * 2. Delete ALL workspace tools
 * 3. Create fresh tools via POST /v1/convai/tools
 * 4. Link to agent via tool_ids PATCH
 */

const API_KEY = "sk_2b27cfbfbc65aab7bfff4e370c598be68abcbe515e488d68";
const AGENT_ID = "agent_4701kg1vwhzqfxmvzh032nhvx434";
const SUPABASE_URL = "https://zsqfzluyylzmmjtfxwgr.supabase.co/functions/v1";
const SECRET_ID = "9G30VIglbkIoULRKR7xD";

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// ============= STEP 1: Clear tool_ids =============
async function clearToolIds() {
  console.log("1. Clearing tool_ids from agent...");
  const res = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${AGENT_ID}`, {
    method: "PATCH",
    headers: { "xi-api-key": API_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({
      conversation_config: { agent: { prompt: { tool_ids: [] } } },
    }),
  });
  const data = await res.json();
  console.log(`   tool_ids after clear: ${(data.conversation_config?.agent?.prompt?.tool_ids || []).length}`);
}

// ============= STEP 2: Delete ALL workspace tools =============
async function deleteAllWorkspaceTools() {
  console.log("\n2. Deleting ALL workspace tools...");
  const res = await fetch("https://api.elevenlabs.io/v1/convai/tools", {
    headers: { "xi-api-key": API_KEY },
  });
  const data = await res.json();
  const tools = data.tools || data || [];
  console.log(`   Found ${tools.length} workspace tools.`);

  for (const t of tools) {
    const id = t.tool_id || t.id;
    const name = t.tool_config?.name || "unknown";
    const delRes = await fetch(`https://api.elevenlabs.io/v1/convai/tools/${id}`, {
      method: "DELETE",
      headers: { "xi-api-key": API_KEY },
    });
    console.log(`   ${name} (${id}): ${delRes.ok ? "deleted" : "FAILED " + delRes.status}`);
    await sleep(200);
  }

  // Verify
  const verifyRes = await fetch("https://api.elevenlabs.io/v1/convai/tools", {
    headers: { "xi-api-key": API_KEY },
  });
  const verifyData = await verifyRes.json();
  const remaining = verifyData.tools || verifyData || [];
  console.log(`   Remaining: ${remaining.length}`);
}

// ============= STEP 3: Create tools =============
function prop(type, description) {
  return { type, description };
}

const TOOLS = [
  {
    name: "check_availability",
    description: "Check if a specific appointment time is available. Call this BEFORE confirming any appointment.",
    url: `${SUPABASE_URL}/elevenlabs-check-availability`,
    properties: {
      date: prop("string", "Appointment date. Accept 'tomorrow', 'next Monday', 'Friday', or YYYY-MM-DD format."),
      time: prop("string", "Appointment time. Accept '2pm', '10:30am', 'noon', or HH:MM format."),
      service_name: prop("string", "Service being booked (e.g., 'haircut', 'AC repair'). Helps determine duration."),
      tenant_id: prop("string", "The tenant/business ID"),
      conversation_id: prop("string", "Conversation tracking"),
    },
    required: ["date", "time"],
  },
  {
    name: "suggest_availability",
    description: "Get available appointment times. Call when customer asks 'What times do you have?' Returns up to 5 open slots.",
    url: `${SUPABASE_URL}/elevenlabs-suggest-availability`,
    properties: {
      date: prop("string", "Date to check. Accept 'tomorrow', 'next week', 'Saturday'. Defaults to next available."),
      service_name: prop("string", "Service name to determine duration needed"),
      preference: prop("string", "Time preference: 'morning', 'afternoon', 'evening', or 'earliest'"),
      tenant_id: prop("string", "The tenant/business ID"),
      conversation_id: prop("string", "Conversation tracking"),
    },
    required: [],
  },
  {
    name: "create_booking",
    description: "Book the appointment after customer confirms. Only call AFTER checking availability AND getting explicit confirmation.",
    url: `${SUPABASE_URL}/elevenlabs-create-booking`,
    properties: {
      customer_name: prop("string", "Customer's full name. Ask if not provided."),
      date: prop("string", "Confirmed appointment date"),
      time: prop("string", "Confirmed appointment time"),
      service_name: prop("string", "Service being booked"),
      customer_phone: prop("string", "The caller's phone number"),
      notes: prop("string", "Special requests or instructions"),
      tenant_id: prop("string", "The tenant/business ID"),
      conversation_id: prop("string", "Conversation tracking"),
    },
    required: ["customer_name", "date", "time"],
  },
  {
    name: "check_service_area",
    description: "Check if we can come to the customer's location. For mobile services (HVAC, plumber, detailing, cleaning).",
    url: `${SUPABASE_URL}/elevenlabs-check-service-area`,
    properties: {
      address: prop("string", "Customer's address where service is needed"),
      tenant_id: prop("string", "The tenant/business ID"),
      conversation_id: prop("string", "Conversation tracking"),
    },
    required: ["address"],
  },
  {
    name: "create_dispatch_job",
    description: "Send a technician out NOW for emergency service calls. Use for true emergencies only.",
    url: `${SUPABASE_URL}/elevenlabs-create-dispatch-job`,
    properties: {
      pickup_address: prop("string", "Customer's address where technician should go"),
      service_type: prop("string", "Type of emergency: 'emergency_repair', 'ac_repair', 'plumbing', 'electrical', 'lockout'"),
      customer_name: prop("string", "Customer's name. ALWAYS ask for this before dispatching."),
      customer_phone: prop("string", "The caller's phone number"),
      urgency: prop("string", "'emergency', 'urgent', or 'standard'"),
      notes: prop("string", "Problem description and special instructions"),
      tenant_id: prop("string", "The tenant/business ID"),
      conversation_id: prop("string", "Conversation tracking"),
    },
    required: ["pickup_address", "service_type", "customer_name"],
  },
  {
    name: "create_callback",
    description: "Schedule a callback when customer needs a quote, wants to discuss a complex job, or asks to speak with someone.",
    url: `${SUPABASE_URL}/elevenlabs-create-callback`,
    properties: {
      reason: prop("string", "Why they want a callback"),
      customer_name: prop("string", "Customer's name"),
      customer_phone: prop("string", "The caller's phone number"),
      department: prop("string", "Who should call: 'sales', 'owner', 'manager', 'technician'"),
      preferred_time: prop("string", "When to call: 'morning', 'afternoon', 'ASAP'"),
      notes: prop("string", "What they want to discuss"),
      tenant_id: prop("string", "The tenant/business ID"),
      conversation_id: prop("string", "Conversation tracking"),
    },
    required: ["reason"],
  },
  {
    name: "cancel_booking",
    description: "Cancel an existing appointment. Use when caller says: 'I need to cancel', 'Cancel my appointment'.",
    url: `${SUPABASE_URL}/elevenlabs-cancel-booking`,
    properties: {
      tenant_id: prop("string", "The tenant/business ID"),
      customer_name: prop("string", "Customer's name to find the booking"),
      customer_phone: prop("string", "The caller's phone number"),
      booking_id: prop("string", "Direct booking ID if known"),
      reason: prop("string", "Reason for cancellation"),
      conversation_id: prop("string", "Conversation tracking"),
    },
    required: ["tenant_id"],
  },
  {
    name: "add_to_waitlist",
    description: "Add caller to waitlist when their preferred time is unavailable and waitlist is enabled.",
    url: `${SUPABASE_URL}/elevenlabs-add-to-waitlist`,
    properties: {
      tenant_id: prop("string", "The tenant/business ID"),
      customer_name: prop("string", "Customer's name"),
      customer_phone: prop("string", "The caller's phone number"),
      preferred_date: prop("string", "Date they wanted"),
      preferred_time: prop("string", "Time they wanted"),
      service_name: prop("string", "Service they're waiting for"),
      notes: prop("string", "Additional notes"),
      conversation_id: prop("string", "Conversation tracking"),
    },
    required: ["tenant_id", "customer_name", "preferred_date"],
  },
  {
    name: "lookup_active_job",
    description: "Look up the status of a customer's active job or vehicle. Use when caller asks about status of their repair/service.",
    url: `${SUPABASE_URL}/elevenlabs-lookup-active-job`,
    properties: {
      tenant_id: prop("string", "The tenant/business ID"),
      customer_phone: prop("string", "The caller's phone number"),
      customer_name: prop("string", "Customer's name to match against job records"),
      job_number: prop("string", "Job number if the customer provides one"),
      vehicle_description: prop("string", "Vehicle year/make/model if mentioned"),
      conversation_id: prop("string", "Conversation tracking"),
    },
    required: ["tenant_id"],
  },
  {
    name: "transfer_to_owner",
    description: "Transfer the caller to the business owner or manager. Use IMMEDIATELY when caller asks to speak to someone.",
    url: `${SUPABASE_URL}/elevenlabs-transfer-call`,
    properties: {
      tenant_id: prop("string", "The tenant/business ID"),
      conversation_id: prop("string", "Conversation tracking"),
      twilio_call_sid: prop("string", "The Twilio call SID for this conversation"),
      customer_name: prop("string", "Customer's name if collected"),
      reason: prop("string", "Why the caller wants to be transferred"),
    },
    required: ["tenant_id"],
  },
];

async function createToolsAndLink() {
  console.log("\n3. Creating 10 workspace tools...");
  const newToolIds = [];

  for (const t of TOOLS) {
    const payload = {
      tool_config: {
        type: "webhook",
        name: t.name,
        description: t.description,
        response_timeout_secs: 20,
        api_schema: {
          url: t.url,
          method: "POST",
          request_headers: {
            "content-type": "application/json",
            "x-cl-secret": { secret_id: SECRET_ID },
          },
          request_body_schema: {
            type: "object",
            properties: t.properties,
            required: t.required,
          },
        },
      },
    };

    const res = await fetch("https://api.elevenlabs.io/v1/convai/tools", {
      method: "POST",
      headers: { "xi-api-key": API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.text();
      console.log(`   FAILED ${t.name}: ${res.status} ${err.substring(0, 200)}`);
      continue;
    }

    const data = await res.json();
    const toolId = data.tool_id || data.id;
    console.log(`   ${t.name} -> ${toolId}`);
    newToolIds.push(toolId);
    await sleep(300);
  }

  console.log(`\n4. Linking ${newToolIds.length} tools to agent...`);
  const patchRes = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${AGENT_ID}`, {
    method: "PATCH",
    headers: { "xi-api-key": API_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({
      conversation_config: { agent: { prompt: { tool_ids: newToolIds } } },
    }),
  });

  const result = await patchRes.json();
  const tools = result.conversation_config?.agent?.prompt?.tools || [];
  const tids = result.conversation_config?.agent?.prompt?.tool_ids || [];
  const prompt = result.conversation_config?.agent?.prompt?.prompt || "";
  const kb = result.conversation_config?.agent?.prompt?.knowledge_base || [];

  console.log(`   tool_ids: ${tids.length}`);
  console.log(`   resolved tools: ${tools.length}`);
  console.log(`   tool names: ${tools.map((t) => t.name).join(", ")}`);
  console.log(`   prompt: ${prompt.length} chars`);
  console.log(`   KB: ${kb.length} items`);
}

async function main() {
  await clearToolIds();
  await sleep(1000);
  await deleteAllWorkspaceTools();
  await sleep(1000);
  await createToolsAndLink();
  console.log("\nDone. Check dashboard.");
}

main().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});
