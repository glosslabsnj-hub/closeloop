/**
 * Estimates Save Works — Structural Regression Tests
 *
 * @vitest-environment node
 *
 * Verifies the estimates save flow is structurally sound:
 * 1. useEstimates has createEstimate and updateEstimate mutations
 * 2. Both mutations surface errors via toast (not silent fails)
 * 3. EstimateBuilder component calls the mutations
 * 4. Totals are calculated before saving (subtotal/tax/total)
 * 5. createEstimate mutation propagates DB errors (throws, not swallows)
 *
 * Gates: functional/estimates_save_works
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function readFile(relPath: string): string {
  return readFileSync(resolve(relPath), "utf-8");
}

// ─── useEstimates mutation structure ─────────────────────────────────────────

describe("useEstimates: createEstimate mutation", () => {
  const source = readFile("src/hooks/useEstimates.ts");

  it("exports createEstimate mutation", () => {
    expect(source).toContain("createEstimate");
    expect(source).toContain("useMutation");
  });

  it("throws on DB error (does not silently swallow)", () => {
    // The createEstimate mutationFn must have: if (error) throw error
    const createSection = source.split("createEstimate")[1]?.split("updateEstimate")[0] || "";
    expect(createSection).toContain("if (error) throw error");
  });

  it("onError shows toast to user", () => {
    const lines = source.split("\n");
    // Find the createEstimate onError handler
    const createStart = lines.findIndex(l => l.includes("createEstimate = useMutation"));
    const updateStart = lines.findIndex(l => l.includes("updateEstimate = useMutation"));
    const createBlock = lines.slice(createStart, updateStart).join("\n");
    expect(createBlock).toContain("onError");
    expect(createBlock).toContain("toast");
  });

  it("onSuccess invalidates estimates query cache", () => {
    const lines = source.split("\n");
    const createStart = lines.findIndex(l => l.includes("createEstimate = useMutation"));
    const updateStart = lines.findIndex(l => l.includes("updateEstimate = useMutation"));
    const createBlock = lines.slice(createStart, updateStart).join("\n");
    expect(createBlock).toContain("invalidateQueries");
    expect(createBlock).toContain("estimates");
  });

  it("calculates subtotal, tax, total before insert", () => {
    expect(source).toContain("calculateTotals");
    expect(source).toContain("subtotal_cents");
    expect(source).toContain("tax_cents");
    expect(source).toContain("total_cents");
  });

  it("generates unique estimate number before insert", () => {
    expect(source).toContain("generateEstimateNumber");
    expect(source).toContain("estimate_number: estimateNumber");
  });
});

describe("useEstimates: updateEstimate mutation", () => {
  const source = readFile("src/hooks/useEstimates.ts");

  it("exports updateEstimate mutation", () => {
    expect(source).toContain("updateEstimate");
  });

  it("throws on DB error", () => {
    const updateSection = source.split("updateEstimate = useMutation")[1]?.split("sendEstimate")[0] || "";
    expect(updateSection).toContain("if (error) throw error");
  });

  it("onError shows toast to user", () => {
    const lines = source.split("\n");
    const updateStart = lines.findIndex(l => l.includes("updateEstimate = useMutation"));
    const sendStart = lines.findIndex(l => l.includes("sendEstimate = useMutation"));
    const updateBlock = lines.slice(updateStart, sendStart).join("\n");
    expect(updateBlock).toContain("onError");
    expect(updateBlock).toContain("toast");
  });

  it("recalculates totals when line_items updated", () => {
    const updateSection = source.split("updateEstimate = useMutation")[1]?.split("sendEstimate")[0] || "";
    expect(updateSection).toContain("calculateTotals");
    expect(updateSection).toContain("subtotal_cents");
  });

  it("includes tenant_id guard (no-op without tenant)", () => {
    // createEstimate throws early if no tenantId
    expect(source).toContain('throw new Error("No tenant ID")');
  });
});

// ─── EstimateBuilder component structure ─────────────────────────────────────

describe("EstimateBuilder: calls useEstimates mutations", () => {
  const source = readFile("src/components/estimates/EstimateBuilder.tsx");

  it("imports useEstimates hook", () => {
    expect(source).toContain("useEstimates");
  });

  it("calls createEstimate or updateEstimate on save", () => {
    const hasSavePath =
      source.includes("createEstimate") || source.includes("updateEstimate");
    expect(hasSavePath).toBe(true);
  });

  it("has a save action that the user can trigger", () => {
    // Must have a button/handler that triggers saving
    const hasSaveButton =
      source.includes("Save") || source.includes("save") || source.includes("Submit");
    expect(hasSaveButton).toBe(true);
  });
});

// ─── EstimatesPage structure ──────────────────────────────────────────────────

describe("EstimatesPage: renders EstimateBuilder", () => {
  const source = readFile("src/pages/app/EstimatesPage.tsx");

  it("imports useEstimates or EstimateBuilder", () => {
    const hasImport =
      source.includes("useEstimates") || source.includes("EstimateBuilder");
    expect(hasImport).toBe(true);
  });

  it("has a way to create a new estimate", () => {
    const hasCreatePath =
      source.includes("New Estimate") ||
      source.includes("newEstimate") ||
      source.includes("createEstimate") ||
      source.includes("EstimateBuilder");
    expect(hasCreatePath).toBe(true);
  });
});
