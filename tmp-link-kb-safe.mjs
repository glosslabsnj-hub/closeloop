/**
 * Link KB to agent while preserving tool_ids
 * Sends tool_ids + knowledge_base in the same prompt-level PATCH
 */
const API_KEY = "sk_2b27cfbfbc65aab7bfff4e370c598be68abcbe515e488d68";
const BASE = "https://api.elevenlabs.io/v1/convai";
const AGENT_ID = "agent_4701kg1vwhzqfxmvzh032nhvx434";
const KB_ID = "jDfDM18Sx7dNvLuv9evo";

const TOOL_IDS = [
  "tool_4501khb193jefada5rzay0r3vf37",
  "tool_4801khb195j9fzqv99hbs6jwbk0j",
  "tool_5901khb197fpezxthtx35dndsmjm",
  "tool_0501khb199cwfvb9c3ve0fpfggf7",
  "tool_2201khb19bceesqvt05c07ay6v1v",
  "tool_0801khb19cg0f5ft8bmf6cwm960t",
  "tool_8501khb19dnaee09mn262cyn3edy",
  "tool_0501khb19fn4e1gbntxed26nszk7",
  "tool_4201khb19hkxerb8t7mr0tq15c0r",
  "tool_7701khb19kk1ecatyvg4gqm5612z",
];

async function run() {
  const patch = {
    conversation_config: {
      agent: {
        prompt: {
          tool_ids: TOOL_IDS,
          knowledge_base: [
            {
              type: "file",
              id: KB_ID,
              name: "Service Industry Expertise",
            },
          ],
        },
      },
    },
  };

  console.log("PATCHing agent with tool_ids + KB...");
  const res = await fetch(`${BASE}/agents/${AGENT_ID}`, {
    method: "PATCH",
    headers: { "xi-api-key": API_KEY, "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  const result = await res.json();
  const p = result.conversation_config?.agent?.prompt || {};

  console.log("Status:", res.status);
  console.log("Tools resolved:", (p.tools || []).length);
  if ((p.tools || []).length > 0) {
    p.tools.forEach(t => console.log("  " + t.name));
  }
  console.log("tool_ids:", (p.tool_ids || []).length);
  console.log("KB:", JSON.stringify(p.knowledge_base));
  console.log("Prompt:", (p.prompt || "").length, "chars");

  const dvs = result.conversation_config?.agent?.dynamic_variables?.dynamic_variable_placeholders || {};
  const empty = Object.entries(dvs).filter(([k, v]) => v === "" || v === null);
  console.log("DVs:", Object.keys(dvs).length, "total,", empty.length, "empty");
}

run().catch(e => { console.error("FATAL:", e); process.exit(1); });
