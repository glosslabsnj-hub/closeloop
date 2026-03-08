/**
 * Deploy Impound Agent — Creates workspace tools + patches agent via tool_ids
 *
 * Impound gets 3 impound-specific tools + shared tools (create_callback,
 * check_service_area, create_dispatch_job, transfer_to_owner).
 *
 * Usage: node scripts/deploy-impound-agent.mjs [--dry-run]
 */

const API_KEY = "sk_2b27cfbfbc65aab7bfff4e370c598be68abcbe515e488d68";
const BASE_API = "https://api.elevenlabs.io/v1/convai";
const AGENT_ID = "agent_6301kgqscdvyek3a6wgegq8et167";
const SUPABASE_URL = "https://yltzlvzgwkidbeqaoevp.supabase.co/functions/v1";
const SECRET_ID = "9G30VIglbkIoULRKR7xD";

const DRY_RUN = process.argv.includes("--dry-run");
if (DRY_RUN) console.log("DRY RUN MODE\n");

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
  if (DRY_RUN) {
    console.log(`  [DRY RUN] Would create: ${payload.tool_config.name}`);
    return "dry_run_id";
  }
  const res = await fetch(`${BASE_API}/tools`, {
    method: "POST",
    headers: { "xi-api-key": API_KEY, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Create tool ${payload.tool_config.name} failed (${res.status}): ${text.substring(0, 300)}`);
  }
  const data = await res.json();
  return data.tool_id || data.id;
}

async function getAgent() {
  const res = await fetch(`${BASE_API}/agents/${AGENT_ID}`, {
    headers: { "xi-api-key": API_KEY },
  });
  if (!res.ok) throw new Error(`GET agent failed: ${res.status}`);
  return res.json();
}

async function patchAgent(payload) {
  if (DRY_RUN) {
    console.log("  [DRY RUN] Would PATCH agent");
    return null;
  }
  const res = await fetch(`${BASE_API}/agents/${AGENT_ID}`, {
    method: "PATCH",
    headers: { "xi-api-key": API_KEY, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PATCH agent failed (${res.status}): ${text.substring(0, 500)}`);
  }
  return res.json();
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============= TOOL DEFINITIONS (7 tools for Impound) =============

const TOOLS = [
  // 3 impound-specific tools
  makeToolPayload(
    "check_impound",
    "Look up a vehicle in the impound lot by license plate number, VIN, or vehicle description. Returns vehicle details, storage fees, and release requirements if found.",
    `${SUPABASE_URL}/check-impound`,
    {
      tenant_id: prop("string", "The tenant/business ID"),
      license_plate: prop("string", "License plate number to search for"),
      vin: prop("string", "VIN number to search for"),
      vehicle_description: prop("string", "Vehicle description (year, make, model, color)"),
      towed_date: prop("string", "Approximate date vehicle was towed (YYYY-MM-DD)"),
      conversation_id: prop("string", "Conversation tracking ID"),
    },
    ["tenant_id"]
  ),

  makeToolPayload(
    "get_impound_lot_info",
    "Get impound lot information including hours of operation, address, phone number, accepted payment methods, and current status (open/closed).",
    `${SUPABASE_URL}/get-impound-lot-info`,
    {
      tenant_id: prop("string", "The tenant/business ID"),
      lot_id: prop("string", "Specific lot ID if the business has multiple lots"),
      tenant_timezone: prop("string", "Timezone for accurate open/closed status"),
      conversation_id: prop("string", "Conversation tracking ID"),
    },
    ["tenant_id"]
  ),

  makeToolPayload(
    "get_impound_release_info",
    "Get release requirements and fee breakdown for a specific impounded vehicle. Includes storage fees, tow fees, admin fees, required documents, and total amount due.",
    `${SUPABASE_URL}/get-impound-release-info`,
    {
      tenant_id: prop("string", "The tenant/business ID"),
      vehicle_id: prop("string", "Vehicle ID from the check_impound lookup"),
      tenant_timezone: prop("string", "Timezone for accurate fee calculation"),
      conversation_id: prop("string", "Conversation tracking ID"),
    },
    ["tenant_id", "vehicle_id"]
  ),

  // Shared tools that impound also needs
  makeToolPayload(
    "create_callback",
    "Schedule a callback request when the caller needs to speak to someone, has questions about fees or disputes, or needs help that requires a human.",
    `${SUPABASE_URL}/elevenlabs-create-callback`,
    {
      tenant_id: prop("string", "The tenant/business ID"),
      customer_name: prop("string", "Caller's full name"),
      customer_phone: prop("string", "The caller's phone number"),
      reason: prop("string", "Why the callback is needed"),
      best_time: prop("string", "When the caller prefers to be called back"),
      urgency: prop("string", "'high' if time-sensitive, 'normal' otherwise"),
      notes: prop("string", "Additional context"),
      conversation_id: prop("string", "Conversation tracking ID"),
    },
    ["tenant_id", "customer_name", "customer_phone", "reason"]
  ),

  makeToolPayload(
    "check_service_area",
    "Verify if a location is within the towing/service area and get ETA.",
    `${SUPABASE_URL}/elevenlabs-check-service-area`,
    {
      tenant_id: prop("string", "The tenant/business ID"),
      address: prop("string", "Address to check"),
      conversation_id: prop("string", "Conversation tracking ID"),
    },
    ["tenant_id", "address"]
  ),

  makeToolPayload(
    "create_dispatch_job",
    "Create a tow or roadside dispatch job for vehicles that need to be brought to the lot or for roadside assistance requests.",
    `${SUPABASE_URL}/elevenlabs-create-dispatch-job`,
    {
      tenant_id: prop("string", "The tenant/business ID"),
      customer_name: prop("string", "Caller's full name"),
      customer_phone: prop("string", "The caller's phone number"),
      pickup_address: prop("string", "Pickup location"),
      dropoff_address: prop("string", "Dropoff/destination address"),
      job_type: prop("string", "Type: 'tow', 'roadside', 'other'"),
      urgency: prop("string", "Urgency: 'emergency', 'same_day', 'scheduled'"),
      vehicle_type: prop("string", "Vehicle type"),
      vehicle_info: prop("string", "Vehicle details: year, make, model, color"),
      drivable: prop("string", "'true' or 'false'"),
      problem_description: prop("string", "Description of the issue"),
      notes: prop("string", "Additional details"),
      conversation_id: prop("string", "Conversation tracking ID"),
    },
    ["tenant_id", "customer_name", "customer_phone", "pickup_address"]
  ),

  makeToolPayload(
    "transfer_to_owner",
    "Transfer the live call to the business owner or manager. Use when the caller explicitly asks to speak with a person or the situation requires human judgment.",
    `${SUPABASE_URL}/elevenlabs-transfer-call`,
    {
      tenant_id: prop("string", "The tenant/business ID"),
      twilio_call_sid: prop("string", "The Twilio call SID for this conversation"),
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
  console.log("DEPLOYING IMPOUND AGENT");
  console.log(`Agent: ${AGENT_ID}`);
  console.log("=".repeat(60));

  // Step 1: Get current state
  console.log("\n1. Fetching current agent state...");
  const current = await getAgent();
  const currentToolIds = current.conversation_config?.agent?.prompt?.tool_ids || [];
  const currentTools = current.conversation_config?.agent?.prompt?.tools || [];
  console.log(`   Current tool_ids: ${currentToolIds.length}`);
  console.log(`   Current inline tools: ${currentTools.length}`);

  // Step 2: Clear existing tools (both tool_ids and inline tools)
  if (currentToolIds.length > 0 || currentTools.length > 0) {
    console.log("\n2. Clearing existing tools from agent...");
    await patchAgent({
      conversation_config: { agent: { prompt: { tool_ids: [], tools: [] } } },
    });
    console.log("   Cleared.");
  } else {
    console.log("\n2. No existing tools to clear.");
  }

  // Step 3: Create workspace tools
  console.log("\n3. Creating workspace tools...");
  const newToolIds = [];
  for (const toolPayload of TOOLS) {
    const name = toolPayload.tool_config.name;
    const toolId = await createTool(toolPayload);
    console.log(`   ${name} -> ${toolId}`);
    newToolIds.push(toolId);
    await sleep(500);
  }
  console.log(`   Created ${newToolIds.length} tools.`);

  // Step 4: Patch agent with tool_ids
  console.log("\n4. Patching agent with tool_ids...");
  const result = await patchAgent({
    conversation_config: {
      agent: {
        prompt: {
          tool_ids: newToolIds,
        },
      },
    },
  });

  if (result) {
    const tools = result.conversation_config?.agent?.prompt?.tools || [];
    const tids = result.conversation_config?.agent?.prompt?.tool_ids || [];

    console.log("\n" + "=".repeat(60));
    console.log("VERIFICATION");
    console.log("=".repeat(60));
    console.log(`   Tools: ${tools.length} resolved, ${tids.length} tool_ids`);
    console.log(`   Tool names: ${tools.map(t => t.name).join(", ")}`);

    if (tools.length !== TOOLS.length) {
      console.log(`   WARNING: Expected ${TOOLS.length} tools but got ${tools.length}`);
    } else {
      console.log("   All tools deployed successfully.");
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log("DONE");
  console.log("=".repeat(60));
}

main().catch(e => {
  console.error("FATAL:", e.message);
  process.exit(1);
});
