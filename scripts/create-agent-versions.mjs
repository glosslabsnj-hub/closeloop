/**
 * Try to create new versions for all agents to publish changes
 */

const ELEVENLABS_API_KEY = "sk_2b27cfbfbc65aab7bfff4e370c598be68abcbe515e488d68";

const AGENTS = [
  { name: "DISPATCH", id: "agent_2601kghfpmckez3t2n6p7bmcpac4" },
  { name: "SERVICE", id: "agent_4701kg1vwhzqfxmvzh032nhvx434" },
  { name: "IMPOUND", id: "agent_6301kgqscdvyek3a6wgegq8et167" },
];

console.log("=".repeat(80));
console.log("CREATING NEW VERSIONS TO PUBLISH AGENT CHANGES");
console.log("=".repeat(80));
console.log("");

for (const agent of AGENTS) {
  console.log(`\n${"=".repeat(80)}`);
  console.log(`${agent.name} Agent`);
  console.log("=".repeat(80));

  // Get the agent to find the branch_id
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

  // Try to create a version from this branch
  const createVersionRes = await fetch(
    `https://api.elevenlabs.io/v1/convai/agents/${agent.id}/branches/${branchId}/create-version`,
    {
      method: "POST",
      headers: {
        "xi-api-key": ELEVENLABS_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        version_name: "Production deployment",
        description: "Automated deployment via API"
      }),
    }
  );

  console.log(`Create version status: ${createVersionRes.status}`);

  if (createVersionRes.ok) {
    const versionData = await createVersionRes.json();
    console.log(`✅ Version created successfully`);
    console.log(`   Version ID: ${versionData.version_id || versionData.id || "N/A"}`);
    console.log(`   Response:`, JSON.stringify(versionData, null, 2).substring(0, 300));
  } else {
    const errorText = await createVersionRes.text();
    console.log(`❌ Failed: ${errorText}`);

    // Try alternative: POST directly to versions endpoint
    console.log(`\nTrying alternative: POST to versions endpoint...`);

    const altRes = await fetch(
      `https://api.elevenlabs.io/v1/convai/agents/${agent.id}/versions/create`,
      {
        method: "POST",
        headers: {
          "xi-api-key": ELEVENLABS_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          branch_id: branchId,
          version_name: "Production deployment"
        }),
      }
    );

    console.log(`Alternative status: ${altRes.status}`);

    if (altRes.ok) {
      const altData = await altRes.json();
      console.log(`✅ Version created successfully (alternative method)`);
      console.log(`   Response:`, JSON.stringify(altData, null, 2).substring(0, 300));
    } else {
      const altError = await altRes.text();
      console.log(`❌ Alternative also failed: ${altError}`);
    }
  }
}

console.log("\n" + "=".repeat(80));
console.log("CHECKING PUBLISH STATUS AFTER VERSION CREATION");
console.log("=".repeat(80));

// Wait 2 seconds for changes to propagate
await new Promise(resolve => setTimeout(resolve, 2000));

for (const agent of AGENTS) {
  const res = await fetch(
    `https://api.elevenlabs.io/v1/convai/agents/${agent.id}`,
    { headers: { "xi-api-key": ELEVENLABS_API_KEY } }
  );

  const data = await res.json();
  const branchId = data.branch_id;

  const branchRes = await fetch(
    `https://api.elevenlabs.io/v1/convai/agents/${agent.id}/branches/${branchId}`,
    { headers: { "xi-api-key": ELEVENLABS_API_KEY } }
  );

  if (branchRes.ok) {
    const branchData = await branchRes.json();
    const hasChanges = branchData.has_unpublished_changes !== false;

    console.log(`\n${agent.name}:`);
    console.log(`  Status: ${hasChanges ? "⚠️  Still has unpublished changes" : "✅ Fully published and live"}`);
    console.log(`  Version: ${data.version_id}`);
  }
}

console.log("\n" + "=".repeat(80));
console.log("COMPLETE");
console.log("=".repeat(80));
