/**
 * Deploy IMPOUND Tools ONLY
 *
 * Registers the 3 impound-specific tools directly in the IMPOUND agent.
 * Does NOT touch any other agents or create workspace-level tools.
 */

const ELEVENLABS_API_KEY = "sk_2b27cfbfbc65aab7bfff4e370c598be68abcbe515e488d68";
const IMPOUND_AGENT_ID = "agent_6301kgqscdvyek3a6wgegq8et167";
const SUPABASE_URL = "https://zsqfzluyylzmmjtfxwgr.supabase.co";

console.log("=".repeat(80));
console.log("DEPLOYING IMPOUND TOOLS TO IMPOUND AGENT ONLY");
console.log("=".repeat(80));
console.log(`Agent ID: ${IMPOUND_AGENT_ID}`);
console.log(`Target: IMPOUND agent only (no other agents will be touched)`);
console.log("");

// ============================================================================
// STEP 1: Get current agent configuration
// ============================================================================

console.log("📥 Fetching current IMPOUND agent configuration...");

const getAgentRes = await fetch(
  `https://api.elevenlabs.io/v1/convai/agents/${IMPOUND_AGENT_ID}`,
  {
    headers: {
      "xi-api-key": ELEVENLABS_API_KEY,
    },
  }
);

if (!getAgentRes.ok) {
  console.error("❌ Failed to fetch agent:", getAgentRes.status, await getAgentRes.text());
  process.exit(1);
}

const agentData = await getAgentRes.json();
const currentConfig = agentData.conversation_config?.agent || {};
const currentPrompt = currentConfig.prompt || {};
const currentTools = currentPrompt.tools || [];

console.log("✅ Current agent fetched");
console.log(`   Current tools: ${currentTools.length}`);
console.log(`   Tool names: ${JSON.stringify(currentTools.map(t => t.name))}`);
console.log("");

// ============================================================================
// STEP 2: Define the 3 IMPOUND tools with proper ElevenLabs schema
// ============================================================================

console.log("🔧 Defining IMPOUND tools...");

const IMPOUND_WEBHOOK_TOOLS = [
  {
    type: "webhook",
    name: "check_impound",
    description: "Look up a vehicle in the impound lot by license plate, VIN, or description. Returns vehicle details, tow date, location, and fees if found. Use this when caller asks about their vehicle or wants to know if their car was towed.",
    response_timeout_secs: 20,
    disable_interruptions: false,
    force_pre_tool_speech: false,
    assignments: [],
    tool_call_sound: null,
    tool_call_sound_behavior: "auto",
    tool_error_handling_mode: "auto",
    dynamic_variables: {
      dynamic_variable_placeholders: {}
    },
    execution_mode: "immediate",
    api_schema: {
      url: `${SUPABASE_URL}/functions/v1/check-impound`,
      method: "POST",
      request_headers: {
        "content-type": "application/json",
      },
      path_params_schema: {},
      query_params_schema: null,
      request_body_schema: {
        type: "object",
        required: ["tenant_id"],
        description: "Look up vehicle by plate, VIN, or description",
        properties: {
          tenant_id: {
            type: "string",
            description: "The tenant_id from your context. ALWAYS pass {{tenant_id}} here.",
            enum: null,
            is_system_provided: false,
            dynamic_variable: "",
            constant_value: "",
          },
          conversation_id: {
            type: "string",
            description: "Conversation tracking ID. ALWAYS pass {{conversation_id}} here.",
            enum: null,
            is_system_provided: false,
            dynamic_variable: "",
            constant_value: "",
          },
          license_plate: {
            type: "string",
            description: "Vehicle license plate number (if provided by caller)",
            enum: null,
            is_system_provided: false,
            dynamic_variable: "",
            constant_value: "",
          },
          license_plate_state: {
            type: "string",
            description: "State of the license plate (e.g., 'CA', 'TX', 'NY')",
            enum: null,
            is_system_provided: false,
            dynamic_variable: "",
            constant_value: "",
          },
          vin: {
            type: "string",
            description: "Vehicle Identification Number (if provided by caller)",
            enum: null,
            is_system_provided: false,
            dynamic_variable: "",
            constant_value: "",
          },
          vehicle_description: {
            type: "string",
            description: "Vehicle description like '2020 red Honda Civic' (if plate/VIN not available)",
            enum: null,
            is_system_provided: false,
            dynamic_variable: "",
            constant_value: "",
          },
          towed_date: {
            type: "string",
            description: "Date the vehicle was towed in YYYY-MM-DD format (optional)",
            enum: null,
            is_system_provided: false,
            dynamic_variable: "",
            constant_value: "",
          },
        },
      },
      content_type: "application/json",
      auth_connection: null,
    },
  },
  {
    type: "webhook",
    name: "get_impound_lot_info",
    description: "Get detailed information about the impound lot including hours, address, phone, and current open/closed status. Use this when caller asks about lot hours, location, or when you can pick up a vehicle.",
    response_timeout_secs: 20,
    disable_interruptions: false,
    force_pre_tool_speech: false,
    assignments: [],
    tool_call_sound: null,
    tool_call_sound_behavior: "auto",
    tool_error_handling_mode: "auto",
    dynamic_variables: {
      dynamic_variable_placeholders: {}
    },
    execution_mode: "immediate",
    api_schema: {
      url: `${SUPABASE_URL}/functions/v1/get-impound-lot-info`,
      method: "POST",
      request_headers: {
        "content-type": "application/json",
      },
      path_params_schema: {},
      query_params_schema: null,
      request_body_schema: {
        type: "object",
        required: ["tenant_id"],
        description: "Get impound lot hours and information",
        properties: {
          tenant_id: {
            type: "string",
            description: "The tenant_id from your context. ALWAYS pass {{tenant_id}} here.",
            enum: null,
            is_system_provided: false,
            dynamic_variable: "",
            constant_value: "",
          },
          conversation_id: {
            type: "string",
            description: "Conversation tracking ID. ALWAYS pass {{conversation_id}} here.",
            enum: null,
            is_system_provided: false,
            dynamic_variable: "",
            constant_value: "",
          },
          lot_id: {
            type: "string",
            description: "Specific lot ID if known (optional, defaults to primary lot)",
            enum: null,
            is_system_provided: false,
            dynamic_variable: "",
            constant_value: "",
          },
          tenant_timezone: {
            type: "string",
            description: "Tenant timezone for accurate hours calculation (e.g., 'America/New_York')",
            enum: null,
            is_system_provided: false,
            dynamic_variable: "",
            constant_value: "",
          },
        },
      },
      content_type: "application/json",
      auth_connection: null,
    },
  },
  {
    type: "webhook",
    name: "get_impound_release_info",
    description: "Calculate total fees to release a vehicle and get release requirements. Use this AFTER finding the vehicle with check_impound, when caller asks 'how much' or 'what do I need to bring'. Returns total fees, payment methods, required documents, and lot hours.",
    response_timeout_secs: 20,
    disable_interruptions: false,
    force_pre_tool_speech: false,
    assignments: [],
    tool_call_sound: null,
    tool_call_sound_behavior: "auto",
    tool_error_handling_mode: "auto",
    dynamic_variables: {
      dynamic_variable_placeholders: {}
    },
    execution_mode: "immediate",
    api_schema: {
      url: `${SUPABASE_URL}/functions/v1/get-impound-release-info`,
      method: "POST",
      request_headers: {
        "content-type": "application/json",
      },
      path_params_schema: {},
      query_params_schema: null,
      request_body_schema: {
        type: "object",
        required: ["tenant_id", "vehicle_id"],
        description: "Calculate release fees and requirements for a vehicle",
        properties: {
          tenant_id: {
            type: "string",
            description: "The tenant_id from your context. ALWAYS pass {{tenant_id}} here.",
            enum: null,
            is_system_provided: false,
            dynamic_variable: "",
            constant_value: "",
          },
          conversation_id: {
            type: "string",
            description: "Conversation tracking ID. ALWAYS pass {{conversation_id}} here.",
            enum: null,
            is_system_provided: false,
            dynamic_variable: "",
            constant_value: "",
          },
          vehicle_id: {
            type: "string",
            description: "The vehicle ID returned from check_impound tool. REQUIRED.",
            enum: null,
            is_system_provided: false,
            dynamic_variable: "",
            constant_value: "",
          },
          tenant_timezone: {
            type: "string",
            description: "Tenant timezone for accurate hours calculation (e.g., 'America/New_York')",
            enum: null,
            is_system_provided: false,
            dynamic_variable: "",
            constant_value: "",
          },
        },
      },
      content_type: "application/json",
      auth_connection: null,
    },
  },
];

console.log("✅ Tool definitions created:");
for (const tool of IMPOUND_WEBHOOK_TOOLS) {
  console.log(`   - ${tool.name}`);
}
console.log("");

// ============================================================================
// STEP 3: APPEND webhook tools to existing tools (keep transfer_to_agent)
// ============================================================================

console.log("🚀 Updating IMPOUND agent with tools...");
console.log("   Strategy: APPEND webhook tools to existing tools");

// Keep existing system tools (like transfer_to_agent) and add our 3 webhook tools
const mergedTools = [...currentTools, ...IMPOUND_WEBHOOK_TOOLS];

console.log(`   Merged tools count: ${mergedTools.length} (${currentTools.length} existing + ${IMPOUND_WEBHOOK_TOOLS.length} new)`);

// Build the updated agent configuration
const updatedPrompt = {
  ...currentPrompt,
  tools: mergedTools,
};

const updatedAgent = {
  ...currentConfig,
  prompt: updatedPrompt,
};

const updatedConversationConfig = {
  ...agentData.conversation_config,
  agent: updatedAgent,
};

// Update the agent
const updateRes = await fetch(
  `https://api.elevenlabs.io/v1/convai/agents/${IMPOUND_AGENT_ID}`,
  {
    method: "PATCH",
    headers: {
      "xi-api-key": ELEVENLABS_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      conversation_config: updatedConversationConfig,
    }),
  }
);

if (!updateRes.ok) {
  const errorText = await updateRes.text();
  console.error("❌ Failed to update agent:", updateRes.status);
  console.error(errorText);
  process.exit(1);
}

const updateData = await updateRes.json();
console.log("✅ Agent updated successfully");
console.log("");

// ============================================================================
// STEP 4: Verify the tools were registered
// ============================================================================

console.log("🔍 Verifying tools registration...");
console.log("   Waiting 2 seconds for ElevenLabs to process...");
await new Promise(resolve => setTimeout(resolve, 2000));

const verifyRes = await fetch(
  `https://api.elevenlabs.io/v1/convai/agents/${IMPOUND_AGENT_ID}`,
  {
    headers: {
      "xi-api-key": ELEVENLABS_API_KEY,
    },
  }
);

if (!verifyRes.ok) {
  console.error("❌ Failed to verify agent");
  process.exit(1);
}

const verifyData = await verifyRes.json();
const verifyTools = verifyData.conversation_config?.agent?.prompt?.tools || [];
const toolNames = verifyTools.map(t => t.name);

console.log("✅ Verification complete");
console.log(`   Tools registered: ${verifyTools.length}`);
console.log(`   Tool names: ${JSON.stringify(toolNames)}`);
console.log("");

// ============================================================================
// STEP 5: Final status
// ============================================================================

console.log("=".repeat(80));
console.log("DEPLOYMENT COMPLETE");
console.log("=".repeat(80));

const hasCheckImpound = toolNames.includes("check_impound");
const hasLotInfo = toolNames.includes("get_impound_lot_info");
const hasReleaseInfo = toolNames.includes("get_impound_release_info");

if (hasCheckImpound && hasLotInfo && hasReleaseInfo) {
  console.log("✅ SUCCESS: All 3 IMPOUND tools registered correctly");
  console.log("");
  console.log("IMPOUND Agent Status:");
  console.log("  🟢 Agent ID: " + IMPOUND_AGENT_ID);
  console.log("  🟢 Tools: " + verifyTools.length + " total");
  console.log("  🟢 check_impound - Vehicle lookup");
  console.log("  🟢 get_impound_lot_info - Lot hours/info");
  console.log("  🟢 get_impound_release_info - Fee calculation");
  console.log("  🟢 transfer_to_agent - Transfer to dispatch");
  console.log("");
  console.log("✅ IMPOUND agent is now 100% READY and LIVE");
  console.log("");
  console.log("Next steps:");
  console.log("  1. Make a test phone call to verify the flow");
  console.log("  2. Test vehicle lookup by license plate");
  console.log("  3. Test fee calculation");
  console.log("");
} else {
  console.log("⚠️ WARNING: Some tools missing");
  console.log(`   Expected: check_impound, get_impound_lot_info, get_impound_release_info`);
  console.log(`   Found: ${JSON.stringify(toolNames)}`);
  console.log("");
  console.log("   check_impound: " + (hasCheckImpound ? "✅" : "❌"));
  console.log("   get_impound_lot_info: " + (hasLotInfo ? "✅" : "❌"));
  console.log("   get_impound_release_info: " + (hasReleaseInfo ? "✅" : "❌"));
  console.log("");
  console.log("Please review the agent configuration or check the error above");
}

console.log("=".repeat(80));
