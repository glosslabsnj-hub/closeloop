const API_KEY = "sk_2b27cfbfbc65aab7bfff4e370c598be68abcbe515e488d68";
const BASE = "https://api.elevenlabs.io/v1/convai";

const ALL_AGENTS = [
  { name: "Sales",     id: "agent_2301kh5ertzwfas9e9badpers2cf" },
  { name: "Impound",   id: "agent_6301kgqscdvyek3a6wgegq8et167" },
  { name: "General",   id: "agent_9601kghg3djcfbfvwxxfkrxqpmq9" },
  { name: "Medical",   id: "agent_1001kghfstqzfryadtx3kh9t4ye4" },
  { name: "Dispatch",  id: "agent_2601kghfpmckez3t2n6p7bmcpac4" },
  { name: "Food",      id: "agent_6501kghfd7pcf5dte8k61wnn0m58" },
  { name: "Service",   id: "agent_4701kg1vwhzqfxmvzh032nhvx434" },
];

async function run() {
  // Step 1: Clear tool_ids from ALL agents (except inline tools which we preserve)
  console.log("=== STEP 1: Clear tool_ids from all agents ===\n");
  for (const agent of ALL_AGENTS) {
    const res = await fetch(`${BASE}/agents/${agent.id}`, { headers: { "xi-api-key": API_KEY } });
    const data = await res.json();
    const toolIds = data.conversation_config?.agent?.prompt?.tool_ids || [];

    if (toolIds.length > 0) {
      console.log(`${agent.name}: clearing ${toolIds.length} tool_ids...`);
      const patchRes = await fetch(`${BASE}/agents/${agent.id}`, {
        method: "PATCH",
        headers: { "xi-api-key": API_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({ conversation_config: { agent: { prompt: { tool_ids: [] } } } }),
      });
      console.log(`  PATCH: ${patchRes.status}`);
    } else {
      console.log(`${agent.name}: no tool_ids to clear`);
    }
  }

  // Step 2: Delete ALL workspace tools
  console.log("\n=== STEP 2: Delete all workspace tools ===\n");
  const listRes = await fetch(`${BASE}/tools`, { headers: { "xi-api-key": API_KEY } });
  const data = await listRes.json();
  const tools = data.tools || data || [];
  console.log(`Found ${tools.length} workspace tools\n`);

  let deleted = 0, failed = 0;
  for (const t of tools) {
    const name = t.name || t.tool_config?.name || "?";
    const res = await fetch(`${BASE}/tools/${t.id}`, {
      method: "DELETE",
      headers: { "xi-api-key": API_KEY },
    });
    if (res.status === 204) {
      deleted++;
      console.log(`  Deleted: ${name} (${t.id})`);
    } else {
      const body = await res.text();
      failed++;
      console.log(`  FAILED (${res.status}): ${name} (${t.id}) - ${body.substring(0, 100)}`);
    }
  }

  // Step 3: Verify
  console.log(`\n=== STEP 3: Verify ===`);
  console.log(`Deleted: ${deleted}, Failed: ${failed}`);
  const verifyRes = await fetch(`${BASE}/tools`, { headers: { "xi-api-key": API_KEY } });
  const remaining = await verifyRes.json();
  const rem = remaining.tools || remaining || [];
  console.log(`Remaining workspace tools: ${rem.length}`);
  if (rem.length > 0) {
    rem.forEach(t => console.log(`  ${t.id} -> ${t.name || t.tool_config?.name}`));
  }

  console.log("\nDone. Workspace should be clean.");
}

run().catch(e => { console.error("FATAL:", e); process.exit(1); });
