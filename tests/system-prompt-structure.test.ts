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

  it("accepts conversationId as alias for sessionId (regression: R11 context loss)", () => {
    // QA sends conversationId; before fa1854a the server only read sessionId → context lost.
    // Both parameter names must be destructured and merged.
    expect(textConvSource).toContain("conversationId: reqConversationId");
    expect(textConvSource).toContain("reqSessionId || reqConversationId");
  });

  it("server-side session storage: sessionId takes priority over conversationMessages (regression: plumbing R5 context loss)", () => {
    // Priority: sessionId (server DB) > conversationMessages (client JSON) > history (legacy)
    // commit 6997b1d: sessionId is now resolved and checked FIRST.
    // If someone removes the sessionId check or changes the order, multi-turn QA tests fail.
    const sessionBlock = textConvSource.match(/if \(sessionId\)[\s\S]*?loadSession/);
    expect(sessionBlock, "sessionId must be the FIRST condition checked for starting messages").not.toBeNull();
  });

  it("server-side session storage: saveSession called after AI response", () => {
    // After generating a response, the updated messages must be saved to text_conversation_sessions.
    // Without this save, the next message in the session will start from scratch.
    expect(textConvSource).toContain("saveSession");
    expect(textConvSource).toContain("text_conversation_sessions");
  });

  it("server-side session storage: loadSession returns null on DB error (safe fallback)", () => {
    // loadSession must return null on error, not throw. Throwing would crash the entire request.
    // If null returned, startingMessages defaults to [] (fresh conversation) — degraded but safe.
    const loadFn = textConvSource.match(/async function loadSession[\s\S]*?\n\}/);
    expect(loadFn, "loadSession function must exist").not.toBeNull();
    expect(loadFn![0]).toContain("return null");
    expect(loadFn![0]).not.toContain("throw");
  });

  it("has TEXT CHANNEL OVERRIDE for transfer requests (regression: AI said 'let me transfer you' in text mode)", () => {
    // In text/browser_test mode there is no live call to transfer.
    // The service agent base prompt says 'let me transfer you now' for voice.
    // text-conversation must override this to use create_callback instead.
    expect(textConvSource).toContain("TEXT CHANNEL OVERRIDE");
    expect(textConvSource).toContain("transfer_to_owner is NOT available in text/chat");
  });
});

describe("buildSystemPrompt — anti-fabrication rules (regression: R10/R11 QA bugs)", () => {
  it("includes explicit maintenance plan prevention with named plan examples", () => {
    // Regression guard: AI was inventing 'Comfort Club' maintenance plans.
    // buildBusinessContext.ts must name specific plan names to avoid.
    expect(source).toContain("Comfort Club");
    expect(source).toContain("Priority Club");
  });

  it("includes response script for missing maintenance plan", () => {
    // AI must use this exact script when no plan is listed in SERVICES.
    expect(source).toContain("We don't have a maintenance plan set up right now");
  });

  it("does NOT contain bare $189 example price (regression: AI quoted example as real price)", () => {
    // The old prompt had '$189' as a literal example price in a script.
    // AI would quote it as a real tune-up price. Removed in fa1854a.
    // The replacement wraps it as a format note, not a literal dollar amount.
    // Verify the bare "$189" example isn't present outside a [SCRIPT EXAMPLE FORMAT] annotation.
    const servicePromptIdx = source.indexOf("function buildSystemPrompt(");
    const promptBody = source.slice(servicePromptIdx);
    // $189 should not appear as a standalone example like '"runs about $189"'
    expect(promptBody).not.toMatch(/"runs about \$189"/);
    expect(promptBody).not.toMatch(/"full tune-up runs about \$189"/);
  });

  it("includes CRITICAL warning against using example prices as real prices", () => {
    // This lives in agentBasePrompts.ts (service agent pricing rules)
    const basePromptsPath = join(process.cwd(), "supabase/functions/_shared/agentBasePrompts.ts");
    const basePromptsSource = readFileSync(basePromptsPath, "utf-8");
    expect(basePromptsSource).toContain("NEVER quote a price that is not in services_pricing");
  });
});

describe("agentBasePrompts — anti-fabrication rules (regression: R10/R11 QA bugs)", () => {
  const basePromptsPath = join(
    process.cwd(),
    "supabase/functions/_shared/agentBasePrompts.ts"
  );
  const basePromptsSource = readFileSync(basePromptsPath, "utf-8");

  it("SERVICE_AGENT_BASE_PROMPT includes maintenance plan prevention with specific plan names", () => {
    // Regression guard: the service prompt must include the SPECIFIC SCRIPT
    // preventing AI from inventing plan names like Comfort Club.
    expect(basePromptsSource).toContain("SPECIFIC SCRIPT");
    expect(basePromptsSource).toContain('"Comfort Club"');
    expect(basePromptsSource).toContain('"Priority Club"');
  });

  it("SERVICE_AGENT_BASE_PROMPT includes exact response script for missing maintenance plan", () => {
    expect(basePromptsSource).toContain("We don't have a maintenance plan set up right now");
  });

  it("SERVICE_AGENT_BASE_PROMPT marks example prices as format-only, not literal values", () => {
    // Regression guard: bare '$189' was removed. Any remaining example must
    // be wrapped in a [SCRIPT EXAMPLE FORMAT] annotation.
    const servicePromptStart = basePromptsSource.indexOf("SERVICE_AGENT_BASE_PROMPT");
    const servicePromptBody = basePromptsSource.slice(servicePromptStart);
    // The old literal example: '"A full tune-up runs about $189"' must not exist
    expect(servicePromptBody).not.toMatch(/"A full tune-up runs about \$189"/);
  });

  it("agentBasePrompts includes diagnostic fee credit prohibition (regression: R13 QA)", () => {
    // Regression guard: AI invented 'diagnostic fee credited toward repair'
    // which is common HVAC practice NOT in tenant config.
    expect(basePromptsSource).toContain("diagnostic fee credited toward repair");
    expect(basePromptsSource).toContain("Do NOT say");
  });

  it("agentBasePrompts prohibits HVAC common practice assumptions", () => {
    // Should call out the HVAC/plumbing context explicitly
    expect(basePromptsSource).toContain("HVAC/plumbing");
  });

  it("agentBasePrompts requires address collection for on-site services (plumbing/HVAC/electrical)", () => {
    // For on-site businesses (plumbing, HVAC, electrical), AI MUST ask for customer address.
    // Without the address, bookings are unusable — the business can't go to the customer.
    // Regression guard: if this rule is removed, all plumbing bookings fail silently.
    expect(basePromptsSource).toContain("COLLECT ADDRESS FOR ON-SITE SERVICES");
    expect(basePromptsSource).toContain("plumbing");
    expect(basePromptsSource).toContain("customer_address");
    // The rule must say MUST (not should) to ensure AI always collects it
    expect(basePromptsSource).toContain("MUST ask");
  });

  it("agentBasePrompts requires customer_address for on-site bookings in create_booking params", () => {
    // Verify the create_booking parameter guidance explicitly mentions customer_address
    // for on-site services, not just as a generic optional parameter.
    expect(basePromptsSource).toContain("ALWAYS include customer_address for on-site services");
    expect(basePromptsSource).toContain("HVAC, plumbing, electrical");
  });
});

describe("buildSystemPrompt — emergency surcharge disclosure (regression: R13 QA)", () => {
  it("injects emergency_surcharge into POLICIES section when set", () => {
    // Regression guard: after-hours surcharge was not disclosed to callers.
    // Fix: ctx.ai_settings.emergency_surcharge must appear in POLICIES block.
    expect(fnBody).toContain("emergencySurcharge");
    expect(fnBody).toContain("After-hours/emergency surcharge");
    expect(fnBody).toContain("DISCLOSE THIS");
  });

  it("emergency_surcharge gate condition includes it in hasAnyPolicy check", () => {
    expect(fnBody).toContain("emergencySurcharge || customPolicies");
  });
});

describe("buildSystemPrompt — STRICT ACCURACY RULES completeness (regression: R13 QA)", () => {
  const strictStart = fnBody.indexOf("STRICT ACCURACY RULES");
  const strictSection = fnBody.slice(strictStart, strictStart + 3000);

  it("prohibits inventing diagnostic fee credit policy", () => {
    // Common HVAC practice: AI assumes this without config data
    expect(strictSection).toContain("diagnostic fee credited toward repair");
  });

  it("prohibits claiming years in business when not configured", () => {
    expect(strictSection).toContain("years_in_business");
    expect(strictSection).toContain("NOT CONFIGURED");
  });

  it("provides exact fallback script for unconfigured years_in_business (regression: plumbing R5 — AI invented '11 years')", () => {
    // AI said "11 years" when years_in_business was NULL. The rule must provide
    // an EXACT phrase to use so the AI doesn't invent a number.
    // "We've been serving the area for years" is the approved fallback.
    expect(strictSection).toContain("We've been serving the area for years");
    expect(strictSection).toContain("NEVER invent a number");
  });

  it("BUSINESS INFORMATION block shows 'NOT CONFIGURED' when years_in_business is null", () => {
    // The prompt generation code must explicitly render the NOT CONFIGURED text
    // when ctx.tenant.years_in_business is falsy. This is what the AI reads.
    expect(fnBody).toContain("NOT CONFIGURED — never state or guess a number of years");
  });
});

describe("buildSystemPrompt — SERVICES anti-fabrication rule (regression: R15 QA — handoff #460)", () => {
  // AI was fabricating "$29 air filter replacement" when customer asked about AC tune-up.
  // Root cause: anti-fabrication rules covered pricing/deposits/promos but NOT services.
  // Fix: added explicit SERVICES rule in buildBusinessContext.ts (commit 756c0b6).

  const strictStart = fnBody.indexOf("STRICT ACCURACY RULES");
  const strictSection = fnBody.slice(strictStart, strictStart + 5000);

  it("prohibits suggesting services not in catalog", () => {
    expect(strictSection).toContain("Do NOT suggest, offer, or quote any service not explicitly listed in the SERVICES AND PRICING section");
  });

  it("names HVAC examples of commonly-invented unlisted services", () => {
    // Naming specific examples prevents the AI from rationalizing that
    // "air filter replacement" is too obvious to avoid.
    expect(strictSection).toContain("air filter replacement");
  });

  it("names auto repair example of commonly-invented unlisted service", () => {
    expect(strictSection).toContain("brake flush");
  });

  it("provides response script when unlisted service is requested", () => {
    // AI must use this exact script rather than inventing a price/service.
    expect(strictSection).toContain("I'd need to have someone from our team call you to discuss that service");
  });

  it("SERVICES rule gates on SERVICES AND PRICING section (not freeform)", () => {
    // The rule must reference the exact section name so AI knows which data to check.
    expect(strictSection).toContain("SERVICES AND PRICING section");
  });
});

describe("buildSystemPrompt — DISCOUNTS anti-fabrication rule (regression: plumbing R5 QA — '10% courtesy discount')", () => {
  // AI was fabricating a "10% courtesy discount" under pricing pressure.
  // Root cause: STRICT ACCURACY RULES listed "military, senior, first-time" but NOT "courtesy".
  // AI rationalized it could offer a courtesy discount since it wasn't explicitly prohibited.
  // Fix: expanded prohibition list to include "courtesy" and added pressure escalation script.

  const strictStart = fnBody.indexOf("STRICT ACCURACY RULES");
  const strictSection = fnBody.slice(strictStart, strictStart + 5000);

  it("prohibits courtesy discounts specifically", () => {
    expect(strictSection).toContain("courtesy");
  });

  it("prohibits all discount categories including seasonal and promotional", () => {
    expect(strictSection).toContain("seasonal");
    expect(strictSection).toContain("promotional");
  });

  it("includes pricing pressure escalation script", () => {
    // AI must NOT invent a discount under price pressure — must escalate to callback.
    expect(strictSection).toContain("pushes back on price");
  });
});

describe("text-conversation — DISCOUNTS anti-fabrication rule (regression: plumbing R5 QA)", () => {
  const textConvPath = join(
    process.cwd(),
    "supabase/functions/text-conversation/index.ts"
  );
  const textConvSource = readFileSync(textConvPath, "utf-8");

  it("toolReinforcement DISCOUNTS rule covers 'courtesy' discounts", () => {
    // Regression guard: "10% courtesy discount" was fabricated by plumbing AI.
    // The word "courtesy" was absent from the prohibition list.
    expect(textConvSource).toContain("courtesy");
  });

  it("toolReinforcement DISCOUNTS rule covers all common fabricated discount types", () => {
    const antiFabStart = textConvSource.indexOf("ANTI-FABRICATION RULES");
    const antiFabBlock = textConvSource.slice(antiFabStart, antiFabStart + 2000);
    expect(antiFabBlock).toContain("military");
    expect(antiFabBlock).toContain("seasonal");
    expect(antiFabBlock).toContain("promotional");
    expect(antiFabBlock).toContain("courtesy");
  });

  it("toolReinforcement includes pricing pressure escalation to create_callback", () => {
    // When customer pushes back on price, AI must NOT invent discount.
    // Must use create_callback instead.
    expect(textConvSource).toContain("pushes back on pricing");
    expect(textConvSource).toContain("create_callback");
  });
});

describe("text-conversation — SERVICES anti-fabrication rule (regression: R15 QA)", () => {
  // The text channel also needs the SERVICES rule since it uses a separate
  // toolReinforcement prompt (not buildBusinessContext STRICT ACCURACY RULES).

  const textConvPath = join(
    process.cwd(),
    "supabase/functions/text-conversation/index.ts"
  );
  const textConvSource = readFileSync(textConvPath, "utf-8");

  it("toolReinforcement includes SERVICES anti-fabrication rule", () => {
    expect(textConvSource).toContain("SERVICES: ONLY mention, suggest, or quote services that appear in your services catalog");
  });

  it("names HVAC unlisted service examples to avoid (air filter, capacitor, freon)", () => {
    // Specific examples prevent the AI from rationalizing exceptions.
    expect(textConvSource).toContain("air filter replacement");
    expect(textConvSource).toContain("capacitor replacement");
    expect(textConvSource).toContain("freon recharge");
  });

  it("provides correct response script for unlisted services in text channel", () => {
    expect(textConvSource).toContain("I'd need to have someone from our team call you to discuss that service");
  });

  it("SERVICES rule appears in ANTI-FABRICATION RULES block", () => {
    // The SERVICES rule must be grouped with the other anti-fabrication rules,
    // not in a separate section that could be deprioritized.
    const antiFabStart = textConvSource.indexOf("ANTI-FABRICATION RULES");
    const antiFabBlock = textConvSource.slice(antiFabStart, antiFabStart + 2000);
    expect(antiFabBlock).toContain("SERVICES:");
  });
});

describe("buildServicesForPrompt — quote_only service rendering (regression: plumbing R5 — 'No-Phone-Quotes-Over-500')", () => {
  // Root cause of plumbing R5 (6/10): 6 services had price_type=fixed with amounts >$500
  // (Whole-House Repipe $4500, Tankless Water Heater $2800, etc.).
  // AI quoted exact amounts violating the "No-Phone-Quotes-Over-500" policy.
  // Fix: changed those services to quote_only in DB (receptionist_eng, 2026-03-06).
  // Regression guard: ensure quote_only services render "Quote required" not a dollar amount.

  const buildBizContextPath = join(
    process.cwd(),
    "supabase/functions/_shared/buildBusinessContext.ts"
  );
  const buildBizSource = readFileSync(buildBizContextPath, "utf-8");

  it("quote_only price_type falls through to 'Quote required' in buildServicesForPrompt", () => {
    // The function must have a branch that produces "Quote required" text.
    // This is the text shown for quote_only services in the AI's SERVICES AND PRICING section.
    const fnStart = buildBizSource.indexOf("function buildServicesForPrompt(");
    const fnEnd = buildBizSource.indexOf("\nfunction ", fnStart + 10);
    const fnBody = buildBizSource.slice(fnStart, fnEnd > 0 ? fnEnd : fnStart + 5000);
    expect(fnBody).toContain("Quote required");
  });

  it("fixed price_type with price_amount renders a dollar amount (positive case)", () => {
    // Ensure fixed-price services still show actual prices so the AI can quote them
    const fnStart = buildBizSource.indexOf("function buildServicesForPrompt(");
    const fnEnd = buildBizSource.indexOf("\nfunction ", fnStart + 10);
    const fnBody = buildBizSource.slice(fnStart, fnEnd > 0 ? fnEnd : fnStart + 5000);
    expect(fnBody).toContain("exact price");
  });

  it("price cap policy detection checks for 'over'/'above'/'exceed' keywords", () => {
    // The priceCapPolicy detection must catch "No-Phone-Quotes-Over-500" type policies.
    // Detection logic in buildSystemPrompt: text.includes("over") || text.includes("above") || text.includes("exceed")
    expect(buildBizSource).toContain('text.includes("over") || text.includes("above") || text.includes("exceed")');
  });

  it("price cap policy detection checks for 'quote'/'price' keywords", () => {
    // Policy must also include price/quote keywords so it's not triggered by unrelated "over" mentions
    expect(buildBizSource).toContain('text.includes("quote") || text.includes("price")');
  });

  it("price cap policy triggers POLICY OVERRIDE in critical rules section", () => {
    // When a price cap policy is found, the prompt must include a POLICY OVERRIDE warning
    // so the AI knows to offer callbacks instead of quoting high-value services.
    expect(buildBizSource).toContain("POLICY OVERRIDE");
    expect(buildBizSource).toContain("do NOT quote the price directly");
  });

  it("price cap policy adjusts SERVICES AND PRICING note to remind AI to check policies", () => {
    // When price cap policy exists: pricingNote changes to warn about in-person estimates
    expect(buildBizSource).toContain("CHECK POLICIES before quoting");
    expect(buildBizSource).toContain("Some services may require an in-person estimate");
  });
});

describe("buildServicesForPrompt — quote_required tag output (regression: plumbing R5)", () => {
  // Verify the normalizeServices() function maps price_type='quote_only' → price_type='quote_required'
  // before passing to buildServicesForPrompt. This is the bridge between DB and prompt generation.

  const buildBizContextPath = join(
    process.cwd(),
    "supabase/functions/_shared/buildBusinessContext.ts"
  );
  const buildBizSource = readFileSync(buildBizContextPath, "utf-8");

  it("normalizeServices maps quote_only DB value to quote_required prompt value", () => {
    // In normalizeServices: price_type === "quote_only" → priceType = "quote_required"
    expect(buildBizSource).toContain('price_type === "quote_only"');
    expect(buildBizSource).toContain('priceType = "quote_required"');
  });

  it("getTextPriceDescription returns 'quote required' string for quote_required type", () => {
    // The utility used to describe prices in text also handles quote_required
    expect(buildBizSource).toContain('"quote required"');
  });
});

describe("buildSystemPrompt — WARRANTY anti-fabrication rule (regression: plumbing R6 — 'all repairs have 1-year warranty')", () => {
  // QA Round 6: AI claimed "ALL repairs have a 1-year warranty" when only some services have warranty.
  // Root cause: STRICT ACCURACY RULES had no warranty-specific prohibition.
  // Fix: added WARRANTY rule to prohibit blanket warranty claims.

  const buildBizContextPath = join(
    process.cwd(),
    "supabase/functions/_shared/buildBusinessContext.ts"
  );
  const buildBizSource = readFileSync(buildBizContextPath, "utf-8");

  const strictStart = buildBizSource.indexOf("STRICT ACCURACY RULES");
  const strictSection = buildBizSource.slice(strictStart, strictStart + 6000);

  it("prohibits blanket warranty claims across all services", () => {
    expect(strictSection).toContain("WARRANTIES:");
  });

  it("requires warranty to be tied to a specific service in data", () => {
    expect(strictSection).toContain("explicitly listed for a specific service");
  });

  it("prohibits the specific 'all our work is guaranteed' fabrication", () => {
    expect(strictSection).toContain("1-year warranty");
  });
});

describe("buildSystemPrompt — SAVINGS CLAIMS anti-fabrication rule (regression: plumbing R6 — '20-30% savings')", () => {
  // QA Round 6: AI claimed customers could save 20-30% vs competitors. This is fabrication.
  // Root cause: No rule prohibiting savings % comparisons.

  const buildBizContextPath = join(
    process.cwd(),
    "supabase/functions/_shared/buildBusinessContext.ts"
  );
  const buildBizSource = readFileSync(buildBizContextPath, "utf-8");

  const strictStart = buildBizSource.indexOf("STRICT ACCURACY RULES");
  const strictSection = buildBizSource.slice(strictStart, strictStart + 6000);

  it("prohibits savings percentage comparisons", () => {
    expect(strictSection).toContain("SAVINGS CLAIMS:");
  });

  it("prohibits specific savings fabrication examples", () => {
    expect(strictSection).toContain("20-30%");
  });
});

describe("buildSystemPrompt — FREE SERVICES anti-fabrication rule (regression: plumbing R6 — 'free second opinion')", () => {
  // QA Round 6: AI offered a free second opinion not in business data.

  const buildBizContextPath = join(
    process.cwd(),
    "supabase/functions/_shared/buildBusinessContext.ts"
  );
  const buildBizSource = readFileSync(buildBizContextPath, "utf-8");

  const strictStart = buildBizSource.indexOf("STRICT ACCURACY RULES");
  const strictSection = buildBizSource.slice(strictStart, strictStart + 6000);

  it("prohibits fabricated free services", () => {
    expect(strictSection).toContain("FREE SERVICES:");
  });

  it("specifically prohibits free second opinion", () => {
    expect(strictSection).toContain("free second opinion");
  });
});

describe("buildSystemPrompt — POST-BOOKING anti-fabrication rule (regression: plumbing R6 — booking flow appends promotions)", () => {
  // QA Round 6: After booking confirmed, AI appended fabricated promotions/discounts.
  // Fix: POST-BOOKING rule prohibits volunteering offers not in data after confirmation.

  const buildBizContextPath = join(
    process.cwd(),
    "supabase/functions/_shared/buildBusinessContext.ts"
  );
  const buildBizSource = readFileSync(buildBizContextPath, "utf-8");

  const strictStart = buildBizSource.indexOf("STRICT ACCURACY RULES");
  const strictSection = buildBizSource.slice(strictStart, strictStart + 6000);

  it("prohibits post-booking promotion volunteering", () => {
    expect(strictSection).toContain("POST-BOOKING:");
  });
});

describe("buildSystemPrompt — REFERRAL PROGRAMS anti-fabrication rule (regression: plumbing R6 — '$25 referral program')", () => {
  // QA Round 6: AI invented a $25 referral program not in business data.

  const buildBizContextPath = join(
    process.cwd(),
    "supabase/functions/_shared/buildBusinessContext.ts"
  );
  const buildBizSource = readFileSync(buildBizContextPath, "utf-8");

  const strictStart = buildBizSource.indexOf("STRICT ACCURACY RULES");
  const strictSection = buildBizSource.slice(strictStart, strictStart + 6000);

  it("prohibits referral program fabrication", () => {
    expect(strictSection).toContain("REFERRAL PROGRAMS:");
  });
});

describe("text-conversation — WARRANTY/SAVINGS/FREE/POST-BOOKING anti-fabrication rules (regression: plumbing R6)", () => {
  // QA Round 6 (handoff #471): AI fabricated warranty, savings %, free second opinion,
  // and post-booking promotions. These rules must also exist in text-conversation toolReinforcement.

  const textConvPath = join(
    process.cwd(),
    "supabase/functions/text-conversation/index.ts"
  );
  const textConvSource = readFileSync(textConvPath, "utf-8");

  const antiFabStart = textConvSource.indexOf("ANTI-FABRICATION RULES");
  const antiFabBlock = textConvSource.slice(antiFabStart, antiFabStart + 3000);

  it("toolReinforcement includes WARRANTY anti-fabrication rule", () => {
    expect(antiFabBlock).toContain("WARRANTIES:");
  });

  it("toolReinforcement prohibits blanket warranty claims", () => {
    expect(antiFabBlock).toContain("explicitly listed for a specific service");
  });

  it("toolReinforcement includes SAVINGS CLAIMS prohibition", () => {
    expect(antiFabBlock).toContain("SAVINGS CLAIMS:");
  });

  it("toolReinforcement includes FREE SERVICES prohibition", () => {
    expect(antiFabBlock).toContain("FREE SERVICES:");
  });

  it("toolReinforcement includes POST-BOOKING silence rule", () => {
    expect(antiFabBlock).toContain("POST-BOOKING");
  });

  it("toolReinforcement prohibits referral programs (regression: $25 referral program)", () => {
    expect(antiFabBlock).toContain("referral");
  });
});
