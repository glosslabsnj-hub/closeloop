/**
 * Fix transfer_to_owner tool — re-add dynamic_variable injection for twilio_call_sid and conversation_id.
 *
 * The fix-tool-dynamic-vars.mjs script removed ALL dynamic variables and made every param LLM-provided.
 * For transfer_to_owner, twilio_call_sid and conversation_id MUST be injected via dynamic_variable
 * because the LLM cannot reliably extract them from the system prompt.
 *
 * This script:
 *   1. Fetches each agent's tool_ids
 *   2. Finds the transfer_to_owner workspace tool
 *   3. Patches it to restore dynamic_variable on twilio_call_sid and conversation_id
 *   4. Adds both to tool-level dynamic_variable_placeholders
 *
 * Usage: node scripts/fix-transfer-tool.mjs
 */

const API_KEY = "sk_2b27cfbfbc65aab7bfff4e370c598be68abcbe515e488d68";
const BASE_API = "https://api.elevenlabs.io/v1/convai";

const AGENTS = {
  service:  "agent_4701kg1vwhzqfxmvzh032nhvx434",
  dispatch: "agent_2601kghfpmckez3t2n6p7bmcpac4",
  food:     "agent_6501kghfd7pcf5dte8k61wnn0m58",
  medical:  "agent_1001kghfstqzfryadtx3kh9t4ye4",
  sales:    "agent_2301kh5ertzwfas9e9badpers2cf",
  general:  "agent_9601kghg3djcfbfvwxxfkrxqpmq9",
  impound:  "agent_6301kgqscdvyek3a6wgegq8et167",
};

const HEADERS = {
  "xi-api-key": API_KEY,
  "Content-Type": "application/json",
};

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchJSON(url, opts = {}) {
  const res = await fetch(url, { ...opts, headers: { ...HEADERS, ...opts.headers } });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${opts.method || "GET"} ${url} -> ${res.status}: ${text}`);
  }
  return res.json();
}

async function getAgentToolIds(agentId) {
  const data = await fetchJSON(`${BASE_API}/agents/${agentId}`);
  return data.conversation_config?.agent?.prompt?.tool_ids || [];
}

async function getWorkspaceTool(toolId) {
  return fetchJSON(`${BASE_API}/tools/${toolId}`);
}

async function patchWorkspaceTool(toolId, body) {
  return fetchJSON(`${BASE_API}/tools/${toolId}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

/**
 * Given a tool config, patch its transfer_to_owner properties to use dynamic_variable
 * for twilio_call_sid and conversation_id.
 */
function buildPatch(toolConfig) {
  const schema = toolConfig.tool_config?.api_schema?.request_body_schema;
  if (!schema?.properties) {
    return null;
  }

  const props = { ...schema.properties };
  let changed = false;

  // Fix twilio_call_sid: must use dynamic_variable instead of description
  if (props.twilio_call_sid) {
    props.twilio_call_sid = { type: "string", dynamic_variable: "{{twilio_call_sid}}" };
    changed = true;
  }

  // Fix conversation_id: must use dynamic_variable instead of description
  if (props.conversation_id) {
    props.conversation_id = { type: "string", dynamic_variable: "{{conversation_id}}" };
    changed = true;
  }

  if (!changed) return null;

  // Build the tool-level dynamic_variable_placeholders
  // Merge with any existing ones (e.g., tenant_id might already be there)
  const existingDVP =
    toolConfig.tool_config?.dynamic_variables?.dynamic_variable_placeholders || {};
  const newDVP = {
    ...existingDVP,
    twilio_call_sid: "pending",
    conversation_id: "",
  };

  return {
    tool_config: {
      ...toolConfig.tool_config,
      dynamic_variables: {
        dynamic_variable_placeholders: newDVP,
      },
      api_schema: {
        ...toolConfig.tool_config.api_schema,
        request_body_schema: {
          ...schema,
          properties: props,
        },
      },
    },
  };
}

async function main() {
  console.log("=== Fix transfer_to_owner dynamic variables ===\n");

  let totalFixed = 0;

  for (const [mode, agentId] of Object.entries(AGENTS)) {
    console.log(`\n--- ${mode.toUpperCase()} (${agentId}) ---`);

    // Step 1: Get tool_ids from agent
    const toolIds = await getAgentToolIds(agentId);
    console.log(`  Tool IDs: ${toolIds.length}`);

    if (toolIds.length === 0) {
      console.log("  No workspace tools linked. Skipping.");
      continue;
    }

    // Step 2: Find transfer_to_owner among the workspace tools
    let transferToolId = null;
    let transferToolConfig = null;

    for (const tid of toolIds) {
      const tool = await getWorkspaceTool(tid);
      if (tool.tool_config?.name === "transfer_to_owner") {
        transferToolId = tid;
        transferToolConfig = tool;
        break;
      }
      await sleep(100);
    }

    if (!transferToolId) {
      console.log("  transfer_to_owner NOT found. Skipping.");
      continue;
    }

    console.log(`  Found transfer_to_owner: ${transferToolId}`);

    // Show current state
    const currentProps =
      transferToolConfig.tool_config?.api_schema?.request_body_schema?.properties || {};
    const hasDVCallSid = !!currentProps.twilio_call_sid?.dynamic_variable;
    const hasDVConvId = !!currentProps.conversation_id?.dynamic_variable;
    console.log(`  twilio_call_sid dynamic_variable: ${hasDVCallSid ? "YES" : "NO (needs fix)"}`);
    console.log(`  conversation_id dynamic_variable: ${hasDVConvId ? "YES" : "NO (needs fix)"}`);

    if (hasDVCallSid && hasDVConvId) {
      console.log("  Already correct. Skipping.");
      continue;
    }

    // Step 3: Build and apply patch
    const patch = buildPatch(transferToolConfig);
    if (!patch) {
      console.log("  Could not build patch. Skipping.");
      continue;
    }

    console.log("  Patching...");
    const result = await patchWorkspaceTool(transferToolId, patch);
    console.log(`  PATCHED successfully.`);

    // Verify
    const verifyProps =
      result.tool_config?.api_schema?.request_body_schema?.properties || {};
    const verifyDVP =
      result.tool_config?.dynamic_variables?.dynamic_variable_placeholders || {};
    console.log(`  Verify twilio_call_sid: ${verifyProps.twilio_call_sid?.dynamic_variable || "MISSING"}`);
    console.log(`  Verify conversation_id: ${verifyProps.conversation_id?.dynamic_variable || "MISSING"}`);
    console.log(`  Verify placeholders: ${JSON.stringify(verifyDVP)}`);

    totalFixed++;
    await sleep(300);
  }

  console.log(`\n=== Done. Fixed ${totalFixed} agent(s). ===`);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
