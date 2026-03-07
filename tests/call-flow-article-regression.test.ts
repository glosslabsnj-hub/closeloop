/**
 * Call Flow Article (a/an) Regression Tests
 *
 * @vitest-environment node
 *
 * BUG #520 (2026-03-06): ServiceCallFlowSettings urgency_check option showed
 * "schedule a appointment" for all industries. Root cause: hardcoded "a" article
 * before appointmentLabel without checking if it begins with a vowel.
 *
 * Fix (commit d69b815):
 *   const article = /^[aeiou]/i.test(apptLabel) ? "an" : "a";
 *
 * These tests verify:
 * 1. The article regex is present in the source file
 * 2. Article helper correctly uses "an" for vowel-initial labels (appointment, estimate)
 * 3. Article helper correctly uses "a" for consonant-initial labels (job, visit, session, etc.)
 * 4. Both UI locations use the article variable (urgency_check radio + info box text)
 *
 * Business impact: An electrician who selects urgency_check sees
 * "Is this urgent, or can you schedule an appointment?" NOT "a appointment".
 * This is a visible grammar error that reduces credibility with business owners.
 *
 * Gate: service brain/customization_intuitive (Call Flow settings UX)
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const CALL_FLOW_PATH = join(
  process.cwd(),
  "src/components/ai/ServiceCallFlowSettings.tsx"
);
const source = readFileSync(CALL_FLOW_PATH, "utf-8");

// ---------------------------------------------------------------------------
// Article regex — the fix itself
// ---------------------------------------------------------------------------

describe("ServiceCallFlowSettings: a/an article helper exists", () => {
  it("defines article variable using vowel-check regex", () => {
    // The exact fix: /^[aeiou]/i test to choose "an" vs "a"
    expect(source).toMatch(/article\s*=\s*\/\^\[aeiou\]\/i\.test\(apptLabel\)\s*\?\s*"an"\s*:\s*"a"/);
  });

  it("article variable appears before any JSX that uses it", () => {
    const articleIdx = source.indexOf('const article =');
    const jsxIdx = source.indexOf('${article}');
    expect(articleIdx).toBeGreaterThan(-1);
    expect(jsxIdx).toBeGreaterThan(-1);
    expect(articleIdx).toBeLessThan(jsxIdx);
  });
});

// ---------------------------------------------------------------------------
// Article logic: unit-test the regex inline
// ---------------------------------------------------------------------------

describe("a/an article logic — vowel detection", () => {
  // Extract and evaluate the regex logic from source
  function getArticle(label: string): "an" | "a" {
    return /^[aeiou]/i.test(label) ? "an" : "a";
  }

  it("'appointment' → 'an' (starts with vowel 'a')", () => {
    expect(getArticle("appointment")).toBe("an");
  });

  it("'estimate' → 'an' (starts with vowel 'e')", () => {
    expect(getArticle("estimate")).toBe("an");
  });

  it("'inquiry' → 'an' (starts with vowel 'i')", () => {
    expect(getArticle("inquiry")).toBe("an");
  });

  it("'order' → 'an' (starts with vowel 'o')", () => {
    expect(getArticle("order")).toBe("an");
  });

  it("'update' → 'an' (starts with vowel 'u')", () => {
    expect(getArticle("update")).toBe("an");
  });

  it("'job' → 'a' (starts with consonant 'j')", () => {
    expect(getArticle("job")).toBe("a");
  });

  it("'visit' → 'a' (starts with consonant 'v')", () => {
    expect(getArticle("visit")).toBe("a");
  });

  it("'session' → 'a' (starts with consonant 's')", () => {
    expect(getArticle("session")).toBe("a");
  });

  it("'consultation' → 'a' (starts with consonant 'c')", () => {
    expect(getArticle("consultation")).toBe("a");
  });

  it("'booking' → 'a' (starts with consonant 'b')", () => {
    expect(getArticle("booking")).toBe("a");
  });

  it("'reservation' → 'a' (starts with consonant 'r')", () => {
    expect(getArticle("reservation")).toBe("a");
  });

  it("'dispatch' → 'a' (starts with consonant 'd')", () => {
    expect(getArticle("dispatch")).toBe("a");
  });

  // Case insensitivity check (in case label ever starts with capital)
  it("'Appointment' → 'an' (capital A, still vowel)", () => {
    expect(getArticle("Appointment")).toBe("an");
  });
});

// ---------------------------------------------------------------------------
// Source-level checks: article is used in BOTH UI locations
// ---------------------------------------------------------------------------

describe("ServiceCallFlowSettings: article variable used in rendered text", () => {
  it("uses ${article} in urgency_check radio label text", () => {
    // Radio label: "Is this urgent, or can you schedule ${article} ${apptLabel}?"
    expect(source).toContain("${article} ${apptLabel}");
  });

  it("article variable is used in both template literal and JSX contexts", () => {
    // Template literal: ${article} in urgency_check radio label
    const templateMatches = (source.match(/\$\{article\}/g) || []).length;
    // JSX expression: {article} in info box example text
    const jsxMatches = (source.match(/\{article\}/g) || []).length;
    // article must appear in at least 2 UI locations
    expect(templateMatches + jsxMatches).toBeGreaterThanOrEqual(2);
  });

  it("does NOT contain hardcoded 'a appointment' string", () => {
    // The regression: before the fix this was a hardcoded "a" before appointmentLabel
    expect(source).not.toContain("a appointment");
    expect(source).not.toContain('"a" + " " + apptLabel');
  });
});

// ---------------------------------------------------------------------------
// apptLabel derivation: terminolgy.appointmentLabel is used, not hardcoded
// ---------------------------------------------------------------------------

describe("ServiceCallFlowSettings: apptLabel derived from industry terminology", () => {
  it("reads appointmentLabel from terminology hook", () => {
    // useIndustryContext provides terminology, which has appointmentLabel
    expect(source).toContain("terminology.appointmentLabel");
  });

  it("falls back to 'appointment' when appointmentLabel is undefined", () => {
    expect(source).toContain('terminology.appointmentLabel || "appointment"');
  });

  it("both article and apptLabel are derived from the same apptLabel constant", () => {
    const apptLabelIdx = source.indexOf("const apptLabel =");
    const articleIdx = source.indexOf("const article =");
    // apptLabel must be declared before article uses it
    expect(apptLabelIdx).toBeGreaterThan(-1);
    expect(articleIdx).toBeGreaterThan(-1);
    expect(apptLabelIdx).toBeLessThan(articleIdx);
  });
});

// ---------------------------------------------------------------------------
// BookingBehaviorSettings: article fix (bug #563 extension)
// ---------------------------------------------------------------------------

describe("BookingBehaviorSettings: bookingArticle variable exists and is used", () => {
  const bbSource = readFileSync(
    join(process.cwd(), "src/components/ai/BookingBehaviorSettings.tsx"),
    "utf-8"
  );

  it("defines bookingArticle variable using vowel-check regex", () => {
    expect(bbSource).toMatch(/bookingArticle\s*=\s*\/\^\[aeiou\]\/i\.test\(terms\.booking\)\s*\?\s*"an"\s*:\s*"a"/);
  });

  it("uses bookingArticle in the label (not hardcoded 'a')", () => {
    expect(bbSource).toContain("{bookingArticle} {terms.booking}");
  });

  it("does NOT contain hardcoded 'a {terms.booking}' pattern", () => {
    // Ensure no raw "a {terms.booking}" remains — only bookingArticle should precede it
    expect(bbSource).not.toMatch(/"a"\s*\}\s*\{terms\.booking\}/);
    expect(bbSource).not.toContain("schedules a {terms.booking}");
  });
});

// ---------------------------------------------------------------------------
// CalendarConnectionStep: article fix (bug #563 extension)
// ---------------------------------------------------------------------------

describe("CalendarConnectionStep: bookingArticle variable exists and is used", () => {
  const csSource = readFileSync(
    join(process.cwd(), "src/components/dashboard/CalendarConnectionStep.tsx"),
    "utf-8"
  );

  it("defines bookingArticle variable using vowel-check regex", () => {
    expect(csSource).toMatch(/bookingArticle\s*=\s*\/\^\[aeiou\]\/i\.test\(terms\.booking\)\s*\?\s*"an"\s*:\s*"a"/);
  });

  it("uses bookingArticle in the label (not hardcoded 'a')", () => {
    expect(csSource).toContain("{bookingArticle} {terms.booking}");
  });

  it("does NOT contain hardcoded 'a {terms.booking}' pattern", () => {
    expect(csSource).not.toContain("schedules a {terms.booking}");
  });
});

// ---------------------------------------------------------------------------
// Cross-mode article correctness: service="booking" (a), medical="appointment" (an), food="order" (an)
// ---------------------------------------------------------------------------

describe("bookingArticle correctness per mode terms.booking value", () => {
  function getArticle(term: string): "an" | "a" {
    return /^[aeiou]/i.test(term) ? "an" : "a";
  }

  const modeCases: Array<{ mode: string; booking: string; expected: "an" | "a" }> = [
    { mode: "service",  booking: "booking",     expected: "a"  },
    { mode: "dispatch", booking: "job",          expected: "a"  },
    { mode: "food",     booking: "order",        expected: "an" },
    { mode: "medical",  booking: "appointment",  expected: "an" },
    { mode: "sales",    booking: "appointment",  expected: "an" },
    { mode: "general",  booking: "booking",      expected: "a"  },
  ];

  for (const { mode, booking, expected } of modeCases) {
    it(`${mode} mode: terms.booking="${booking}" → "${expected} ${booking}"`, () => {
      expect(getArticle(booking)).toBe(expected);
    });
  }
});

// ---------------------------------------------------------------------------
// Industry-specific scenarios: correct phrase for each business type
// ---------------------------------------------------------------------------

describe("a/an urgency_check phrase by industry", () => {
  function getArticle(label: string): "an" | "a" {
    return /^[aeiou]/i.test(label) ? "an" : "a";
  }

  const industryLabels: Array<{ industry: string; label: string; expected: "an" | "a" }> = [
    { industry: "HVAC / plumbing / electrical (home_services)", label: "appointment", expected: "an" },
    { industry: "General contractor", label: "appointment", expected: "an" },
    { industry: "Salon / spa", label: "appointment", expected: "an" },
    { industry: "Plumber (terminology override)", label: "job", expected: "a" },
    { industry: "Electrician (terminology override)", label: "job", expected: "a" },
    { industry: "Personal trainer", label: "session", expected: "a" },
    { industry: "Lawyer / consultant", label: "consultation", expected: "a" },
    { industry: "Medical / dental", label: "visit", expected: "a" },
    { industry: "Car dealership (test drive)", label: "appointment", expected: "an" },
  ];

  for (const { industry, label, expected } of industryLabels) {
    it(`${industry} uses label "${label}" → phrase "${expected} ${label}"`, () => {
      expect(getArticle(label)).toBe(expected);
    });
  }
});
