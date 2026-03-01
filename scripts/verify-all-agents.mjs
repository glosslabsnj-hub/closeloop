/**
 * Final verification of all ElevenLabs agents, tools, and webhook
 */

const API_KEY = "sk_2b27cfbfbc65aab7bfff4e370c598be68abcbe515e488d68";
const NEW_HOST = "yltzlvzgwkidbeqaoevp.supabase.co";
const OLD_HOST = "zsqfzluyylzmmjtfxwgr.supabase.co";

const AGENTS = [
  { mode: "service",  id: "agent_4701kg1vwhzqfxmvzh032nhvx434" },
  { mode: "dispatch", id: "agent_2601kghfpmckez3t2n6p7bmcpac4" },
  { mode: "impound",  id: "agent_6301kgqscdvyek3a6wgegq8et167" },
];

async function main() {
  console.log("=".repeat(60));
  console.log("FULL SYSTEM VERIFICATION");
  console.log("=".repeat(60));

  let allGood = true;

  for (const agent of AGENTS) {
    console.log(`\n--- ${agent.mode.toUpperCase()} AGENT ---`);
    const res = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${agent.id}`, {
      headers: { "xi-api-key": API_KEY }
    });
    const data = await res.json();

    const tools = data.conversation_config?.agent?.prompt?.tools || [];
    const toolIds = data.conversation_config?.agent?.prompt?.tool_ids || [];
    const firstMsg = data.conversation_config?.agent?.first_message || "";

    console.log(`  Tools: ${tools.length} (${toolIds.length} tool_ids)`);
    console.log(`  First message: "${firstMsg.substring(0, 60)}..."`);

    let oldUrls = 0, newUrls = 0, noUrl = 0;
    for (const t of tools) {
      const url = t.api_schema?.url || "";
      if (url.includes(OLD_HOST)) {
        oldUrls++;
        console.log(`  OLD URL: ${t.name} -> ${url}`);
        allGood = false;
      } else if (url.includes(NEW_HOST)) {
        newUrls++;
      } else {
        noUrl++;
      }
    }

    console.log(`  URL check: ${newUrls} NEW, ${oldUrls} OLD, ${noUrl} no-url (system tools)`);
    console.log(`  Tool names: ${tools.map(t => t.name).join(", ")}`);

    if (oldUrls > 0) {
      console.log(`  STATUS: BROKEN - ${oldUrls} tools still on dead project`);
    } else if (tools.length === 0 && toolIds.length === 0) {
      console.log(`  STATUS: WARNING - No tools at all`);
    } else {
      console.log(`  STATUS: OK`);
    }
  }

  // Check webhook
  console.log(`\n--- POST-CALL WEBHOOK ---`);
  const wsRes = await fetch("https://api.elevenlabs.io/v1/convai/settings", {
    headers: { "xi-api-key": API_KEY }
  });
  const settings = await wsRes.json();
  const webhookId = settings.webhooks?.post_call_webhook_id;
  console.log(`  Webhook ID: ${webhookId || "NOT SET"}`);
  console.log(`  Events: ${JSON.stringify(settings.webhooks?.events || [])}`);

  if (webhookId) {
    // Get webhook details
    const whRes = await fetch("https://api.elevenlabs.io/v1/workspace/webhooks", {
      headers: { "xi-api-key": API_KEY }
    });
    if (whRes.ok) {
      const whData = await whRes.json();
      const wh = (whData.webhooks || []).find(w => w.webhook_id === webhookId);
      if (wh) {
        console.log(`  URL: ${wh.webhook_url}`);
        console.log(`  Disabled: ${wh.is_disabled}`);
        if (wh.webhook_url.includes(NEW_HOST)) {
          console.log(`  STATUS: OK - points to NEW project`);
        } else {
          console.log(`  STATUS: BROKEN - wrong URL`);
          allGood = false;
        }
      }
    }
  } else {
    console.log(`  STATUS: BROKEN - no webhook assigned`);
    allGood = false;
  }

  // Check init webhook on each agent
  console.log(`\n--- INIT WEBHOOKS (per-agent) ---`);
  for (const agent of AGENTS) {
    const res = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${agent.id}`, {
      headers: { "xi-api-key": API_KEY }
    });
    const data = await res.json();
    const initWh = data.conversation_config?.conversation_initiation_client_data_webhook?.url || "NOT SET";
    console.log(`  ${agent.mode}: ${initWh}`);
    if (initWh.includes(OLD_HOST)) {
      console.log(`    BROKEN - points to OLD project`);
      allGood = false;
    } else if (initWh.includes(NEW_HOST)) {
      console.log(`    OK`);
    }
  }

  console.log(`\n${"=".repeat(60)}`);
  console.log(allGood ? "ALL SYSTEMS GO" : "ISSUES FOUND - see above");
  console.log("=".repeat(60));
}

main().catch(console.error);
