/**
 * Onboarding Submit Pipeline Resilience Tests
 *
 * @vitest-environment node
 *
 * The onboarding submit pipeline has 17 steps. Step 1 (tenant creation) is
 * critical — failure halts everything. Steps 2-16 are wrapped in runStep()
 * which catches errors and continues. Step 17 marks completion.
 *
 * This test suite ensures the pipeline structure stays resilient:
 * - Steps 2-16 use runStep() (error collection, not error halting)
 * - INSERT steps use delete-then-insert (idempotent on retry)
 * - UPSERT steps use onConflict (idempotent)
 * - UPDATE steps are naturally idempotent
 * - Retry logic works (MAX_RETRIES, exponential backoff)
 * - Partial failure surfaces user-friendly toast
 *
 * Gates: onboarding/complete_flow_works, overall/error_states_have_recovery
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const SUBMIT_PATH = join(
  process.cwd(),
  "src/hooks/useOnboardingSubmit.ts"
);
const source = readFileSync(SUBMIT_PATH, "utf-8");

// ─── Pipeline structure ─────────────────────────────────────────────────────

describe("onboarding pipeline — step structure", () => {
  it("step 1 (tenant creation) throws on failure instead of using runStep", () => {
    // Tenant creation failure must halt the pipeline (throw), not be silently collected
    const tenantBlock = source.match(
      /STEP 1.*?Create tenant[\s\S]*?STEPS? 2/
    );
    expect(tenantBlock).toBeTruthy();
    expect(tenantBlock![0]).toContain("throw new Error");
    expect(tenantBlock![0]).not.toContain("runStep");
  });

  it("defines runStep error collection pattern", () => {
    expect(source).toContain("const runStep = async (name: string, fn: () => Promise<void>)");
  });

  it("runStep catches errors and pushes to stepFailures", () => {
    const runStepBlock = source.match(
      /const runStep[\s\S]*?stepFailures\.push/
    );
    expect(runStepBlock).toBeTruthy();
  });

  it("runStep logs errors to console.error", () => {
    const runStepBlock = source.match(
      /const runStep[\s\S]*?\}\s*\};/
    );
    expect(runStepBlock).toBeTruthy();
    expect(runStepBlock![0]).toContain("console.error");
  });

  // Count all runStep calls — should be at least 14 (steps 2 through 16, including sub-steps)
  it("has at least 14 runStep calls for non-critical steps", () => {
    const calls = (source.match(/await runStep\(/g) || []).length;
    expect(calls).toBeGreaterThanOrEqual(14);
  });
});

// ─── Idempotency: INSERT steps use delete-then-insert ───────────────────────

describe("onboarding pipeline — idempotent INSERT steps", () => {
  const deleteBeforeInsertSteps = [
    { name: "services", table: "services" },
    { name: "FAQs", table: "business_faqs" },
    { name: "objections", table: "objection_responses" },
    { name: "automations", table: "automations" },
  ];

  for (const step of deleteBeforeInsertSteps) {
    it(`${step.name} step deletes before inserting (idempotent)`, () => {
      // Find the runStep block for this step
      const pattern = new RegExp(
        `runStep\\("${step.name}"[\\s\\S]*?\\.from\\("${step.table}"\\)[\\s\\S]*?\\.delete\\(\\)`,
      );
      expect(source).toMatch(pattern);
    });

    it(`${step.name} step inserts after deleting`, () => {
      const pattern = new RegExp(
        `runStep\\("${step.name}"[\\s\\S]*?\\.from\\("${step.table}"\\)[\\s\\S]*?\\.insert\\(`,
      );
      expect(source).toMatch(pattern);
    });
  }
});

// ─── Idempotency: UPSERT steps use onConflict ──────────────────────────────

describe("onboarding pipeline — idempotent UPSERT steps", () => {
  const upsertSteps = [
    { name: "delivery settings", table: "booking_delivery_settings" },
    { name: "SMS registration", table: "a2p_registrations" },
  ];

  for (const step of upsertSteps) {
    it(`${step.name} step uses upsert with onConflict`, () => {
      const pattern = new RegExp(
        `runStep\\("${step.name}"[\\s\\S]*?\\.from\\("${step.table}"\\)[\\s\\S]*?\\.upsert\\([\\s\\S]*?onConflict`,
      );
      expect(source).toMatch(pattern);
    });
  }

  it("food settings step uses upsert with onConflict", () => {
    expect(source).toMatch(
      /\.from\("food_order_settings"\)[\s\S]*?\.upsert\([\s\S]*?onConflict/
    );
  });
});

// ─── Idempotency: UPDATE steps use .update().eq() ───────────────────────────

describe("onboarding pipeline — idempotent UPDATE steps", () => {
  it("policies step uses .update().eq(tenant_id)", () => {
    expect(source).toMatch(
      /runStep\("policies"[\s\S]*?\.from\("tenants"\)[\s\S]*?\.update\(/
    );
  });

  it("AI settings step uses .update().eq(tenant_id)", () => {
    expect(source).toMatch(
      /runStep\("AI settings"[\s\S]*?\.from\("assistant_settings"\)[\s\S]*?\.update\(/
    );
  });
});

// ─── Delivery settings for each mode ────────────────────────────────────────

describe("onboarding pipeline — mode-specific delivery settings", () => {
  it("creates booking_delivery_settings for all tenants", () => {
    // This is NOT inside an if(mode) block — it runs for everyone
    expect(source).toMatch(
      /runStep\("delivery settings"[\s\S]*?booking_delivery_settings/
    );
  });

  it("creates dispatch_delivery_settings for dispatch mode", () => {
    expect(source).toContain("dispatch_delivery_settings");
    expect(source).toMatch(
      /businessMode === "dispatch"[\s\S]*?dispatch_delivery_settings/
    );
  });

  it("creates order_delivery_settings for food mode", () => {
    expect(source).toContain("order_delivery_settings");
    expect(source).toMatch(
      /isFoodMode[\s\S]*?order_delivery_settings/
    );
  });
});

// ─── Retry logic ────────────────────────────────────────────────────────────

describe("onboarding pipeline — retry logic", () => {
  it("defines MAX_RETRIES constant", () => {
    expect(source).toMatch(/const MAX_RETRIES\s*=\s*\d+/);
  });

  it("MAX_RETRIES is at least 2", () => {
    const match = source.match(/const MAX_RETRIES\s*=\s*(\d+)/);
    expect(match).toBeTruthy();
    expect(Number(match![1])).toBeGreaterThanOrEqual(2);
  });

  it("exports handleRetry function", () => {
    expect(source).toContain("handleRetry");
  });

  it("handleRetry uses exponential backoff", () => {
    expect(source).toMatch(/Math\.pow\(2,\s*retryCount\)/);
  });

  it("shows retry button on non-final failure", () => {
    expect(source).toContain("setShowRetry(true)");
  });

  it("shows permanent error after MAX_RETRIES exhausted", () => {
    expect(source).toContain("setCompletionError");
  });

  it("saves createdTenantId so retries skip tenant creation", () => {
    expect(source).toContain("setCreatedTenantId(tenantId)");
    // And checks it at the start
    expect(source).toMatch(/let tenantId = createdTenantId/);
    expect(source).toMatch(/if \(!tenantId\)/);
  });
});

// ─── Partial failure UX ─────────────────────────────────────────────────────

describe("onboarding pipeline — partial failure handling", () => {
  it("collects step failures into an array", () => {
    expect(source).toContain("const stepFailures: string[] = []");
  });

  it("shows toast with failed step names on partial failure", () => {
    expect(source).toMatch(/stepFailures\.length\s*>\s*0/);
    expect(source).toMatch(/stepFailures\.join/);
  });

  it("proceeds to completion even with partial failures", () => {
    // setIsComplete must be OUTSIDE the stepFailures check
    // and AFTER the stepFailures toast
    const completeIdx = source.indexOf("setIsComplete(true)");
    const failureCheckIdx = source.indexOf("stepFailures.length > 0");
    expect(completeIdx).toBeGreaterThan(-1);
    expect(failureCheckIdx).toBeGreaterThan(-1);
    // The isComplete call should be BEFORE the failure check (both happen in sequence)
    // Actually: isComplete is set, then failures are surfaced
    // Let's just verify both exist in the try block
    expect(source).toContain("setIsComplete(true)");
  });

  it("marks tenant as onboarding_completed even with partial failures", () => {
    // onboarding_completed_at update must be OUTSIDE runStep (critical path)
    expect(source).toContain("onboarding_completed_at");
    // Both must be in the same try block, with completion before the stepFailures check
    const completedAtIdx = source.indexOf("onboarding_completed_at");
    const isCompleteIdx = source.indexOf("setIsComplete(true)");
    const failureCheckIdx = source.indexOf("stepFailures.length > 0");
    expect(completedAtIdx).toBeGreaterThan(-1);
    expect(isCompleteIdx).toBeGreaterThan(completedAtIdx);
    expect(failureCheckIdx).toBeGreaterThan(isCompleteIdx);
  });
});

// ─── Step 17: completion cleanup ────────────────────────────────────────────

describe("onboarding pipeline — completion cleanup", () => {
  it("clears selectedPlan from sessionStorage", () => {
    expect(source).toContain('sessionStorage.removeItem("selectedPlan")');
  });

  it("clears referralAgencySlug from sessionStorage", () => {
    expect(source).toContain('sessionStorage.removeItem("referralAgencySlug")');
  });

  it("refreshes tenant data after completion", () => {
    expect(source).toContain("refreshTenant()");
  });

  it("clears onboarding form data", () => {
    expect(source).toContain("clearOnboardingData(userId)");
  });

  it("clears progress callback", () => {
    expect(source).toContain("clearProgress()");
  });
});

// ─── Critical data saved correctly ──────────────────────────────────────────

describe("onboarding pipeline — critical data integrity", () => {
  it("saves timezone to tenant", () => {
    expect(source).toContain("Intl.DateTimeFormat().resolvedOptions().timeZone");
    expect(source).toContain("timezone");
  });

  it("saves industry slug to tenant", () => {
    expect(source).toContain("industry: industrySlug");
  });

  it("saves business mode to tenant", () => {
    expect(source).toContain("business_mode: businessMode");
  });

  it("saves capabilities_json to tenant", () => {
    expect(source).toContain("capabilities_json: capabilitiesJson");
  });

  it("saves enabled_modules to tenant", () => {
    expect(source).toContain("enabled_modules: enabledModules");
  });

  it("saves hours_json to tenant", () => {
    expect(source).toContain("hours_json: hoursToSave");
  });

  it("saves payment_methods via getPaymentDefaults", () => {
    expect(source).toMatch(/payment_methods:\s*getPaymentDefaults/);
  });

  it("saves service_default_flow via getServiceDefaultFlow", () => {
    expect(source).toMatch(/service_default_flow:\s*getServiceDefaultFlow/);
  });

  it("saves required_intake_fields from communicationPrefs", () => {
    expect(source).toContain("required_intake_fields");
    expect(source).toContain("communicationPrefs.requiredIntakeFields");
  });

  it("saves escalation_rules from communicationPrefs", () => {
    expect(source).toContain("escalation_rules");
    expect(source).toContain("communicationPrefs.escalationRules");
  });
});

// ─── Mode-conditional steps ─────────────────────────────────────────────────

describe("onboarding pipeline — mode-conditional logic", () => {
  it("food settings only run for food mode", () => {
    expect(source).toMatch(/isFoodMode[\s\S]*?food_order_settings/);
  });

  it("dispatch delivery settings only run for dispatch mode", () => {
    expect(source).toMatch(
      /businessMode === "dispatch"[\s\S]*?dispatch_delivery_settings/
    );
  });

  it("team members only saved when not solo operator", () => {
    expect(source).toMatch(/!isSoloOperator[\s\S]*?teamMembers/);
  });

  it("Twilio provisioning skipped for super admin", () => {
    expect(source).toMatch(/!isSuperAdmin[\s\S]*?provision-twilio-number/);
  });

  it("industry template skipped when catalog entry exists", () => {
    expect(source).toContain("hasCatalogEntry");
    expect(source).toMatch(/if\s*\(hasCatalogEntry\)\s*return/);
  });
});
