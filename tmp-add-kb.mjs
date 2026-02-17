/**
 * Add KB to service agent WITHOUT clearing tools.
 * We fetch the current tools array and re-send it along with the KB.
 */
const API_KEY = "sk_2b27cfbfbc65aab7bfff4e370c598be68abcbe515e488d68";
const BASE = "https://api.elevenlabs.io/v1/convai";
const AGENT_ID = "agent_4701kg1vwhzqfxmvzh032nhvx434";

async function run() {
  // Get current state
  const getRes = await fetch(`${BASE}/agents/${AGENT_ID}`, { headers: { "xi-api-key": API_KEY } });
  const current = await getRes.json();
  const prompt = current.conversation_config?.agent?.prompt || {};
  const currentTools = prompt.tools || [];
  const currentPrompt = prompt.prompt || "";

  console.log(`Current tools: ${currentTools.length}`);
  console.log(`Current prompt: ${currentPrompt.length} chars`);

  // PATCH with both tools AND knowledge_base
  const patch = {
    conversation_config: {
      agent: {
        prompt: {
          tools: currentTools,
          knowledge_base: [
            {
              type: "file",
              id: "Z41DPV66g3SM2i3saSqa",
              name: "Service Industry Expertise",
            },
          ],
        },
      },
    },
  };

  const patchRes = await fetch(`${BASE}/agents/${AGENT_ID}`, {
    method: "PATCH",
    headers: { "xi-api-key": API_KEY, "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  const result = await patchRes.json();
  const rp = result.conversation_config?.agent?.prompt || {};

  console.log("\nAfter patch:");
  console.log(`  Tools: ${(rp.tools || []).length}`);
  if ((rp.tools || []).length > 0) {
    rp.tools.forEach(t => console.log(`    ${t.name}`));
  }
  console.log(`  KB: ${JSON.stringify(rp.knowledge_base)}`);
  console.log(`  Prompt: ${(rp.prompt || "").length} chars`);

  const dvs = result.conversation_config?.agent?.dynamic_variables?.dynamic_variable_placeholders || {};
  const empty = Object.entries(dvs).filter(([k, v]) => v === "" || v === null || v === undefined);
  console.log(`  DVs: ${Object.keys(dvs).length} total, ${empty.length} empty`);
}

run().catch(e => { console.error("FATAL:", e); process.exit(1); });
