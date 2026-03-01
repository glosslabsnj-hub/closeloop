/**
 * Deploy IMPOUND Agent tools v2
 *
 * Approach: Clear stale tool_ids first, then set inline tools.
 */

const API_KEY = "sk_2b27cfbfbc65aab7bfff4e370c598be68abcbe515e488d68";
const AGENT_ID = "agent_6301kgqscdvyek3a6wgegq8et167";
const BASE = "https://api.elevenlabs.io/v1/convai";
const SUPABASE_URL = "https://yltzlvzgwkidbeqaoevp.supabase.co";

async function main() {
  console.log("=== IMPOUND AGENT DEPLOY v2 ===\n");

  // Step 1: Clear stale tool_ids
  console.log("1. Clearing stale tool_ids...");
  let res = await fetch(`${BASE}/agents/${AGENT_ID}`, {
    method: "PATCH",
    headers: { "xi-api-key": API_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({
      conversation_config: { agent: { prompt: { tool_ids: [] } } }
    }),
  });
  if (res.ok) {
    console.log("   Cleared tool_ids.");
  } else {
    console.log(`   Clear failed: ${res.status} ${(await res.text()).substring(0, 200)}`);
  }

  // Step 2: Set inline tools (transfer_to_agent + 3 impound tools)
  console.log("\n2. Setting inline tools...");
  const tools = [
    {
      type: "system",
      name: "transfer_to_agent",
      description: "Transfer the caller to the dispatch/service agent when they need to arrange a tow, schedule a pickup, or speak with dispatch.",
      system_tool_type: "transfer_to_agent",
    },
    {
      type: "webhook",
      name: "check_impound",
      description: "Look up a vehicle in the impound lot by license plate, VIN, or description. Returns vehicle details, tow date, location, and fees if found.",
      api_schema: {
        url: `${SUPABASE_URL}/functions/v1/check-impound`,
        method: "POST",
        request_headers: { "content-type": "application/json" },
        request_body_schema: {
          type: "object",
          required: ["tenant_id"],
          properties: {
            tenant_id: { type: "string", description: "The tenant/business ID" },
            conversation_id: { type: "string", description: "Conversation tracking ID" },
            license_plate: { type: "string", description: "Vehicle license plate number" },
            license_plate_state: { type: "string", description: "State of the license plate (e.g., 'NJ', 'NY')" },
            vin: { type: "string", description: "Vehicle Identification Number" },
            vehicle_description: { type: "string", description: "Vehicle year/make/model/color" },
            towed_date: { type: "string", description: "Date towed in YYYY-MM-DD format" },
          },
        },
      },
    },
    {
      type: "webhook",
      name: "get_impound_lot_info",
      description: "Get impound lot hours, address, phone, and current open/closed status.",
      api_schema: {
        url: `${SUPABASE_URL}/functions/v1/get-impound-lot-info`,
        method: "POST",
        request_headers: { "content-type": "application/json" },
        request_body_schema: {
          type: "object",
          required: ["tenant_id"],
          properties: {
            tenant_id: { type: "string", description: "The tenant/business ID" },
            conversation_id: { type: "string", description: "Conversation tracking ID" },
          },
        },
      },
    },
    {
      type: "webhook",
      name: "get_impound_release_info",
      description: "Calculate total fees to release a vehicle and get release requirements. Use AFTER finding the vehicle with check_impound.",
      api_schema: {
        url: `${SUPABASE_URL}/functions/v1/get-impound-release-info`,
        method: "POST",
        request_headers: { "content-type": "application/json" },
        request_body_schema: {
          type: "object",
          required: ["tenant_id", "vehicle_id"],
          properties: {
            tenant_id: { type: "string", description: "The tenant/business ID" },
            conversation_id: { type: "string", description: "Conversation tracking ID" },
            vehicle_id: { type: "string", description: "Vehicle ID from check_impound" },
          },
        },
      },
    },
  ];

  res = await fetch(`${BASE}/agents/${AGENT_ID}`, {
    method: "PATCH",
    headers: { "xi-api-key": API_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({
      conversation_config: { agent: { prompt: { tools } } }
    }),
  });

  if (res.ok) {
    const data = await res.json();
    const agentTools = data.conversation_config?.agent?.prompt?.tools || [];
    console.log(`   SUCCESS: ${agentTools.length} tools set`);
    agentTools.forEach(t => console.log(`   - ${t.name} (${t.type})`));
  } else {
    console.log(`   FAILED: ${res.status} ${(await res.text()).substring(0, 300)}`);
  }

  // Verify
  console.log("\n3. Verifying...");
  res = await fetch(`${BASE}/agents/${AGENT_ID}`, {
    headers: { "xi-api-key": API_KEY },
  });
  const verify = await res.json();
  const vTools = verify.conversation_config?.agent?.prompt?.tools || [];
  const vIds = verify.conversation_config?.agent?.prompt?.tool_ids || [];
  console.log(`   Tools: ${vTools.length} inline, ${vIds.length} workspace`);
  vTools.forEach(t => {
    const url = t.api_schema?.url || "N/A";
    console.log(`   - ${t.name}: ${url.includes("yltzlvzgwkidbeqaoevp") ? "NEW" : url.substring(0, 50)}`);
  });

  console.log("\n=== DONE ===");
}

main().catch(console.error);
