/**
 * System Prompt Structure Tests
 *
 * @vitest-environment node
 *
 * Verifies that buildSystemPrompt in buildBusinessContext.ts includes
 * all critical business data sections. These tests read the source code
 * to ensure prompt patterns are never accidentally removed.
 *
 * QA Bugs Fixed:
 * - Handoff #317: FAQs not in AI text simulator prompt
 * - Handoff #321: Business hours not injected into AI prompt
 * - Handoff #322: Custom greeting not used in text simulator
 *
 * Gate: brain/edits_reflect_in_ai_behavior
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const CONTEXT_PATH = join(
  process.cwd(),
  "supabase/functions/_shared/buildBusinessContext.ts"
);

const source = readFileSync(CONTEXT_PATH, "utf-8");

// Extract just the buildSystemPrompt function
const fnStart = source.indexOf("function buildSystemPrompt(");
const fnBody = source.slice(fnStart);

describe("buildSystemPrompt — required sections", () => {
  it("includes business name in opening", () => {
    expect(fnBody).toContain("ctx.tenant.business_name");
  });

  it("includes business hours section", () => {
    expect(fnBody).toContain("BUSINESS HOURS");
    expect(fnBody).toContain("ctx.tenant.hours");
  });

  it("iterates all 7 day names for hours", () => {
    const dayNames = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
    for (const day of dayNames) {
      expect(fnBody).toContain(`"${day}"`);
    }
  });

  it("includes 'ANSWER WHEN ASKED' instruction in hours section", () => {
    // This is the critical instruction that prevents the AI from saying
    // "I don't have access to hours" when hours ARE configured
    expect(fnBody).toContain("ANSWER WHEN ASKED");
  });

  it("includes FAQ section", () => {
    expect(fnBody).toContain("FREQUENTLY ASKED QUESTIONS");
    expect(fnBody).toContain("ctx.knowledge.faqs");
  });

  it("includes services section with pricing instructions", () => {
    expect(fnBody).toContain("SERVICES AND PRICING");
    expect(fnBody).toContain("Quote prices when they exist");
  });

  it("includes policies section", () => {
    expect(fnBody).toContain("POLICIES");
    expect(fnBody).toContain("ctx.policies.cancellation");
    expect(fnBody).toContain("ctx.policies.deposit");
    expect(fnBody).toContain("ctx.policies.payment_methods");
  });

  it("includes objection handling section", () => {
    expect(fnBody).toContain("OBJECTION HANDLING");
    expect(fnBody).toContain("ctx.knowledge.objections");
  });

  it("includes communication style/tone", () => {
    expect(fnBody).toContain("COMMUNICATION STYLE");
    expect(fnBody).toContain("ctx.ai_settings.tone");
  });

  it("includes booking behavior section for booking-enabled tenants", () => {
    expect(fnBody).toContain("BOOKING BEHAVIOR");
    expect(fnBody).toContain("ctx.operations.modules.booking_enabled");
  });

  it("includes dispatch ETA behavior section", () => {
    expect(fnBody).toContain("DISPATCH ETA BEHAVIOR");
    expect(fnBody).toContain("ctx.eta.spoken");
    expect(fnBody).toContain("ctx.eta.min_minutes");
    expect(fnBody).toContain("ctx.eta.max_minutes");
  });

  it("includes pricing resolution contract", () => {
    expect(fnBody).toContain("PRICING RESOLUTION CONTRACT");
  });

  it("includes decision priority hierarchy", () => {
    expect(fnBody).toContain("DECISION PRIORITY");
  });

  it("includes unknown question behavior", () => {
    expect(fnBody).toContain("unknown_question_behavior");
  });
});

describe("buildSystemPrompt — hours are ALWAYS injected", () => {
  it("hours section is gated on Object.keys(hours).length, not mode", () => {
    // Hours should be injected for ALL modes, not just service mode.
    // The gate is: ctx.tenant.hours has keys, not a mode check.
    const hoursBlock = fnBody.slice(
      fnBody.indexOf("BUSINESS HOURS"),
      fnBody.indexOf("BUSINESS HOURS") + 500
    );
    // Should NOT contain a mode check like 'business_mode === "service"'
    expect(hoursBlock).not.toContain('business_mode === "service"');
    expect(hoursBlock).not.toContain('business_mode === "dispatch"');
  });

  it("hours shows open/close times per day", () => {
    expect(fnBody).toContain("dayHours.open");
    expect(fnBody).toContain("dayHours.close");
    expect(fnBody).toContain("dayHours.is_open");
  });

  it("closed days show 'Closed' label", () => {
    expect(fnBody).toContain('"Closed"');
  });
});

describe("buildSystemPrompt — FAQs injected with Q/A format", () => {
  it("uses Q: / A: format for FAQs", () => {
    expect(fnBody).toContain("Q: ${faq.question}");
    expect(fnBody).toContain("A: ${faq.answer}");
  });

  it("limits FAQs to prevent prompt bloat", () => {
    // Should slice to top N FAQs
    expect(fnBody).toMatch(/faqs\.slice\(0,\s*\d+\)/);
  });
});

describe("buildSystemPrompt — greeting and fallback scripts", () => {
  it("fetches greeting_script from ai_assistants", () => {
    // buildBusinessContext fetches greeting_script in the parallel query
    expect(source).toContain("greeting_script");
  });

  it("fetches fallback_script from ai_assistants", () => {
    expect(source).toContain("fallback_script");
  });

  it("fetches tone from ai_assistants", () => {
    expect(source).toContain("ai_assistants");
    expect(source).toContain("tone");
  });
});

describe("buildBusinessContext — data fetching completeness", () => {
  it("fetches services for the tenant", () => {
    expect(source).toContain('from("services")');
    expect(source).toContain('eq("tenant_id", tenantId)');
  });

  it("fetches FAQs (business_faqs) for the tenant", () => {
    expect(source).toContain('from("business_faqs")');
  });

  it("fetches objection responses for the tenant", () => {
    expect(source).toContain('from("objection_responses")');
  });

  it("fetches knowledge base for the tenant", () => {
    expect(source).toContain('from("ai_knowledge_base")');
  });

  it("fetches assistant settings for tone/greeting/fallback", () => {
    expect(source).toContain('from("ai_assistants")');
  });

  it("fetches menu items for food mode", () => {
    expect(source).toContain('from("menu_items")');
  });

  it("fetches medical practice settings", () => {
    expect(source).toContain('from("medical_practice_settings")');
  });

  it("fetches staff members for multi-resource awareness", () => {
    expect(source).toContain('from("staff_members")');
  });

  it("fetches intent rules for intelligence layer", () => {
    expect(source).toContain('from("business_intent_rules")');
  });

  it("fetches business memory for personalization", () => {
    expect(source).toContain('from("business_memory")');
  });
});

describe("buildBusinessContext — HIPAA safety", () => {
  it("disables memory when HIPAA mode is active", () => {
    expect(source).toContain("hipaaMode");
    expect(source).toContain("!hipaaMode");
  });

  it("filters out customer_preference memory in HIPAA mode", () => {
    expect(source).toContain("customer_preference");
  });
});

describe("buildSystemPrompt — food ordering instructions", () => {
  it("includes food ordering flow for food mode with menu", () => {
    expect(fnBody).toContain("FOOD ORDERING FLOW");
    expect(fnBody).toContain("FOOD ORDERING SETTINGS");
  });

  it("includes fallback when food mode has no menu", () => {
    expect(fnBody).toContain("Menu items are not yet configured");
  });

  it("includes prep time in food ordering", () => {
    expect(fnBody).toContain("estimated_prep_minutes");
  });
});

describe("text-conversation — uses buildBusinessContext", () => {
  const textConvPath = join(
    process.cwd(),
    "supabase/functions/text-conversation/index.ts"
  );
  const textConvSource = readFileSync(textConvPath, "utf-8");

  it("imports buildBusinessContext", () => {
    expect(textConvSource).toContain("buildBusinessContext");
  });

  it("uses the canonical systemPrompt from buildBusinessContext", () => {
    // After commit 83bbb7d, text-conversation should use the systemPrompt
    // returned by buildBusinessContext, NOT a hardcoded/separate prompt
    expect(textConvSource).toContain("systemPrompt");
  });

  it("does NOT build its own prompt from scratch (regression guard)", () => {
    // Before the fix, text-conversation was fetching ElevenLabs templates
    // and building its own prompt. It should now delegate to buildBusinessContext.
    // Guard against re-introducing a separate prompt builder.
    expect(textConvSource).not.toContain("fetch_elevenlabs_template");
    expect(textConvSource).not.toContain("getElevenLabsTemplate");
  });
});
