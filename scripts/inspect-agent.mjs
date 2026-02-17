/**
 * Deep inspect an agent's tools and dynamic variables
 */

const API_KEY = "sk_2b27cfbfbc65aab7bfff4e370c598be68abcbe515e488d68";
const BASE = "https://api.elevenlabs.io/v1/convai/agents";

const AGENTS = [
  { mode: "service",  id: "agent_4701kg1vwhzqfxmvzh032nhvx434" },
  { mode: "general",  id: "agent_9601kghg3djcfbfvwxxfkrxqpmq9" },
];

async function inspect(mode, id) {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`${mode.toUpperCase()} (${id})`);
  console.log("=".repeat(60));

  const res = await fetch(`${BASE}/${id}`, { headers: { "xi-api-key": API_KEY } });
  const data = await res.json();

  const agent = data.conversation_config?.agent || {};
  const tools = agent.prompt?.tools || [];
  const toolIds = agent.prompt?.tool_ids || [];
  const dvp = agent.dynamic_variables?.dynamic_variable_placeholders || {};
  const dvKeys = Object.keys(dvp);

  // Tools
  console.log(`\n--- TOOLS (${toolIds.length} ids, ${tools.length} resolved) ---`);
  for (const t of tools) {
    const cfg = t;
    const schema = cfg.api_schema || {};
    const props = schema.request_body_schema?.properties || {};
    const propNames = Object.keys(props);
    const url = schema.url || "NO URL";
    const headers = schema.request_headers || {};
    const hasAuth = Object.keys(headers).some(h => h.toLowerCase().includes("secret") || h.toLowerCase().includes("cl-secret"));
    console.log(`  ${cfg.name}:`);
    console.log(`    URL: ${url}`);
    console.log(`    Auth: ${hasAuth ? "YES" : "NO AUTH HEADER"}`);
    console.log(`    Params (${propNames.length}): ${JSON.stringify(propNames)}`);
  }

  // Dynamic variables
  console.log(`\n--- DYNAMIC VARIABLES (${dvKeys.length} total) ---`);
  let emptyCount = 0;
  let filledCount = 0;
  const emptyVars = [];
  for (const k of dvKeys) {
    const v = dvp[k];
    if (v === "" || v === null || v === undefined) {
      emptyCount++;
      emptyVars.push(k);
    } else {
      filledCount++;
    }
  }
  console.log(`  Filled: ${filledCount}`);
  console.log(`  Empty: ${emptyCount}`);

  if (emptyVars.length > 0) {
    console.log(`  Empty vars: ${JSON.stringify(emptyVars.slice(0, 30))}`);
    if (emptyVars.length > 30) console.log(`  ... and ${emptyVars.length - 30} more`);
  }

  // Show sample of filled vars
  console.log(`\n  Sample filled vars:`);
  let shown = 0;
  for (const k of dvKeys) {
    if (dvp[k] && dvp[k] !== "" && shown < 10) {
      console.log(`    ${k} = ${JSON.stringify(dvp[k]).substring(0, 80)}`);
      shown++;
    }
  }
}

async function run() {
  for (const a of AGENTS) {
    await inspect(a.mode, a.id);
  }
}

run();
