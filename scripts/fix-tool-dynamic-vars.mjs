/**
 * Fix ElevenLabs agent tools — recreate as workspace tools with ALL params as LLM-provided.
 *
 * The working configuration had every tool parameter set to "LLM" (not dynamic_variable).
 * The LLM reads tenant_id, caller_phone, etc. from the system prompt context and passes
 * them as regular parameters. Dynamic variable injection on tool params causes failures.
 *
 * This script:
 *   1. Deletes current workspace tools
 *   2. Creates new workspace tools with ALL params as LLM-provided (description only, no dynamic_variable)
 *   3. Links them to the agent
 *
 * Usage: node scripts/fix-tool-dynamic-vars.mjs
 */

const API_KEY = "sk_2b27cfbfbc65aab7bfff4e370c598be68abcbe515e488d68";
const BASE_API = "https://api.elevenlabs.io/v1/convai";
const SUPABASE_URL = "https://zsqfzluyylzmmjtfxwgr.supabase.co/functions/v1";
const AGENT_ID = "agent_4701kg1vwhzqfxmvzh032nhvx434";

const SECRET_HEADER = { "X-CL-Secret": { secret_id: "9G30VIglbkIoULRKR7xD" } };
const CONTENT_HEADER = { "content-type": "application/json" };
const ALL_HEADERS = { ...CONTENT_HEADER, ...SECRET_HEADER };

// ALL parameters are LLM-provided. No dynamic_variable injection.
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

// ============= SERVICE AGENT TOOLS (10 tools) =============
// ALL params are LLM-provided. The LLM reads tenant_id, caller_phone, twilio_call_sid
// from the system prompt dynamic variables and passes them as regular tool parameters.

const TOOL_CONFIGS = [
  buildToolConfig(
    "suggest_availability",
    "Get available appointment times. Call when customer asks \"What times do you have?\" Returns up to 5 open slots.",
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
    "check_availability",
    "Check if a specific appointment time is available. Call this BEFORE confirming any appointment.",
    `${SUPABASE_URL}/elevenlabs-check-availability`,
    {
      date: prop("string", "Appointment date. Accept 'tomorrow', 'next Monday', 'Friday', or YYYY-MM-DD format."),
      time: prop("string", "Appointment time. Accept '2pm', '10:30am', 'noon', or HH:MM format."),
      service_name: prop("string", "Service being booked (e.g., 'haircut', 'AC repair'). Helps determine duration."),
      tenant_id: prop("string", "The tenant_id from your system prompt context. Always include this."),
      conversation_id: prop("string", "Conversation tracking ID if available"),
    },
    ["date", "time"]
  ),
  buildToolConfig(
    "create_booking",
    "Book the appointment after customer confirms. Only call AFTER checking availability AND getting explicit confirmation.",
    `${SUPABASE_URL}/elevenlabs-create-booking`,
    {
      customer_name: prop("string", "Customer's full name. Ask if not provided."),
      date: prop("string", "Confirmed appointment date"),
      time: prop("string", "Confirmed appointment time"),
      service_name: prop("string", "Service being booked"),
      customer_phone: prop("string", "The caller's phone number from caller_phone in your system prompt context."),
      notes: prop("string", "Special requests, address, vehicle info, urgency, email, and ALL answers to required questions. This is the only way details reach the business owner."),
      tenant_id: prop("string", "The tenant_id from your system prompt context. Always include this."),
      conversation_id: prop("string", "Conversation tracking ID if available"),
    },
    ["customer_name", "date", "time"]
  ),
  buildToolConfig(
    "check_service_area",
    "Check if we can come to the customer's location. For mobile services (HVAC, plumber, detailing, cleaning).",
    `${SUPABASE_URL}/elevenlabs-check-service-area`,
    {
      address: prop("string", "Customer's address where service is needed"),
      tenant_id: prop("string", "The tenant_id from your system prompt context. Always include this."),
      conversation_id: prop("string", "Conversation tracking ID if available"),
    },
    ["address"]
  ),
  buildToolConfig(
    "create_dispatch_job",
    "Send a technician out NOW for emergency service calls. Use for true emergencies only.",
    `${SUPABASE_URL}/elevenlabs-create-dispatch-job`,
    {
      pickup_address: prop("string", "Customer's address where technician should go"),
      service_type: prop("string", "Type of emergency: 'emergency_repair', 'ac_repair', 'plumbing', 'electrical', 'lockout'"),
      customer_name: prop("string", "Customer's name. ALWAYS ask for this before dispatching."),
      customer_phone: prop("string", "The caller's phone number from caller_phone in your system prompt context."),
      urgency: prop("string", "'emergency', 'urgent', or 'standard'"),
      notes: prop("string", "Problem description and special instructions"),
      tenant_id: prop("string", "The tenant_id from your system prompt context. Always include this."),
      conversation_id: prop("string", "Conversation tracking ID if available"),
    },
    ["pickup_address", "service_type", "customer_name"]
  ),
  buildToolConfig(
    "create_callback",
    "Create a callback request. Use when: complex quote needed, manager requested, unclear pricing, or any human follow-up.",
    `${SUPABASE_URL}/elevenlabs-create-callback`,
    {
      customer_name: prop("string", "Customer's name"),
      customer_phone: prop("string", "The caller's phone number from caller_phone in your system prompt context."),
      reason: prop("string", "Why callback is needed"),
      preferred_time: prop("string", "When customer wants callback"),
      tenant_id: prop("string", "The tenant_id from your system prompt context. Always include this."),
      conversation_id: prop("string", "Conversation tracking ID if available"),
    },
    ["customer_name"]
  ),
  buildToolConfig(
    "cancel_booking",
    "Cancel an existing booking. Ask for name to look it up.",
    `${SUPABASE_URL}/elevenlabs-cancel-booking`,
    {
      customer_name: prop("string", "Name on the booking"),
      customer_phone: prop("string", "The caller's phone number from caller_phone in your system prompt context."),
      reason: prop("string", "Reason for cancellation"),
      tenant_id: prop("string", "The tenant_id from your system prompt context. Always include this."),
      conversation_id: prop("string", "Conversation tracking ID if available"),
    },
    ["customer_name"]
  ),
  buildToolConfig(
    "add_to_waitlist",
    "Add customer to waitlist when requested time is fully booked. Only use when waitlist_enabled is true.",
    `${SUPABASE_URL}/elevenlabs-add-to-waitlist`,
    {
      customer_name: prop("string", "Customer's name"),
      customer_phone: prop("string", "The caller's phone number from caller_phone in your system prompt context."),
      preferred_date: prop("string", "Date they want"),
      preferred_time: prop("string", "Time they want"),
      service_name: prop("string", "Service requested"),
      tenant_id: prop("string", "The tenant_id from your system prompt context. Always include this."),
      conversation_id: prop("string", "Conversation tracking ID if available"),
    },
    ["customer_name", "preferred_date"]
  ),
  buildToolConfig(
    "lookup_active_job",
    "Look up status of an active job or appointment. Try active_job_summary first before calling.",
    `${SUPABASE_URL}/elevenlabs-lookup-dispatch-status`,
    {
      customer_name: prop("string", "Customer's name to look up"),
      customer_phone: prop("string", "The caller's phone number from caller_phone in your system prompt context."),
      job_number: prop("string", "Job or reference number if provided"),
      tenant_id: prop("string", "The tenant_id from your system prompt context. Always include this."),
      conversation_id: prop("string", "Conversation tracking ID if available"),
    },
    ["tenant_id"]
  ),
  buildToolConfig(
    "transfer_to_owner",
    "Transfer the call to the business owner/manager. Use IMMEDIATELY when caller asks to speak to a person.",
    `${SUPABASE_URL}/elevenlabs-transfer-call`,
    {
      reason: prop("string", "Why the caller wants to transfer"),
      tenant_id: prop("string", "The tenant_id from your system prompt context. Always include this."),
      twilio_call_sid: prop("string", "The twilio_call_sid from your system prompt context. Always include this."),
      conversation_id: prop("string", "Conversation tracking ID if available"),
    },
    ["tenant_id"]
  ),
];

// ============= MAIN =============

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function main() {
  console.log(`Fixing tools for service agent (${AGENT_ID})...\n`);

  // Step 1: Get current tool_ids so we can clean them up
  console.log("Step 1: Fetching current agent config...");
  const getRes = await fetch(`${BASE_API}/agents/${AGENT_ID}`, {
    headers: { "xi-api-key": API_KEY },
  });
  const currentConfig = await getRes.json();
  const oldToolIds = currentConfig.conversation_config?.agent?.prompt?.tool_ids || [];
  const promptLen = (currentConfig.conversation_config?.agent?.prompt?.prompt || "").length;
  console.log(`  Prompt: ${promptLen} chars`);
  console.log(`  Current tool_ids: ${oldToolIds.length}`);

  // Step 2: Unlink old tools from agent first
  if (oldToolIds.length > 0) {
    console.log("\nStep 2: Unlinking old tools from agent...");
    const unlinkRes = await fetch(`${BASE_API}/agents/${AGENT_ID}`, {
      method: "PATCH",
      headers: { "xi-api-key": API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({
        conversation_config: {
          agent: {
            prompt: {
              tool_ids: [],
            },
          },
        },
      }),
    });
    if (unlinkRes.ok) {
      console.log("  Unlinked.");
    } else {
      console.log(`  Unlink failed: ${unlinkRes.status} ${await unlinkRes.text()}`);
    }

    // Delete old workspace tools
    console.log("  Deleting old workspace tools...");
    for (const toolId of oldToolIds) {
      const delRes = await fetch(`${BASE_API}/tools/${toolId}`, {
        method: "DELETE",
        headers: { "xi-api-key": API_KEY },
      });
      console.log(`    ${toolId}: ${delRes.status}`);
      await sleep(200);
    }
  } else {
    console.log("\nStep 2: No old tools to clean up.");
  }

  // Step 3: Create new workspace tools — ALL params as LLM-provided (no dynamic_variable)
  console.log("\nStep 3: Creating workspace tools (ALL params = LLM-provided)...\n");
  const newToolIds = [];

  for (const config of TOOL_CONFIGS) {
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

  console.log(`\n  Created ${newToolIds.length} workspace tools.\n`);

  // Step 4: Link new tools to agent
  console.log("Step 4: Linking tools to agent...");
  const linkRes = await fetch(`${BASE_API}/agents/${AGENT_ID}`, {
    method: "PATCH",
    headers: { "xi-api-key": API_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({
      conversation_config: {
        agent: {
          prompt: {
            tool_ids: newToolIds,
          },
        },
      },
    }),
  });

  if (linkRes.ok) {
    console.log("  Linked successfully!\n");
  } else {
    const err = await linkRes.text();
    console.error(`  Link failed (${linkRes.status}): ${err}`);
    process.exit(1);
  }

  // Step 5: Verify
  console.log("Step 5: Verifying...");
  await sleep(2000);

  const verifyRes = await fetch(`${BASE_API}/agents/${AGENT_ID}`, {
    headers: { "xi-api-key": API_KEY },
  });
  const verifyData = await verifyRes.json();
  const finalToolIds = verifyData.conversation_config?.agent?.prompt?.tool_ids || [];
  const finalPrompt = (verifyData.conversation_config?.agent?.prompt?.prompt || "").length;
  const dvCount = Object.keys(verifyData.conversation_config?.agent?.dynamic_variables?.dynamic_variable_placeholders || {}).length;

  console.log(`  Prompt: ${finalPrompt} chars`);
  console.log(`  Dynamic vars: ${dvCount}`);
  console.log(`  Workspace tools: ${finalToolIds.length}`);

  if (finalToolIds.length === 10) {
    console.log("\n  ALL 10 TOOLS LINKED. Agent is ready for calls.");
  } else {
    console.log(`\n  WARNING: Expected 10 tools, got ${finalToolIds.length}`);
  }

  // Verify prompt fixes still present
  const prompt = verifyData.conversation_config?.agent?.prompt?.prompt || "";
  const fixes = [
    ["Tool Failure Protocol", "TOOL FAILURE PROTOCOL"],
    ["Service Area Ambiguity", "SERVICE AREA AMBIGUITY RULES"],
    ["Calendar Failure Fallback", "IF THE AVAILABILITY TOOL FAILS"],
    ["Pricing Triage", "PRICING TRIAGE"],
    ["Default Intake Questions", "required_questions_summary IS empty"],
    ["Severity Override", "SEVERITY OVERRIDE"],
  ];
  console.log("\n  Prompt fixes:");
  for (const [label, needle] of fixes) {
    console.log(`    ${prompt.includes(needle) ? "OK" : "MISSING"} ${label}`);
  }

  console.log("\nDone! Try calling now.");
}

main().catch(err => {
  console.error("Fatal:", err);
  process.exit(1);
});
