/**
 * Try to mark branches as published by PATCHing the branch directly
 */

const ELEVENLABS_API_KEY = "sk_2b27cfbfbc65aab7bfff4e370c598be68abcbe515e488d68";

const AGENTS = [
  { name: "DISPATCH", id: "agent_2601kghfpmckez3t2n6p7bmcpac4" },
  { name: "SERVICE", id: "agent_4701kg1vwhzqfxmvzh032nhvx434" },
  { name: "IMPOUND", id: "agent_6301kgqscdvyek3a6wgegq8et167" },
];

console.log("=".repeat(80));
console.log("TRYING TO MARK BRANCHES AS PUBLISHED");
console.log("=".repeat(80));
console.log("");

for (const agent of AGENTS) {
  console.log(`\n${agent.name} Agent`);

  // Get the agent to find the branch_id
  const getRes = await fetch(
    `https://api.elevenlabs.io/v1/convai/agents/${agent.id}`,
    { headers: { "xi-api-key": ELEVENLABS_API_KEY } }
  );

  const agentData = await getRes.json();
  const branchId = agentData.branch_id;

  console.log(`Branch ID: ${branchId}`);

  // Try PATCHing the branch with has_unpublished_changes: false
  const patchBranchRes = await fetch(
    `https://api.elevenlabs.io/v1/convai/agents/${agent.id}/branches/${branchId}`,
    {
      method: "PATCH",
      headers: {
        "xi-api-key": ELEVENLABS_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        has_unpublished_changes: false
      }),
    }
  );

  console.log(`PATCH branch status: ${patchBranchRes.status}`);

  if (patchBranchRes.ok) {
    const data = await patchBranchRes.json();
    console.log(`✅ Branch updated`);
    console.log(`   Response keys:`, Object.keys(data));
  } else {
    const errorText = await patchBranchRes.text();
    console.log(`❌ Failed: ${errorText.substring(0, 200)}`);
  }
}

console.log("\n" + "=".repeat(80));
console.log("VERIFYING STATUS");
console.log("=".repeat(80));

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

    console.log(`\n${agent.name}: ${hasChanges ? "⚠️  Still unpublished" : "✅ Published"}`);
  }
}
