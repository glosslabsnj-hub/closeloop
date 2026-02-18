/**
 * Debug version - see what the API returns
 */

const ELEVENLABS_API_KEY = "sk_2b27cfbfbc65aab7bfff4e370c598be68abcbe515e488d68";
const IMPOUND_AGENT_ID = "agent_6301kgqscdvyek3a6wgegq8et167";
const SUPABASE_URL = "https://zsqfzluyylzmmjtfxwgr.supabase.co";

// Fetch current
const getRes = await fetch(
  `https://api.elevenlabs.io/v1/convai/agents/${IMPOUND_AGENT_ID}`,
  { headers: { "xi-api-key": ELEVENLABS_API_KEY } }
);
const agentData = await getRes.json();
const currentTools = agentData.conversation_config.agent.prompt.tools;

console.log("Current tools:", currentTools.length);

// Try minimal update with just 1 simple tool
const testTool = {
  type: "webhook",
  name: "test_tool",
  description: "Test tool",
  response_timeout_secs: 20,
  disable_interruptions: false,
  force_pre_tool_speech: false,
  assignments: [],
  tool_call_sound: null,
  tool_call_sound_behavior: "auto",
  tool_error_handling_mode: "auto",
  dynamic_variables: { dynamic_variable_placeholders: {} },
  execution_mode: "immediate",
  api_schema: {
    url: `${SUPABASE_URL}/functions/v1/check-impound`,
    method: "POST",
    request_headers: { "content-type": "application/json" },
    path_params_schema: {},
    query_params_schema: null,
    request_body_schema: {
      type: "object",
      required: ["tenant_id"],
      properties: {
        tenant_id: {
          type: "string",
          description: "Tenant ID",
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
};

const updatedTools = [...currentTools, testTool];

console.log("Updating with tools:", updatedTools.length);

const updateBody = {
  conversation_config: {
    ...agentData.conversation_config,
    agent: {
      ...agentData.conversation_config.agent,
      prompt: {
        ...agentData.conversation_config.agent.prompt,
        tools: updatedTools,
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

console.log("Update status:", updateRes.status);
const updateData = await updateRes.json();
console.log("Update response keys:", Object.keys(updateData));
console.log("Update response agent_id:", updateData.agent_id);

if (updateData.conversation_config?.agent?.prompt?.tools) {
  console.log("Tools in response:", updateData.conversation_config.agent.prompt.tools.length);
  console.log("Tool names:", updateData.conversation_config.agent.prompt.tools.map(t => t.name));
} else {
  console.log("No tools in update response");
}
