/**
 * AgreementBuilder Mode-Aware Regression Tests
 *
 * @vitest-environment node
 *
 * Verifies:
 * 1. AgreementBuilder imports useTenantConfig (is mode-aware)
 * 2. SALES_PLAN_TEMPLATES exist (Standard Purchase, Financing Plan, Premium Deal)
 * 3. SERVICE_PLAN_TEMPLATES exist (maintenance language)
 * 4. Sales plan type options include "financing" and "standard" (not just "maintenance")
 * 5. Labels are mode-aware (Items/Features, Appointments, Customer Discount)
 * 6. AgreementsPage.tsx already has all mode-specific terminology
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";

const builderSrc = readFileSync(
  join(process.cwd(), "src/components/agreements/AgreementBuilder.tsx"),
  "utf-8"
);

const pageSrc = readFileSync(
  join(process.cwd(), "src/pages/app/AgreementsPage.tsx"),
  "utf-8"
);

describe("AgreementBuilder — mode-awareness regression", () => {
  it("imports useTenantConfig", () => {
    expect(builderSrc).toContain('useTenantConfig');
  });

  it("uses businessMode to detect sales mode", () => {
    expect(builderSrc).toContain('businessMode');
    expect(builderSrc).toContain('isSales');
  });

  it("has SALES_PLAN_TEMPLATES defined", () => {
    expect(builderSrc).toContain('SALES_PLAN_TEMPLATES');
  });

  it("has SERVICE_PLAN_TEMPLATES defined (old name, not just PLAN_TEMPLATES)", () => {
    expect(builderSrc).toContain('SERVICE_PLAN_TEMPLATES');
  });

  it("SALES_PLAN_TEMPLATES has Standard Purchase template", () => {
    expect(builderSrc).toContain('Standard Purchase');
  });

  it("SALES_PLAN_TEMPLATES has Financing Plan template", () => {
    expect(builderSrc).toContain('Financing Plan');
  });

  it("SALES_PLAN_TEMPLATES has Premium Deal template", () => {
    expect(builderSrc).toContain('Premium Deal');
  });

  it("SERVICE_PLAN_TEMPLATES has Basic Maintenance template (original)", () => {
    expect(builderSrc).toContain('Basic Maintenance');
  });

  it("plan type dropdown has 'financing' option for sales", () => {
    expect(builderSrc).toContain('"financing"');
  });

  it("plan type dropdown has 'standard' option for sales", () => {
    expect(builderSrc).toContain('"standard"');
  });

  it("plan type dropdown still has 'maintenance' option for service mode", () => {
    expect(builderSrc).toContain('"maintenance"');
  });

  it("placeholder text is mode-aware (sales vs service)", () => {
    expect(builderSrc).toContain('Standard Purchase Agreement');
    expect(builderSrc).toContain('Annual Maintenance Plan');
  });

  it("labels are mode-aware: 'Items / Features Included' for sales", () => {
    expect(builderSrc).toContain('Items / Features Included');
  });

  it("labels are mode-aware: 'Services Included' kept for service mode", () => {
    expect(builderSrc).toContain('servicesLabel');
  });

  it("visits/year label is mode-aware: Appointments for sales", () => {
    expect(builderSrc).toContain('Appointments / Follow-ups');
  });

  it("discount label is mode-aware: Customer Discount for sales", () => {
    expect(builderSrc).toContain('Customer Discount %');
  });
});

describe("AgreementsPage — mode-specific terminology regression", () => {
  it("page title is 'Sales Agreements' for sales mode", () => {
    expect(pageSrc).toContain('"sales" ? "Sales Agreements"');
  });

  it("page title is 'Patient Agreements' for medical mode", () => {
    expect(pageSrc).toContain('"medical" ? "Patient Agreements"');
  });

  it("agreement label is 'purchase agreement' for sales", () => {
    expect(pageSrc).toContain('"sales" ? "purchase agreement"');
  });

  it("agreement label is 'patient agreement' for medical", () => {
    expect(pageSrc).toContain('"medical" ? "patient agreement"');
  });

  it("empty state title is mode-specific for sales", () => {
    expect(pageSrc).toContain('No purchase agreements yet');
  });

  it("empty state title is mode-specific for medical", () => {
    expect(pageSrc).toContain('No patient agreements yet');
  });

  it("create dialog title is mode-specific for sales", () => {
    expect(pageSrc).toContain('Create Purchase Agreement');
  });

  it("create dialog desc mentions financing plans for sales", () => {
    expect(pageSrc).toContain('financing plan');
  });

  it("does NOT show service-only description for sales mode", () => {
    // Sales mode description should mention "purchase agreements" not "maintenance plans"
    const salesDescStart = pageSrc.indexOf('"sales" ? "Create purchase agreements');
    expect(salesDescStart).toBeGreaterThan(-1);
  });
});

// ---------------------------------------------------------------------------
// UX commit 881d0b9: AgreementBuilder template card display for sales mode
// ---------------------------------------------------------------------------
describe("AgreementBuilder: template cards — sales mode display (commit 881d0b9)", () => {
  it("shows 'Custom pricing' instead of '$0.00/mo' for sales template cards", () => {
    expect(builderSrc).toContain("Custom pricing");
  });

  it("shows 'appointment(s)' for sales mode, not 'visits/year'", () => {
    // Template card visits/year is conditional: sales uses appointment(s)
    expect(builderSrc).toContain('"appointment(s)"');
    expect(builderSrc).toContain('"visits/year"');
  });

  it("isSales ternary controls visits vs appointment label", () => {
    // Must branch on isSales, not hardcode one label
    const visitsLine = builderSrc.includes('isSales ? "appointment(s)" : "visits/year"');
    expect(visitsLine).toBe(true);
  });

  it("shows 'Prospect / Buyer *' customer label for sales mode", () => {
    expect(builderSrc).toContain("Prospect / Buyer *");
  });

  it("isSales ternary controls customer label", () => {
    const labelLine = builderSrc.includes('isSales ? "Prospect / Buyer *" : "Customer *"');
    expect(labelLine).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// UX commit 881d0b9: AgreementsPage list item 'appointments used' for sales
// ---------------------------------------------------------------------------
describe("AgreementsPage: 'appointments used' for sales, 'visits used' for others (commit 881d0b9)", () => {
  it("shows 'appointments' for sales mode in list item", () => {
    expect(pageSrc).toContain('"appointments"');
  });

  it("shows 'visits' for non-sales modes in list item", () => {
    expect(pageSrc).toContain('"visits"');
  });

  it("isSales ternary controls appointments vs visits label", () => {
    const hasConditional = pageSrc.includes('isSales ? "appointments" : "visits"');
    expect(hasConditional).toBe(true);
  });

  it("AgreementListItem receives isSales prop", () => {
    expect(pageSrc).toContain("isSales");
  });

  it("AgreementListItem prop is set to businessMode === 'sales'", () => {
    expect(pageSrc).toContain('isSales={businessMode === "sales"}');
  });
});
