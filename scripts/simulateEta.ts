/**
 * ETA Simulator Test Script
 *
 * Tests the ETA estimator with scenarios for both Step 1 (baseline) and Step 2 (provider).
 *
 * Run with: npx tsx scripts/simulateEta.ts
 *
 * Step 1 Scenarios (baseline, no provider):
 * - Service mode, low busyness
 * - Dispatch mode, high busyness
 * - Food mode with job_type override
 * - Dispatch on holiday
 *
 * Step 2 Scenarios (provider-based):
 * - Dispatch route ETA with exact addresses
 * - Food delivery ETA with exact addresses
 * - Out-of-area (distance exceeds max radius)
 * - Vague address => blocked unless allow_vague_address_fallback true
 */

import { estimateEta, EtaPolicy, EtaInput, DEFAULT_ETA_POLICY } from "../src/lib/eta/estimateEta";
import {
  EtaPolicyExtended,
  EtaInputExtended,
  EtaResultExtended,
  isVagueAddress,
  computeEtaFromDuration,
} from "../src/lib/eta/estimateEtaWithProvider";

// ============================================================================
// Step 1: Baseline Test Policy Configuration
// ============================================================================

const testPolicyBaseline: EtaPolicy = {
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
// Step 2: Provider-Enhanced Test Policy
// ============================================================================

const testPolicyWithProvider: EtaPolicyExtended = {
  ...testPolicyBaseline,
  provider_enabled: true,
  max_service_radius_miles: 25,
  allow_vague_address_fallback: true,
  food_prep_minutes: 20,
  dispatch_response_minutes: 5,
  traffic_buffer_pct: 15,
};

// ============================================================================
// Step 1 Test Scenarios
// ============================================================================

interface Step1Scenario {
  name: string;
  description: string;
  input: EtaInput;
  expectedSource: "job_type" | "mode" | "default";
}

const step1Scenarios: Step1Scenario[] = [
  {
    name: "1.1: Service mode, low busyness",
    description: "A plumber booking during a quiet Tuesday afternoon",
    input: {
      business_mode: "service",
      manual_busyness_pct: 10,
      is_holiday: false,
    },
    expectedSource: "mode",
  },
  {
    name: "1.2: Dispatch mode, high busyness",
    description: "A tow truck dispatch during a busy Friday evening rush",
    input: {
      business_mode: "dispatch",
      manual_busyness_pct: 80,
      is_holiday: false,
    },
    expectedSource: "mode",
  },
  {
    name: "1.3: Food mode with job_type override",
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
    name: "1.4: Dispatch on holiday",
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
// Step 2 Test Scenarios (Simulated - no actual API calls)
// ============================================================================

interface Step2Scenario {
  name: string;
  description: string;
  input: EtaInputExtended;
  simulatedRouteResult?: {
    distance_miles: number;
    duration_minutes: number;
  };
  expectedStatus: "computed" | "fallback" | "out_of_area" | "blocked_missing_address";
}

const step2Scenarios: Step2Scenario[] = [
  {
    name: "2.1: Dispatch route ETA with exact addresses",
    description: "Battery jump with specific pickup and dropoff addresses",
    input: {
      business_mode: "dispatch",
      job_type: "battery_jump",
      manual_busyness_pct: 20,
      origin_address: "123 Main St, Denver, CO 80202",
      destination_address: "456 Oak Ave, Denver, CO 80203",
      tenant_id: "test-tenant-123",
    },
    simulatedRouteResult: {
      distance_miles: 5.2,
      duration_minutes: 12,
    },
    expectedStatus: "computed",
  },
  {
    name: "2.2: Food delivery ETA with exact addresses",
    description: "Pizza delivery with specific restaurant and customer addresses",
    input: {
      business_mode: "food",
      job_type: "pizza_delivery",
      manual_busyness_pct: 40,
      origin_address: "789 Pizza Lane, Denver, CO 80204",
      destination_address: "321 Customer Blvd, Denver, CO 80205",
      tenant_id: "test-tenant-123",
    },
    simulatedRouteResult: {
      distance_miles: 3.8,
      duration_minutes: 10,
    },
    expectedStatus: "computed",
  },
  {
    name: "2.3: Out-of-area (distance exceeds max radius)",
    description: "Tow request from outside service area",
    input: {
      business_mode: "dispatch",
      job_type: "tow",
      manual_busyness_pct: 10,
      origin_address: "123 Main St, Denver, CO 80202",
      destination_address: "999 Far Away Rd, Boulder, CO 80301",
      tenant_id: "test-tenant-123",
    },
    simulatedRouteResult: {
      distance_miles: 35.0, // Exceeds 25 mile max
      duration_minutes: 45,
    },
    expectedStatus: "out_of_area",
  },
  {
    name: "2.4: Vague address => fallback",
    description: "Customer gives vague location, fallback to baseline",
    input: {
      business_mode: "dispatch",
      job_type: "battery_jump",
      manual_busyness_pct: 20,
      origin_address: "123 Main St, Denver, CO 80202",
      destination_address: "somewhere near downtown",
      tenant_id: "test-tenant-123",
    },
    expectedStatus: "fallback",
  },
];

// ============================================================================
// Run Step 1 Tests (Baseline)
// ============================================================================

function runStep1Tests(): { passed: number; failed: number } {
  console.log("=".repeat(70));
  console.log("STEP 1: BASELINE ETA TESTS (No Provider)");
  console.log("=".repeat(70));
  console.log();

  console.log("Test Policy Configuration:");
  console.log("-".repeat(40));
  console.log(JSON.stringify(testPolicyBaseline, null, 2));
  console.log();

  let passed = 0;
  let failed = 0;

  for (const scenario of step1Scenarios) {
    console.log("=".repeat(70));
    console.log(`📋 ${scenario.name}`);
    console.log(`   ${scenario.description}`);
    console.log("-".repeat(40));
    console.log("Input:", JSON.stringify(scenario.input, null, 2));
    console.log();

    const result = estimateEta(testPolicyBaseline, scenario.input);

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

  return { passed, failed };
}

// ============================================================================
// Run Step 2 Tests (Provider - Simulated)
// ============================================================================

function runStep2Tests(): { passed: number; failed: number } {
  console.log("=".repeat(70));
  console.log("STEP 2: PROVIDER-ENHANCED ETA TESTS (Simulated)");
  console.log("=".repeat(70));
  console.log();

  console.log("Test Policy Configuration:");
  console.log("-".repeat(40));
  console.log(JSON.stringify(testPolicyWithProvider, null, 2));
  console.log();

  console.log("Note: These tests simulate the provider response.");
  console.log("      In production, the eta-route Edge Function calls Mapbox.");
  console.log();

  let passed = 0;
  let failed = 0;

  for (const scenario of step2Scenarios) {
    console.log("=".repeat(70));
    console.log(`📋 ${scenario.name}`);
    console.log(`   ${scenario.description}`);
    console.log("-".repeat(40));
    console.log("Input:");
    console.log(`   Business Mode: ${scenario.input.business_mode}`);
    console.log(`   Job Type: ${scenario.input.job_type || "(none)"}`);
    console.log(`   Busyness: ${scenario.input.manual_busyness_pct}%`);
    console.log(`   Origin: ${scenario.input.origin_address || "(none)"}`);
    console.log(`   Destination: ${scenario.input.destination_address || "(none)"}`);
    console.log();

    // Simulate the provider logic
    const destinationProvided = !!scenario.input.destination_address?.trim();
    const destinationVague = destinationProvided && isVagueAddress(scenario.input.destination_address!);

    console.log("Address Analysis:");
    console.log(`   Destination provided: ${destinationProvided}`);
    console.log(`   Destination vague: ${destinationVague}`);
    console.log();

    let simulatedStatus: string;
    let simulatedResult: any = {};

    if (!destinationProvided || destinationVague) {
      // Would fall back to baseline
      simulatedStatus = "fallback";
      const baselineResult = estimateEta(testPolicyBaseline, scenario.input);
      simulatedResult = {
        ...baselineResult,
        status: "fallback",
        provider: "none",
        confidence: "low",
      };
    } else if (scenario.simulatedRouteResult) {
      // Simulate route calculation
      const { distance_miles, duration_minutes } = scenario.simulatedRouteResult;

      // Check out-of-area
      if (testPolicyWithProvider.max_service_radius_miles &&
          distance_miles > testPolicyWithProvider.max_service_radius_miles) {
        simulatedStatus = "out_of_area";
        simulatedResult = {
          status: "out_of_area",
          distance_miles,
          duration_minutes,
          out_of_area_message: `Location is ${distance_miles.toFixed(1)} miles away, exceeds ${testPolicyWithProvider.max_service_radius_miles} mile service area.`,
        };
      } else {
        // Compute ETA from duration
        const range = computeEtaFromDuration(
          duration_minutes,
          testPolicyWithProvider,
          scenario.input.business_mode,
          scenario.input.manual_busyness_pct || 0
        );
        simulatedStatus = "computed";
        simulatedResult = {
          status: "computed",
          distance_miles,
          duration_minutes,
          min: range.min,
          max: range.max,
          spoken: `${range.min} to ${range.max} minutes`,
          provider: "mapbox",
          confidence: "high",
        };
      }
    } else {
      simulatedStatus = "fallback";
    }

    console.log("Simulated Result:");
    console.log(`   Status: ${simulatedStatus}`);
    if (simulatedResult.distance_miles !== undefined) {
      console.log(`   📏 Distance: ${simulatedResult.distance_miles.toFixed(1)} miles`);
    }
    if (simulatedResult.duration_minutes !== undefined) {
      console.log(`   🚗 Driving time: ${simulatedResult.duration_minutes} minutes`);
    }
    if (simulatedResult.min !== undefined) {
      console.log(`   ⏱️  ETA Range: ${simulatedResult.min} - ${simulatedResult.max} minutes`);
      console.log(`   🗣️  Spoken: "${simulatedResult.spoken}"`);
    }
    if (simulatedResult.out_of_area_message) {
      console.log(`   🚫 Out of Area: ${simulatedResult.out_of_area_message}`);
    }
    if (simulatedResult.provider) {
      console.log(`   📍 Provider: ${simulatedResult.provider}`);
    }
    console.log();

    // Validate expected status
    if (simulatedStatus === scenario.expectedStatus) {
      console.log(`   ✅ PASS: Status matches expected (${scenario.expectedStatus})`);
      passed++;
    } else {
      console.log(`   ❌ FAIL: Expected status "${scenario.expectedStatus}", got "${simulatedStatus}"`);
      failed++;
    }

    console.log();
  }

  return { passed, failed };
}

// ============================================================================
// Run All Tests
// ============================================================================

function runAllTests() {
  console.log();
  console.log("╔" + "═".repeat(68) + "╗");
  console.log("║" + " ".repeat(20) + "ETA SIMULATOR TEST SUITE" + " ".repeat(24) + "║");
  console.log("║" + " ".repeat(15) + "Step 1 (Baseline) + Step 2 (Provider)" + " ".repeat(15) + "║");
  console.log("╚" + "═".repeat(68) + "╝");
  console.log();

  const step1Results = runStep1Tests();
  const step2Results = runStep2Tests();

  const totalPassed = step1Results.passed + step2Results.passed;
  const totalFailed = step1Results.failed + step2Results.failed;

  // Summary
  console.log();
  console.log("╔" + "═".repeat(68) + "╗");
  console.log("║" + " ".repeat(25) + "TEST SUMMARY" + " ".repeat(31) + "║");
  console.log("╠" + "═".repeat(68) + "╣");
  console.log(`║  Step 1 (Baseline):  ${step1Results.passed} passed, ${step1Results.failed} failed` + " ".repeat(30) + "║");
  console.log(`║  Step 2 (Provider):  ${step2Results.passed} passed, ${step2Results.failed} failed` + " ".repeat(30) + "║");
  console.log("╠" + "═".repeat(68) + "╣");
  console.log(`║  TOTAL:              ${totalPassed} passed, ${totalFailed} failed` + " ".repeat(30) + "║");
  console.log("╚" + "═".repeat(68) + "╝");
  console.log();

  if (totalFailed === 0) {
    console.log("🎉 All tests passed!");
  } else {
    console.log("⚠️  Some tests failed. Please review the output above.");
    process.exit(1);
  }
}

// Run if executed directly
runAllTests();
