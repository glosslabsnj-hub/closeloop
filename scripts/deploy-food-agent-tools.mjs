/**
 * Deploy Food Agent Tools + Knowledge Base to ElevenLabs
 *
 * Creates 8 workspace tools for the food agent and links them.
 * Uploads 1 knowledge base document.
 * ONLY touches the food agent — no other agents affected.
 *
 * Usage: node scripts/deploy-food-agent-tools.mjs
 */

import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const API_KEY = "sk_2b27cfbfbc65aab7bfff4e370c598be68abcbe515e488d68";
const BASE_API = "https://api.elevenlabs.io/v1/convai";
const SUPABASE_URL = "https://yltzlvzgwkidbeqaoevp.supabase.co/functions/v1";
const FOOD_AGENT_ID = "agent_6501kghfd7pcf5dte8k61wnn0m58";

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

// ============= 8 FOOD AGENT TOOLS =============

const FOOD_TOOLS = [
  buildToolConfig(
    "check_availability",
    "Check if a reservation time is available. Call this BEFORE confirming any reservation.",
    `${SUPABASE_URL}/elevenlabs-check-availability`,
    {
      date: prop("string", "Reservation date. Accept 'tomorrow', 'next Friday', 'Saturday', or YYYY-MM-DD format."),
      time: prop("string", "Reservation time. Accept '7pm', '6:30pm', 'noon', or HH:MM format."),
      service_name: prop("string", "Party size as service name: 'table for 4', 'party of 6'."),
      tenant_id: prop("string", "The tenant_id from your system prompt context. Always include this."),
      conversation_id: prop("string", "Conversation tracking ID if available"),
    },
    ["date", "time"]
  ),
  buildToolConfig(
    "suggest_availability",
    "Get available reservation times. Call when customer asks 'What times do you have Friday?' or 'When can we get a table?' Returns up to 5 open slots.",
    `${SUPABASE_URL}/elevenlabs-suggest-availability`,
    {
      date: prop("string", "Date to check. Accept 'tomorrow', 'this weekend', 'Saturday'. Defaults to next available."),
      service_name: prop("string", "Party size: 'table for 2', 'party of 8'"),
      preference: prop("string", "Time preference: 'lunch', 'dinner', 'evening', 'earliest'"),
      tenant_id: prop("string", "The tenant_id from your system prompt context. Always include this."),
      conversation_id: prop("string", "Conversation tracking ID if available"),
    },
    []
  ),
  buildToolConfig(
    "create_booking",
    "Make a reservation after customer confirms. Get their name and party size. Only call AFTER checking availability AND getting explicit confirmation.",
    `${SUPABASE_URL}/elevenlabs-create-booking`,
    {
      customer_name: prop("string", "Name for the reservation. Ask if not provided."),
      date: prop("string", "Confirmed reservation date"),
      time: prop("string", "Confirmed reservation time"),
      service_name: prop("string", "Party size: 'table for 4', 'party of 6', 'reservation for 2'"),
      customer_phone: prop("string", "The caller's phone number from caller_phone in your system prompt context."),
      notes: prop("string", "Special requests: 'high chair needed', 'birthday celebration', 'outdoor seating', 'wheelchair accessible'"),
      tenant_id: prop("string", "The tenant_id from your system prompt context. Always include this."),
      conversation_id: prop("string", "Conversation tracking ID if available"),
    },
    ["customer_name", "date", "time", "service_name"]
  ),
  buildToolConfig(
    "check_service_area",
    "Check if we deliver to the customer's address. ALWAYS call this BEFORE taking a delivery order. If out of area, suggest pickup instead.",
    `${SUPABASE_URL}/elevenlabs-check-service-area`,
    {
      address: prop("string", "Customer's delivery address"),
      tenant_id: prop("string", "The tenant_id from your system prompt context. Always include this."),
      conversation_id: prop("string", "Conversation tracking ID if available"),
    },
    ["address"]
  ),
  buildToolConfig(
    "create_dispatch_job",
    "Create a delivery order. Use AFTER confirming delivery address is in service area AND customer has placed their full order. Do NOT call this for pickup orders.",
    `${SUPABASE_URL}/elevenlabs-create-dispatch-job`,
    {
      pickup_address: prop("string", "Delivery address — where to bring the food"),
      service_type: prop("string", "Default to 'delivery'"),
      customer_name: prop("string", "Customer's name for the order"),
      customer_phone: prop("string", "The caller's phone number from caller_phone in your system prompt context."),
      notes: prop("string", "Delivery instructions: 'Leave at door', 'Call when arriving', 'Apt 4B buzzer code 1234'"),
      tenant_id: prop("string", "The tenant_id from your system prompt context. Always include this."),
      conversation_id: prop("string", "Conversation tracking ID if available"),
    },
    ["pickup_address"]
  ),
  buildToolConfig(
    "create_callback",
    "Schedule a callback for catering inquiries, large orders, event planning, complaints, or complex dietary needs. Use when the question needs a human.",
    `${SUPABASE_URL}/elevenlabs-create-callback`,
    {
      customer_name: prop("string", "Customer's name"),
      customer_phone: prop("string", "The caller's phone number from caller_phone in your system prompt context."),
      reason: prop("string", "Why callback is needed: 'catering inquiry', 'large order', 'complaint', 'dietary question', 'event planning'"),
      department: prop("string", "Department to route to: 'catering', 'manager', 'kitchen'"),
      preferred_time: prop("string", "When customer wants callback"),
      notes: prop("string", "Additional context about the request"),
      tenant_id: prop("string", "The tenant_id from your system prompt context. Always include this."),
      conversation_id: prop("string", "Conversation tracking ID if available"),
    },
    ["customer_name"]
  ),
  buildToolConfig(
    "transfer_to_owner",
    "Transfer the call to the restaurant manager or owner. Use IMMEDIATELY when caller asks to speak to a manager — don't try to talk them out of it.",
    `${SUPABASE_URL}/elevenlabs-transfer-call`,
    {
      reason: prop("string", "Why the caller wants to transfer"),
      customer_name: prop("string", "Customer's name if collected"),
      tenant_id: prop("string", "The tenant_id from your system prompt context. Always include this."),
      twilio_call_sid: prop("string", "The twilio_call_sid from your system prompt context. Always include this."),
      conversation_id: prop("string", "Conversation tracking ID if available"),
    },
    ["tenant_id", "twilio_call_sid"]
  ),
  buildToolConfig(
    "add_to_waitlist",
    "Add customer to waitlist when their requested reservation time is fully booked. Only use when waitlist_enabled is true AND the time is unavailable.",
    `${SUPABASE_URL}/elevenlabs-add-to-waitlist`,
    {
      customer_name: prop("string", "Customer's name"),
      customer_phone: prop("string", "The caller's phone number from caller_phone in your system prompt context."),
      preferred_date: prop("string", "Date they wanted"),
      preferred_time: prop("string", "Time they wanted"),
      service_name: prop("string", "Party size: 'table for 4'"),
      notes: prop("string", "Additional notes: 'birthday dinner', 'outdoor preferred'"),
      tenant_id: prop("string", "The tenant_id from your system prompt context. Always include this."),
      conversation_id: prop("string", "Conversation tracking ID if available"),
    },
    ["customer_name", "preferred_date"]
  ),
];

// ============= KNOWLEDGE BASE DOCUMENTS =============

const KB_DOCS = [
  {
    name: "Food Ordering Expertise",
    file: join(__dirname, "knowledge-base", "food-ordering-expertise.md"),
  },
];

// ============= MAIN =============

async function main() {
  console.log(`\nDeploying Food Agent (${FOOD_AGENT_ID})\n`);
  console.log("=".repeat(60));

  // Step 1: Get current state
  console.log("\nStep 1: Fetching current agent config...");
  const getRes = await fetch(`${BASE_API}/agents/${FOOD_AGENT_ID}`, {
    headers: { "xi-api-key": API_KEY },
  });
  if (!getRes.ok) throw new Error(`GET failed: ${getRes.status} ${await getRes.text()}`);
  const current = await getRes.json();

  const oldToolIds = current.conversation_config?.agent?.prompt?.tool_ids || [];
  console.log(`  Current tool_ids: ${oldToolIds.length}`);

  // Step 2: Unlink + delete old tools (if any)
  if (oldToolIds.length > 0) {
    console.log("\nStep 2: Cleaning up old tools...");
    await fetch(`${BASE_API}/agents/${FOOD_AGENT_ID}`, {
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
    console.log("\nStep 2: No old tools to clean up.");
  }

  // Step 3: Create 8 workspace tools
  console.log(`\nStep 3: Creating ${FOOD_TOOLS.length} workspace tools...\n`);
  const newToolIds = [];

  for (const config of FOOD_TOOLS) {
    console.log(`  Creating: ${config.name}`);
    const res = await fetch(`${BASE_API}/tools`, {
      method: "POST",
      headers: { "xi-api-key": API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ tool_config: config }),
    });

    if (res.ok) {
      const data = await res.json();
      const toolId = data.tool_id || data.id;
      console.log(`    -> ${toolId}`);
      newToolIds.push(toolId);
    } else {
      const err = await res.text();
      console.error(`    FAILED (${res.status}): ${err}`);
      process.exit(1);
    }
    await sleep(500);
  }

  console.log(`\n  Created ${newToolIds.length} workspace tools.`);

  // Step 4: Link tools to food agent
  console.log("\nStep 4: Linking tools to food agent...");
  const linkRes = await fetch(`${BASE_API}/agents/${FOOD_AGENT_ID}`, {
    method: "PATCH",
    headers: { "xi-api-key": API_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({
      conversation_config: { agent: { prompt: { tool_ids: newToolIds } } },
    }),
  });

  if (linkRes.ok) {
    console.log("  Tools linked successfully!");
  } else {
    const err = await linkRes.text();
    console.error(`  Link failed (${linkRes.status}): ${err}`);
    process.exit(1);
  }

  // Step 5: Upload Knowledge Base documents
  console.log("\nStep 5: Uploading knowledge base documents...\n");

  for (const doc of KB_DOCS) {
    console.log(`  Uploading: ${doc.name}`);
    const content = readFileSync(doc.file, "utf-8");

    const formData = new FormData();
    const blob = new Blob([content], { type: "text/plain" });
    formData.append("file", blob, doc.name.replace(/\s+/g, "-").toLowerCase() + ".md");
    formData.append("name", doc.name);

    const res = await fetch(
      `${BASE_API}/agents/${FOOD_AGENT_ID}/add-to-knowledge-base`,
      {
        method: "POST",
        headers: { "xi-api-key": API_KEY },
        body: formData,
      }
    );

    if (res.ok) {
      console.log(`    Uploaded`);
    } else {
      const err = await res.text();
      console.error(`    FAILED (${res.status}): ${err}`);
    }
    await sleep(1000);
  }

  // Step 6: Verify final state
  console.log("\nStep 6: Verifying final state...");
  await sleep(2000);
  const verifyRes = await fetch(`${BASE_API}/agents/${FOOD_AGENT_ID}`, {
    headers: { "xi-api-key": API_KEY },
  });
  const finalState = await verifyRes.json();
  const finalToolIds = finalState.conversation_config?.agent?.prompt?.tool_ids || [];
  const finalPrompt = (finalState.conversation_config?.agent?.prompt?.prompt || "").length;
  const dvCount = Object.keys(finalState.conversation_config?.agent?.dynamic_variables?.dynamic_variable_placeholders || {}).length;

  console.log(`\n  Final state:`);
  console.log(`    Prompt: ${finalPrompt} chars`);
  console.log(`    Dynamic vars: ${dvCount}`);
  console.log(`    Workspace tools: ${finalToolIds.length}`);

  if (finalToolIds.length === 8) {
    console.log("\n  ALL 8 TOOLS LINKED. Food agent is ready for calls.");
  } else {
    console.log(`\n  WARNING: Expected 8 tools, got ${finalToolIds.length}`);
  }

  console.log("\nDone!");
}

main().catch(err => {
  console.error("Fatal:", err);
  process.exit(1);
});
