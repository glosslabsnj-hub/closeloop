/**
 * Try to activate agents to 100% live
 */

const ELEVENLABS_API_KEY = "sk_2b27cfbfbc65aab7bfff4e370c598be68abcbe515e488d68";

const AGENTS = [
  { name: "DISPATCH", id: "agent_2601kghfpmckez3t2n6p7bmcpac4" },
  { name: "SERVICE", id: "agent_4701kg1vwhzqfxmvzh032nhvx434" },
  { name: "IMPOUND", id: "agent_6301kgqscdvyek3a6wgegq8et167" },
];

console.log("=".repeat(80));
console.log("ACTIVATING AGENTS TO 100% LIVE");
console.log("=".repeat(80));
console.log("");

for (const agent of AGENTS) {
  console.log(`\n${agent.name} Agent`);

  // Get the agent
  const getRes = await fetch(
    `https://api.elevenlabs.io/v1/convai/agents/${agent.id}`,
    { headers: { "xi-api-key": ELEVENLABS_API_KEY } }
  );

  const agentData = await getRes.json();
  const branchId = agentData.branch_id;

  console.log(`Current live percentage: ${agentData.current_live_percentage || "unknown"}`);

  // Try to activate by patching branch with live percentage
  const activateRes = await fetch(
    `https://api.elevenlabs.io/v1/convai/agents/${agent.id}/branches/${branchId}`,
    {
      method: "PATCH",
      headers: {
        "xi-api-key": ELEVENLABS_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        current_live_percentage: 100
      }),
    }
  );

  console.log(`Activate status: ${activateRes.status}`);

  if (activateRes.ok) {
    const data = await activateRes.json();
    console.log(`✅ Updated`);
    console.log(`   current_live_percentage: ${data.current_live_percentage}`);
  } else {
    const errorText = await activateRes.text();
    console.log(`❌ Failed: ${errorText.substring(0, 150)}`);
  }

  // Try alternative: PATCH the agent directly
  console.log(`\nTrying to activate via agent PATCH...`);

  const agentActivateRes = await fetch(
    `https://api.elevenlabs.io/v1/convai/agents/${agent.id}`,
    {
      method: "PATCH",
      headers: {
        "xi-api-key": ELEVENLABS_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        is_active: true,
        status: "active"
      }),
    }
  );

  console.log(`Agent activate status: ${agentActivateRes.status}`);

  if (agentActivateRes.ok) {
    console.log(`✅ Agent activated`);
  } else {
    const errorText = await agentActivateRes.text();
    console.log(`❌ Failed: ${errorText.substring(0, 150)}`);
  }
}

console.log("\n" + "=".repeat(80));
console.log("VERIFYING ACTIVATION");
console.log("=".repeat(80));

await new Promise(resolve => setTimeout(resolve, 2000));

for (const agent of AGENTS) {
  const agentRes = await fetch(
    `https://api.elevenlabs.io/v1/convai/agents/${agent.id}`,
    { headers: { "xi-api-key": ELEVENLABS_API_KEY } }
  );

  const agentData = await agentRes.json();
  const branchId = agentData.branch_id;

  const branchRes = await fetch(
    `https://api.elevenlabs.io/v1/convai/agents/${agent.id}/branches/${branchId}`,
    { headers: { "xi-api-key": ELEVENLABS_API_KEY } }
  );

  const branchData = await branchRes.json();

  console.log(`\n${agent.name}:`);
  console.log(`  Live percentage: ${branchData.current_live_percentage}%`);
  console.log(`  Has unpublished changes: ${branchData.has_unpublished_changes !== false ? "YES" : "NO"}`);
  console.log(`  Status: ${branchData.current_live_percentage === 100 ? "✅ FULLY LIVE" : "⚠️  NOT FULLY LIVE"}`);
}

console.log("\n" + "=".repeat(80));
console.log("COMPLETE");
console.log("=".repeat(80));
