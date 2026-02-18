/**
 * Deploy Sales Agent — Creates workspace tools + patches agent
 *
 * This script uses the ElevenLabs tools API (POST /v1/convai/tools)
 * to create workspace tools, uploads KB docs, and patches the agent
 * with prompt + tools + KB + dynamic variables + data collection
 * in a SINGLE operation.
 *
 * ONLY touches the sales agent — no other agents affected.
 *
 * Usage: node scripts/deploy-sales-agent.mjs [--dry-run]
 */

import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const API_KEY = "sk_2b27cfbfbc65aab7bfff4e370c598be68abcbe515e488d68";
const BASE_API = "https://api.elevenlabs.io/v1/convai";
const AGENT_ID = "agent_2301kh5ertzwfas9e9badpers2cf";
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

// ============= TOOL DEFINITIONS (7 tools) =============

const TOOLS = [
  makeToolPayload(
    "check_availability",
    "Check if a specific test drive or appointment time is available. Call this BEFORE confirming any appointment. Date must be YYYY-MM-DD, time must be HH:MM in 24h format.",
    `${SUPABASE_URL}/elevenlabs-check-availability`,
    {
      tenant_id: prop("string", "The tenant/business ID"),
      date: prop("string", "The date to check availability for, in YYYY-MM-DD format"),
      time: prop("string", "The time to check, in HH:MM 24-hour format (e.g., 14:30 for 2:30 PM)"),
      service_name: prop("string", "Service being booked (e.g., 'test drive', 'consultation', 'showing')"),
      conversation_id: prop("string", "Conversation tracking ID"),
    },
    ["tenant_id", "date", "time"]
  ),

  makeToolPayload(
    "suggest_availability",
    "Get available times for test drives or showroom appointments. Call when customer asks 'When can I come in?' Returns up to 5 open slots. If no date specified, check today or the next business day.",
    `${SUPABASE_URL}/elevenlabs-suggest-availability`,
    {
      tenant_id: prop("string", "The tenant/business ID"),
      date: prop("string", "The date to find availability for, in YYYY-MM-DD format"),
      time_preference: prop("string", "Caller's preference: 'morning', 'afternoon', 'evening', or 'any'"),
      service_name: prop("string", "Service name to determine duration needed"),
      conversation_id: prop("string", "Conversation tracking ID"),
    },
    ["tenant_id", "date"]
  ),

  makeToolPayload(
    "create_booking",
    "Book a test drive or sales appointment. ALWAYS include vehicle interest, budget, and trade-in info in the notes field. Only call AFTER checking availability AND getting explicit confirmation from the caller.",
    `${SUPABASE_URL}/elevenlabs-create-booking`,
    {
      tenant_id: prop("string", "The tenant/business ID"),
      customer_name: prop("string", "The caller's full name"),
      customer_phone: prop("string", "The caller's phone number"),
      service_name: prop("string", "The service being booked (e.g., 'Test Drive', 'Showing', 'Consultation')"),
      date: prop("string", "Confirmed appointment date in YYYY-MM-DD format"),
      time: prop("string", "Confirmed appointment time in HH:MM 24-hour format"),
      notes: prop("string", "CRITICAL: Include vehicle/product interest, budget range, trade-in info, financing interest, timeline, and ALL qualifying details. This is the only way context reaches the sales team."),
      conversation_id: prop("string", "Conversation tracking ID"),
    },
    ["tenant_id", "customer_name", "customer_phone", "service_name", "date", "time"]
  ),

  makeToolPayload(
    "check_service_area",
    "Verify if a customer's address is within the service/delivery area. Use for delivery, solar installation, real estate coverage, mobile services, or geographic questions.",
    `${SUPABASE_URL}/elevenlabs-check-service-area`,
    {
      tenant_id: prop("string", "The tenant/business ID"),
      address: prop("string", "Address to check. Can be delivery address, installation address, or customer location."),
      conversation_id: prop("string", "Conversation tracking ID"),
    },
    ["tenant_id", "address"]
  ),

  makeToolPayload(
    "create_callback",
    "Create a callback for financing questions, trade-in valuations, manager requests, or when customer won't schedule but wants info. Use department field to route: 'sales', 'finance', 'service', 'manager'. This is your safety net — ALWAYS use this rather than letting a lead go.",
    `${SUPABASE_URL}/elevenlabs-create-callback`,
    {
      tenant_id: prop("string", "The tenant/business ID"),
      customer_name: prop("string", "Caller's full name"),
      customer_phone: prop("string", "The caller's phone number"),
      reason: prop("string", "Why the callback is needed — be specific"),
      department: prop("string", "Department to route to: 'sales', 'finance', 'service', 'manager'"),
      preferred_time: prop("string", "When the caller prefers to be called back"),
      notes: prop("string", "Additional context: vehicle interest, budget, trade-in details, all qualifying info gathered"),
      conversation_id: prop("string", "Conversation tracking ID"),
    },
    ["tenant_id", "customer_name", "customer_phone", "reason"]
  ),

  makeToolPayload(
    "transfer_to_owner",
    "Transfer the live call to the business owner or manager. Use IMMEDIATELY when caller asks to speak to a person — don't try to talk them out of it. Pauses AI and connects via Twilio.",
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

  makeToolPayload(
    "search_inventory",
    "Search available inventory by criteria. Use when caller asks about specific vehicles, products, or items. Supports make, model, year range, price range, body style, color, condition, or free-text query. Returns up to 10 matching items with details.",
    `${SUPABASE_URL}/elevenlabs-search-inventory`,
    {
      tenant_id: prop("string", "The tenant/business ID"),
      query: prop("string", "Free text search query (e.g., 'red SUV under 20k', '3 bed house in Scottsdale')"),
      make: prop("string", "Vehicle/product make or brand (e.g., 'Toyota', 'Ford')"),
      model: prop("string", "Vehicle/product model (e.g., 'Camry', 'F-150')"),
      year_min: prop("string", "Minimum year (e.g., '2022')"),
      year_max: prop("string", "Maximum year (e.g., '2025')"),
      price_min: prop("string", "Minimum price in dollars (e.g., '15000')"),
      price_max: prop("string", "Maximum price in dollars (e.g., '35000')"),
      condition: prop("string", "Condition filter: 'new', 'used', or 'certified'"),
      body_style: prop("string", "Body style: 'SUV', 'Sedan', 'Truck', 'Coupe', 'Van', etc."),
      color: prop("string", "Exterior color preference"),
      max_results: prop("string", "Maximum results to return (default 5, max 10)"),
      conversation_id: prop("string", "Conversation tracking ID"),
    },
    ["tenant_id"]
  ),
];

// ============= LOAD PROMPT + DYNAMIC VARIABLES =============

const deployScript = readFileSync(join(__dirname, "update-elevenlabs-agents.mjs"), "utf-8");

// Extract MODE_PROMPTS.sales content
const salesPromptMatch = deployScript.match(/MODE_PROMPTS\.sales\s*=\s*`([\s\S]*?)`;/);
const salesPrompt = salesPromptMatch ? salesPromptMatch[1] : null;

if (!salesPrompt) {
  console.error("ERROR: Could not extract MODE_PROMPTS.sales from update-elevenlabs-agents.mjs");
  process.exit(1);
}

// Load dynamic variable defaults
const dvMatch = deployScript.match(/const DYNAMIC_VARIABLE_DEFAULTS\s*=\s*\{([\s\S]*?)\n\};/);
let dynamicVariablePlaceholders = {};
if (dvMatch) {
  const entries = dvMatch[1].matchAll(/\s+(\w+):\s*"([^"]*)"/g);
  for (const [, key, value] of entries) {
    dynamicVariablePlaceholders[key] = value;
  }
}

// ============= DATA COLLECTION (8 fields) =============

const DATA_COLLECTION = {
  customer_name: { type: "string", description: "Caller's full name. If not provided, ask for it before booking." },
  customer_phone: { type: "string", description: "Best callback number. If not mentioned, use the number they're calling from." },
  interest_type: { type: "string", description: "What they're interested in — vehicle make/model, property type, product category, etc." },
  budget_range: { type: "string", description: "Their stated budget or price range." },
  timeline: { type: "string", description: "When they want to buy, visit, or make a decision." },
  has_trade_in: { type: "boolean", description: "True if the caller has a trade-in (vehicle, property, equipment)." },
  financing_interest: { type: "boolean", description: "True if the caller expressed interest in financing options." },
  appointment_booked: { type: "boolean", description: "True if an appointment/test drive/showing was successfully booked." },
};

// ============= FIRST MESSAGE =============

const FIRST_MESSAGE = "Hi, thanks for calling {{business_name}}! How can I help you today?";

// ============= KNOWLEDGE BASE =============

const KB_DOCS = [
  { name: "Sales Scenarios Guide", file: join(__dirname, "knowledge-base", "sales-scenarios-guide.md") },
  { name: "Objection Handling Playbook", file: join(__dirname, "knowledge-base", "sales-objection-handling.md") },
  { name: "Sales Terminology Guide", file: join(__dirname, "knowledge-base", "sales-terminology-guide.md") },
];

// ============= MAIN =============

async function main() {
  console.log("=".repeat(60));
  console.log("DEPLOYING SALES AGENT");
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

  // Step 3: Create all 7 workspace tools
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

  // Step 4: Upload knowledge base files
  console.log("\n4. Uploading knowledge base...");
  const kbEntries = [];

  for (const doc of KB_DOCS) {
    console.log(`   Uploading: ${doc.name}`);
    if (DRY_RUN) {
      console.log(`   [DRY RUN] Would upload: ${doc.name}`);
      kbEntries.push({ type: "file", id: "dry_run_kb_id", name: doc.name });
      continue;
    }

    const content = readFileSync(doc.file, "utf-8");
    const { Blob } = await import("buffer");
    const formData = new FormData();
    const blob = new Blob([content], { type: "text/markdown" });
    const fileName = doc.name.replace(/\s+/g, "-").toLowerCase() + ".md";
    formData.append("file", blob, fileName);

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
      const docId = uploadData.id;
      console.log(`   ${doc.name} → ${docId} (${content.length} chars)`);
      kbEntries.push({ type: "file", id: docId, name: doc.name });
    } else {
      const errText = await uploadRes.text();
      console.error(`   KB upload failed for ${doc.name}: ${uploadRes.status} ${errText.substring(0, 200)}`);
    }
    await sleep(1000);
  }

  // Step 5: Build and apply the full patch
  console.log("\n5. Building full agent patch...");

  const promptObj = {
    prompt: salesPrompt,
    tool_ids: newToolIds,
  };

  // Include KB references with non-empty names
  if (kbEntries.length > 0) {
    promptObj.knowledge_base = kbEntries;
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

  const promptLen = salesPrompt.length;
  const dvCount = Object.keys(dynamicVariablePlaceholders).length;
  console.log(`   Prompt: ${promptLen} chars`);
  console.log(`   Tools: ${newToolIds.length} tool_ids`);
  console.log(`   Dynamic variables: ${dvCount}`);
  console.log(`   Knowledge base: ${kbEntries.length} docs`);
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
    if (kb.length > 0) {
      for (const entry of kb) {
        console.log(`     - ${entry.name || "(unnamed)"} (${entry.id})`);
      }
    }
    console.log(`   Data collection: ${Object.keys(result.platform_settings?.data_collection || {}).length} fields`);
    console.log(`   First message: "${result.conversation_config?.agent?.first_message?.substring(0, 60)}..."`);

    // Check for empty DVs
    const emptyDVs = Object.entries(dvs).filter(([k, v]) => v === "" || v === null);
    if (emptyDVs.length > 0) {
      console.log(`   WARNING: ${emptyDVs.length} empty DVs: ${emptyDVs.map(e => e[0]).join(", ")}`);
    } else {
      console.log(`   All DVs have values: OK`);
    }

    // Validate key expectations
    const issues = [];
    if (prompt.length < 25000) issues.push(`Prompt too short: ${prompt.length} chars (expected 25000+)`);
    if (tools.length !== 7) issues.push(`Tool count: ${tools.length} (expected 7)`);
    if (kb.length < 3) issues.push(`KB count: ${kb.length} (expected 3)`);
    if (Object.keys(dvs).length < 100) issues.push(`DV count: ${Object.keys(dvs).length} (expected 100+)`);

    if (issues.length > 0) {
      console.log("\n   WARNINGS:");
      for (const issue of issues) {
        console.log(`   - ${issue}`);
      }
    } else {
      console.log("\n   All checks passed!");
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
