/**
 * Deploy Sales Agent Tools + Knowledge Base to ElevenLabs
 *
 * Creates 6 workspace tools for the sales agent and links them.
 * Uploads 3 knowledge base documents.
 * ONLY touches the sales agent — no other agents affected.
 *
 * Usage: node scripts/deploy-sales-agent-tools.mjs
 */

import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const API_KEY = "sk_2b27cfbfbc65aab7bfff4e370c598be68abcbe515e488d68";
const BASE_API = "https://api.elevenlabs.io/v1/convai";
const SUPABASE_URL = "https://yltzlvzgwkidbeqaoevp.supabase.co/functions/v1";
const SALES_AGENT_ID = "agent_2301kh5ertzwfas9e9badpers2cf";

const SECRET_HEADER = { "X-CL-Secret": { secret_id: "9G30VIglbkIoULRKR7xD" } };
const CONTENT_HEADER = { "content-type": "application/json" };
const ALL_HEADERS = { ...CONTENT_HEADER, ...SECRET_HEADER };

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function prop(type, description) {
  return { type, description };
}

function buildToolConfig(name, description, url, properties, required) {
  return {
    type: "webhook",
    name,
    description,
    response_timeout_secs: 20,
    api_schema: {
      url,
      method: "POST",
      request_headers: ALL_HEADERS,
      request_body_schema: {
        type: "object",
        properties,
        required,
      },
    },
  };
}

// ============= 6 SALES AGENT TOOLS =============

const SALES_TOOLS = [
  buildToolConfig(
    "check_availability",
    "Check if a specific test drive or appointment time is available. Call this BEFORE confirming any appointment.",
    `${SUPABASE_URL}/elevenlabs-check-availability`,
    {
      date: prop("string", "Appointment date. Accept 'tomorrow', 'next Monday', 'Friday', or YYYY-MM-DD format."),
      time: prop("string", "Appointment time. Accept '2pm', '10:30am', 'noon', or HH:MM format."),
      service_name: prop("string", "Service being booked (e.g., 'test drive', 'consultation', 'showing')."),
      tenant_id: prop("string", "The tenant_id from your system prompt context. Always include this."),
      conversation_id: prop("string", "Conversation tracking ID if available"),
    },
    ["date", "time"]
  ),
  buildToolConfig(
    "suggest_availability",
    "Get available times for test drives or showroom appointments. Call when customer asks 'When can I come in?' Returns up to 5 open slots.",
    `${SUPABASE_URL}/elevenlabs-suggest-availability`,
    {
      date: prop("string", "Date to check. Accept 'tomorrow', 'next week', 'Saturday'. Defaults to next available."),
      service_name: prop("string", "Service name to determine duration needed"),
      preference: prop("string", "Time preference: 'morning', 'afternoon', 'evening', or 'earliest'"),
      tenant_id: prop("string", "The tenant_id from your system prompt context. Always include this."),
      conversation_id: prop("string", "Conversation tracking ID if available"),
    },
    []
  ),
  buildToolConfig(
    "create_booking",
    "Book a test drive or sales appointment. ALWAYS include vehicle interest, budget, and trade-in info in the notes field. Only call AFTER checking availability AND getting explicit confirmation.",
    `${SUPABASE_URL}/elevenlabs-create-booking`,
    {
      customer_name: prop("string", "Customer's full name. Ask if not provided."),
      date: prop("string", "Confirmed appointment date"),
      time: prop("string", "Confirmed appointment time"),
      service_name: prop("string", "Service being booked (e.g., 'test drive', 'showing', 'demo')"),
      customer_phone: prop("string", "The caller's phone number from caller_phone in your system prompt context."),
      notes: prop("string", "CRITICAL: Include vehicle/product interest, budget range, trade-in info, financing interest, timeline, and ALL answers to required questions. This is the only way details reach the sales team."),
      tenant_id: prop("string", "The tenant_id from your system prompt context. Always include this."),
      conversation_id: prop("string", "Conversation tracking ID if available"),
    },
    ["customer_name", "date", "time"]
  ),
  buildToolConfig(
    "check_service_area",
    "Check if we serve the customer's area. For delivery, solar installation, real estate coverage, or service area questions.",
    `${SUPABASE_URL}/elevenlabs-check-service-area`,
    {
      address: prop("string", "Customer's address to check"),
      tenant_id: prop("string", "The tenant_id from your system prompt context. Always include this."),
      conversation_id: prop("string", "Conversation tracking ID if available"),
    },
    ["address"]
  ),
  buildToolConfig(
    "create_callback",
    "Create a callback for financing questions, trade-in valuations, manager requests, or when customer won't schedule but wants info. Use department field to route: 'sales', 'finance', 'service', 'manager'.",
    `${SUPABASE_URL}/elevenlabs-create-callback`,
    {
      customer_name: prop("string", "Customer's name"),
      customer_phone: prop("string", "The caller's phone number from caller_phone in your system prompt context."),
      reason: prop("string", "Why callback is needed"),
      department: prop("string", "Department to route to: 'sales', 'finance', 'service', 'manager'"),
      preferred_time: prop("string", "When customer wants callback"),
      notes: prop("string", "Additional context: vehicle interest, budget, trade-in details"),
      tenant_id: prop("string", "The tenant_id from your system prompt context. Always include this."),
      conversation_id: prop("string", "Conversation tracking ID if available"),
    },
    ["customer_name"]
  ),
  buildToolConfig(
    "transfer_to_owner",
    "Transfer the call to the business owner or manager. Use IMMEDIATELY when caller asks to speak to a person — don't try to talk them out of it.",
    `${SUPABASE_URL}/elevenlabs-transfer-call`,
    {
      reason: prop("string", "Why the caller wants to transfer"),
      customer_name: prop("string", "Customer's name if collected"),
      tenant_id: prop("string", "The tenant_id from your system prompt context. Always include this."),
      twilio_call_sid: prop("string", "The twilio_call_sid from your system prompt context. Always include this."),
      conversation_id: prop("string", "Conversation tracking ID if available"),
    },
    ["tenant_id"]
  ),
];

// ============= KNOWLEDGE BASE DOCUMENTS =============

const KB_DOCS = [
  {
    name: "Sales Scenarios Guide",
    file: join(__dirname, "knowledge-base", "sales-scenarios-guide.md"),
  },
  {
    name: "Objection Handling Playbook",
    file: join(__dirname, "knowledge-base", "sales-objection-handling.md"),
  },
  {
    name: "Sales Terminology Guide",
    file: join(__dirname, "knowledge-base", "sales-terminology-guide.md"),
  },
];

// ============= MAIN =============

async function main() {
  console.log(`\nDeploying Sales Agent (${SALES_AGENT_ID})\n`);
  console.log("=".repeat(60));

  // Step 1: Get current state
  console.log("\n📡 Step 1: Fetching current agent config...");
  const getRes = await fetch(`${BASE_API}/agents/${SALES_AGENT_ID}`, {
    headers: { "xi-api-key": API_KEY },
  });
  if (!getRes.ok) throw new Error(`GET failed: ${getRes.status} ${await getRes.text()}`);
  const current = await getRes.json();

  const oldToolIds = current.conversation_config?.agent?.prompt?.tool_ids || [];
  console.log(`  Current tool_ids: ${oldToolIds.length}`);

  // Step 2: Unlink + delete old tools (if any)
  if (oldToolIds.length > 0) {
    console.log("\n🗑️  Step 2: Cleaning up old tools...");
    await fetch(`${BASE_API}/agents/${SALES_AGENT_ID}`, {
      method: "PATCH",
      headers: { "xi-api-key": API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({
        conversation_config: { agent: { prompt: { tool_ids: [] } } },
      }),
    });
    for (const toolId of oldToolIds) {
      const delRes = await fetch(`${BASE_API}/tools/${toolId}`, {
        method: "DELETE",
        headers: { "xi-api-key": API_KEY },
      });
      console.log(`    Deleted ${toolId}: ${delRes.status}`);
      await sleep(300);
    }
  } else {
    console.log("\n✅ Step 2: No old tools to clean up.");
  }

  // Step 3: Create 6 workspace tools
  console.log("\n🔧 Step 3: Creating 6 workspace tools...\n");
  const newToolIds = [];

  for (const config of SALES_TOOLS) {
    console.log(`  Creating: ${config.name}`);
    const res = await fetch(`${BASE_API}/tools`, {
      method: "POST",
      headers: { "xi-api-key": API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ tool_config: config }),
    });

    if (res.ok) {
      const data = await res.json();
      const toolId = data.tool_id || data.id;
      console.log(`    ✅ ${toolId}`);
      newToolIds.push(toolId);
    } else {
      const err = await res.text();
      console.error(`    ❌ FAILED (${res.status}): ${err}`);
      process.exit(1);
    }
    await sleep(500);
  }

  console.log(`\n  Created ${newToolIds.length} workspace tools.`);

  // Step 4: Link tools to sales agent
  console.log("\n🔗 Step 4: Linking tools to sales agent...");
  const linkRes = await fetch(`${BASE_API}/agents/${SALES_AGENT_ID}`, {
    method: "PATCH",
    headers: { "xi-api-key": API_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({
      conversation_config: { agent: { prompt: { tool_ids: newToolIds } } },
    }),
  });

  if (linkRes.ok) {
    console.log("  ✅ Tools linked successfully!");
  } else {
    const err = await linkRes.text();
    console.error(`  ❌ Link failed (${linkRes.status}): ${err}`);
    process.exit(1);
  }

  // Step 5: Upload Knowledge Base documents
  console.log("\n📚 Step 5: Uploading knowledge base documents...\n");

  for (const doc of KB_DOCS) {
    console.log(`  Uploading: ${doc.name}`);
    const content = readFileSync(doc.file, "utf-8");

    // Use the agent knowledge base endpoint
    const formData = new FormData();
    const blob = new Blob([content], { type: "text/plain" });
    formData.append("file", blob, doc.name.replace(/\s+/g, "-").toLowerCase() + ".md");
    formData.append("name", doc.name);

    const res = await fetch(
      `${BASE_API}/agents/${SALES_AGENT_ID}/add-to-knowledge-base`,
      {
        method: "POST",
        headers: { "xi-api-key": API_KEY },
        body: formData,
      }
    );

    if (res.ok) {
      console.log(`    ✅ Uploaded`);
    } else {
      const err = await res.text();
      console.error(`    ❌ FAILED (${res.status}): ${err}`);
      // Don't exit on KB failure — tools are already deployed
    }
    await sleep(1000);
  }

  // Step 6: Verify final state
  console.log("\n🔍 Step 6: Verifying final state...");
  await sleep(2000);
  const verifyRes = await fetch(`${BASE_API}/agents/${SALES_AGENT_ID}`, {
    headers: { "xi-api-key": API_KEY },
  });
  const finalState = await verifyRes.json();
  const finalTools = finalState.conversation_config?.agent?.prompt?.tool_ids || [];
  const promptLen = (finalState.conversation_config?.agent?.prompt?.prompt || "").length;
  const kb = finalState.conversation_config?.agent?.prompt?.knowledge_base || [];

  console.log(`  Prompt: ${promptLen} chars`);
  console.log(`  Tools linked: ${finalTools.length}`);
  console.log(`  Knowledge base docs: ${Array.isArray(kb) ? kb.length : 0}`);

  if (finalTools.length === 6) {
    console.log("\n" + "=".repeat(60));
    console.log("🎉 Sales agent deployed successfully! 6 tools + KB");
    console.log("=".repeat(60));
  } else {
    console.log(`\n⚠️  Expected 6 tools, got ${finalTools.length}. Check ElevenLabs dashboard.`);
  }
}

main().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
