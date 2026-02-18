/**
 * Inspect version structure to understand publish workflow
 */

const ELEVENLABS_API_KEY = "sk_2b27cfbfbc65aab7bfff4e370c598be68abcbe515e488d68";

const AGENTS = [
  { name: "IMPOUND", id: "agent_6301kgqscdvyek3a6wgegq8et167" }, // Focus on one agent first
];

console.log("=".repeat(80));
console.log("INSPECTING AGENT VERSION STRUCTURE");
console.log("=".repeat(80));
console.log("");

for (const agent of AGENTS) {
  console.log(`\n${agent.name} Agent (${agent.id})`);
  console.log("─".repeat(80));

  // Get agent details
  const agentRes = await fetch(
    `https://api.elevenlabs.io/v1/convai/agents/${agent.id}`,
    { headers: { "xi-api-key": ELEVENLABS_API_KEY } }
  );

  const agentData = await agentRes.json();

  console.log(`\nAgent top-level fields:`);
  console.log(`  version_id: ${agentData.version_id}`);
  console.log(`  branch_id: ${agentData.branch_id}`);
  console.log(`  main_branch_id: ${agentData.main_branch_id}`);

  // Get branch details
  const branchRes = await fetch(
    `https://api.elevenlabs.io/v1/convai/agents/${agent.id}/branches/${agentData.branch_id}`,
    { headers: { "xi-api-key": ELEVENLABS_API_KEY } }
  );

  const branchData = await branchRes.json();

  console.log(`\nBranch details:`);
  console.log(`  name: ${branchData.name}`);
  console.log(`  last_committed_at: ${branchData.last_committed_at}`);
  console.log(`  current_live_percentage: ${branchData.current_live_percentage}`);
  console.log(`  has_unpublished_changes: ${branchData.has_unpublished_changes}`);

  if (branchData.most_recent_versions) {
    console.log(`\nMost recent versions (${branchData.most_recent_versions.length}):`);
    branchData.most_recent_versions.slice(0, 3).forEach((v, i) => {
      console.log(`  ${i + 1}. ${v.id || v.version_id} - ${v.name || "Unnamed"} - ${v.created_at || "N/A"}`);
    });
  }

  // Try to list all versions
  console.log(`\nAttempting to list all versions...`);

  const listEndpoints = [
    `https://api.elevenlabs.io/v1/convai/agents/${agent.id}/versions`,
    `https://api.elevenlabs.io/v1/convai/agents/${agent.id}/branches/${agentData.branch_id}/versions`,
  ];

  for (const endpoint of listEndpoints) {
    console.log(`\n  Trying: ${endpoint.split("/").slice(-3).join("/")}`);
    const res = await fetch(endpoint, {
      headers: { "xi-api-key": ELEVENLABS_API_KEY }
    });

    console.log(`  Status: ${res.status}`);

    if (res.ok) {
      const data = await res.json();
      console.log(`  ✅ Success!`);
      console.log(`  Response:`, JSON.stringify(data, null, 2).substring(0, 500));
    }
  }

  // Check if there's a "commit" concept
  console.log(`\n\nAttempting to find commit endpoints...`);

  const commitEndpoints = [
    { method: "GET", url: `https://api.elevenlabs.io/v1/convai/agents/${agent.id}/commits` },
    { method: "GET", url: `https://api.elevenlabs.io/v1/convai/agents/${agent.id}/branches/${agentData.branch_id}/commits` },
    { method: "POST", url: `https://api.elevenlabs.io/v1/convai/agents/${agent.id}/commit`, body: {} },
    { method: "POST", url: `https://api.elevenlabs.io/v1/convai/agents/${agent.id}/branches/${agentData.branch_id}/save`, body: {} },
  ];

  for (const endpoint of commitEndpoints) {
    console.log(`\n  ${endpoint.method} ${endpoint.url.split("/").slice(-3).join("/")}`);
    const res = await fetch(endpoint.url, {
      method: endpoint.method,
      headers: {
        "xi-api-key": ELEVENLABS_API_KEY,
        "Content-Type": "application/json"
      },
      ...(endpoint.body ? { body: JSON.stringify(endpoint.body) } : {})
    });

    console.log(`  Status: ${res.status}`);

    if (res.ok) {
      const data = await res.json();
      console.log(`  ✅ Found working endpoint!`);
      console.log(`  Response:`, JSON.stringify(data, null, 2).substring(0, 400));
    }
  }
}

console.log("\n" + "=".repeat(80));
console.log("INSPECTION COMPLETE");
console.log("=".repeat(80));
