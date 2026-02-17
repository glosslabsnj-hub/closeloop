const API_KEY = "sk_2b27cfbfbc65aab7bfff4e370c598be68abcbe515e488d68";
const BASE = "https://api.elevenlabs.io/v1/convai";
const SERVICE_AGENT = "agent_4701kg1vwhzqfxmvzh032nhvx434";
const GENERAL_AGENT = "agent_9601kghg3djcfbfvwxxfkrxqpmq9";

async function api(method, path, body) {
  const opts = { method, headers: { "xi-api-key": API_KEY } };
  if (body) {
    opts.headers["Content-Type"] = "application/json";
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(`${BASE}${path}`, opts);
  const text = await res.text();
  return { status: res.status, data: text ? JSON.parse(text) : null };
}

async function run() {
  // Step 1: List ALL workspace tools
  console.log("=== STEP 1: List all workspace tools ===");
  const { data: toolsData } = await api("GET", "/tools");
  const allTools = toolsData.tools || toolsData || [];
  console.log(`Total workspace tools: ${allTools.length}\n`);

  for (const t of allTools) {
    const name = t.name || t.tool_config?.name || "NO_NAME";
    console.log(`  ${t.id} -> ${name}`);
  }

  // Step 2: Get current tool_ids from both agents
  console.log("\n=== STEP 2: Check agent tool_ids ===");
  const { data: serviceAgent } = await api("GET", `/agents/${SERVICE_AGENT}`);
  const serviceToolIds = serviceAgent.conversation_config?.agent?.prompt?.tool_ids || [];
  console.log(`Service agent tool_ids: ${serviceToolIds.length}`);
  serviceToolIds.forEach(id => console.log(`  ${id}`));

  const { data: generalAgent } = await api("GET", `/agents/${GENERAL_AGENT}`);
  const generalToolIds = generalAgent.conversation_config?.agent?.prompt?.tool_ids || [];
  console.log(`General agent tool_ids: ${generalToolIds.length}`);
  generalToolIds.forEach(id => console.log(`  ${id}`));

  // Step 3: Clear tool_ids from service agent
  console.log("\n=== STEP 3: Clear service agent tool_ids ===");
  await api("PATCH", `/agents/${SERVICE_AGENT}`, {
    conversation_config: { agent: { prompt: { tool_ids: [] } } }
  });
  console.log("Cleared.");

  // Step 4: Delete ALL tools that are NOT assigned to the general agent
  const generalSet = new Set(generalToolIds);
  const toDelete = allTools.filter(t => !generalSet.has(t.id));
  const toKeep = allTools.filter(t => generalSet.has(t.id));

  console.log(`\n=== STEP 4: Delete ${toDelete.length} tools (keeping ${toKeep.length} general agent tools) ===`);
  for (const t of toDelete) {
    const name = t.name || t.tool_config?.name || "?";
    const { status } = await api("DELETE", `/tools/${t.id}`);
    console.log(`  DELETE ${t.id} (${name}) -> ${status}`);
  }

  // Step 5: Verify workspace is clean
  console.log("\n=== STEP 5: Verify workspace ===");
  const { data: remaining } = await api("GET", "/tools");
  const rem = remaining.tools || remaining || [];
  console.log(`Remaining tools: ${rem.length}`);
  rem.forEach(t => {
    const name = t.name || t.tool_config?.name || "?";
    console.log(`  ${t.id} -> ${name}`);
  });

  console.log("\n=== DONE - Workspace cleaned ===");
}

run().catch(e => { console.error("FATAL:", e.message); process.exit(1); });
