/**
 * Check publish status of DISPATCH, SERVICE, and IMPOUND agents
 */

const ELEVENLABS_API_KEY = "sk_2b27cfbfbc65aab7bfff4e370c598be68abcbe515e488d68";

const AGENTS = [
  { name: "DISPATCH", id: "agent_2601kghfpmckez3t2n6p7bmcpac4" },
  { name: "SERVICE", id: "agent_4701kg1vwhzqfxmvzh032nhvx434" },
  { name: "IMPOUND", id: "agent_6301kgqscdvyek3a6wgegq8et167" },
];

console.log("=".repeat(80));
console.log("CHECKING PUBLISH STATUS FOR ALL 3 AGENTS");
console.log("=".repeat(80));
console.log("");

for (const agent of AGENTS) {
  console.log(`\n${"─".repeat(80)}`);
  console.log(`${agent.name} Agent (${agent.id})`);
  console.log("─".repeat(80));

  const res = await fetch(
    `https://api.elevenlabs.io/v1/convai/agents/${agent.id}`,
    { headers: { "xi-api-key": ELEVENLABS_API_KEY } }
  );

  if (!res.ok) {
    console.error(`❌ Failed to fetch ${agent.name}:`, res.status);
    continue;
  }

  const data = await res.json();

  // Check version info
  const versionId = data.version_id;
  const branchId = data.branch_id;
  const mainBranchId = data.main_branch_id;

  console.log(`Version ID:     ${versionId}`);
  console.log(`Branch ID:      ${branchId}`);
  console.log(`Main Branch ID: ${mainBranchId}`);
  console.log(`On Main Branch: ${branchId === mainBranchId ? "✅ YES" : "⚠️  NO"}`);

  // Check tools
  const tools = data.conversation_config?.agent?.prompt?.tools || [];
  const toolIds = data.conversation_config?.agent?.prompt?.tool_ids || [];
  const toolNames = tools.map(t => t.name);

  console.log(`\nTools Configuration:`);
  console.log(`  Inline tools:     ${tools.length} (${toolNames.join(", ") || "none"})`);
  console.log(`  Workspace tools:  ${toolIds.length} tool IDs`);
  console.log(`  Total tools:      ${tools.length + toolIds.length}`);

  // Try to check if there are unpublished changes
  // We need to check the branch status
  const branchRes = await fetch(
    `https://api.elevenlabs.io/v1/convai/agents/${agent.id}/branches/${branchId}`,
    { headers: { "xi-api-key": ELEVENLABS_API_KEY } }
  );

  if (branchRes.ok) {
    const branchData = await branchRes.json();
    console.log(`\nBranch Status:`);
    console.log(`  Name: ${branchData.name || "N/A"}`);
    console.log(`  Has unpublished changes: ${branchData.has_unpublished_changes !== false ? "⚠️  YES (needs publish)" : "✅ NO (fully published)"}`);
  } else {
    console.log(`\nBranch Status: Could not fetch (${branchRes.status})`);
  }
}

console.log("\n" + "=".repeat(80));
console.log("SUMMARY");
console.log("=".repeat(80));
console.log("");
console.log("Next Step: If any agent shows 'needs publish', run:");
console.log("  node scripts/publish-impound-agent.mjs");
console.log("");
