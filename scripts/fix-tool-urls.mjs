/**
 * Fix ALL ElevenLabs agent tool URLs from OLD Supabase project to NEW.
 *
 * OLD: zsqfzluyylzmmjtfxwgr.supabase.co
 * NEW: yltzlvzgwkidbeqaoevp.supabase.co
 *
 * This is the #1 reason calls are "hit or miss" - tools call dead server.
 */

const API_KEY = "sk_2b27cfbfbc65aab7bfff4e370c598be68abcbe515e488d68";
const AGENT_BASE = "https://api.elevenlabs.io/v1/convai/agents";
const TOOL_BASE = "https://api.elevenlabs.io/v1/convai/tools";

const OLD_PROJECT = "zsqfzluyylzmmjtfxwgr";
const NEW_PROJECT = "yltzlvzgwkidbeqaoevp";

// All known agents
const AGENTS = [
  { mode: "service",  id: "agent_4701kg1vwhzqfxmvzh032nhvx434" },
  { mode: "general",  id: "agent_9601kghg3djcfbfvwxxfkrxqpmq9" },
  { mode: "dispatch", id: "agent_2601kghfpmckez3t2n6p7bmcpac4" },
  { mode: "impound",  id: "agent_6301kgqscdvyek3a6wgegq8et167" },
];

async function fetchAgent(id) {
  const res = await fetch(`${AGENT_BASE}/${id}`, {
    headers: { "xi-api-key": API_KEY }
  });
  if (!res.ok) throw new Error(`Failed to fetch agent ${id}: ${res.status}`);
  return res.json();
}

async function fetchTool(id) {
  const res = await fetch(`${TOOL_BASE}/${id}`, {
    headers: { "xi-api-key": API_KEY }
  });
  if (!res.ok) throw new Error(`Failed to fetch tool ${id}: ${res.status}`);
  return res.json();
}

async function updateTool(id, updates) {
  const res = await fetch(`${TOOL_BASE}/${id}`, {
    method: "PATCH",
    headers: {
      "xi-api-key": API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(updates),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Failed to update tool ${id}: ${res.status} ${body}`);
  }
  return res.json();
}

async function main() {
  let totalFixed = 0;
  let totalChecked = 0;

  for (const agent of AGENTS) {
    console.log(`\n${"=".repeat(60)}`);
    console.log(`${agent.mode.toUpperCase()} AGENT (${agent.id})`);
    console.log("=".repeat(60));

    const data = await fetchAgent(agent.id);
    const tools = data.conversation_config?.agent?.prompt?.tools || [];
    const toolIds = data.conversation_config?.agent?.prompt?.tool_ids || [];

    console.log(`  Inline tools: ${tools.length}, Workspace tool IDs: ${toolIds.length}`);

    // Check inline tools
    for (const tool of tools) {
      const url = tool.api_schema?.url || "";
      totalChecked++;

      if (url.includes(OLD_PROJECT)) {
        const newUrl = url.replace(OLD_PROJECT, NEW_PROJECT);
        console.log(`  FIX NEEDED: ${tool.name}`);
        console.log(`    OLD: ${url}`);
        console.log(`    NEW: ${newUrl}`);

        // For inline tools, we need to update via workspace tool API
        // First check if the tool has a workspace ID
        if (tool.tool_id) {
          try {
            const toolData = await fetchTool(tool.tool_id);
            const currentSchema = toolData.api_schema || {};
            await updateTool(tool.tool_id, {
              api_schema: {
                ...currentSchema,
                url: newUrl,
              }
            });
            console.log(`    UPDATED via workspace tool ID: ${tool.tool_id}`);
            totalFixed++;
          } catch (err) {
            console.error(`    ERROR updating: ${err.message}`);
          }
        } else {
          console.log(`    NO tool_id - need to update via agent config`);
        }
      } else if (url.includes(NEW_PROJECT)) {
        console.log(`  OK: ${tool.name} (already on new project)`);
      } else if (url) {
        console.log(`  UNKNOWN URL: ${tool.name} -> ${url}`);
      }
    }

    // Check workspace tool IDs
    for (const toolId of toolIds) {
      totalChecked++;
      try {
        const toolData = await fetchTool(toolId);
        const url = toolData.api_schema?.url || "";

        if (url.includes(OLD_PROJECT)) {
          const newUrl = url.replace(OLD_PROJECT, NEW_PROJECT);
          console.log(`  FIX NEEDED (workspace): ${toolData.name || toolId}`);
          console.log(`    OLD: ${url}`);
          console.log(`    NEW: ${newUrl}`);

          await updateTool(toolId, {
            api_schema: {
              ...toolData.api_schema,
              url: newUrl,
            }
          });
          console.log(`    UPDATED`);
          totalFixed++;
        } else if (url.includes(NEW_PROJECT)) {
          console.log(`  OK (workspace): ${toolData.name || toolId}`);
        } else if (url) {
          console.log(`  UNKNOWN URL (workspace): ${toolData.name || toolId} -> ${url}`);
        }
      } catch (err) {
        console.error(`  ERROR checking workspace tool ${toolId}: ${err.message}`);
      }
    }
  }

  console.log(`\n${"=".repeat(60)}`);
  console.log(`SUMMARY: Checked ${totalChecked} tools, fixed ${totalFixed} URLs`);
  console.log("=".repeat(60));

  // Also check workspace-level webhook
  console.log(`\nChecking workspace webhook settings...`);
  try {
    const wsRes = await fetch("https://api.elevenlabs.io/v1/convai/settings", {
      headers: { "xi-api-key": API_KEY }
    });
    if (wsRes.ok) {
      const wsData = await wsRes.json();
      console.log(`  Init webhook: ${wsData.conversation_initiation_client_data_webhook?.url || "NOT SET"}`);
      console.log(`  Post-call webhook: ${wsData.webhook?.url || "NOT SET"}`);

      // Check if webhooks need updating
      const initUrl = wsData.conversation_initiation_client_data_webhook?.url || "";
      const postUrl = wsData.webhook?.url || "";

      if (initUrl.includes(OLD_PROJECT) || postUrl.includes(OLD_PROJECT)) {
        console.log(`\n  WARNING: Workspace webhooks still point to OLD project!`);
        console.log(`  These need manual update via ElevenLabs dashboard or API.`);
      }
    }
  } catch (err) {
    console.error(`  Error checking workspace: ${err.message}`);
  }
}

main().catch(console.error);
