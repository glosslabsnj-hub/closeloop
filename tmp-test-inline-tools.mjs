/**
 * Test: PATCH service agent with a single inline tool and check if it persists
 */
const API_KEY = "sk_2b27cfbfbc65aab7bfff4e370c598be68abcbe515e488d68";
const BASE = "https://api.elevenlabs.io/v1/convai";
const AGENT_ID = "agent_4701kg1vwhzqfxmvzh032nhvx434";
const SECRET_ID = "9G30VIglbkIoULRKR7xD";
const SUPABASE_URL = "https://zsqfzluyylzmmjtfxwgr.supabase.co/functions/v1";

async function run() {
  // Simple test tool
  const testTool = {
    type: "webhook",
    name: "create_callback",
    description: "Test tool - create a callback request.",
    response_timeout_secs: 20,
    api_schema: {
      url: `${SUPABASE_URL}/elevenlabs-create-callback`,
      method: "POST",
      request_headers: {
        "content-type": "application/json",
        "X-CL-Secret": { secret_id: SECRET_ID },
      },
      request_body_schema: {
        type: "object",
        properties: {
          reason: { type: "string", description: "Why callback needed" },
          customer_name: { type: "string", description: "Name" },
          tenant_id: { type: "string", dynamic_variable: "{{tenant_id}}" },
        },
        required: ["reason"],
      },
    },
  };

  const patch = {
    conversation_config: {
      agent: {
        prompt: {
          tools: [testTool],
        },
      },
    },
  };

  console.log("Sending PATCH with 1 inline tool...");
  console.log("Payload:", JSON.stringify(patch, null, 2).substring(0, 500));

  const res = await fetch(`${BASE}/agents/${AGENT_ID}`, {
    method: "PATCH",
    headers: { "xi-api-key": API_KEY, "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });

  const status = res.status;
  const body = await res.text();
  console.log(`\nPATCH response status: ${status}`);

  if (status !== 200) {
    console.log("ERROR body:", body.substring(0, 2000));
    return;
  }

  const result = JSON.parse(body);
  const rp = result.conversation_config?.agent?.prompt || {};
  console.log("Tools in response:", (rp.tools || []).length);
  if ((rp.tools || []).length > 0) {
    rp.tools.forEach(t => console.log(`  ${t.name} (type: ${t.type})`));
  } else {
    console.log("NO TOOLS IN RESPONSE");
  }
  console.log("tool_ids:", JSON.stringify(rp.tool_ids));

  // Re-fetch to confirm persistence
  console.log("\nRe-fetching agent...");
  const getRes = await fetch(`${BASE}/agents/${AGENT_ID}`, { headers: { "xi-api-key": API_KEY } });
  const getData = await getRes.json();
  const gp = getData.conversation_config?.agent?.prompt || {};
  console.log("Tools after re-fetch:", (gp.tools || []).length);
  console.log("tool_ids after re-fetch:", JSON.stringify(gp.tool_ids));
}

run().catch(e => { console.error("FATAL:", e); process.exit(1); });
