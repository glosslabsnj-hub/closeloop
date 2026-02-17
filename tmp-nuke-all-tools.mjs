/**
 * Delete ALL workspace tools and clear tool_ids from service agent
 */
const API_KEY = "sk_2b27cfbfbc65aab7bfff4e370c598be68abcbe515e488d68";
const BASE = "https://api.elevenlabs.io/v1/convai";
const SERVICE_AGENT = "agent_4701kg1vwhzqfxmvzh032nhvx434";

async function run() {
  // Step 1: Clear tool_ids from service agent
  console.log("1. Clearing tool_ids from service agent...");
  const clearRes = await fetch(`${BASE}/agents/${SERVICE_AGENT}`, {
    method: "PATCH",
    headers: { "xi-api-key": API_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ conversation_config: { agent: { prompt: { tool_ids: [] } } } }),
  });
  console.log(`   PATCH status: ${clearRes.status}`);

  // Step 2: List all workspace tools
  console.log("\n2. Listing all workspace tools...");
  const listRes = await fetch(`${BASE}/tools`, { headers: { "xi-api-key": API_KEY } });
  const data = await listRes.json();
  const tools = data.tools || data || [];
  console.log(`   Found ${tools.length} workspace tools`);

  // Step 3: Delete each one
  console.log("\n3. Deleting all workspace tools...");
  let deleted = 0, failed = 0;
  for (const t of tools) {
    const name = t.name || t.tool_config?.name || "?";
    const res = await fetch(`${BASE}/tools/${t.id}`, {
      method: "DELETE",
      headers: { "xi-api-key": API_KEY },
    });
    if (res.status === 204) {
      deleted++;
      console.log(`   Deleted: ${name} (${t.id})`);
    } else {
      failed++;
      console.log(`   FAILED (${res.status}): ${name} (${t.id})`);
    }
  }

  // Step 4: Verify
  console.log(`\n4. Results: ${deleted} deleted, ${failed} failed`);
  const verifyRes = await fetch(`${BASE}/tools`, { headers: { "xi-api-key": API_KEY } });
  const remaining = await verifyRes.json();
  const rem = remaining.tools || remaining || [];
  console.log(`   Remaining: ${rem.length} tools`);
  if (rem.length > 0) {
    rem.forEach(t => console.log(`     ${t.id} -> ${t.name || t.tool_config?.name}`));
  }

  console.log("\nDone.");
}

run().catch(e => { console.error("FATAL:", e); process.exit(1); });
