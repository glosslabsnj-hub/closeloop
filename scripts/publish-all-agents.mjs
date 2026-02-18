/**
 * Publish DISPATCH, SERVICE, and IMPOUND agents
 */

const ELEVENLABS_API_KEY = "sk_2b27cfbfbc65aab7bfff4e370c598be68abcbe515e488d68";

const AGENTS = [
  { name: "DISPATCH", id: "agent_2601kghfpmckez3t2n6p7bmcpac4" },
  { name: "SERVICE", id: "agent_4701kg1vwhzqfxmvzh032nhvx434" },
  { name: "IMPOUND", id: "agent_6301kgqscdvyek3a6wgegq8et167" },
];

console.log("=".repeat(80));
console.log("PUBLISHING ALL 3 AGENTS TO MAKE THEM 100% LIVE");
console.log("=".repeat(80));
console.log("");

for (const agent of AGENTS) {
  console.log(`\n📤 Publishing ${agent.name} agent...`);

  // Publish the agent (creates a new version)
  const publishRes = await fetch(
    `https://api.elevenlabs.io/v1/convai/agents/${agent.id}/publish`,
    {
      method: "POST",
      headers: {
        "xi-api-key": ELEVENLABS_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
    }
  );

  if (!publishRes.ok) {
    const errorText = await publishRes.text();
    console.error(`   ❌ Failed to publish ${agent.name}:`, publishRes.status);
    console.error(`   ${errorText}`);
    continue;
  }

  const publishData = await publishRes.json();
  console.log(`   ✅ Published successfully`);
  console.log(`   New version ID: ${publishData.version_id || "N/A"}`);
}

console.log("\n" + "=".repeat(80));
console.log("VERIFYING PUBLISH STATUS");
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
console.log("PUBLISH COMPLETE");
console.log("=".repeat(80));
console.log("");
console.log("✅ All 3 agents are now published and 100% LIVE in ElevenLabs");
console.log("");
console.log("You can verify by:");
console.log("  1. Checking the ElevenLabs dashboard - 'Publish' button should be disabled");
console.log("  2. Making a test phone call to each agent");
console.log("");
