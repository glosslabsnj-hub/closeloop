/**
 * Inspect ALL workspace tools across all ElevenLabs agents
 */
const API_KEY = "sk_2b27cfbfbc65aab7bfff4e370c598be68abcbe515e488d68";
const TOOL_BASE = "https://api.elevenlabs.io/v1/convai/tools";

const ALL_TOOL_IDS = [
  // Service agent (10 tools)
  "tool_7701khba1zj2fkra7wfqergfkd1c",
  "tool_6001khba20qgf1vrnqffay24155g",
  "tool_6401khba21wwf49thjpw2h883ckc",
  "tool_2401khba23w3f17agnawxtzdjzjs",
  "tool_1901khba251cev39xpksedxqg7pj",
  "tool_2201khba270vervaczdn76rasyrz",
  "tool_3301khba280bemxt1fvpdt644vjf",
  "tool_9301khba2968eadb3h29rmqdbg3h",
  "tool_0301khba2bj6ferbnthhrdw6k0pa",
  "tool_3701khba2dgve3mrsn7sqx5bcmrs",
  // Dispatch agent (7 tools)
  "tool_2201khn8wpb4f4p8tsekkqtvms3d",
  "tool_5301khn8wr48efea68gqfxcd0xz8",
  "tool_7401khn8wswke1x9jxctwjvmsce0",
  "tool_7601khn8wxe0ewcasbt0td8284rg",
  "tool_6701khn8wxe0ewcasbt0td8284rg",
  "tool_3701khn8wz78fq5vce4dbmn8w8c8",
  "tool_9101khn8x10heba8yp20hz2fkf6d",
  // Impound agent (3 tools)
  "tool_3701khqcdqj1eswsptyd3gbdpe2r",
  "tool_7901khqcdr1gftharmfs3rnr7q6f",
  "tool_6801khqcdrgpf3dr4g5fhw7k09t2",
];

const unique = [...new Set(ALL_TOOL_IDS)];

async function main() {
  let oldCount = 0, newCount = 0, errorCount = 0;
  const toFix = [];

  for (const id of unique) {
    try {
      const res = await fetch(`${TOOL_BASE}/${id}`, {
        headers: { "xi-api-key": API_KEY }
      });
      if (res.status === 404) {
        console.log(`404 NOT FOUND: ${id}`);
        errorCount++;
        continue;
      }
      if (res.status !== 200) {
        console.log(`ERROR ${res.status}: ${id}`);
        errorCount++;
        continue;
      }
      const data = await res.json();
      const url = data.api_schema?.url || "N/A";
      let host = "OTHER";
      if (url.includes("zsqfzluyylzmmjtfxwgr")) host = "OLD";
      else if (url.includes("yltzlvzgwkidbeqaoevp")) host = "NEW";

      if (host === "OLD") {
        oldCount++;
        toFix.push({ id, name: data.name, url, schema: data.api_schema });
      }
      if (host === "NEW") newCount++;

      console.log(`${host} | ${data.name || "unnamed"} | ${url.substring(0, 90)}`);
    } catch (err) {
      console.log(`FETCH ERROR: ${id} - ${err.message}`);
      errorCount++;
    }
  }

  console.log(`\nSummary: ${oldCount} OLD, ${newCount} NEW, ${errorCount} errors, ${unique.length} total unique tools`);

  if (toFix.length > 0) {
    console.log(`\n${"=".repeat(60)}`);
    console.log(`FIXING ${toFix.length} tools with OLD URLs...`);
    console.log("=".repeat(60));

    let fixed = 0;
    for (const tool of toFix) {
      const newUrl = tool.url.replace("zsqfzluyylzmmjtfxwgr", "yltzlvzgwkidbeqaoevp");
      console.log(`\n  Fixing: ${tool.name} (${tool.id})`);
      console.log(`    ${tool.url}`);
      console.log(`    -> ${newUrl}`);

      const patchRes = await fetch(`${TOOL_BASE}/${tool.id}`, {
        method: "PATCH",
        headers: {
          "xi-api-key": API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          api_schema: {
            ...tool.schema,
            url: newUrl,
          }
        }),
      });

      if (patchRes.status === 200) {
        console.log(`    SUCCESS`);
        fixed++;
      } else {
        const errBody = await patchRes.text();
        console.log(`    FAILED (${patchRes.status}): ${errBody.substring(0, 200)}`);
      }
    }
    console.log(`\nFixed ${fixed}/${toFix.length} tools`);
  }

  // Now fix the webhook
  console.log(`\n${"=".repeat(60)}`);
  console.log("POST-CALL WEBHOOK");
  console.log("=".repeat(60));

  // Check current
  const settingsRes = await fetch("https://api.elevenlabs.io/v1/convai/settings", {
    headers: { "xi-api-key": API_KEY }
  });
  const settings = await settingsRes.json();
  console.log("  Current settings:", JSON.stringify(settings, null, 2));

  // Try setting the webhook
  const webhookUrl = "https://yltzlvzgwkidbeqaoevp.supabase.co/functions/v1/elevenlabs-webhook";
  const patchRes = await fetch("https://api.elevenlabs.io/v1/convai/settings", {
    method: "PATCH",
    headers: {
      "xi-api-key": API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      webhook: {
        url: webhookUrl,
        secret: "64239813d7204643a7c853d38d7492ac",
      }
    }),
  });
  console.log(`\n  Webhook PATCH status: ${patchRes.status}`);
  const patchBody = await patchRes.json();
  console.log("  Webhook PATCH response:", JSON.stringify(patchBody, null, 2));
}

main().catch(console.error);
