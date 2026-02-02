/**
 * ETA Simulator Test Script
 *
 * Tests the ETA estimator with 4 scenarios to validate the policy-based calculation.
 *
 * Run with: npx ts-node scripts/simulateEta.ts
 * Or: npx tsx scripts/simulateEta.ts
 */

import { estimateEta, EtaPolicy, EtaInput, DEFAULT_ETA_POLICY } from "../src/lib/eta/estimateEta";

// ============================================================================
// Test Policy Configuration
// ============================================================================

const testPolicy: EtaPolicy = {
  default_range_minutes: { min: 30, max: 60 },
  mode_overrides: {
    dispatch: {
      range_minutes: { min: 20, max: 45 },
    },
    food: {
      range_minutes: { min: 25, max: 40 },
    },
    service: {
      range_minutes: { min: 45, max: 90 },
    },
  },
  job_type_overrides: {
    pizza_delivery: {
      range_minutes: { min: 20, max: 35 },
    },
    battery_jump: {
      range_minutes: { min: 15, max: 30 },
    },
    tow: {
      range_minutes: { min: 30, max: 60 },
    },
  },
  busyness_buffer_pct: 15,
  holiday_buffer_pct: 10,
};

// ============================================================================
// Test Scenarios
// ============================================================================

interface TestScenario {
  name: string;
  description: string;
  input: EtaInput;
  expectedSource: "job_type" | "mode" | "default";
}

const scenarios: TestScenario[] = [
  {
    name: "Scenario 1: Service mode, low busyness",
    description: "A plumber booking during a quiet Tuesday afternoon",
    input: {
      business_mode: "service",
      manual_busyness_pct: 10,
      is_holiday: false,
    },
    expectedSource: "mode",
  },
  {
    name: "Scenario 2: Dispatch mode, high busyness",
    description: "A tow truck dispatch during a busy Friday evening rush",
    input: {
      business_mode: "dispatch",
      manual_busyness_pct: 80,
      is_holiday: false,
    },
    expectedSource: "mode",
  },
  {
    name: "Scenario 3: Food mode with job_type override",
    description: "A pizza delivery with specific job type override",
    input: {
      business_mode: "food",
      job_type: "pizza_delivery",
      manual_busyness_pct: 50,
      is_holiday: false,
    },
    expectedSource: "job_type",
  },
  {
    name: "Scenario 4: Dispatch on holiday",
    description: "A battery jump on Christmas Day",
    input: {
      business_mode: "dispatch",
      job_type: "battery_jump",
      manual_busyness_pct: 30,
      is_holiday: true,
    },
    expectedSource: "job_type",
  },
];

// ============================================================================
// Run Tests
// ============================================================================

function runTests() {
  console.log("=".repeat(70));
  console.log("ETA SIMULATOR TEST SUITE");
  console.log("=".repeat(70));
  console.log();

  console.log("Test Policy Configuration:");
  console.log("-".repeat(40));
  console.log(JSON.stringify(testPolicy, null, 2));
  console.log();

  let passed = 0;
  let failed = 0;

  for (const scenario of scenarios) {
    console.log("=".repeat(70));
    console.log(`📋 ${scenario.name}`);
    console.log(`   ${scenario.description}`);
    console.log("-".repeat(40));
    console.log("Input:", JSON.stringify(scenario.input, null, 2));
    console.log();

    const result = estimateEta(testPolicy, scenario.input);

    console.log("Result:");
    console.log(`   🗣️  Spoken: "${result.spoken}"`);
    console.log(`   ⏱️  Range: ${result.min} - ${result.max} minutes`);
    console.log(`   📍 Source: ${result.source}`);
    console.log();
    console.log("Calculation Notes:");
    for (const note of result.notes) {
      console.log(`   • ${note}`);
    }
    console.log();

    // Validate expected source
    if (result.source === scenario.expectedSource) {
      console.log(`   ✅ PASS: Source matches expected (${scenario.expectedSource})`);
      passed++;
    } else {
      console.log(`   ❌ FAIL: Expected source "${scenario.expectedSource}", got "${result.source}"`);
      failed++;
    }

    // Validate range is reasonable
    if (result.min > 0 && result.max > result.min && result.max < 180) {
      console.log(`   ✅ PASS: Range is reasonable (${result.min}-${result.max} min)`);
    } else {
      console.log(`   ⚠️  WARNING: Range may be unreasonable`);
    }

    console.log();
  }

  // Also test with default policy
  console.log("=".repeat(70));
  console.log("📋 Bonus: Test with DEFAULT_ETA_POLICY (no overrides)");
  console.log("-".repeat(40));

  const defaultResult = estimateEta(DEFAULT_ETA_POLICY, {
    business_mode: "general",
    manual_busyness_pct: 0,
    is_holiday: false,
  });

  console.log("Input: business_mode=general, busyness=0%, no holiday");
  console.log(`   🗣️  Spoken: "${defaultResult.spoken}"`);
  console.log(`   ⏱️  Range: ${defaultResult.min} - ${defaultResult.max} minutes`);
  console.log(`   📍 Source: ${defaultResult.source}`);
  console.log();

  if (defaultResult.source === "default") {
    console.log(`   ✅ PASS: Correctly uses default source`);
    passed++;
  } else {
    console.log(`   ❌ FAIL: Expected "default" source`);
    failed++;
  }

  // Summary
  console.log();
  console.log("=".repeat(70));
  console.log("TEST SUMMARY");
  console.log("=".repeat(70));
  console.log(`   Total: ${passed + failed}`);
  console.log(`   ✅ Passed: ${passed}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log();

  if (failed === 0) {
    console.log("🎉 All tests passed!");
  } else {
    console.log("⚠️  Some tests failed. Please review the output above.");
    process.exit(1);
  }
}

// Run if executed directly
runTests();
