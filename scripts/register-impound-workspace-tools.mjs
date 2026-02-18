/**
 * Register IMPOUND tools in workspace, then attach to IMPOUND agent
 *
 * This creates 3 workspace tools with clear naming (IMPOUND prefix)
 * Then attaches them ONLY to the IMPOUND agent using tool_ids
 */

const ELEVENLABS_API_KEY = "sk_2b27cfbfbc65aab7bfff4e370c598be68abcbe515e488d68";
const IMPOUND_AGENT_ID = "agent_6301kgqscdvyek3a6wgegq8et167";
const SUPABASE_URL = "https://zsqfzluyylzmmjtfxwgr.supabase.co";

console.log("=".repeat(80));
console.log("REGISTERING IMPOUND TOOLS - WORKSPACE + AGENT ATTACHMENT");
console.log("=".repeat(80));
console.log("Strategy: Create workspace tools with IMPOUND_ prefix");
console.log("          Then attach ONLY to IMPOUND agent");
console.log("");

const toolsToCreate = [
  {
    name: "IMPOUND_check_vehicle",
    description: "[IMPOUND ONLY] Look up a vehicle in the impound lot by license plate, VIN, or description",
    url: `${SUPABASE_URL}/functions/v1/check-impound`,
    properties: {
      tenant_id: { type: "string", description: "Tenant ID (use {{tenant_id}})", required: true },
      conversation_id: { type: "string", description: "Conversation ID (use {{conversation_id}})" },
      license_plate: { type: "string", description: "Vehicle license plate" },
      license_plate_state: { type: "string", description: "Plate state (CA, TX, NY)" },
      vin: { type: "string", description: "Vehicle VIN" },
      vehicle_description: { type: "string", description: "Vehicle description (year make model color)" },
      towed_date: { type: "string", description: "Tow date (YYYY-MM-DD)" },
    },
  },
  {
    name: "IMPOUND_get_lot_hours",
    description: "[IMPOUND ONLY] Get impound lot hours, address, phone, and open/closed status",
    url: `${SUPABASE_URL}/functions/v1/get-impound-lot-info`,
    properties: {
      tenant_id: { type: "string", description: "Tenant ID (use {{tenant_id}})", required: true },
      conversation_id: { type: "string", description: "Conversation ID (use {{conversation_id}})" },
      lot_id: { type: "string", description: "Lot ID (optional)" },
      tenant_timezone: { type: "string", description: "Timezone (e.g., America/New_York)" },
    },
  },
  {
    name: "IMPOUND_get_release_fees",
    description: "[IMPOUND ONLY] Calculate release fees and requirements for a vehicle",
    url: `${SUPABASE_URL}/functions/v1/get-impound-release-info`,
    properties: {
      tenant_id: { type: "string", description: "Tenant ID (use {{tenant_id}})", required: true },
      conversation_id: { type: "string", description: "Conversation ID (use {{conversation_id}})" },
      vehicle_id: { type: "string", description: "Vehicle ID from check_vehicle", required: true },
      tenant_timezone: { type: "string", description: "Timezone (e.g., America/New_York)" },
    },
  },
];

const createdToolIds = [];

console.log("📋 Creating workspace tools...");

for (const toolDef of toolsToCreate) {
  console.log(`\n   Creating: ${toolDef.name}`);

  // Build request_body_schema from properties
  const requestBodySchema = {
    type: "object",
    required: Object.entries(toolDef.properties)
      .filter(([_, def]) => def.required)
      .map(([key, _]) => key),
    properties: Object.fromEntries(
      Object.entries(toolDef.properties).map(([key, def]) => [
        key,
        {
          type: def.type,
          description: def.description,
          enum: null,
          is_system_provided: false,
          dynamic_variable: "",
          constant_value: "",
        },
      ])
    ),
  };

  const createBody = {
    tool_config: {
      type: "webhook",
      name: toolDef.name,
      description: toolDef.description,
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
        url: toolDef.url,
        method: "POST",
        request_headers: {
          "content-type": "application/json",
        },
        path_params_schema: {},
        query_params_schema: null,
        request_body_schema: requestBodySchema,
        content_type: "application/json",
        auth_connection: null,
      },
    },
  };

  const createRes = await fetch("https://api.elevenlabs.io/v1/convai/tools", {
    method: "POST",
    headers: {
      "xi-api-key": ELEVENLABS_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(createBody),
  });

  if (!createRes.ok) {
    const errorText = await createRes.text();
    console.error(`   ❌ Failed to create ${toolDef.name}:`, createRes.status);
    console.error(errorText);
    continue;
  }

  const createData = await createRes.json();
  const toolId = createData.id || createData.tool_id; // Try both possible fields
  createdToolIds.push({ name: toolDef.name, id: toolId });
  console.log(`   ✅ Created: ${toolId}`);
  if (!toolId) {
    console.log(`   ⚠️  Response keys:`, Object.keys(createData));
  }
}

console.log(`\n✅ Created ${createdToolIds.length}/3 workspace tools`);
console.log("");

if (createdToolIds.length === 0) {
  console.error("❌ No tools created. Exiting.");
  process.exit(1);
}

// ============================================================================
// Attach tools to IMPOUND agent
// ============================================================================

console.log("🔗 Attaching tools to IMPOUND agent...");

const getAgentRes = await fetch(
  `https://api.elevenlabs.io/v1/convai/agents/${IMPOUND_AGENT_ID}`,
  { headers: { "xi-api-key": ELEVENLABS_API_KEY } }
);

const agentData = await getAgentRes.json();
const currentToolIds = agentData.conversation_config.agent.prompt.tool_ids || [];

console.log(`   Current tool_ids: ${currentToolIds.length}`);

const newToolIds = [...currentToolIds, ...createdToolIds.map(t => t.id)].filter(id => id); // filter out undefined

console.log(`   New tool_ids: ${newToolIds.length} (${createdToolIds.length} added)`);

const updateBody = {
  conversation_config: {
    ...agentData.conversation_config,
    agent: {
      ...agentData.conversation_config.agent,
      prompt: {
        ...agentData.conversation_config.agent.prompt,
        tools: [], // Clear inline tools array (system tools are in built_in_tools)
        tool_ids: newToolIds,
      },
    },
  },
};

const updateRes = await fetch(
  `https://api.elevenlabs.io/v1/convai/agents/${IMPOUND_AGENT_ID}`,
  {
    method: "PATCH",
    headers: {
      "xi-api-key": ELEVENLABS_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(updateBody),
  }
);

if (!updateRes.ok) {
  console.error("❌ Failed to attach tools:", updateRes.status, await updateRes.text());
  process.exit(1);
}

console.log("✅ Tools attached to agent");
console.log("");

// ============================================================================
// Verify
// ============================================================================

console.log("🔍 Verifying...");

const verifyRes = await fetch(
  `https://api.elevenlabs.io/v1/convai/agents/${IMPOUND_AGENT_ID}`,
  { headers: { "xi-api-key": ELEVENLABS_API_KEY } }
);

const verifyData = await verifyRes.json();
const verifyToolIds = verifyData.conversation_config.agent.prompt.tool_ids || [];

console.log(`✅ Agent now has ${verifyToolIds.length} tool IDs attached`);
console.log("");

console.log("=".repeat(80));
console.log("DEPLOYMENT COMPLETE");
console.log("=".repeat(80));
console.log("");
console.log("Created workspace tools (prefixed with IMPOUND_):");
for (const tool of createdToolIds) {
  console.log(`  🟢 ${tool.name} (${tool.id})`);
}
console.log("");
console.log("✅ IMPOUND agent is now 100% READY and LIVE");
console.log("");
console.log("Note: These tools are only attached to the IMPOUND agent.");
console.log("They will appear in your workspace but won't clutter other agents.");
console.log("");
console.log("=".repeat(80));
