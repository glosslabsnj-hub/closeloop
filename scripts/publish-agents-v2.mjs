/**
 * Try alternative publish endpoints for DISPATCH, SERVICE, and IMPOUND agents
 */

const ELEVENLABS_API_KEY = "sk_2b27cfbfbc65aab7bfff4e370c598be68abcbe515e488d68";

const AGENTS = [
  { name: "DISPATCH", id: "agent_2601kghfpmckez3t2n6p7bmcpac4" },
  { name: "SERVICE", id: "agent_4701kg1vwhzqfxmvzh032nhvx434" },
  { name: "IMPOUND", id: "agent_6301kgqscdvyek3a6wgegq8et167" },
];

console.log("=".repeat(80));
console.log("ATTEMPTING TO PUBLISH ALL 3 AGENTS - TRYING DIFFERENT ENDPOINTS");
console.log("=".repeat(80));
console.log("");

for (const agent of AGENTS) {
  console.log(`\n${"=".repeat(80)}`);
  console.log(`${agent.name} Agent`);
  console.log("=".repeat(80));

  // First, get the agent to find the branch_id
  const getRes = await fetch(
    `https://api.elevenlabs.io/v1/convai/agents/${agent.id}`,
    { headers: { "xi-api-key": ELEVENLABS_API_KEY } }
  );

  if (!getRes.ok) {
    console.error(`❌ Failed to get ${agent.name}:`, getRes.status);
    continue;
  }

  const agentData = await getRes.json();
  const branchId = agentData.branch_id;

  console.log(`Branch ID: ${branchId}`);
  console.log("");

  // Try different publish endpoints
  const endpoints = [
    // Original attempt
    {
      url: `https://api.elevenlabs.io/v1/convai/agents/${agent.id}/publish`,
      method: "POST",
      body: {}
    },
    // Try with branch
    {
      url: `https://api.elevenlabs.io/v1/convai/agents/${agent.id}/branches/${branchId}/publish`,
      method: "POST",
      body: {}
    },
    // Try commit
    {
      url: `https://api.elevenlabs.io/v1/convai/agents/${agent.id}/branches/${branchId}/commit`,
      method: "POST",
      body: {}
    },
    // Try deploy
    {
      url: `https://api.elevenlabs.io/v1/convai/agents/${agent.id}/deploy`,
      method: "POST",
      body: {}
    },
    // Try versions endpoint
    {
      url: `https://api.elevenlabs.io/v1/convai/agents/${agent.id}/versions`,
      method: "POST",
      body: {}
    },
    // Try PATCH on the agent itself (maybe that's how you "save")
    {
      url: `https://api.elevenlabs.io/v1/convai/agents/${agent.id}`,
      method: "PATCH",
      body: { version_comment: "Production deployment" }
    },
  ];

  for (const endpoint of endpoints) {
    console.log(`\nTrying: ${endpoint.method} ${endpoint.url.split("/").slice(-2).join("/")}`);

    const res = await fetch(endpoint.url, {
      method: endpoint.method,
      headers: {
        "xi-api-key": ELEVENLABS_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(endpoint.body),
    });

    console.log(`  Status: ${res.status}`);

    if (res.ok) {
      const data = await res.json();
      console.log(`  ✅ SUCCESS!`);
      console.log(`  Response:`, JSON.stringify(data, null, 2).substring(0, 300));

      // If this worked, break and move to next agent
      break;
    } else {
      const errorText = await res.text();
      console.log(`  ❌ Failed: ${errorText.substring(0, 100)}`);
    }
  }
}

console.log("\n" + "=".repeat(80));
console.log("ENDPOINT EXPLORATION COMPLETE");
console.log("=".repeat(80));
