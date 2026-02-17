/**
 * Deploy Service Agent — Creates workspace tools + patches agent
 *
 * This script uses the new ElevenLabs tools API (POST /v1/convai/tools)
 * to create workspace tools, then assigns them via tool_ids.
 *
 * Usage: node scripts/deploy-service-agent.mjs [--dry-run]
 */

import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const API_KEY = "sk_2b27cfbfbc65aab7bfff4e370c598be68abcbe515e488d68";
const BASE_API = "https://api.elevenlabs.io/v1/convai";
const AGENT_ID = "agent_4701kg1vwhzqfxmvzh032nhvx434";
const SUPABASE_URL = "https://zsqfzluyylzmmjtfxwgr.supabase.co/functions/v1";
const SECRET_ID = "9G30VIglbkIoULRKR7xD";

const DRY_RUN = process.argv.includes("--dry-run");
if (DRY_RUN) console.log("DRY RUN MODE\n");

// ============= HELPERS =============

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

async function deleteTool(toolId) {
  const res = await fetch(`${BASE_API}/tools/${toolId}`, {
    method: "DELETE",
    headers: { "xi-api-key": API_KEY },
  });
  return res.ok;
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

// ============= TOOL DEFINITIONS (10 tools) =============

const TOOLS = [
  makeToolPayload(
    "check_availability",
    "Check if a specific date/time slot is available for booking. Returns whether the slot is open or already taken. Use BEFORE confirming any appointment. Date must be YYYY-MM-DD, time must be HH:MM in 24h format.",
    `${SUPABASE_URL}/elevenlabs-check-availability`,
    {
      tenant_id: prop("string", "The tenant/business ID"),
      date: prop("string", "The date to check availability for, in YYYY-MM-DD format"),
      time: prop("string", "The time to check, in HH:MM 24-hour format (e.g., 14:30 for 2:30 PM)"),
      service_id: prop("string", "Optional service ID if a specific service was selected"),
      staff_id: prop("string", "Optional staff member ID if the caller requested a specific person"),
      conversation_id: prop("string", "Conversation tracking ID"),
    },
    ["tenant_id", "date", "time"]
  ),

  makeToolPayload(
    "suggest_availability",
    "Get a list of available appointment slots for a given date. Returns up to 5 available time windows. Use when the caller asks 'what times do you have?' or wants options. If no date specified, check today or the next business day.",
    `${SUPABASE_URL}/elevenlabs-suggest-availability`,
    {
      tenant_id: prop("string", "The tenant/business ID"),
      date: prop("string", "The date to find availability for, in YYYY-MM-DD format"),
      service_id: prop("string", "Optional service ID for duration-aware scheduling"),
      time_preference: prop("string", "Caller's preference: 'morning', 'afternoon', 'evening', or 'any'"),
      staff_id: prop("string", "Optional staff member ID if the caller requested a specific person"),
      conversation_id: prop("string", "Conversation tracking ID"),
    },
    ["tenant_id", "date"]
  ),

  makeToolPayload(
    "create_booking",
    "Book an appointment after the caller confirms date, time, and service. ONLY call this AFTER the caller explicitly agrees to the proposed time. Include all relevant details in the notes field. Never call this without checking availability first.",
    `${SUPABASE_URL}/elevenlabs-create-booking`,
    {
      tenant_id: prop("string", "The tenant/business ID"),
      customer_name: prop("string", "The caller's full name"),
      customer_phone: prop("string", "The caller's phone number"),
      service_name: prop("string", "The service being booked (e.g., 'AC Tune-Up', 'Haircut')"),
      service_id: prop("string", "Service ID from availability check if known"),
      date: prop("string", "Confirmed appointment date in YYYY-MM-DD format"),
      time: prop("string", "Confirmed appointment time in HH:MM 24-hour format"),
      staff_id: prop("string", "Staff member ID if requested"),
      notes: prop("string", "Any relevant details: special requests, address, vehicle info, symptoms described"),
      conversation_id: prop("string", "Conversation tracking ID"),
    },
    ["tenant_id", "customer_name", "customer_phone", "service_name", "date", "time"]
  ),

  makeToolPayload(
    "check_service_area",
    "Verify if a customer's address is within the service area, get real-time ETA based on traffic, and determine pricing tier for distance-based services. Use for mobile services (HVAC, plumbing, cleaning, etc.) before confirming a dispatch or when the caller provides their address.",
    `${SUPABASE_URL}/elevenlabs-check-service-area`,
    {
      tenant_id: prop("string", "The tenant/business ID"),
      address: prop("string", "Address to check. Can be pickup location, delivery address, or customer location. Accept partial addresses."),
      dropoff_address: prop("string", "The destination/dropoff address for towing jobs, for accurate tow distance pricing"),
      vehicle_type: prop("string", "Type of vehicle (sedan, suv, truck, motorcycle, etc.) for price modifiers"),
      conversation_id: prop("string", "Conversation tracking ID"),
    },
    ["tenant_id", "address"]
  ),

  makeToolPayload(
    "create_dispatch_job",
    "Create a dispatch/service job for emergency or same-day urgent requests. Use for true emergencies (water leak, no heat, locked out, breakdown) or when the business flow is dispatch_first. Collects address and dispatches a technician.",
    `${SUPABASE_URL}/elevenlabs-create-dispatch-job`,
    {
      tenant_id: prop("string", "The tenant/business ID"),
      customer_name: prop("string", "Caller's full name"),
      customer_phone: prop("string", "The caller's phone number"),
      pickup_address: prop("string", "Service location or pickup address"),
      dropoff_address: prop("string", "Dropoff/destination address if applicable (towing, delivery)"),
      job_type: prop("string", "Type of job: 'service_call', 'tow', 'roadside', 'delivery', 'other'"),
      urgency: prop("string", "Urgency level: 'emergency', 'same_day', 'scheduled', 'low'"),
      vehicle_type: prop("string", "Vehicle type if relevant"),
      vehicle_info: prop("string", "Vehicle details: year, make, model, color"),
      drivable: prop("string", "'true' if vehicle can be driven, 'false' if not, '' if unknown"),
      problem_description: prop("string", "Description of the issue or service needed"),
      notes: prop("string", "Any additional details"),
      conversation_id: prop("string", "Conversation tracking ID"),
    },
    ["tenant_id", "customer_name", "customer_phone", "pickup_address"]
  ),

  makeToolPayload(
    "create_callback",
    "Schedule a callback request when: (1) the caller wants to speak to the owner/manager, (2) you can't answer their question, (3) they need a quote that requires an on-site visit, (4) they want to think about it, or (5) the call needs human follow-up. Always capture the reason.",
    `${SUPABASE_URL}/elevenlabs-create-callback`,
    {
      tenant_id: prop("string", "The tenant/business ID"),
      customer_name: prop("string", "Caller's full name"),
      customer_phone: prop("string", "The caller's phone number"),
      reason: prop("string", "Why the callback is needed — be specific"),
      best_time: prop("string", "When the caller prefers to be called back (e.g., 'morning', 'after 3pm', 'anytime')"),
      urgency: prop("string", "'high' if time-sensitive, 'normal' otherwise"),
      notes: prop("string", "Additional context for the person calling back"),
      conversation_id: prop("string", "Conversation tracking ID"),
    },
    ["tenant_id", "customer_name", "customer_phone", "reason"]
  ),

  makeToolPayload(
    "cancel_booking",
    "Cancel an existing appointment. Use when a caller wants to cancel. Ask for their name and the approximate date/time of their appointment to find it. Inform them of the cancellation policy if one exists.",
    `${SUPABASE_URL}/elevenlabs-cancel-booking`,
    {
      tenant_id: prop("string", "The tenant/business ID"),
      customer_name: prop("string", "Name on the booking"),
      customer_phone: prop("string", "The caller's phone number"),
      booking_date: prop("string", "Approximate date of the booking to cancel (YYYY-MM-DD)"),
      booking_time: prop("string", "Approximate time if known (HH:MM)"),
      reason: prop("string", "Reason for cancellation if provided"),
      conversation_id: prop("string", "Conversation tracking ID"),
    },
    ["tenant_id", "customer_phone"]
  ),

  makeToolPayload(
    "add_to_waitlist",
    "Add the caller to a waitlist when their preferred time slot is not available and they don't want an alternative. Let them know they'll be contacted if something opens up.",
    `${SUPABASE_URL}/elevenlabs-add-to-waitlist`,
    {
      tenant_id: prop("string", "The tenant/business ID"),
      customer_name: prop("string", "Caller's full name"),
      customer_phone: prop("string", "The caller's phone number"),
      preferred_date: prop("string", "Their preferred date (YYYY-MM-DD)"),
      preferred_time: prop("string", "Their preferred time or time range"),
      service_name: prop("string", "Service they want"),
      notes: prop("string", "Any preferences or special requests"),
      conversation_id: prop("string", "Conversation tracking ID"),
    },
    ["tenant_id", "customer_name", "customer_phone"]
  ),

  makeToolPayload(
    "lookup_active_job",
    "Look up the status of a customer's active job or vehicle in the shop. Use when a caller asks 'Is my car ready?', 'What's the status of my repair?', or similar. Searches by phone, name, job number, or vehicle description.",
    `${SUPABASE_URL}/elevenlabs-lookup-active-job`,
    {
      tenant_id: prop("string", "The tenant/business ID"),
      customer_phone: prop("string", "The caller's phone number"),
      customer_name: prop("string", "Customer's name to match against job records"),
      job_number: prop("string", "Job number if the customer provides one"),
      vehicle_description: prop("string", "Vehicle year/make/model if mentioned"),
      conversation_id: prop("string", "Conversation tracking ID"),
    },
    ["tenant_id"]
  ),

  makeToolPayload(
    "transfer_to_owner",
    "Transfer the live call to the business owner or manager. Use ONLY when: (1) the caller explicitly asks to speak with a person/manager/owner, (2) the situation requires human judgment that AI cannot provide, or (3) escalation rules indicate transfer. Pauses the AI and connects the caller via Twilio.",
    `${SUPABASE_URL}/elevenlabs-transfer-call`,
    {
      tenant_id: prop("string", "The tenant/business ID"),
      twilio_call_sid: prop("string", "The Twilio call SID for this conversation"),
      reason: prop("string", "Why the transfer is needed — be specific"),
      customer_name: prop("string", "Caller's name if collected"),
      conversation_id: prop("string", "Conversation tracking ID"),
    },
    ["tenant_id"]
  ),
];

// ============= LOAD PROMPT + KB =============

// Load the system prompt from update-elevenlabs-agents.mjs by reading MODE_PROMPTS.service
// For now, we build it fresh from the deployment script's service prompt
import { createRequire } from "module";

// Read the full prompt from the main deployment script
const deployScript = readFileSync(join(__dirname, "update-elevenlabs-agents.mjs"), "utf-8");

// Extract MODE_PROMPTS.service content
const servicePromptMatch = deployScript.match(/MODE_PROMPTS\.service\s*=\s*`([\s\S]*?)`;/);
const servicePrompt = servicePromptMatch ? servicePromptMatch[1] : null;

if (!servicePrompt) {
  console.error("ERROR: Could not extract MODE_PROMPTS.service from update-elevenlabs-agents.mjs");
  process.exit(1);
}

// Load knowledge base
const SERVICE_KB_TEXT = readFileSync(
  join(__dirname, "knowledge-bases", "service-industry-expertise.md"),
  "utf-8"
);

// Load dynamic variable defaults by extracting from script
const dvMatch = deployScript.match(/const DYNAMIC_VARIABLE_DEFAULTS\s*=\s*\{([\s\S]*?)\n\};/);
let dynamicVariablePlaceholders = {};
if (dvMatch) {
  // Parse the defaults object — it's simple key: "value" pairs
  const entries = dvMatch[1].matchAll(/\s+(\w+):\s*"([^"]*)"/g);
  for (const [, key, value] of entries) {
    dynamicVariablePlaceholders[key] = value;
  }
}

// ============= DATA COLLECTION =============

const DATA_COLLECTION = {
  customer_name: { type: "string", description: "Caller's full name. If they don't say it, ask for it before booking." },
  customer_phone: { type: "string", description: "Best callback number. If not mentioned, use the number they're calling from." },
  intent: { type: "string", description: "Primary intent: booking, dispatch, question, complaint, callback, other" },
  callback_requested: { type: "boolean", description: "True if the caller asked for a callback or follow-up from a human." },
  service_requested: { type: "string", description: "The specific service the caller wants (e.g., 'drain cleaning', 'haircut and color')." },
  booking_date: { type: "string", description: "Preferred or confirmed appointment date." },
  booking_time: { type: "string", description: "Preferred or confirmed appointment time." },
  booking_confirmed: { type: "boolean", description: "True if a booking was successfully created/confirmed." },
};

// ============= FIRST MESSAGE =============

const FIRST_MESSAGE = "Hi, thanks for calling {{business_name}}. How can I help you today?";

// ============= MAIN =============

async function main() {
  console.log("=".repeat(60));
  console.log("DEPLOYING SERVICE AGENT");
  console.log(`Agent: ${AGENT_ID}`);
  console.log("=".repeat(60));

  // Step 1: Get current agent state
  console.log("\n1. Fetching current agent state...");
  const current = await getAgent();
  const currentToolIds = current.conversation_config?.agent?.prompt?.tool_ids || [];
  const currentTools = current.conversation_config?.agent?.prompt?.tools || [];
  console.log(`   Current tools: ${currentTools.length} (tool_ids: ${currentToolIds.length})`);
  console.log(`   Current prompt: ${(current.conversation_config?.agent?.prompt?.prompt || "").length} chars`);

  // Step 2: Delete any existing tools on the agent
  if (currentToolIds.length > 0) {
    console.log("\n2. Clearing existing tool_ids from agent...");
    await patchAgent({
      conversation_config: { agent: { prompt: { tool_ids: [] } } },
    });
    console.log("   Cleared.");

    // Delete the workspace tools themselves
    console.log("   Deleting old workspace tools...");
    for (const tid of currentToolIds) {
      try {
        await deleteTool(tid);
        console.log(`   Deleted: ${tid}`);
      } catch (e) {
        console.log(`   Skip (already gone): ${tid}`);
      }
    }
  } else {
    console.log("\n2. No existing tool_ids to clear.");
  }

  // Step 3: Create all 10 workspace tools
  console.log("\n3. Creating workspace tools...");
  const newToolIds = [];
  for (const toolPayload of TOOLS) {
    const name = toolPayload.tool_config.name;
    const toolId = await createTool(toolPayload);
    console.log(`   ${name} → ${toolId}`);
    newToolIds.push(toolId);
    await sleep(500); // Rate limit protection
  }
  console.log(`   Created ${newToolIds.length} tools.`);

  // Step 4: Upload knowledge base file
  console.log("\n4. Uploading knowledge base...");
  let kbDocId = null;

  // Check for existing KB docs and remove them
  const kbListRes = await fetch(`${BASE_API.replace('/agents', '')}/knowledge-base`, {
    headers: { "xi-api-key": API_KEY },
  });
  if (kbListRes.ok) {
    const kbList = await kbListRes.json();
    const docs = kbList.documents || [];
    for (const doc of docs) {
      if (doc.name && doc.name.includes("SERVICE INDUSTRY")) {
        console.log(`   Deleting old KB doc: ${doc.id} (${doc.name.substring(0, 40)})`);
        await fetch(`${BASE_API.replace('/agents', '')}/knowledge-base/${doc.id}`, {
          method: "DELETE",
          headers: { "xi-api-key": API_KEY },
        });
      }
    }
  }

  // Upload the KB as a file
  if (!DRY_RUN) {
    const kbPath = join(__dirname, "knowledge-bases", "service-industry-expertise.md");
    const { Blob } = await import("buffer");
    const formData = new FormData();
    const kbContent = readFileSync(kbPath);
    const blob = new Blob([kbContent], { type: "text/markdown" });
    formData.append("file", blob, "service-industry-expertise.md");

    const uploadRes = await fetch(
      `${BASE_API}/agents/${AGENT_ID}/add-to-knowledge-base`,
      {
        method: "POST",
        headers: { "xi-api-key": API_KEY },
        body: formData,
      }
    );
    if (uploadRes.ok) {
      const uploadData = await uploadRes.json();
      kbDocId = uploadData.id;
      console.log(`   Uploaded KB: ${kbDocId} (${SERVICE_KB_TEXT.length} chars)`);
    } else {
      console.log(`   KB upload failed: ${uploadRes.status} ${await uploadRes.text()}`);
    }
  }

  // Step 5: Build and apply the full patch (tools + KB in one PATCH)
  console.log("\n5. Building full agent patch...");

  const promptObj = {
    prompt: servicePrompt,
    tool_ids: newToolIds,
  };

  // Include KB reference in the same prompt patch so we don't overwrite tools
  if (kbDocId) {
    promptObj.knowledge_base = [
      {
        type: "file",
        id: kbDocId,
        name: "Service Industry Expertise",
      },
    ];
  }

  const patch = {
    conversation_config: {
      agent: {
        first_message: FIRST_MESSAGE,
        prompt: promptObj,
        dynamic_variables: {
          dynamic_variable_placeholders: dynamicVariablePlaceholders,
        },
      },
    },
    platform_settings: {
      data_collection: DATA_COLLECTION,
    },
  };

  const promptLen = servicePrompt.length;
  const dvCount = Object.keys(dynamicVariablePlaceholders).length;
  console.log(`   Prompt: ${promptLen} chars`);
  console.log(`   Tools: ${newToolIds.length} tool_ids`);
  console.log(`   Dynamic variables: ${dvCount}`);
  console.log(`   Knowledge base: ${kbDocId ? "1 doc (" + kbDocId + ")" : "skipped"}`);
  console.log(`   Data collection: ${Object.keys(DATA_COLLECTION).length} fields`);

  console.log("\n6. Applying patch...");
  const result = await patchAgent(patch);

  if (result) {
    const tools = result.conversation_config?.agent?.prompt?.tools || [];
    const tids = result.conversation_config?.agent?.prompt?.tool_ids || [];
    const dvs = result.conversation_config?.agent?.dynamic_variables?.dynamic_variable_placeholders || {};
    const kb = result.conversation_config?.agent?.prompt?.knowledge_base || [];
    const prompt = result.conversation_config?.agent?.prompt?.prompt || "";

    console.log("\n" + "=".repeat(60));
    console.log("VERIFICATION");
    console.log("=".repeat(60));
    console.log(`   Prompt: ${prompt.length} chars ${prompt.length === promptLen ? "OK" : "MISMATCH!"}`);
    console.log(`   Tools: ${tools.length} resolved, ${tids.length} tool_ids`);
    console.log(`   Tool names: ${tools.map(t => t.name).join(", ")}`);
    console.log(`   Dynamic variables: ${Object.keys(dvs).length}`);
    console.log(`   Knowledge base: ${kb.length} items`);
    console.log(`   First message: "${result.conversation_config?.agent?.first_message?.substring(0, 60)}..."`);

    // Check for empty DVs
    const emptyDVs = Object.entries(dvs).filter(([k, v]) => v === "" || v === null);
    if (emptyDVs.length > 0) {
      console.log(`   WARNING: ${emptyDVs.length} empty DVs: ${emptyDVs.map(e => e[0]).join(", ")}`);
    } else {
      console.log(`   All DVs have values: OK`);
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log("DONE!");
  console.log("=".repeat(60));
}

main().catch(e => {
  console.error("FATAL:", e.message);
  process.exit(1);
});
