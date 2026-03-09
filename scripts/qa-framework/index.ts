#!/usr/bin/env npx tsx
/**
 * QA Framework - Main Entry Point
 *
 * Usage:
 *   npx tsx scripts/qa-framework/index.ts                    # Run all suites, all businesses
 *   npx tsx scripts/qa-framework/index.ts --suite booking    # Run booking suite only
 *   npx tsx scripts/qa-framework/index.ts --biz solo-hvac    # Run all suites for one business
 *   npx tsx scripts/qa-framework/index.ts --mode service     # Run for service-mode businesses only
 *   npx tsx scripts/qa-framework/index.ts --p0               # Run P0 tests only
 *   npx tsx scripts/qa-framework/index.ts --cleanup          # Clean up all test tenants
 *   npx tsx scripts/qa-framework/index.ts --list             # List all tests
 */
import { runFullSuite } from "./core/runner.js";
import { cleanupAllTestTenants } from "./core/test-tenant.js";
import { ALL_BUSINESSES, SERVICE_BUSINESSES } from "./businesses/index.js";
import { bookingFlowSuite } from "./suites/booking-flow.js";
import { aiContextSuite } from "./suites/ai-context.js";
import { agreementsSuite } from "./suites/agreements.js";
import { dispatchFlowSuite } from "./suites/dispatch-flow.js";
import { leadsCustomersSuite } from "./suites/leads-customers.js";
import { estimatesFlowSuite } from "./suites/estimates-flow.js";
import { messagingSuite } from "./suites/messaging.js";
import { multiModeSuite } from "./suites/multi-mode.js";
import type { BusinessConfig, TestSuite, SuiteResult } from "./core/types.js";

const args = process.argv.slice(2);

// ── Parse CLI args ──────────────────────────────────────────────────

const suiteFilter = args.find(a => a.startsWith("--suite="))?.split("=")[1]
  || (args.includes("--suite") ? args[args.indexOf("--suite") + 1] : null);

const bizFilter = args.find(a => a.startsWith("--biz="))?.split("=")[1]
  || (args.includes("--biz") ? args[args.indexOf("--biz") + 1] : null);

const modeFilter = args.find(a => a.startsWith("--mode="))?.split("=")[1]
  || (args.includes("--mode") ? args[args.indexOf("--mode") + 1] : null);

const p0Only = args.includes("--p0");
const doCleanup = args.includes("--cleanup");
const doList = args.includes("--list");

// ── All Suites ──────────────────────────────────────────────────────

const ALL_SUITES: Record<string, TestSuite> = {
  booking: bookingFlowSuite,
  "ai-context": aiContextSuite,
  agreements: agreementsSuite,
  dispatch: dispatchFlowSuite,
  leads: leadsCustomersSuite,
  estimates: estimatesFlowSuite,
  messaging: messagingSuite,
  "multi-mode": multiModeSuite,
};

// ── Cleanup mode ────────────────────────────────────────────────────

if (doCleanup) {
  console.log("\nCleaning up all test tenants...");
  await cleanupAllTestTenants();
  console.log("Done.\n");
  process.exit(0);
}

// ── List mode ───────────────────────────────────────────────────────

if (doList) {
  console.log("\n=== QA Test Suites ===\n");
  for (const [key, suite] of Object.entries(ALL_SUITES)) {
    console.log(`Suite: ${suite.name} (--suite ${key})`);
    console.log(`  ${suite.description}`);
    for (const test of suite.tests) {
      const bizList = test.businesses.join(", ");
      console.log(`  [${test.priority.toUpperCase()}] ${test.id}: ${test.name}`);
      console.log(`         Businesses: ${bizList}${test.modes ? ` | Modes: ${test.modes.join(",")}` : ""}`);
    }
    console.log();
  }

  console.log("=== Business Configs ===\n");
  for (const biz of ALL_BUSINESSES) {
    console.log(`  ${biz.slug}: ${biz.name} (${biz.mode}/${biz.size}) - ${biz.services.length} services`);
  }
  console.log();
  process.exit(0);
}

// ── Run Tests ───────────────────────────────────────────────────────

// Filter suites
let suites = Object.entries(ALL_SUITES);
if (suiteFilter) {
  suites = suites.filter(([key]) => key === suiteFilter);
  if (suites.length === 0) {
    console.error(`Unknown suite: ${suiteFilter}. Available: ${Object.keys(ALL_SUITES).join(", ")}`);
    process.exit(1);
  }
}

// Filter businesses
let businesses = [...ALL_BUSINESSES];
if (bizFilter) {
  businesses = businesses.filter(b => b.slug === bizFilter);
  if (businesses.length === 0) {
    console.error(`Unknown business: ${bizFilter}. Available: ${ALL_BUSINESSES.map(b => b.slug).join(", ")}`);
    process.exit(1);
  }
}
if (modeFilter) {
  businesses = businesses.filter(b => b.mode === modeFilter);
}

// Filter P0
if (p0Only) {
  for (const [, suite] of suites) {
    suite.tests = suite.tests.filter(t => t.priority === "p0");
  }
}

console.log(`\n╔${"═".repeat(58)}╗`);
console.log(`║  FLUX RECEPTIONIST QA FRAMEWORK                          ║`);
console.log(`║  Suites: ${suites.map(([k]) => k).join(", ").padEnd(47)}║`);
console.log(`║  Businesses: ${businesses.length} configured${" ".repeat(37 - String(businesses.length).length)}║`);
console.log(`╚${"═".repeat(58)}╝`);

const allResults: SuiteResult[] = [];

for (const [key, suite] of suites) {
  // Filter businesses by mode restrictions in tests
  const applicableBusinesses = businesses.filter(biz => {
    return suite.tests.some(t => {
      if (t.modes && !t.modes.includes(biz.mode)) return false;
      if (t.businesses.includes("*")) return true;
      return t.businesses.includes(biz.slug);
    });
  });

  if (applicableBusinesses.length === 0) {
    console.log(`\nSkipping suite "${suite.name}" — no applicable businesses`);
    continue;
  }

  const result = await runFullSuite(suite, applicableBusinesses);
  allResults.push(result);
}

// ── Final Summary ───────────────────────────────────────────────────

const totalPassed = allResults.reduce((s, r) => s + r.passed, 0);
const totalFailed = allResults.reduce((s, r) => s + r.failed, 0);
const totalTests = totalPassed + totalFailed;
const totalTime = allResults.reduce((s, r) => s + r.duration_ms, 0);

console.log(`\n╔${"═".repeat(58)}╗`);
console.log(`║  FINAL RESULTS                                           ║`);
console.log(`╠${"═".repeat(58)}╣`);
console.log(`║  Total: ${totalTests}  Passed: ${totalPassed}  Failed: ${totalFailed}${" ".repeat(Math.max(0, 34 - String(totalTests).length - String(totalPassed).length - String(totalFailed).length))}║`);
console.log(`║  Pass Rate: ${totalTests > 0 ? Math.round(totalPassed / totalTests * 100) : 0}%${" ".repeat(43)}║`);
console.log(`║  Duration: ${(totalTime / 1000).toFixed(1)}s${" ".repeat(Math.max(0, 44 - (totalTime / 1000).toFixed(1).length))}║`);
console.log(`╚${"═".repeat(58)}╝\n`);

// Exit with failure code if any tests failed
process.exit(totalFailed > 0 ? 1 : 0);
