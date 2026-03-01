/**
 * Fix ALL ElevenLabs agent inline tool URLs and workspace webhook.
 *
 * Problem: All tool URLs point to OLD dead Supabase project.
 * Fix: PATCH each agent's conversation_config to update tool URLs.
 * Also: Set the post-call webhook (currently NOT SET).
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

async function fixAgent(agent) {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`Fixing ${agent.mode.toUpperCase()} agent (${agent.id})`);
  console.log("=".repeat(60));

  // Fetch current config
  const res = await fetch(`${AGENT_BASE}/${agent.id}`, {
    headers: { "xi-api-key": API_KEY }
  });
  if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
  const data = await res.json();

  const tools = data.conversation_config?.agent?.prompt?.tools || [];
  let fixCount = 0;

  // Fix each tool's URL
  for (const tool of tools) {
    const url = tool.api_schema?.url || "";
    if (url.includes(OLD_HOST)) {
      tool.api_schema.url = url.replace(OLD_HOST, NEW_HOST);
      console.log(`  Fixed: ${tool.name}`);
      console.log(`    ${url}`);
      console.log(`    -> ${tool.api_schema.url}`);
      fixCount++;
    }
  }

  if (fixCount === 0) {
    console.log("  No fixes needed.");
    return 0;
  }

  // PATCH the agent with updated tools
  const patchBody = {
    conversation_config: {
      agent: {
        prompt: {
          tools: tools
        }
      }
    }
  };

  console.log(`\n  Patching agent with ${fixCount} fixed tools...`);
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
    console.error(`  PATCH FAILED: ${patchRes.status} ${errBody.substring(0, 500)}`);
    return 0;
  }

  console.log(`  SUCCESS: ${fixCount} tools updated.`);
  return fixCount;
}

async function fixPostCallWebhook() {
  console.log(`\n${"=".repeat(60)}`);
  console.log("Fixing workspace post-call webhook");
  console.log("=".repeat(60));

  const webhookUrl = `https://${NEW_HOST}/functions/v1/elevenlabs-webhook`;

  // Use the workspace settings endpoint
  const res = await fetch("https://api.elevenlabs.io/v1/convai/settings", {
    method: "PATCH",
    headers: {
      "xi-api-key": API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      webhook: {
        url: webhookUrl,
        secret: process.env.ELEVENLABS_WEBHOOK_SECRET || "64239813d7204643a7c853d38d7492ac",
      }
    }),
  });

  if (!res.ok) {
    const errBody = await res.text();
    console.error(`  WEBHOOK PATCH FAILED: ${res.status} ${errBody.substring(0, 500)}`);
    return;
  }

  console.log(`  SUCCESS: Post-call webhook set to ${webhookUrl}`);
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

  // Fix the post-call webhook
  await fixPostCallWebhook();

  console.log(`\n${"=".repeat(60)}`);
  console.log(`DONE: Fixed ${totalFixed} tool URLs across ${AGENTS.length} agents`);
  console.log("=".repeat(60));

  // Verify
  console.log("\nVerifying...");
  for (const agent of AGENTS) {
    const res = await fetch(`${AGENT_BASE}/${agent.id}`, {
      headers: { "xi-api-key": API_KEY }
    });
    const data = await res.json();
    const tools = data.conversation_config?.agent?.prompt?.tools || [];
    const oldCount = tools.filter(t => (t.api_schema?.url || "").includes(OLD_HOST)).length;
    const newCount = tools.filter(t => (t.api_schema?.url || "").includes(NEW_HOST)).length;
    console.log(`  ${agent.mode}: ${newCount} tools on new project, ${oldCount} still on old`);
  }

  // Verify webhook
  const wsRes = await fetch("https://api.elevenlabs.io/v1/convai/settings", {
    headers: { "xi-api-key": API_KEY }
  });
  const wsData = await wsRes.json();
  console.log(`  Post-call webhook: ${wsData.webhook?.url || "NOT SET"}`);
}

main().catch(console.error);
