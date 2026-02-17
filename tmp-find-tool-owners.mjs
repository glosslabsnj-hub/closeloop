const API_KEY = "sk_2b27cfbfbc65aab7bfff4e370c598be68abcbe515e488d68";
const BASE = "https://api.elevenlabs.io/v1/convai";

const AGENTS = {
  service:  "agent_4701kg1vwhzqfxmvzh032nhvx434",
  general:  "agent_9601kghg3djcfbfvwxxfkrxqpmq9",
};

const STUBBORN = [
  "tool_3001khapzps8e22v53nneyzeq0hp",
  "tool_8701khapz0mhe9jvxgcfpxrnpzh4",
  "tool_3101kgqwdd7fea4bbc29xq93rkha",
  "tool_6301kgqwb2rqf9c8zjgjq2nzqpdd",
  "tool_2601kgqw7y0ve9h89vabt297ry0h",
  "tool_5101kgngvtv2ffxsnxfr1jd5qv2j",
  "tool_6101kgmevs5ce248r1kgj5d0skgh",
  "tool_2501kgme13e2fhmvad507ztr5ch4",
  "tool_3101kgj28s1afztv01vymwctamr1",
  "tool_7801kgj0n9mke7sbsaym23mfq6sa",
];

async function run() {
  // Check each known agent for these tool_ids
  for (const [mode, agentId] of Object.entries(AGENTS)) {
    const res = await fetch(`${BASE}/agents/${agentId}`, { headers: { "xi-api-key": API_KEY } });
    const data = await res.json();
    const toolIds = data.conversation_config?.agent?.prompt?.tool_ids || [];
    const inlineTools = data.conversation_config?.agent?.prompt?.tools || [];
    const matches = toolIds.filter(id => STUBBORN.includes(id));
    console.log(`${mode} (${agentId}):`);
    console.log(`  tool_ids: ${toolIds.length}, inline tools: ${inlineTools.length}`);
    if (matches.length > 0) {
      console.log(`  MATCHES STUBBORN: ${matches.length} -> ${JSON.stringify(matches)}`);
    }
  }

  // Also check the error detail when trying to delete
  console.log("\nChecking delete error for first stubborn tool...");
  const res = await fetch(`${BASE}/tools/${STUBBORN[0]}`, {
    method: "DELETE",
    headers: { "xi-api-key": API_KEY },
  });
  const body = await res.text();
  console.log(`Status: ${res.status}, Body: ${body}`);

  // Also list all agents to find any we don't know about
  console.log("\nListing all agents...");
  const agentsRes = await fetch(`${BASE}/agents`, { headers: { "xi-api-key": API_KEY } });
  const agentsData = await agentsRes.json();
  const agents = agentsData.agents || agentsData || [];
  console.log(`Total agents: ${agents.length}`);
  for (const a of agents) {
    console.log(`  ${a.agent_id || a.id} -> ${a.name || "unnamed"}`);
  }
}

run().catch(e => { console.error("FATAL:", e); process.exit(1); });
