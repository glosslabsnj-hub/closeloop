/**
 * Verify all ElevenLabs agents match expected configuration
 */

const API_KEY = "sk_2b27cfbfbc65aab7bfff4e370c598be68abcbe515e488d68";
const BASE_API = "https://api.elevenlabs.io/v1/convai/agents";

const AGENTS = [
  { mode: "service",  id: "agent_4701kg1vwhzqfxmvzh032nhvx434", expectedTools: 8 },
  { mode: "dispatch", id: "agent_2601kghfpmckez3t2n6p7bmcpac4", expectedTools: 7 },
  { mode: "food",     id: "agent_6501kghfd7pcf5dte8k61wnn0m58", expectedTools: 6 },
  { mode: "medical",  id: "agent_1001kghfstqzfryadtx3kh9t4ye4", expectedTools: 5 },
  { mode: "general",  id: "agent_9601kghg3djcfbfvwxxfkrxqpmq9", expectedTools: 3 },
  { mode: "sales",    id: "agent_2301kh5ertzwfas9e9badpers2cf", expectedTools: 5 },
  { mode: "impound",  id: "agent_6301kgqscdvyek3a6wgegq8et167", expectedTools: 10 },
];

let allPass = true;

for (const { mode, id, expectedTools } of AGENTS) {
  console.log(`\n--- ${mode.toUpperCase()} (${id}) ---`);

  const res = await fetch(`${BASE_API}/${id}`, { headers: { "xi-api-key": API_KEY } });
  const data = await res.json();

  const agent = data.conversation_config?.agent || {};
  const tools = agent.prompt?.tools || [];
  const toolNames = tools.map(t => t.name);
  const firstMsg = agent.first_message || "";
  const prompt = agent.prompt?.prompt || "";
  const dvp = agent.dynamic_variables?.dynamic_variable_placeholders || {};
  const dvKeys = Object.keys(dvp);
  const dc = data.platform_settings?.data_collection || {};
  const dcKeys = Object.keys(dc);

  // Checks
  const checks = [];

  // 1. Tool count
  if (tools.length === expectedTools) {
    checks.push(`PASS: Tool count ${tools.length}/${expectedTools}`);
  } else {
    checks.push(`FAIL: Tool count ${tools.length}/${expectedTools}`);
    allPass = false;
  }

  // 2. Tool names (no hyphens)
  const hyphenated = toolNames.filter(n => n.includes("-"));
  if (hyphenated.length === 0) {
    checks.push("PASS: No hyphenated tool names");
  } else {
    checks.push(`FAIL: Hyphenated tools: ${hyphenated.join(", ")}`);
    allPass = false;
  }

  // 3. Medical should NOT have create_dispatch_job, SHOULD have create_booking
  if (mode === "medical") {
    if (toolNames.includes("create_dispatch_job")) {
      checks.push("FAIL: Medical has create_dispatch_job (should not)");
      allPass = false;
    } else {
      checks.push("PASS: Medical does NOT have create_dispatch_job");
    }
    if (toolNames.includes("create_booking")) {
      checks.push("PASS: Medical has create_booking");
    } else {
      checks.push("FAIL: Medical MISSING create_booking");
      allPass = false;
    }
  }

  // 4. First message spacing
  if (firstMsg.includes("calling{{")) {
    checks.push("FAIL: First message spacing bug (calling{{)");
    allPass = false;
  } else {
    checks.push("PASS: First message spacing OK");
  }

  // 5. System prompt has phone rules
  if (prompt.includes("HUMAN PHONE RULES")) {
    checks.push("PASS: System prompt has phone rules");
  } else {
    checks.push("FAIL: System prompt missing phone rules");
    allPass = false;
  }

  // 6. Dynamic variable garbage
  const garbageCount = dvKeys.filter(k => /^(LOOP|loop|lopp|yes)$/i.test(String(dvp[k]))).length;
  if (garbageCount === 0) {
    checks.push(`PASS: No garbage dynamic variables (${dvKeys.length} vars)`);
  } else {
    checks.push(`FAIL: ${garbageCount} garbage dynamic variables`);
    allPass = false;
  }

  // 7. Data collection fields exist (skip impound)
  if (mode !== "impound") {
    if (dcKeys.length > 0) {
      checks.push(`PASS: ${dcKeys.length} data collection fields`);
    } else {
      checks.push("FAIL: No data collection fields");
      allPass = false;
    }
  }

  // Print results
  console.log(`  Tools: ${JSON.stringify(toolNames)}`);
  console.log(`  First msg: "${firstMsg.substring(0, 70)}..."`);
  console.log(`  DC fields: ${JSON.stringify(dcKeys)}`);
  for (const check of checks) {
    const icon = check.startsWith("PASS") ? "  [OK]" : "  [!!]";
    console.log(`${icon} ${check}`);
  }
}

console.log("\n" + "=".repeat(60));
if (allPass) {
  console.log("ALL CHECKS PASSED");
} else {
  console.log("SOME CHECKS FAILED - review above");
}
console.log("=".repeat(60));
