/**
 * CreateTestTenantDialog — Regression Tests
 *
 * @vitest-environment node
 *
 * BUG #513/#514 root cause (2026-03-06):
 * CreateTestTenantDialog created test tenants WITHOUT setting tenant.industry.
 * As a result, useIndustryContext() returned undefined for all admin-created test tenants.
 * This broke every industry-specific UX feature:
 * - Business name placeholder showed "Acme Plumbing" for electricians
 * - Service name placeholder showed generic "Standard Service" instead of "Outlet Installation"
 * - FAQ quick-add showed generic "Where are you located?" instead of "Do you pull permits?"
 * - SLUG_SERVICE_OVERRIDES and SuggestedFAQButtons catalog pull never triggered
 *
 * Fix (commit 4dbe345): Added Industry dropdown to CreateTestTenantDialog.
 * When an industry is selected:
 * 1. `tenants.update({ industry: industrySlug })` sets tenant.industry
 * 2. Services from industryCatalog are seeded into the services table
 * 3. FAQs from industryCatalog are seeded into business_faqs table
 *
 * These tests verify the dialog code has the fix in place.
 *
 * Gate: service onboarding/complete_flow_works (electrical)
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const DIALOG_PATH = join(
  process.cwd(),
  "src/components/admin/CreateTestTenantDialog.tsx"
);
const source = readFileSync(DIALOG_PATH, "utf-8");

// ---------------------------------------------------------------------------
// Industry dropdown exists in dialog
// ---------------------------------------------------------------------------

describe("CreateTestTenantDialog: industry dropdown", () => {
  it("dialog file exists", () => {
    expect(source.length).toBeGreaterThan(0);
  });

  it("imports getIndustryBySlug from industryCatalog", () => {
    expect(source).toContain("getIndustryBySlug");
    expect(source).toContain("industryCatalog");
  });

  it("has industrySlug state variable", () => {
    expect(source).toContain("industrySlug");
    // useState with empty string default
    expect(source).toContain('useState("")');
  });

  it("renders a Select component for industry with _none sentinel (fixes Select.Item crash)", () => {
    // Radix UI rejects empty string values — _none sentinel is required
    expect(source).toContain('value="_none"');
    expect(source).toContain('setIndustrySlug(v === "_none" ? "" : v)');
  });

  it("shows preview of how many services/FAQs will be seeded", () => {
    // Shows helpful info: "Will seed X services and Y FAQs from the electrical catalog"
    expect(source).toContain("services");
    expect(source).toContain("faqs");
    // References the count from catalogEntry
    expect(source).toContain("services?.length");
    expect(source).toContain("faqs?.length");
  });
});

// ---------------------------------------------------------------------------
// Industry slug written to tenants table
// ---------------------------------------------------------------------------

describe("CreateTestTenantDialog: tenant.industry is set on creation", () => {
  it("updates tenants table with industry slug", () => {
    // The fix: writes industry back to tenants so useIndustryContext() can read it
    expect(source).toContain('update({ industry: industrySlug }');
  });

  it("update is conditional — only runs when industrySlug is non-empty", () => {
    // Guards: if (industrySlug) { ... update ... }
    // Both the guard and the update must exist, and guard must appear first
    expect(source).toContain("if (industrySlug)");
    expect(source).toContain("update({ industry: industrySlug }");
    const guardIdx = source.indexOf("if (industrySlug)");
    const updateIdx = source.indexOf("update({ industry: industrySlug }");
    expect(guardIdx).toBeGreaterThan(-1);
    expect(updateIdx).toBeGreaterThan(-1);
    expect(
      guardIdx,
      "if (industrySlug) guard must appear before the tenants.update call"
    ).toBeLessThan(updateIdx);
  });

  it("uses tenant ID from the created tenant (not hardcoded)", () => {
    const updateIdx = source.indexOf("update({ industry: industrySlug }");
    const surrounding = source.slice(updateIdx, updateIdx + 100);
    expect(surrounding).toContain("tenantId");
  });
});

// ---------------------------------------------------------------------------
// Catalog seeding: services from industryCatalog
// ---------------------------------------------------------------------------

describe("CreateTestTenantDialog: services are seeded from catalog", () => {
  it("fetches catalog entry via getIndustryBySlug(industrySlug)", () => {
    expect(source).toContain("getIndustryBySlug(industrySlug)");
  });

  it("seeds services when catalogEntry.services.length > 0", () => {
    expect(source).toContain("catalogEntry.services?.length > 0");
    // Inserts into services table
    expect(source).toContain('from("services")');
    expect(source).toContain(".insert(");
  });

  it("seeded services include tenant_id", () => {
    const servicesInsertIdx = source.indexOf('from("services")');
    const nearby = source.slice(servicesInsertIdx, servicesInsertIdx + 400);
    expect(nearby).toContain("tenant_id");
  });
});

// ---------------------------------------------------------------------------
// Catalog seeding: FAQs from industryCatalog
// ---------------------------------------------------------------------------

describe("CreateTestTenantDialog: FAQs are seeded from catalog", () => {
  it("seeds FAQs when catalogEntry.faqs.length > 0", () => {
    expect(source).toContain("catalogEntry.faqs?.length > 0");
    // Inserts into business_faqs table
    expect(source).toContain('from("business_faqs")');
  });

  it("seeded FAQs include tenant_id", () => {
    // faqsToInsert is built before the insert call and includes tenant_id
    expect(source).toContain("faqsToInsert");
    const faqsToInsertIdx = source.indexOf("faqsToInsert");
    const faqsBlock = source.slice(faqsToInsertIdx, faqsToInsertIdx + 300);
    expect(faqsBlock).toContain("tenant_id");
  });

  it("seeded FAQs include question and answer fields", () => {
    // faqsToInsert maps faq.question + faq.answer from catalogEntry
    const faqsToInsertIdx = source.indexOf("faqsToInsert");
    const faqsBlock = source.slice(faqsToInsertIdx, faqsToInsertIdx + 300);
    expect(faqsBlock).toContain("question");
    expect(faqsBlock).toContain("answer");
  });
});

// ---------------------------------------------------------------------------
// Catalog seeding: Objections from catalog (added 2026-03-08 commit 2598d78)
// ---------------------------------------------------------------------------

describe("CreateTestTenantDialog: Objections are seeded from catalog", () => {
  it("seeds objections when catalogEntry.objections.length > 0", () => {
    expect(source).toContain("catalogEntry.objections?.length > 0");
    // Inserts into objection_responses table
    expect(source).toContain('from("objection_responses")');
  });

  it("objectionsToInsert is built with tenant_id", () => {
    expect(source).toContain("objectionsToInsert");
    const objIdx = source.indexOf("objectionsToInsert");
    const objBlock = source.slice(objIdx, objIdx + 400);
    expect(objBlock).toContain("tenant_id");
  });

  it("handles objection seed failure gracefully (warn, not throw)", () => {
    // Objection seeding uses console.warn on error — tenant is still created even if seeding fails
    expect(source).toContain("objErr");
    // Must have a console.warn or console.log call after the error check
    const errIdx = source.indexOf("objErr");
    const errBlock = source.slice(errIdx, errIdx + 200);
    expect(errBlock).toMatch(/console\.(warn|log)/);
  });
});

// ---------------------------------------------------------------------------
// Toast message confirms industry slug on success
// ---------------------------------------------------------------------------

describe("CreateTestTenantDialog: user feedback", () => {
  it("success toast includes industry slug when present", () => {
    // User sees "Created test tenant: Rob's Electric (electrical)" not just "Created test tenant: Rob's Electric"
    expect(source).toContain("industrySlug ?");
  });
});
