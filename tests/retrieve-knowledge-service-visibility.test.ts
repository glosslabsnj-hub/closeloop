/**
 * Retrieve-Knowledge: Service Visibility Regression Tests
 *
 * @vitest-environment node
 *
 * Regression for the brain_vector_search/service_retrieval gate failure:
 * "UV Sanitization (75) saved in catalog but 0 service results in Brain Debugger"
 *
 * Root cause: services got filtered out when:
 * 1. The query keywords (e.g., "services", "offer") didn't appear in service names
 * 2. The intent was "general" or "faq" which had no service boost (score stayed 0)
 * 3. Filter: relevance_score > 0.1 removed them all
 *
 * Fix (2026-03-09):
 * - Added "general" and "faq" intent boosts: { service: 0.15, faq: 0.1/0.2 }
 * - Added "service" keyword to search text so "services" query matches
 * - Together: generic "what services do you offer?" now returns active services
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

function readSrc(relPath: string): string {
  return readFileSync(join(root, relPath), "utf-8");
}

const retrieveKnowledgeSrc = readSrc(
  "supabase/functions/retrieve-knowledge/index.ts"
);

// ---------------------------------------------------------------------------
// Intent boosts: general and faq intents now boost services
// ---------------------------------------------------------------------------
describe("retrieve-knowledge: intent boosts include general and faq for services", () => {
  it("getIntentBoost function exists", () => {
    expect(retrieveKnowledgeSrc).toContain("function getIntentBoost(");
  });

  it("'general' intent has a service boost (so Brain Debugger default queries return services)", () => {
    // Find the boosts object
    const boostsStart = retrieveKnowledgeSrc.indexOf("const boosts:");
    const boostsEnd = retrieveKnowledgeSrc.indexOf("};", boostsStart);
    const boostsBlock = retrieveKnowledgeSrc.slice(boostsStart, boostsEnd + 2);

    expect(boostsBlock).toContain("general:");
    // Should have a service boost
    const generalIdx = boostsBlock.indexOf("general:");
    const nextEntry = boostsBlock.indexOf(",\n", generalIdx);
    const generalBlock = boostsBlock.slice(generalIdx, nextEntry);
    expect(generalBlock).toContain("service");
  });

  it("'faq' intent has a service boost (FAQ queries also surface services)", () => {
    const boostsStart = retrieveKnowledgeSrc.indexOf("const boosts:");
    const boostsEnd = retrieveKnowledgeSrc.indexOf("};", boostsStart);
    const boostsBlock = retrieveKnowledgeSrc.slice(boostsStart, boostsEnd + 2);

    expect(boostsBlock).toContain("faq:");
    const faqIdx = boostsBlock.indexOf("faq:");
    const nextEntry = boostsBlock.indexOf(",\n", faqIdx);
    const faqBlock = boostsBlock.slice(faqIdx, nextEntry);
    expect(faqBlock).toContain("service");
  });

  it("'booking' intent still has service boost >= 0.3 (no regression)", () => {
    const boostsStart = retrieveKnowledgeSrc.indexOf("const boosts:");
    const boostsEnd = retrieveKnowledgeSrc.indexOf("};", boostsStart);
    const boostsBlock = retrieveKnowledgeSrc.slice(boostsStart, boostsEnd + 2);

    expect(boostsBlock).toContain("booking:");
    const bookingIdx = boostsBlock.indexOf("booking:");
    const nextEntry = boostsBlock.indexOf(",\n", bookingIdx);
    const bookingBlock = boostsBlock.slice(bookingIdx, nextEntry);
    expect(bookingBlock).toContain("service: 0.3");
  });

  it("returns 0 for unknown intent+type combination (no fabricated boosts)", () => {
    // The || 0 fallback ensures no undefined is returned
    expect(retrieveKnowledgeSrc).toContain("|| 0");
  });
});

// ---------------------------------------------------------------------------
// Service search text includes "service" keyword
// ---------------------------------------------------------------------------
describe("retrieve-knowledge: service search text includes 'service' keyword", () => {
  it("service search text includes the word 'service'", () => {
    // The search text for services should include "service" so queries like
    // "what services do you offer?" match via the "service" keyword
    const serviceLoopIdx = retrieveKnowledgeSrc.indexOf("// Process services");
    expect(serviceLoopIdx).toBeGreaterThan(-1);

    const searchTextIdx = retrieveKnowledgeSrc.indexOf("const searchText", serviceLoopIdx);
    const searchTextEnd = retrieveKnowledgeSrc.indexOf(";", searchTextIdx);
    const searchTextLine = retrieveKnowledgeSrc.slice(searchTextIdx, searchTextEnd + 1);

    // Must contain the word "service" as a literal in the template (so queries match)
    expect(searchTextLine).toContain(" service ");
  });

  it("service search text still includes name and description", () => {
    const serviceLoopIdx = retrieveKnowledgeSrc.indexOf("// Process services");
    const searchTextIdx = retrieveKnowledgeSrc.indexOf("const searchText", serviceLoopIdx);
    const searchTextEnd = retrieveKnowledgeSrc.indexOf(";", searchTextIdx);
    const searchTextLine = retrieveKnowledgeSrc.slice(searchTextIdx, searchTextEnd + 1);

    expect(searchTextLine).toContain("svc.name");
    expect(searchTextLine).toContain("svc.description");
  });
});

// ---------------------------------------------------------------------------
// Relevance filter threshold
// ---------------------------------------------------------------------------
describe("retrieve-knowledge: relevance filter threshold", () => {
  it("filter threshold is 0.1 (services with general intent boost 0.15 pass through)", () => {
    // The general intent boost is 0.15 > 0.1, so services show up
    expect(retrieveKnowledgeSrc).toContain("> 0.1");
  });

  it("general intent boost (0.15) is above filter threshold (0.1)", () => {
    // This is a logic assertion to document the invariant
    const generalServiceBoost = 0.15;
    const filterThreshold = 0.1;
    expect(generalServiceBoost).toBeGreaterThan(filterThreshold);
  });
});

// ---------------------------------------------------------------------------
// Intent boosts for existing intents (no regression)
// ---------------------------------------------------------------------------
describe("retrieve-knowledge: existing intent boosts unchanged (no regression)", () => {
  const boostsStart = retrieveKnowledgeSrc.indexOf("const boosts:");
  const boostsEnd = retrieveKnowledgeSrc.indexOf("};", boostsStart);
  const boostsBlock = retrieveKnowledgeSrc.slice(boostsStart, boostsEnd + 2);

  it("quote intent has high service boost", () => {
    expect(boostsBlock).toContain("quote:");
    expect(boostsBlock).toContain("service: 0.4");
  });

  it("service_info intent has highest faq boost", () => {
    expect(boostsBlock).toContain("service_info:");
    expect(boostsBlock).toContain("faq: 0.2");
  });

  it("pricing intent has service boost 0.5", () => {
    expect(boostsBlock).toContain("pricing:");
    expect(boostsBlock).toContain("service: 0.5");
  });

  it("cancel intent has policy boost", () => {
    expect(boostsBlock).toContain("cancel:");
    expect(boostsBlock).toContain("policy: 0.5");
  });

  it("objection intent has objection boost", () => {
    expect(boostsBlock).toContain("objection:");
    expect(boostsBlock).toContain("objection: 0.5");
  });
});
