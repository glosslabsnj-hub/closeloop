/**
 * QA Test Runner
 * Executes test suites against configured business tenants.
 */
import type {
  TestSuite, TestCase, TestResult, StepResult, SuiteResult,
  TestContext, TestStep, FieldCheck, BusinessConfig,
} from "./types.js";
import { createTestTenant, cleanupTestTenant } from "./test-tenant.js";
import { callEdgeFunction, dbQuery, dbInsert, dbUpdate, dbDelete } from "./supabase-client.js";
import { MAX_PARALLEL_TESTS } from "./config.js";

// ── Run a Single Test ───────────────────────────────────────────────

async function runStep(step: TestStep, ctx: TestContext): Promise<StepResult> {
  const start = Date.now();
  try {
    let result: unknown;

    // Execute action
    switch (step.action.type) {
      case "call_edge_function": {
        const { function: fn, body } = step.action;
        // Inject tenant_id into body if not present
        const resolvedBody = resolveTemplates({ ...body, tenant_id: body.tenant_id || ctx.tenantId }, ctx);
        const res = await callEdgeFunction(fn, resolvedBody);
        result = res;

        // Check status
        if (step.expect.status && res.status !== step.expect.status) {
          return {
            name: step.name,
            passed: false,
            duration_ms: Date.now() - start,
            error: `Expected status ${step.expect.status}, got ${res.status}`,
            details: JSON.stringify(res.data).substring(0, 500),
          };
        }

        // Check body contains
        if (step.expect.bodyContains) {
          const errors = checkBodyContains(res.data, step.expect.bodyContains);
          if (errors.length > 0) {
            return {
              name: step.name,
              passed: false,
              duration_ms: Date.now() - start,
              error: errors.join("; "),
              details: JSON.stringify(res.data).substring(0, 500),
            };
          }
        }

        // Check body matches
        if (step.expect.bodyMatches && !step.expect.bodyMatches(res.data)) {
          return {
            name: step.name,
            passed: false,
            duration_ms: Date.now() - start,
            error: "Body does not match expected pattern",
            details: JSON.stringify(res.data).substring(0, 500),
          };
        }

        // Store result for later steps
        ctx.variables[`step_${step.name}`] = res.data;
        break;
      }

      case "query_db": {
        const filters = resolveTemplates(step.action.filters, ctx);
        const rows = await dbQuery(step.action.table, filters, step.action.select);
        result = rows;
        ctx.variables[`step_${step.name}`] = rows;
        break;
      }

      case "insert_db": {
        const data = resolveTemplates(step.action.data, ctx);
        const row = await dbInsert(step.action.table, data);
        result = row;
        ctx.createdRecords.push({ table: step.action.table, id: (row as any).id });
        ctx.variables[`step_${step.name}`] = row;
        break;
      }

      case "update_db": {
        const filters = resolveTemplates(step.action.filters, ctx);
        const data = resolveTemplates(step.action.data, ctx);
        result = await dbUpdate(step.action.table, filters, data);
        ctx.variables[`step_${step.name}`] = result;
        break;
      }

      case "delete_db": {
        const filters = resolveTemplates(step.action.filters, ctx);
        await dbDelete(step.action.table, filters);
        result = { deleted: true };
        break;
      }

      case "wait":
        await new Promise(r => setTimeout(r, step.action.ms));
        result = { waited: step.action.ms };
        break;

      case "custom":
        result = await step.action.fn(ctx);
        ctx.variables[`step_${step.name}`] = result;
        break;
    }

    // Check DB expectations
    if (step.expect.dbHasRow) {
      const { table, filters, fields } = step.expect.dbHasRow;
      const resolvedFilters = resolveTemplates(filters, ctx);
      const rows = await dbQuery(table, resolvedFilters);
      if (rows.length === 0) {
        return {
          name: step.name,
          passed: false,
          duration_ms: Date.now() - start,
          error: `Expected row in ${table} with ${JSON.stringify(resolvedFilters)} but found none`,
        };
      }
      if (fields) {
        const row = rows[0] as Record<string, unknown>;
        const fieldErrors = checkFields(row, fields);
        if (fieldErrors.length > 0) {
          return {
            name: step.name,
            passed: false,
            duration_ms: Date.now() - start,
            error: fieldErrors.join("; "),
            details: JSON.stringify(row).substring(0, 500),
          };
        }
      }
    }

    if (step.expect.dbNoRow) {
      const { table, filters } = step.expect.dbNoRow;
      const resolvedFilters = resolveTemplates(filters, ctx);
      const rows = await dbQuery(table, resolvedFilters);
      if (rows.length > 0) {
        return {
          name: step.name,
          passed: false,
          duration_ms: Date.now() - start,
          error: `Expected NO row in ${table} with ${JSON.stringify(resolvedFilters)} but found ${rows.length}`,
        };
      }
    }

    // Custom assertion
    if (step.expect.custom) {
      const check = step.expect.custom(result, ctx);
      if (check !== true) {
        return {
          name: step.name,
          passed: false,
          duration_ms: Date.now() - start,
          error: typeof check === "string" ? check : "Custom assertion failed",
        };
      }
    }

    return {
      name: step.name,
      passed: true,
      duration_ms: Date.now() - start,
    };
  } catch (err: any) {
    return {
      name: step.name,
      passed: false,
      duration_ms: Date.now() - start,
      error: err.message || String(err),
    };
  }
}

async function runTest(test: TestCase, ctx: TestContext): Promise<TestResult> {
  const start = Date.now();
  const steps: StepResult[] = [];

  for (const step of test.steps) {
    const result = await runStep(step, ctx);
    steps.push(result);

    // Stop on first failure (fail fast)
    if (!result.passed) break;
  }

  return {
    testId: test.id,
    testName: test.name,
    business: ctx.businessConfig.slug,
    passed: steps.every(s => s.passed),
    steps,
    duration_ms: Date.now() - start,
    error: steps.find(s => !s.passed)?.error,
  };
}

// ── Run Suite Against a Business ────────────────────────────────────

export async function runSuiteForBusiness(
  suite: TestSuite,
  config: BusinessConfig,
): Promise<TestResult[]> {
  console.log(`\n━━━ ${config.name} (${config.mode} / ${config.size}) ━━━`);
  const ctx = await createTestTenant(config);
  const results: TestResult[] = [];

  // Filter tests applicable to this business
  const applicableTests = suite.tests.filter(t => {
    if (t.businesses.includes("*")) return true;
    if (t.businesses.includes(config.slug)) return true;
    if (t.modes && !t.modes.includes(config.mode)) return false;
    return t.businesses.includes("*");
  });

  for (const test of applicableTests) {
    process.stdout.write(`  ${test.id}: ${test.name}...`);
    // Reset per-test state
    ctx.variables = {};
    ctx.createdRecords = [];

    const result = await runTest(test, ctx);
    results.push(result);

    if (result.passed) {
      console.log(` PASS (${result.duration_ms}ms)`);
    } else {
      console.log(` FAIL: ${result.error}`);
      for (const step of result.steps.filter(s => !s.passed)) {
        console.log(`    └─ Step "${step.name}": ${step.error}`);
        if (step.details) console.log(`       ${step.details.substring(0, 200)}`);
      }
    }

    // Cleanup test data between tests
    await cleanupTestTenant(ctx);
  }

  return results;
}

// ── Run Full Suite ──────────────────────────────────────────────────

export async function runFullSuite(
  suite: TestSuite,
  businesses: BusinessConfig[],
): Promise<SuiteResult> {
  const start = Date.now();
  console.log(`\n${"═".repeat(60)}`);
  console.log(`  QA SUITE: ${suite.name}`);
  console.log(`  ${suite.description}`);
  console.log(`  Businesses: ${businesses.map(b => b.slug).join(", ")}`);
  console.log(`${"═".repeat(60)}`);

  const allResults: TestResult[] = [];

  // Run sequentially per business (parallel within business causes data conflicts)
  for (const biz of businesses) {
    const results = await runSuiteForBusiness(suite, biz);
    allResults.push(...results);
  }

  // Build summary
  const byBusiness: Record<string, { total: number; passed: number; failed: number }> = {};
  const byPriority: Record<string, { total: number; passed: number; failed: number }> = {};

  for (const r of allResults) {
    // By business
    if (!byBusiness[r.business]) byBusiness[r.business] = { total: 0, passed: 0, failed: 0 };
    byBusiness[r.business].total++;
    if (r.passed) byBusiness[r.business].passed++;
    else byBusiness[r.business].failed++;

    // By priority (need to find the test)
    for (const biz of businesses) {
      const test = suite.tests.find(t => t.id === r.testId);
      if (test) {
        const p = test.priority;
        if (!byPriority[p]) byPriority[p] = { total: 0, passed: 0, failed: 0 };
        byPriority[p].total++;
        if (r.passed) byPriority[p].passed++;
        else byPriority[p].failed++;
        break;
      }
    }
  }

  const suiteResult: SuiteResult = {
    suiteName: suite.name,
    total: allResults.length,
    passed: allResults.filter(r => r.passed).length,
    failed: allResults.filter(r => !r.passed).length,
    skipped: 0,
    duration_ms: Date.now() - start,
    results: allResults,
    byBusiness,
    byPriority,
  };

  // Print summary
  console.log(`\n${"═".repeat(60)}`);
  console.log(`  RESULTS: ${suiteResult.passed}/${suiteResult.total} passed (${Math.round(suiteResult.passed / suiteResult.total * 100)}%)`);
  console.log(`  Duration: ${(suiteResult.duration_ms / 1000).toFixed(1)}s`);
  console.log(`${"─".repeat(60)}`);
  for (const [biz, stats] of Object.entries(byBusiness)) {
    const pct = Math.round(stats.passed / stats.total * 100);
    const icon = stats.failed === 0 ? "✓" : "✗";
    console.log(`  ${icon} ${biz}: ${stats.passed}/${stats.total} (${pct}%)`);
  }
  if (suiteResult.failed > 0) {
    console.log(`\n  FAILURES:`);
    for (const r of allResults.filter(r => !r.passed)) {
      console.log(`    ✗ [${r.business}] ${r.testName}: ${r.error}`);
    }
  }
  console.log(`${"═".repeat(60)}\n`);

  return suiteResult;
}

// ── Helpers ─────────────────────────────────────────────────────────

function resolveTemplates(obj: Record<string, unknown>, ctx: TestContext): Record<string, unknown> {
  const resolved: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === "string" && value.startsWith("$")) {
      const path = value.substring(1);
      if (path === "tenantId") resolved[key] = ctx.tenantId;
      else if (path.startsWith("serviceId.")) resolved[key] = ctx.serviceIds[path.substring(10)];
      else if (path.startsWith("staffId.")) resolved[key] = ctx.staffIds[path.substring(8)];
      else if (path.startsWith("var.")) resolved[key] = getNestedValue(ctx.variables, path.substring(4));
      else resolved[key] = value;
    } else if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      resolved[key] = resolveTemplates(value as Record<string, unknown>, ctx);
    } else {
      resolved[key] = value;
    }
  }
  return resolved;
}

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split(".");
  let current: unknown = obj;
  for (const part of parts) {
    if (current == null || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

function checkBodyContains(body: unknown, expected: Record<string, unknown>): string[] {
  const errors: string[] = [];
  if (typeof body !== "object" || body === null) {
    errors.push(`Expected object body, got ${typeof body}`);
    return errors;
  }
  for (const [key, value] of Object.entries(expected)) {
    const actual = (body as Record<string, unknown>)[key];
    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      const nested = checkBodyContains(actual, value as Record<string, unknown>);
      errors.push(...nested.map(e => `${key}.${e}`));
    } else if (actual !== value) {
      errors.push(`${key}: expected ${JSON.stringify(value)}, got ${JSON.stringify(actual)}`);
    }
  }
  return errors;
}

function checkFields(row: Record<string, unknown>, fields: Record<string, FieldCheck>): string[] {
  const errors: string[] = [];
  for (const [field, check] of Object.entries(fields)) {
    const value = row[field];
    switch (check.op) {
      case "equals":
        if (value !== check.value) errors.push(`${field}: expected ${check.value}, got ${value}`);
        break;
      case "contains":
        if (typeof value !== "string" || !value.includes(check.value)) errors.push(`${field}: expected to contain "${check.value}", got "${value}"`);
        break;
      case "not_null":
        if (value == null) errors.push(`${field}: expected not null`);
        break;
      case "truthy":
        if (!value) errors.push(`${field}: expected truthy, got ${value}`);
        break;
      case "one_of":
        if (!check.values.includes(value)) errors.push(`${field}: expected one of ${JSON.stringify(check.values)}, got ${value}`);
        break;
      case "gt":
        if (typeof value !== "number" || value <= check.value) errors.push(`${field}: expected > ${check.value}, got ${value}`);
        break;
      case "lt":
        if (typeof value !== "number" || value >= check.value) errors.push(`${field}: expected < ${check.value}, got ${value}`);
        break;
    }
  }
  return errors;
}
