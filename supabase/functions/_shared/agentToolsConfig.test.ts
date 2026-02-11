/**
 * Test/verification script for agent tools configuration
 *
 * Run with: deno run --allow-read agentToolsConfig.test.ts
 */

import {
  AGENT_TOOLS_REGISTRY,
  getAgentToolsConfig,
  getToolNamesForMode,
  isToolValidForMode,
  getAgentsSummary,
  getElevenLabsToolsForMode,
  type AgentToolsConfig,
} from "./agentToolsConfig.ts";
import type { BusinessMode } from "./agentResolver.ts";

// ============= VERIFICATION TESTS =============

console.log("=".repeat(60));
console.log("ELEVENLABS AGENT TOOLS CONFIGURATION VERIFICATION");
console.log("=".repeat(60));
console.log("");

// Test 1: Verify all modes are registered
const expectedModes: BusinessMode[] = ["service", "dispatch", "food", "medical", "general", "sales"];
const registeredModes = Object.keys(AGENT_TOOLS_REGISTRY);

console.log("1. Mode Registration Check:");
for (const mode of expectedModes) {
  const isRegistered = registeredModes.includes(mode);
  console.log(`   ${isRegistered ? "✓" : "✗"} ${mode}: ${isRegistered ? "registered" : "MISSING"}`);
}
console.log("");

// Test 2: Verify tool counts per mode
console.log("2. Tool Count Verification:");
const expectedToolCounts: Record<BusinessMode, number> = {
  service: 8,
  dispatch: 7,
  food: 6,
  medical: 5,
  general: 3,
  sales: 5,
};

for (const [mode, expectedCount] of Object.entries(expectedToolCounts)) {
  const config = getAgentToolsConfig(mode as BusinessMode);
  const actualCount = config.tools.length;
  const match = actualCount === expectedCount;
  console.log(`   ${match ? "✓" : "✗"} ${mode}: expected ${expectedCount}, got ${actualCount}`);
}
console.log("");

// Test 3: Verify expected tools per mode
console.log("3. Tool Presence Verification:");
const expectedToolsPerMode: Record<BusinessMode, string[]> = {
  service: ["check_availability", "suggest_availability", "create_booking", "check_service_area", "create_dispatch_job", "create_callback", "cancel_booking", "add_to_waitlist"],
  dispatch: ["check_availability", "suggest_availability", "create_booking", "check_service_area", "create_dispatch_job", "lookup_dispatch_status", "create_callback"],
  food: ["check_availability", "suggest_availability", "create_booking", "check_service_area", "create_dispatch_job", "create_callback"],
  medical: ["check_availability", "suggest_availability", "create_booking", "check_service_area", "create_callback"],
  general: ["suggest_availability", "check_service_area", "create_callback"],
  sales: ["check_availability", "suggest_availability", "create_booking", "check_service_area", "create_callback"],
};

for (const [mode, expectedTools] of Object.entries(expectedToolsPerMode)) {
  const actualTools = getToolNamesForMode(mode as BusinessMode);
  const allPresent = expectedTools.every(t => actualTools.includes(t));
  const noExtras = actualTools.every(t => expectedTools.includes(t));
  console.log(`   ${allPresent && noExtras ? "✓" : "✗"} ${mode}:`);
  console.log(`      Expected: [${expectedTools.join(", ")}]`);
  console.log(`      Actual:   [${actualTools.join(", ")}]`);
  if (!allPresent) {
    const missing = expectedTools.filter(t => !actualTools.includes(t));
    console.log(`      MISSING: [${missing.join(", ")}]`);
  }
  if (!noExtras) {
    const extras = actualTools.filter(t => !expectedTools.includes(t));
    console.log(`      EXTRA: [${extras.join(", ")}]`);
  }
}
console.log("");

// Test 4: Verify tool validation function
console.log("4. Tool Validation Function:");
console.log(`   ✓ isToolValidForMode("create_dispatch_job", "service"): ${isToolValidForMode("create_dispatch_job", "service")}`);
console.log(`   ✓ isToolValidForMode("create_dispatch_job", "medical"): ${isToolValidForMode("create_dispatch_job", "medical")} (should be false)`);
console.log(`   ✓ isToolValidForMode("check_availability", "general"): ${isToolValidForMode("check_availability", "general")} (should be false)`);
console.log("");

// Test 5: Verify required parameters
console.log("5. Required Parameter Verification:");
for (const mode of expectedModes) {
  const config = getAgentToolsConfig(mode);
  console.log(`   ${mode}:`);
  for (const tool of config.tools) {
    const requiredParams = tool.parameters.filter(p => p.required).map(p => p.name);
    console.log(`      ${tool.name}: [${requiredParams.join(", ")}]`);
  }
}
console.log("");

// Test 6: Print summary
console.log("6. Agent Summary:");
const summary = getAgentsSummary();
console.table(summary.map(s => ({
  Mode: s.mode,
  Name: s.name,
  Tools: s.toolCount,
  "Tool List": s.tools.join(", "),
})));
console.log("");

// Test 7: Show ElevenLabs API format for one tool
console.log("7. ElevenLabs API Format Sample (service/check_availability):");
const sampleTools = getElevenLabsToolsForMode("service");
const sampleTool = sampleTools.find(t => t.name === "check_availability");
console.log(JSON.stringify(sampleTool, null, 2));
console.log("");

console.log("=".repeat(60));
console.log("VERIFICATION COMPLETE");
console.log("=".repeat(60));
