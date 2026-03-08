/**
 * Deploy Medical Agent Tools + Knowledge Base to ElevenLabs
 *
 * Creates 7 workspace tools for the medical agent and links them.
 * Uploads 1 knowledge base document.
 * ONLY touches the medical agent — no other agents affected.
 *
 * Usage: node scripts/deploy-medical-agent-tools.mjs
 */

import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const API_KEY = "sk_2b27cfbfbc65aab7bfff4e370c598be68abcbe515e488d68";
const BASE_API = "https://api.elevenlabs.io/v1/convai";
const SUPABASE_URL = "https://yltzlvzgwkidbeqaoevp.supabase.co/functions/v1";
const MEDICAL_AGENT_ID = "agent_1001kghfstqzfryadtx3kh9t4ye4";

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

// ============= 7 MEDICAL AGENT TOOLS =============

const MEDICAL_TOOLS = [
  buildToolConfig(
    "check_availability",
    "Check if an appointment time is available. Use when patient requests a specific time: 'Do you have anything at 2pm Tuesday?' or 'Is Dr. Smith available Friday morning?' Can specify provider.",
    `${SUPABASE_URL}/elevenlabs-check-availability`,
    {
      date: prop("string", "Appointment date. Accept 'tomorrow', 'next Monday', 'Friday', or YYYY-MM-DD format."),
      time: prop("string", "Appointment time. Accept '2pm', '10:30am', 'noon', or HH:MM format."),
      service_name: prop("string", "Appointment type: 'dental cleaning', 'follow-up visit', 'initial evaluation', 'eye exam', 'adjustment'."),
      tenant_id: prop("string", "The tenant_id from your system prompt context. Always include this."),
      conversation_id: prop("string", "Conversation tracking ID if available"),
    },
    ["date", "time"]
  ),
  buildToolConfig(
    "suggest_availability",
    "Get available appointment times. Use when patient asks 'When is the soonest appointment?', 'What do you have this week?', or 'When can I see the doctor?' Can filter by provider.",
    `${SUPABASE_URL}/elevenlabs-suggest-availability`,
    {
      date: prop("string", "Date to check. Accept 'tomorrow', 'next week', 'Saturday'. Defaults to next available."),
      service_name: prop("string", "Appointment type to determine duration needed"),
      preference: prop("string", "Time preference: 'morning', 'afternoon', 'evening', or 'earliest'"),
      tenant_id: prop("string", "The tenant_id from your system prompt context. Always include this."),
      conversation_id: prop("string", "Conversation tracking ID if available"),
    },
    []
  ),
  buildToolConfig(
    "create_booking",
    "Book the appointment after patient confirms the time. Collect patient name. For new patients, note that in the notes field. HIPAA: Keep notes general — no symptoms, diagnoses, or medical details.",
    `${SUPABASE_URL}/elevenlabs-create-booking`,
    {
      customer_name: prop("string", "Patient's full name. Ask if not provided."),
      date: prop("string", "Confirmed appointment date"),
      time: prop("string", "Confirmed appointment time"),
      service_name: prop("string", "Appointment type: 'dental cleaning', 'follow-up visit', 'annual physical', 'initial evaluation'."),
      customer_phone: prop("string", "The caller's phone number from caller_phone in your system prompt context."),
      notes: prop("string", "HIPAA-safe notes ONLY: 'new patient', 'follow-up', 'returning patient', 'prefers Dr. Smith'. NEVER include symptoms, diagnoses, or medical details."),
      tenant_id: prop("string", "The tenant_id from your system prompt context. Always include this."),
      conversation_id: prop("string", "Conversation tracking ID if available"),
    },
    ["customer_name", "date", "time"]
  ),
  buildToolConfig(
    "check_service_area",
    "Check if home health visits or house calls are available to the patient's location. Use when patient asks 'Do you do home visits?' or 'Can the doctor come to my house?'",
    `${SUPABASE_URL}/elevenlabs-check-service-area`,
    {
      address: prop("string", "Patient's home address for the home visit"),
      tenant_id: prop("string", "The tenant_id from your system prompt context. Always include this."),
      conversation_id: prop("string", "Conversation tracking ID if available"),
    },
    ["address"]
  ),
  buildToolConfig(
    "create_callback",
    "Schedule a callback for medical questions, prescription refills, test results, billing, or to speak with clinical staff. IMPORTANT: Do not discuss medical information — just route the callback. NEVER include PHI in notes.",
    `${SUPABASE_URL}/elevenlabs-create-callback`,
    {
      reason: prop("string", "Why callback needed: 'prescription refill', 'test results', 'medical question', 'speak to nurse', 'speak to doctor', 'billing question', 'records request', 'patient complaint'"),
      customer_name: prop("string", "Patient's name"),
      customer_phone: prop("string", "The caller's phone number from caller_phone in your system prompt context."),
      department: prop("string", "Department to route to: 'nurse', 'doctor', 'billing', 'front desk', 'medical records', 'office manager'"),
      preferred_time: prop("string", "When to call back"),
      urgency: prop("string", "'low', 'medium', 'high' — note: for true emergencies, ALWAYS direct to 911 instead"),
      notes: prop("string", "General context only — NO medical details, symptoms, diagnoses, or PHI. GOOD: 'prescription refill request'. BAD: 'needs insulin for diabetes'."),
      tenant_id: prop("string", "The tenant_id from your system prompt context. Always include this."),
      conversation_id: prop("string", "Conversation tracking ID if available"),
    },
    ["reason"]
  ),
  buildToolConfig(
    "transfer_to_owner",
    "Transfer the call to the office manager or practice owner. Use IMMEDIATELY when patient asks to speak to someone — don't try to talk them out of it. Also use for unresolved complaints.",
    `${SUPABASE_URL}/elevenlabs-transfer-call`,
    {
      reason: prop("string", "Why the caller wants to transfer"),
      customer_name: prop("string", "Patient's name if collected"),
      tenant_id: prop("string", "The tenant_id from your system prompt context. Always include this."),
      twilio_call_sid: prop("string", "The twilio_call_sid from your system prompt context. Always include this."),
      conversation_id: prop("string", "Conversation tracking ID if available"),
    },
    ["tenant_id", "twilio_call_sid"]
  ),
  buildToolConfig(
    "add_to_waitlist",
    "Add patient to waitlist when their preferred appointment time is unavailable. Only use when waitlist_enabled is true AND the time is fully booked.",
    `${SUPABASE_URL}/elevenlabs-add-to-waitlist`,
    {
      customer_name: prop("string", "Patient's name"),
      customer_phone: prop("string", "The caller's phone number from caller_phone in your system prompt context."),
      preferred_date: prop("string", "Date they wanted"),
      preferred_time: prop("string", "Time they wanted"),
      service_name: prop("string", "Appointment type they're waiting for: 'dental cleaning', 'follow-up', 'initial evaluation'"),
      notes: prop("string", "HIPAA-safe notes only: 'prefers morning', 'needs Dr. Smith'. NO medical details."),
      tenant_id: prop("string", "The tenant_id from your system prompt context. Always include this."),
      conversation_id: prop("string", "Conversation tracking ID if available"),
    },
    ["customer_name", "preferred_date"]
  ),
];

// ============= KNOWLEDGE BASE DOCUMENTS =============

const KB_DOCS = [
  {
    name: "Medical Practice Expertise",
    file: join(__dirname, "knowledge-base", "medical-practice-expertise.md"),
  },
];

// ============= MAIN =============

async function main() {
  console.log(`\nDeploying Medical Agent (${MEDICAL_AGENT_ID})\n`);
  console.log("=".repeat(60));

  // Step 1: Get current state
  console.log("\nStep 1: Fetching current agent config...");
  const getRes = await fetch(`${BASE_API}/agents/${MEDICAL_AGENT_ID}`, {
    headers: { "xi-api-key": API_KEY },
  });
  if (!getRes.ok) throw new Error(`GET failed: ${getRes.status} ${await getRes.text()}`);
  const current = await getRes.json();

  const oldToolIds = current.conversation_config?.agent?.prompt?.tool_ids || [];
  console.log(`  Current tool_ids: ${oldToolIds.length}`);

  // Step 2: Unlink + delete old tools (if any)
  if (oldToolIds.length > 0) {
    console.log("\nStep 2: Cleaning up old tools...");
    await fetch(`${BASE_API}/agents/${MEDICAL_AGENT_ID}`, {
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

  // Step 3: Create 7 workspace tools
  console.log(`\nStep 3: Creating ${MEDICAL_TOOLS.length} workspace tools...\n`);
  const newToolIds = [];

  for (const config of MEDICAL_TOOLS) {
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

  // Step 4: Link tools to medical agent
  console.log("\nStep 4: Linking tools to medical agent...");
  const linkRes = await fetch(`${BASE_API}/agents/${MEDICAL_AGENT_ID}`, {
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
      `${BASE_API}/agents/${MEDICAL_AGENT_ID}/add-to-knowledge-base`,
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
  const verifyRes = await fetch(`${BASE_API}/agents/${MEDICAL_AGENT_ID}`, {
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

  if (finalToolIds.length === 7) {
    console.log("\n  ALL 7 TOOLS LINKED. Medical agent is ready for calls.");
  } else {
    console.log(`\n  WARNING: Expected 7 tools, got ${finalToolIds.length}`);
  }

  console.log("\nDone!");
}

main().catch(err => {
  console.error("Fatal:", err);
  process.exit(1);
});
