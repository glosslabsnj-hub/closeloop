/**
 * Deploy General Agent — Creates workspace tools + patches agent
 *
 * General agent gets 3 business tools + transfer_to_owner (always available).
 * Tools: create_callback, check_service_area, suggest_availability, transfer_to_owner
 *
 * Usage: node scripts/deploy-general-agent.mjs [--dry-run]
 */

import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const API_KEY = "sk_2b27cfbfbc65aab7bfff4e370c598be68abcbe515e488d68";
const BASE_API = "https://api.elevenlabs.io/v1/convai";
const AGENT_ID = "agent_9601kghg3djcfbfvwxxfkrxqpmq9";
const SUPABASE_URL = "https://yltzlvzgwkidbeqaoevp.supabase.co/functions/v1";
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

// ============= TOOL DEFINITIONS (4 tools for General) =============

const TOOLS = [
  makeToolPayload(
    "suggest_availability",
    "Get a list of available appointment slots for a given date. Returns up to 5 available time windows. Use when the caller asks 'what times do you have?' or wants options.",
    `${SUPABASE_URL}/elevenlabs-suggest-availability`,
    {
      tenant_id: prop("string", "The tenant/business ID"),
      date: prop("string", "The date to find availability for, in YYYY-MM-DD format"),
      service_id: prop("string", "Optional service ID for duration-aware scheduling"),
      time_preference: prop("string", "Caller's preference: 'morning', 'afternoon', 'evening', or 'any'"),
      conversation_id: prop("string", "Conversation tracking ID"),
    },
    ["tenant_id", "date"]
  ),

  makeToolPayload(
    "check_service_area",
    "Verify if a customer's address is within the service area and get real-time ETA. Use for mobile services before confirming dispatch or when the caller provides their address.",
    `${SUPABASE_URL}/elevenlabs-check-service-area`,
    {
      tenant_id: prop("string", "The tenant/business ID"),
      address: prop("string", "Address to check"),
      conversation_id: prop("string", "Conversation tracking ID"),
    },
    ["tenant_id", "address"]
  ),

  makeToolPayload(
    "create_callback",
    "Schedule a callback request. This is the PRIMARY tool for the general agent. Use when: the caller wants to speak to someone, needs a quote, has a question you can't answer, or any inquiry that needs human follow-up.",
    `${SUPABASE_URL}/elevenlabs-create-callback`,
    {
      tenant_id: prop("string", "The tenant/business ID"),
      customer_name: prop("string", "Caller's full name"),
      customer_phone: prop("string", "The caller's phone number"),
      reason: prop("string", "Why the callback is needed"),
      best_time: prop("string", "When the caller prefers to be called back"),
      urgency: prop("string", "'high' if time-sensitive, 'normal' otherwise"),
      notes: prop("string", "Additional context for the person calling back"),
      conversation_id: prop("string", "Conversation tracking ID"),
    },
    ["tenant_id", "customer_name", "customer_phone", "reason"]
  ),

  makeToolPayload(
    "transfer_to_owner",
    "Transfer the live call to the business owner or manager. Use ONLY when the caller explicitly asks to speak with a person/manager/owner, or the situation requires human judgment.",
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
  console.log("DEPLOYING GENERAL AGENT");
  console.log(`Agent: ${AGENT_ID}`);
  console.log("=".repeat(60));

  // Step 1: Get current agent state
  console.log("\n1. Fetching current agent state...");
  const current = await getAgent();
  const currentToolIds = current.conversation_config?.agent?.prompt?.tool_ids || [];
  const currentTools = current.conversation_config?.agent?.prompt?.tools || [];
  console.log(`   Current tools: ${currentTools.length} (tool_ids: ${currentToolIds.length})`);

  // Step 2: Clear existing tool_ids
  if (currentToolIds.length > 0) {
    console.log("\n2. Clearing existing tool_ids from agent...");
    await patchAgent({
      conversation_config: { agent: { prompt: { tool_ids: [] } } },
    });
    console.log("   Cleared.");

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
  const patch = {
    conversation_config: {
      agent: {
        prompt: {
          tool_ids: newToolIds,
        },
      },
    },
  };

  const result = await patchAgent(patch);

  if (result) {
    const tools = result.conversation_config?.agent?.prompt?.tools || [];
    const tids = result.conversation_config?.agent?.prompt?.tool_ids || [];

    console.log("\n" + "=".repeat(60));
    console.log("VERIFICATION");
    console.log("=".repeat(60));
    console.log(`   Tools: ${tools.length} resolved, ${tids.length} tool_ids`);
    console.log(`   Tool names: ${tools.map(t => t.name).join(", ")}`);
  }

  console.log("\n" + "=".repeat(60));
  console.log("DONE");
  console.log("=".repeat(60));
}

main().catch(e => {
  console.error("FATAL:", e.message);
  process.exit(1);
});
