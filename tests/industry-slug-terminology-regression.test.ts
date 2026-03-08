/**
 * Industry Slug Terminology Regression Tests
 *
 * @vitest-environment node
 *
 * UX session (2026-03-08): Added SLUG_OVERRIDES for 13 new industries in
 * industryTerminology.ts (cleaning, auto_repair, landscaping, painting,
 * pest_control, locksmith, moving, carpet_cleaning, pool_service, pressure_washing,
 * junk_removal, tree_service, general_contractor, roofing, handyman).
 *
 * Also fixed getIndustryTerminology() call sites to pass slug+category so
 * slug overrides actually resolve.
 *
 * These tests verify:
 * 1. SLUG_OVERRIDES keys return correct terminology via getIndustryTerminology()
 * 2. appointmentLabel overrides work (general_contractor=estimate, roofing=inspection)
 * 3. teamMemberLabel overrides work (handyman=handyman, cleaning=cleaner, etc.)
 * 4. catalogCardTitle/servicesLabel/addItemButton use industry-native language
 * 5. Both underscore (_) and hyphen (-) slug aliases resolve identically
 * 6. Slug overrides take priority over category overrides (3-tier chain)
 * 7. indefiniteArticle() gives correct "an" for estimate/inspection (grammar fix)
 *
 * Business impact: A general contractor sees "Schedule an estimate" not
 * "Schedule a estimate". A pool tech sees "Your Pool Services" not generic
 * "Your Services". These are UX quality signals visible to every business owner.
 *
 * Gate: service onboarding/correct_terminology + brain/customization_intuitive
 */
import { describe, it, expect } from "vitest";
import { getIndustryTerminology } from "../src/data/industryTerminology";
import { indefiniteArticle } from "../src/lib/utils";

// ─── indefiniteArticle: grammar fix regression ─────────────────────────────
// BUG: a estimate → an estimate, a inspection → an inspection

describe("indefiniteArticle: grammar correctness for industry appointmentLabels", () => {
  // Vowel-starting labels (need "an")
  const vowelLabels = [
    "appointment",
    "estimate",
    "inspection",
    "inquiry",
    "order",
    "intake",
    "event",
  ];

  for (const label of vowelLabels) {
    it(`"${label}" → "an" (starts with vowel)`, () => {
      expect(indefiniteArticle(label)).toBe("an");
    });
  }

  // Consonant-starting labels (need "a")
  const consonantLabels = [
    "job",
    "booking",
    "visit",
    "session",
    "consultation",
    "dispatch",
    "reservation",
    "showing",
    "call",
    "service",
  ];

  for (const label of consonantLabels) {
    it(`"${label}" → "a" (starts with consonant)`, () => {
      expect(indefiniteArticle(label)).toBe("a");
    });
  }

  it("handles empty string without throwing", () => {
    expect(indefiniteArticle("")).toBe("a");
  });

  it("is case-insensitive (Estimate → an)", () => {
    expect(indefiniteArticle("Estimate")).toBe("an");
  });

  it("is case-insensitive (Job → a)", () => {
    expect(indefiniteArticle("Job")).toBe("a");
  });
});

// ─── general_contractor: appointmentLabel=estimate ─────────────────────────

describe("getIndustryTerminology: general_contractor slug", () => {
  const t = getIndustryTerminology("service", "home_services", "general_contractor");

  it("appointmentLabel is 'estimate'", () => {
    expect(t.appointmentLabel).toBe("estimate");
  });

  it("teamMemberLabel is 'project manager'", () => {
    expect(t.teamMemberLabel).toBe("project manager");
  });

  it("servicesLabel mentions estimates", () => {
    expect(t.servicesLabel.toLowerCase()).toContain("estimate");
  });

  it("exampleServices includes remodel/addition type work", () => {
    const services = t.exampleServices.join(" ").toLowerCase();
    expect(services).toMatch(/remodel|addition|deck|kitchen/);
  });

  it("exampleFAQs mention licensed/insured or permits", () => {
    const faqs = t.exampleFAQs.join(" ").toLowerCase();
    expect(faqs).toMatch(/licensed|insured|permit/);
  });

  it("grammar fix: 'an estimate' not 'a estimate'", () => {
    const article = indefiniteArticle(t.appointmentLabel);
    expect(`${article} ${t.appointmentLabel}`).toBe("an estimate");
  });
});

// ─── roofing: appointmentLabel=inspection ──────────────────────────────────

describe("getIndustryTerminology: roofing slug", () => {
  const t = getIndustryTerminology("service", "home_services", "roofing");

  it("appointmentLabel is 'inspection'", () => {
    expect(t.appointmentLabel).toBe("inspection");
  });

  it("teamMemberLabel is 'crew'", () => {
    expect(t.teamMemberLabel).toBe("crew");
  });

  it("exampleServices include free inspection option", () => {
    const services = t.exampleServices.join(" ").toLowerCase();
    expect(services).toMatch(/inspect|inspect|repair|shingle|replacement/);
  });

  it("grammar fix: 'an inspection' not 'a inspection'", () => {
    const article = indefiniteArticle(t.appointmentLabel);
    expect(`${article} ${t.appointmentLabel}`).toBe("an inspection");
  });
});

// ─── handyman: teamMemberLabel=handyman ────────────────────────────────────

describe("getIndustryTerminology: handyman slug", () => {
  const t = getIndustryTerminology("service", "home_services", "handyman");

  it("teamMemberLabel is 'handyman'", () => {
    expect(t.teamMemberLabel).toBe("handyman");
  });

  it("exampleServices include repair/mounting type work", () => {
    const services = t.exampleServices.join(" ").toLowerCase();
    expect(services).toMatch(/repair|mount|assembl|day/);
  });

  it("exampleFAQs address how they charge (hourly/job)", () => {
    const faqs = t.exampleFAQs.join(" ").toLowerCase();
    expect(faqs).toMatch(/hourly|job|charge/);
  });
});

// ─── cleaning: teamMemberLabel=cleaner ─────────────────────────────────────

describe("getIndustryTerminology: cleaning slug", () => {
  const t = getIndustryTerminology("service", "home_services", "cleaning");

  it("catalogCardTitle is 'Your Cleaning Services'", () => {
    expect(t.catalogCardTitle).toBe("Your Cleaning Services");
  });

  it("teamMemberLabel is 'cleaner'", () => {
    expect(t.teamMemberLabel).toBe("cleaner");
  });

  it("exampleServices include deep cleaning and move-in/out", () => {
    const services = t.exampleServices.join(" ").toLowerCase();
    expect(services).toMatch(/deep|move|office|standard/);
  });

  it("exampleFAQs mention supplies or recurring discounts", () => {
    const faqs = t.exampleFAQs.join(" ").toLowerCase();
    expect(faqs).toMatch(/supplies|recurring|discount|long/);
  });
});

// ─── locksmith: teamMemberLabel=locksmith ──────────────────────────────────

describe("getIndustryTerminology: locksmith slug", () => {
  const t = getIndustryTerminology("service", "home_services", "locksmith");

  it("catalogCardTitle is 'Your Services'", () => {
    expect(t.catalogCardTitle).toBe("Your Services");
  });

  it("teamMemberLabel is 'locksmith'", () => {
    expect(t.teamMemberLabel).toBe("locksmith");
  });

  it("exampleServices include lockout and car key programming", () => {
    const services = t.exampleServices.join(" ").toLowerCase();
    expect(services).toMatch(/lockout|rekey|car key|deadbolt/);
  });

  it("exampleFAQs mention response time or trip fee", () => {
    const faqs = t.exampleFAQs.join(" ").toLowerCase();
    expect(faqs).toMatch(/response|trip fee|quickly/);
  });
});

// ─── moving: teamMemberLabel=mover ─────────────────────────────────────────

describe("getIndustryTerminology: moving slug", () => {
  const t = getIndustryTerminology("service", "home_services", "moving");

  it("catalogCardTitle is 'Your Moving Services'", () => {
    expect(t.catalogCardTitle).toBe("Your Moving Services");
  });

  it("teamMemberLabel is 'mover'", () => {
    expect(t.teamMemberLabel).toBe("mover");
  });

  it("exampleServices include local and long-distance moves", () => {
    const services = t.exampleServices.join(" ").toLowerCase();
    expect(services).toMatch(/local|long-distance|packing|storage/);
  });
});

// ─── carpet_cleaning: teamMemberLabel=technician ───────────────────────────

describe("getIndustryTerminology: carpet_cleaning slug", () => {
  const t = getIndustryTerminology("service", "home_services", "carpet_cleaning");

  it("catalogCardTitle is 'Your Services'", () => {
    expect(t.catalogCardTitle).toBe("Your Services");
  });

  it("teamMemberLabel is 'technician'", () => {
    expect(t.teamMemberLabel).toBe("technician");
  });

  it("exampleServices include stain treatment and pet odor", () => {
    const services = t.exampleServices.join(" ").toLowerCase();
    expect(services).toMatch(/stain|pet|upholstery|carpet/);
  });

  it("exampleFAQs mention drying time", () => {
    const faqs = t.exampleFAQs.join(" ").toLowerCase();
    expect(faqs).toMatch(/dry|pet|furniture/);
  });
});

// ─── pool_service: teamMemberLabel=pool tech ───────────────────────────────

describe("getIndustryTerminology: pool_service slug", () => {
  const t = getIndustryTerminology("service", "home_services", "pool_service");

  it("catalogCardTitle is 'Your Pool Services'", () => {
    expect(t.catalogCardTitle).toBe("Your Pool Services");
  });

  it("teamMemberLabel is 'pool tech'", () => {
    expect(t.teamMemberLabel).toBe("pool tech");
  });

  it("exampleServices include opening/closing and equipment repair", () => {
    const services = t.exampleServices.join(" ").toLowerCase();
    expect(services).toMatch(/open|clos|clean|equipment|acid/);
  });
});

// ─── tree_service: teamMemberLabel=crew ────────────────────────────────────

describe("getIndustryTerminology: tree_service slug", () => {
  const t = getIndustryTerminology("service", "home_services", "tree_service");

  it("catalogCardTitle is 'Your Tree Services'", () => {
    expect(t.catalogCardTitle).toBe("Your Tree Services");
  });

  it("teamMemberLabel is 'crew'", () => {
    expect(t.teamMemberLabel).toBe("crew");
  });

  it("exampleServices include removal and stump grinding", () => {
    const services = t.exampleServices.join(" ").toLowerCase();
    expect(services).toMatch(/remov|trim|stump|emergency/);
  });
});

// ─── junk_removal: teamMemberLabel=crew member ────────────────────────────

describe("getIndustryTerminology: junk_removal slug", () => {
  const t = getIndustryTerminology("service", "home_services", "junk_removal");

  it("catalogCardTitle is 'Your Services'", () => {
    expect(t.catalogCardTitle).toBe("Your Services");
  });

  it("teamMemberLabel is 'crew member'", () => {
    expect(t.teamMemberLabel).toBe("crew member");
  });

  it("exampleServices include full load and estate cleanout", () => {
    const services = t.exampleServices.join(" ").toLowerCase();
    expect(services).toMatch(/load|estate|construction|single/);
  });
});

// ─── painting: teamMemberLabel=painter ─────────────────────────────────────

describe("getIndustryTerminology: painting slug", () => {
  const t = getIndustryTerminology("service", "home_services", "painting");

  it("catalogCardTitle is 'Your Painting Services'", () => {
    expect(t.catalogCardTitle).toBe("Your Painting Services");
  });

  it("teamMemberLabel is 'painter'", () => {
    expect(t.teamMemberLabel).toBe("painter");
  });

  it("exampleServices include interior and exterior painting", () => {
    const services = t.exampleServices.join(" ").toLowerCase();
    expect(services).toMatch(/interior|exterior|cabinet|deck/);
  });
});

// ─── landscaping: teamMemberLabel=crew member ──────────────────────────────

describe("getIndustryTerminology: landscaping slug", () => {
  const t = getIndustryTerminology("service", "home_services", "landscaping");

  it("servicesLabel is 'Lawn & Landscaping Services'", () => {
    expect(t.servicesLabel).toBe("Lawn & Landscaping Services");
  });

  it("teamMemberLabel is 'crew member'", () => {
    expect(t.teamMemberLabel).toBe("crew member");
  });

  it("exampleServices include mowing and seasonal cleanup", () => {
    const services = t.exampleServices.join(" ").toLowerCase();
    expect(services).toMatch(/mow|trim|mulch|seasonal|landscape/);
  });
});

// ─── pest_control: exampleServices override ────────────────────────────────

describe("getIndustryTerminology: pest_control slug", () => {
  const t = getIndustryTerminology("service", "home_services", "pest_control");

  it("exampleServices include termite inspection and quarterly plan", () => {
    const services = t.exampleServices.join(" ").toLowerCase();
    expect(services).toMatch(/termite|rodent|bed bug|quarterly/);
  });

  it("exampleFAQs mention pet safety and warranty", () => {
    const faqs = t.exampleFAQs.join(" ").toLowerCase();
    expect(faqs).toMatch(/pet|warrant|treatment/);
  });
});

// ─── pressure_washing: exampleServices override ────────────────────────────

describe("getIndustryTerminology: pressure_washing slug", () => {
  const t = getIndustryTerminology("service", "home_services", "pressure_washing");

  it("exampleServices include driveway and house wash", () => {
    const services = t.exampleServices.join(" ").toLowerCase();
    expect(services).toMatch(/driveway|house|deck|fence|commercial/);
  });

  it("exampleFAQs address how long it takes", () => {
    const faqs = t.exampleFAQs.join(" ").toLowerCase();
    expect(faqs).toMatch(/long|hot|package|deal/);
  });
});

// ─── auto_repair: both slug aliases resolve identically ────────────────────

describe("getIndustryTerminology: auto_repair slug aliases", () => {
  it("underscore slug (auto_repair) resolves", () => {
    const t = getIndustryTerminology("service", "automotive", "auto_repair");
    expect(t.catalogCardTitle).toBe("Your Repair Services");
    expect(t.teamMemberLabel).toBe("technician");
  });

  it("hyphen slug (auto-repair) resolves identically", () => {
    const t1 = getIndustryTerminology("service", "automotive", "auto_repair");
    const t2 = getIndustryTerminology("service", "automotive", "auto-repair");
    expect(t1.catalogCardTitle).toBe(t2.catalogCardTitle);
    expect(t1.teamMemberLabel).toBe(t2.teamMemberLabel);
    expect(t1.exampleServices).toEqual(t2.exampleServices);
  });

  it("exampleServices include oil change and brake service", () => {
    const t = getIndustryTerminology("service", "automotive", "auto_repair");
    const services = t.exampleServices.join(" ").toLowerCase();
    expect(services).toMatch(/oil change|brake|diagnostic|tune/);
  });
});

// ─── 3-tier priority: slug > category > mode default ───────────────────────

describe("getIndustryTerminology: 3-tier resolution priority", () => {
  it("slug override wins over category override (general_contractor appointmentLabel)", () => {
    // home_services category might set a generic appointmentLabel
    // but general_contractor slug sets appointmentLabel="estimate"
    const withSlug = getIndustryTerminology("service", "home_services", "general_contractor");
    const withoutSlug = getIndustryTerminology("service", "home_services");
    // slug version should have "estimate", category-only might have "appointment" or "job"
    expect(withSlug.appointmentLabel).toBe("estimate");
    expect(withoutSlug.appointmentLabel).not.toBe("estimate");
  });

  it("slug override wins over category override (roofing teamMemberLabel)", () => {
    const withSlug = getIndustryTerminology("service", "home_services", "roofing");
    // roofing slug sets teamMemberLabel="crew"
    expect(withSlug.teamMemberLabel).toBe("crew");
  });

  it("pest_control slug override wins over home_services category (treatment, pest tech)", () => {
    // pest_control SLUG_OVERRIDE sets teamMemberLabel="pest tech", appointmentLabel="treatment"
    // These slug overrides must take priority over the home_services category default (job)
    const t = getIndustryTerminology("service", "home_services", "pest_control");
    expect(t.teamMemberLabel).toBe("pest tech");
    expect(t.appointmentLabel).toBe("treatment");
    expect(t.customerLabel).toBe("customer");
  });

  it("unknown slug falls back to category default (no crash)", () => {
    const t = getIndustryTerminology("service", "home_services", "unknown_industry_xyz");
    // Must not crash; should return home_services category defaults
    expect(t.appointmentLabel).toBeTruthy();
    expect(t.servicesLabel).toBeTruthy();
  });

  it("no slug, no category falls back to mode default", () => {
    const t = getIndustryTerminology("service");
    expect(t.appointmentLabel).toBe("appointment");
    expect(t.teamMemberLabel).toBe("technician");
  });
});

// ─── All new slug overrides: non-empty required fields ─────────────────────
// Every slug override must return a complete terminology object

describe("getIndustryTerminology: all new slugs return complete objects", () => {
  const slugsToTest = [
    "general_contractor",
    "roofing",
    "handyman",
    "cleaning",
    "locksmith",
    "moving",
    "carpet_cleaning",
    "pool_service",
    "tree_service",
    "junk_removal",
    "painting",
    "landscaping",
    "pest_control",
    "pressure_washing",
    "auto_repair",
    "auto-repair",
  ];

  const requiredFields: Array<keyof ReturnType<typeof getIndustryTerminology>> = [
    "servicesLabel",
    "serviceItemLabel",
    "customerLabel",
    "appointmentLabel",
    "teamMemberLabel",
    "catalogCardTitle",
    "faqsCardTitle",
    "addItemButton",
    "itemNamePlaceholder",
  ];

  for (const slug of slugsToTest) {
    describe(`slug: ${slug}`, () => {
      const t = getIndustryTerminology("service", "home_services", slug);

      for (const field of requiredFields) {
        it(`${field} is non-empty`, () => {
          const val = t[field];
          if (typeof val === "string") {
            expect(val.length, `${slug}.${field} must not be empty`).toBeGreaterThan(0);
          } else if (Array.isArray(val)) {
            expect(val.length, `${slug}.${field} must have at least one item`).toBeGreaterThan(0);
          }
        });
      }
    });
  }
});

// ─── Grammar integration: appointmentLabel + indefiniteArticle ─────────────
// Verify that "Book an estimate" / "Book an inspection" / "Book a job" are correct
//
// NOTE: home_services category overrides appointmentLabel to "job" for all
// industries in that category UNLESS a slug override exists.
// Only general_contractor → "estimate" and roofing → "inspection" override it.
// All other home_services slugs (plumbing, hvac, cleaning, etc.) get "job" from
// the category, which gives "a job" (consonant → no "an" needed).

describe("appointmentLabel + indefiniteArticle integration", () => {
  const cases: Array<{ slug: string; expectedLabel: string; expectedPhrase: string }> = [
    { slug: "general_contractor", expectedLabel: "estimate",   expectedPhrase: "an estimate" },
    { slug: "roofing",            expectedLabel: "inspection", expectedPhrase: "an inspection" },
    // home_services category sets appointmentLabel="job" for these:
    { slug: "plumbing",           expectedLabel: "job",        expectedPhrase: "a job" },
    { slug: "hvac",               expectedLabel: "job",        expectedPhrase: "a job" },
    { slug: "electrical",         expectedLabel: "job",        expectedPhrase: "a job" },
    { slug: "cleaning",           expectedLabel: "job",        expectedPhrase: "a job" },
    { slug: "handyman",           expectedLabel: "job",        expectedPhrase: "a job" },
    { slug: "painting",           expectedLabel: "job",        expectedPhrase: "a job" },
    { slug: "landscaping",        expectedLabel: "job",        expectedPhrase: "a job" },
    // pest_control slug override wins over home_services category → "treatment" not "job"
    { slug: "pest_control",       expectedLabel: "treatment",  expectedPhrase: "a treatment" },
    // locksmith: home_services category sets "job"
    { slug: "locksmith",          expectedLabel: "job",        expectedPhrase: "a job" },
  ];

  for (const { slug, expectedLabel, expectedPhrase } of cases) {
    it(`${slug} → "${expectedPhrase}"`, () => {
      const t = getIndustryTerminology("service", "home_services", slug);
      expect(t.appointmentLabel).toBe(expectedLabel);
      const article = indefiniteArticle(t.appointmentLabel);
      expect(`${article} ${t.appointmentLabel}`).toBe(expectedPhrase);
    });
  }
});

// ─── garage_door: technician teamMember ───────────────────────────────────

describe("getIndustryTerminology: garage_door slug", () => {
  const t = getIndustryTerminology("service", "home_services", "garage_door");

  it("catalogCardTitle is 'Your Services'", () => {
    expect(t.catalogCardTitle).toBe("Your Services");
  });

  it("teamMemberLabel is 'technician'", () => {
    expect(t.teamMemberLabel).toBe("technician");
  });

  it("exampleServices include spring replacement and emergency service", () => {
    const services = t.exampleServices.join(" ").toLowerCase();
    expect(services).toMatch(/spring|opener|repair|emergency/);
  });

  it("exampleFAQs address same-day service and service call fee", () => {
    const faqs = t.exampleFAQs.join(" ").toLowerCase();
    expect(faqs).toMatch(/same-day|brand|fee/);
  });
});

// ─── appliance_repair: technician teamMember ──────────────────────────────

describe("getIndustryTerminology: appliance_repair slug", () => {
  const t = getIndustryTerminology("service", "home_services", "appliance_repair");

  it("catalogCardTitle is 'Your Services'", () => {
    expect(t.catalogCardTitle).toBe("Your Services");
  });

  it("teamMemberLabel is 'technician'", () => {
    expect(t.teamMemberLabel).toBe("technician");
  });

  it("exampleServices cover major home appliances", () => {
    const services = t.exampleServices.join(" ").toLowerCase();
    expect(services).toMatch(/washer|dryer|refrigerator|dishwasher|oven/);
  });

  it("exampleFAQs address brands serviced and diagnostic fee", () => {
    const faqs = t.exampleFAQs.join(" ").toLowerCase();
    expect(faqs).toMatch(/brand|diagnos|parts/);
  });
});

// ─── pest_control: full terminology regression (UX 2026-03-08) ─────────────
// Bug: before this UX session, pest_control had no teamMemberLabel/appointmentLabel/customerLabel
// in SLUG_OVERRIDES, so a pest control owner saw generic "technician / appointment / customer".
// Now: teamMemberLabel="pest tech", appointmentLabel="treatment", customerLabel="customer"
//
// Critical: appointmentLabel="treatment" must win over home_services category default "job",
// otherwise getBookingActionPhrase would return "book an treatment" (grammar bug too).

describe("getIndustryTerminology: pest_control full terminology override", () => {
  const t = getIndustryTerminology("service", "home_services", "pest_control");

  it("teamMemberLabel is 'pest tech'", () => {
    expect(t.teamMemberLabel).toBe("pest tech");
  });

  it("appointmentLabel is 'treatment' (not 'job' from home_services category)", () => {
    expect(t.appointmentLabel).toBe("treatment");
  });

  it("customerLabel is 'customer'", () => {
    expect(t.customerLabel).toBe("customer");
  });

  it("exampleServices include rodent control and quarterly plan", () => {
    const services = t.exampleServices.join(" ").toLowerCase();
    expect(services).toMatch(/termite|rodent|bed bug|quarterly/);
  });

  it("exampleFAQs mention pet safety and treatment warranty", () => {
    const faqs = t.exampleFAQs.join(" ").toLowerCase();
    expect(faqs).toMatch(/pet|warrant|treatment/);
  });
});

// ─── locksmith: full terminology regression (eng 2026-03-08) ───────────────
// eng session expanded locksmith from 6→16 services, added FAQs, objections, context fields.
// Verify the terminology resolves correctly.

describe("getIndustryTerminology: locksmith full terminology", () => {
  const t = getIndustryTerminology("service", "home_services", "locksmith");

  it("teamMemberLabel is 'locksmith'", () => {
    expect(t.teamMemberLabel).toBe("locksmith");
  });

  it("exampleServices include lockout, rekey, and car key programming", () => {
    const services = t.exampleServices.join(" ").toLowerCase();
    expect(services).toMatch(/lockout|rekey|key/);
  });

  it("exampleFAQs address trip fee and response time", () => {
    const faqs = t.exampleFAQs.join(" ").toLowerCase();
    expect(faqs).toMatch(/trip fee|quickly|car key/);
  });
});

// ─── salon/hair-salon: stylist + client labels (UX 2026-03-08) ─────────────
// UX session added teamMemberLabel="stylist", customerLabel="client" for salon/hair-salon.
// These drive "Your stylist will call you" and "client" in dashboard metrics.

describe("getIndustryTerminology: salon/hair-salon stylist + client labels", () => {
  for (const slug of ["salon", "hair-salon"] as const) {
    describe(`slug: ${slug}`, () => {
      const t = getIndustryTerminology("service", "beauty_wellness", slug);

      it("teamMemberLabel is 'stylist'", () => {
        expect(t.teamMemberLabel).toBe("stylist");
      });

      it("customerLabel is 'client'", () => {
        expect(t.customerLabel).toBe("client");
      });

      it("exampleServices include women's haircut and color", () => {
        const services = t.exampleServices.join(" ").toLowerCase();
        expect(services).toMatch(/haircut|color/);
      });
    });
  }
});
