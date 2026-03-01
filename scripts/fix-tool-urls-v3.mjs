/**
 * Fix ElevenLabs agent tool URLs - v3
 * Strips stale tool_ids that cause 404 errors, patches with clean inline tools.
 * Also fixes workspace post-call webhook.
 */

const API_KEY = "sk_2b27cfbfbc65aab7bfff4e370c598be68abcbe515e488d68";
const AGENT_BASE = "https://api.elevenlabs.io/v1/convai/agents";

const OLD_HOST = "zsqfzluyylzmmjtfxwgr.supabase.co";
const NEW_HOST = "yltzlvzgwkidbeqaoevp.supabase.co";

const AGENTS = [
  { mode: "service",  id: "agent_4701kg1vwhzqfxmvzh032nhvx434" },
  { mode: "dispatch", id: "agent_2601kghfpmckez3t2n6p7bmcpac4" },
  { mode: "impound",  id: "agent_6301kgqscdvyek3a6wgegq8et167" },
];

function stripToolIds(tool) {
  // Remove tool_id and id fields that reference deleted workspace tools
  const clean = { ...tool };
  delete clean.tool_id;
  delete clean.id;
  return clean;
}

async function fixAgent(agent) {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`Fixing ${agent.mode.toUpperCase()} agent`);
  console.log("=".repeat(60));

  const res = await fetch(`${AGENT_BASE}/${agent.id}`, {
    headers: { "xi-api-key": API_KEY }
  });
  const data = await res.json();

  const tools = data.conversation_config?.agent?.prompt?.tools || [];
  let fixCount = 0;

  // Fix URLs and strip stale IDs
  const cleanTools = tools.map(tool => {
    const clean = stripToolIds(tool);
    const url = clean.api_schema?.url || "";
    if (url.includes(OLD_HOST)) {
      clean.api_schema.url = url.replace(OLD_HOST, NEW_HOST);
      console.log(`  Fixed: ${clean.name} -> ${clean.api_schema.url}`);
      fixCount++;
    }
    return clean;
  });

  if (fixCount === 0) {
    console.log("  No fixes needed.");
    return 0;
  }

  // PATCH with clean tools (no tool_ids) and empty tool_ids array
  const patchBody = {
    conversation_config: {
      agent: {
        prompt: {
          tools: cleanTools,
          tool_ids: [],  // Clear stale workspace tool references
        }
      }
    }
  };

  console.log(`  Patching ${fixCount} tools...`);
  const patchRes = await fetch(`${AGENT_BASE}/${agent.id}`, {
    method: "PATCH",
    headers: {
      "xi-api-key": API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(patchBody),
  });

  if (!patchRes.ok) {
    const errBody = await patchRes.text();
    console.error(`  FAILED: ${patchRes.status} ${errBody.substring(0, 300)}`);
    return 0;
  }

  console.log(`  SUCCESS: ${fixCount} tools updated.`);
  return fixCount;
}

async function fixWebhook() {
  console.log(`\n${"=".repeat(60)}`);
  console.log("Setting post-call webhook");
  console.log("=".repeat(60));

  const webhookUrl = `https://${NEW_HOST}/functions/v1/elevenlabs-webhook`;

  // Check current settings first
  const getRes = await fetch("https://api.elevenlabs.io/v1/convai/settings", {
    headers: { "xi-api-key": API_KEY }
  });
  const current = await getRes.json();
  console.log("  Current init webhook:", current.conversation_initiation_client_data_webhook?.url || "NOT SET");
  console.log("  Current post-call:", current.webhook?.url || "NOT SET");

  // Set webhook
  const patchRes = await fetch("https://api.elevenlabs.io/v1/convai/settings", {
    method: "PATCH",
    headers: {
      "xi-api-key": API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      webhook: {
        url: webhookUrl,
        secret: "64239813d7204643a7c853d38d7492ac",
      }
    }),
  });

  if (!patchRes.ok) {
    const errBody = await patchRes.text();
    console.error(`  FAILED: ${patchRes.status} ${errBody.substring(0, 300)}`);
    return;
  }

  const result = await patchRes.json();
  console.log("  Result:", JSON.stringify(result.webhook || {}, null, 2));

  // Verify
  const verifyRes = await fetch("https://api.elevenlabs.io/v1/convai/settings", {
    headers: { "xi-api-key": API_KEY }
  });
  const verified = await verifyRes.json();
  console.log("  Verified post-call:", verified.webhook?.url || "STILL NOT SET");
}

async function main() {
  let totalFixed = 0;

  for (const agent of AGENTS) {
    try {
      totalFixed += await fixAgent(agent);
    } catch (err) {
      console.error(`  ERROR: ${err.message}`);
    }
  }

  await fixWebhook();

  // Final verification
  console.log(`\n${"=".repeat(60)}`);
  console.log("FINAL VERIFICATION");
  console.log("=".repeat(60));

  for (const agent of AGENTS) {
    const res = await fetch(`${AGENT_BASE}/${agent.id}`, {
      headers: { "xi-api-key": API_KEY }
    });
    const data = await res.json();
    const tools = data.conversation_config?.agent?.prompt?.tools || [];
    const oldCount = tools.filter(t => (t.api_schema?.url || "").includes(OLD_HOST)).length;
    const newCount = tools.filter(t => (t.api_schema?.url || "").includes(NEW_HOST)).length;
    const total = tools.length;
    console.log(`  ${agent.mode}: ${total} tools total, ${newCount} on NEW project, ${oldCount} on OLD`);
  }

  console.log(`\nTotal fixed: ${totalFixed}`);
}

main().catch(console.error);
