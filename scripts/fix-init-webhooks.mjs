/**
 * Set conversation_initiation_client_data_webhook on all agents
 * This webhook fires when a call starts and provides dynamic variables
 * (tenant_id, business_name, hours, services, etc.)
 */

const API_KEY = "sk_2b27cfbfbc65aab7bfff4e370c598be68abcbe515e488d68";
const BASE = "https://api.elevenlabs.io/v1/convai";
const INIT_URL = "https://yltzlvzgwkidbeqaoevp.supabase.co/functions/v1/elevenlabs-init";

const AGENTS = [
  { mode: "service",  id: "agent_4701kg1vwhzqfxmvzh032nhvx434" },
  { mode: "dispatch", id: "agent_2601kghfpmckez3t2n6p7bmcpac4" },
  { mode: "impound",  id: "agent_6301kgqscdvyek3a6wgegq8et167" },
];

async function main() {
  console.log("Setting init webhook on all agents...\n");

  for (const agent of AGENTS) {
    console.log(`${agent.mode}: Patching...`);
    const res = await fetch(`${BASE}/agents/${agent.id}`, {
      method: "PATCH",
      headers: {
        "xi-api-key": API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        conversation_config: {
          conversation_initiation_client_data_webhook: {
            url: INIT_URL,
          },
        },
      }),
    });

    if (res.ok) {
      const data = await res.json();
      const url = data.conversation_config?.conversation_initiation_client_data_webhook?.url;
      console.log(`  OK: ${url}`);
    } else {
      const text = await res.text();
      console.log(`  FAILED (${res.status}): ${text.substring(0, 200)}`);
    }
  }

  // Also try setting at workspace level
  console.log("\nSetting workspace-level init webhook...");
  const wsRes = await fetch(`${BASE}/settings`, {
    method: "PATCH",
    headers: {
      "xi-api-key": API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      conversation_initiation_client_data_webhook: {
        url: INIT_URL,
      },
    }),
  });
  if (wsRes.ok) {
    const data = await wsRes.json();
    console.log(`  Workspace init: ${data.conversation_initiation_client_data_webhook?.url || "NOT SET"}`);
  } else {
    console.log(`  FAILED (${wsRes.status}): ${(await wsRes.text()).substring(0, 200)}`);
  }

  // Verify all agents
  console.log("\nVerification:");
  for (const agent of AGENTS) {
    const res = await fetch(`${BASE}/agents/${agent.id}`, {
      headers: { "xi-api-key": API_KEY }
    });
    const data = await res.json();
    const url = data.conversation_config?.conversation_initiation_client_data_webhook?.url || "NOT SET";
    console.log(`  ${agent.mode}: ${url}`);
  }
}

main().catch(console.error);
