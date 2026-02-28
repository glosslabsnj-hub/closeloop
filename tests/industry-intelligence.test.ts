/**
 * Tests for the Industry Intelligence Layer
 *
 * Validates the smart onboarding behavior:
 * - Work style auto-detection (isWorkStyleDeterministic)
 * - Question suppression (suppressedFor)
 * - Pre-answered questions (preAnsweredFor)
 * - Industry terminology (getIndustryTerminology, booking action helpers)
 * - Industry onboarding config resolution (3-tier hierarchy)
 * - Default answer generation (getDefaultAnswers)
 */
import {
  getQuestionsForMode,
  getDefaultAnswers,
  isPreAnswered,
  type ScenarioQuestion,
} from "../src/lib/scenarioQuestions";

import {
  isWorkStyleDeterministic,
  getIndustryDefaultWorkStyle,
  getIndustryBySlug,
} from "../src/data/industryCatalog";

import {
  getIndustryTerminology,
  getBookingActionPhrase,
  getAutoBookSummary,
  getReadinessVerb,
  resolveCardTitle,
} from "../src/data/industryTerminology";

import {
  getIndustryOnboardingConfig,
} from "../src/config/industryOnboardingConfig";


// =============================================================================
// isWorkStyleDeterministic
// =============================================================================

describe("isWorkStyleDeterministic", () => {
  test("plumbing is deterministic (always go to customer)", () => {
    expect(isWorkStyleDeterministic("plumbing")).toBe(true);
  });

  test("hvac is deterministic (always go to customer)", () => {
    expect(isWorkStyleDeterministic("hvac")).toBe(true);
  });

  test("electrical is deterministic (always go to customer)", () => {
    expect(isWorkStyleDeterministic("electrical")).toBe(true);
  });

  test("salon is deterministic (customer always comes)", () => {
    expect(isWorkStyleDeterministic("salon")).toBe(true);
  });

  test("dental is deterministic (customer always comes)", () => {
    expect(isWorkStyleDeterministic("dental")).toBe(true);
  });

  test("restaurant is deterministic (customer always comes)", () => {
    expect(isWorkStyleDeterministic("restaurant")).toBe(true);
  });

  test("auto-detailing is NOT deterministic (mobile vs shop varies)", () => {
    expect(isWorkStyleDeterministic("auto-detailing")).toBe(false);
  });

  test("photography is NOT deterministic (studio vs on-location varies)", () => {
    expect(isWorkStyleDeterministic("photography")).toBe(false);
  });

  test("cleaning is NOT deterministic (some have offices, some mobile-only)", () => {
    expect(isWorkStyleDeterministic("cleaning")).toBe(false);
  });

  test("unknown slug returns false", () => {
    expect(isWorkStyleDeterministic("totally-fake-industry")).toBe(false);
  });
});


// =============================================================================
// getIndustryDefaultWorkStyle
// =============================================================================

describe("getIndustryDefaultWorkStyle", () => {
  test("plumbing defaults to go_to_customer", () => {
    expect(getIndustryDefaultWorkStyle("plumbing")).toBe("go_to_customer");
  });

  test("salon defaults to customer_comes", () => {
    expect(getIndustryDefaultWorkStyle("salon")).toBe("customer_comes");
  });

  test("dental defaults to customer_comes", () => {
    expect(getIndustryDefaultWorkStyle("dental")).toBe("customer_comes");
  });

  test("towing defaults to go_to_customer", () => {
    expect(getIndustryDefaultWorkStyle("towing")).toBe("go_to_customer");
  });

  test("restaurant defaults to customer_comes", () => {
    expect(getIndustryDefaultWorkStyle("restaurant")).toBe("customer_comes");
  });
});


// =============================================================================
// Question suppression (suppressedFor)
// =============================================================================

describe("question suppression via getQuestionsForMode", () => {
  const plumberCtx = { slug: "plumbing", category: "home_services" };
  const salonCtx = { slug: "hair-salon", category: "beauty_wellness" };
  const autoRepairCtx = { slug: "auto-repair", category: "auto_services" };
  const photographerCtx = { slug: "photography", category: "events_entertainment" };
  const lawyerCtx = { slug: "legal", category: "professional_services" };

  function getQuestionIds(mode: string, ctx: { slug: string; category: string }): string[] {
    const qs = getQuestionsForMode(mode as any, ctx);
    return qs.map(q => q.id);
  }

  describe("plumber (home_services)", () => {
    const ids = getQuestionIds("service", plumberCtx);

    test("mobile-service is suppressed (plumbers ALWAYS go on-site)", () => {
      expect(ids).not.toContain("mobile-service");
    });

    test("walk-ins is suppressed (plumbers don't accept walk-ins)", () => {
      expect(ids).not.toContain("walk-ins");
    });

    test("job-tracking is suppressed (plumbers don't hold customer items)", () => {
      expect(ids).not.toContain("job-tracking");
    });

    test("same-day-emergency is NOT suppressed (plumbers genuinely need this)", () => {
      expect(ids).toContain("same-day-emergency");
    });

    test("deposits is NOT suppressed (varies by plumber)", () => {
      expect(ids).toContain("deposits");
    });
  });

  describe("hair salon (beauty_wellness)", () => {
    const ids = getQuestionIds("service", salonCtx);

    test("mobile-service is suppressed (salons never go to customer)", () => {
      expect(ids).not.toContain("mobile-service");
    });

    test("same-day-emergency is suppressed (no emergency haircuts)", () => {
      expect(ids).not.toContain("same-day-emergency");
    });

    test("job-tracking is suppressed (salons don't hold customer items)", () => {
      expect(ids).not.toContain("job-tracking");
    });

    test("walk-ins is NOT suppressed (salons genuinely vary on walk-ins)", () => {
      expect(ids).toContain("walk-ins");
    });

    test("deposits is NOT suppressed (varies by salon)", () => {
      expect(ids).toContain("deposits");
    });
  });

  describe("auto repair (auto_services)", () => {
    const ids = getQuestionIds("service", autoRepairCtx);

    test("job-tracking is NOT suppressed (auto repair holds customer vehicles)", () => {
      expect(ids).toContain("job-tracking");
    });

    test("same-day-emergency is NOT suppressed (genuinely varies)", () => {
      expect(ids).toContain("same-day-emergency");
    });
  });

  describe("photographer (events_entertainment)", () => {
    const ids = getQuestionIds("service", photographerCtx);

    test("same-day-emergency is suppressed (no emergency photo shoots)", () => {
      expect(ids).not.toContain("same-day-emergency");
    });

    test("walk-ins is suppressed (appointment-only by nature)", () => {
      expect(ids).not.toContain("walk-ins");
    });

    test("job-tracking is suppressed (no item drop-offs)", () => {
      expect(ids).not.toContain("job-tracking");
    });
  });

  describe("lawyer (professional_services)", () => {
    const ids = getQuestionIds("service", lawyerCtx);

    test("job-tracking is suppressed (no physical item drop-offs)", () => {
      expect(ids).not.toContain("job-tracking");
    });

    test("mobile-service is NOT suppressed (lawyers can be mobile vs office)", () => {
      expect(ids).toContain("mobile-service");
    });

    test("same-day-emergency is NOT suppressed (genuinely varies)", () => {
      expect(ids).toContain("same-day-emergency");
    });
  });

  test("question count is reduced for industries with suppressions", () => {
    const allQuestions = getQuestionsForMode("service");
    const plumberQuestions = getQuestionsForMode("service", plumberCtx);
    expect(plumberQuestions.length).toBeLessThan(allQuestions.length);
  });
});


// =============================================================================
// Pre-answered questions (preAnsweredFor)
// =============================================================================

describe("preAnsweredFor", () => {
  const plumberCtx = { slug: "plumbing", category: "home_services" };
  const salonCtx = { slug: "hair-salon", category: "beauty_wellness" };

  function findQuestion(mode: string, id: string): ScenarioQuestion | undefined {
    // Get ALL questions (no industry filter) to check preAnsweredFor
    return getQuestionsForMode(mode as any).find(q => q.id === id);
  }

  test("same-day-emergency is pre-answered for plumbing slug", () => {
    const q = findQuestion("service", "same-day-emergency");
    expect(q).toBeDefined();
    expect(isPreAnswered(q!, plumberCtx)).toBe(true);
  });

  test("same-day-emergency is NOT pre-answered for salon", () => {
    const q = findQuestion("service", "same-day-emergency");
    expect(q).toBeDefined();
    // same-day-emergency is suppressed for beauty_wellness, but isPreAnswered is a separate check
    expect(isPreAnswered(q!, salonCtx)).toBe(false);
  });

  test("walk-ins is pre-answered for beauty_wellness category", () => {
    const q = findQuestion("service", "walk-ins");
    expect(q).toBeDefined();
    expect(isPreAnswered(q!, salonCtx)).toBe(true);
  });

  test("mobile-service is pre-answered for home_services category", () => {
    const q = findQuestion("service", "mobile-service");
    expect(q).toBeDefined();
    expect(isPreAnswered(q!, plumberCtx)).toBe(true);
  });
});


// =============================================================================
// getDefaultAnswers
// =============================================================================

describe("getDefaultAnswers", () => {
  test("plumber gets pre-answered true for same-day-emergency", () => {
    const answers = getDefaultAnswers("service", { slug: "plumbing", category: "home_services" });
    expect(answers.offersSameDayEmergency).toBe(true);
  });

  test("salon gets pre-answered true for walk-ins", () => {
    // walk-ins is visible for beauty_wellness and pre-answered true
    const answers = getDefaultAnswers("service", { slug: "hair-salon", category: "beauty_wellness" });
    expect(answers.offersWalkIns).toBe(true);
  });

  test("plumber does NOT get walk-ins (suppressed, default is false)", () => {
    const answers = getDefaultAnswers("service", { slug: "plumbing", category: "home_services" });
    // walk-ins is suppressed for home_services — its defaultValue (false) isn't in the answers
    // because the question is filtered OUT before getDefaultAnswers iterates
    expect(answers.offersWalkIns).toBeUndefined();
  });

  test("auto repair gets job-tracking answers (NOT suppressed)", () => {
    const answers = getDefaultAnswers("service", { slug: "auto-repair", category: "auto_services" });
    expect(answers.hasJobTracking).toBeDefined();
  });

  test("without industry context, all questions get default answers", () => {
    const answers = getDefaultAnswers("service");
    // Should have answers for ALL service questions including mobile-service, walk-ins, etc.
    expect(Object.keys(answers).length).toBeGreaterThanOrEqual(5);
    expect(answers.offersMobileService).toBeDefined();
    expect(answers.offersWalkIns).toBeDefined();
    expect(answers.hasJobTracking).toBeDefined();
  });
});


// =============================================================================
// Industry terminology
// =============================================================================

describe("getIndustryTerminology", () => {
  test("service mode defaults to 'appointment'", () => {
    const terms = getIndustryTerminology("service");
    expect(terms.appointmentLabel).toBe("appointment");
  });

  test("home_services overrides appointmentLabel to 'job'", () => {
    const terms = getIndustryTerminology("service", "home_services");
    expect(terms.appointmentLabel).toBe("job");
  });

  test("health_medical overrides to 'visit'", () => {
    const terms = getIndustryTerminology("service", "health_medical");
    expect(terms.appointmentLabel).toBe("visit");
    expect(terms.customerLabel).toBe("patient");
  });

  test("food mode defaults to 'reservation'", () => {
    const terms = getIndustryTerminology("food");
    expect(terms.appointmentLabel).toBe("reservation");
  });

  test("dispatch mode defaults to 'dispatch'", () => {
    const terms = getIndustryTerminology("dispatch");
    expect(terms.appointmentLabel).toBe("dispatch");
  });

  test("medical mode defaults to 'visit'", () => {
    const terms = getIndustryTerminology("medical");
    expect(terms.appointmentLabel).toBe("visit");
  });

  test("beauty_wellness overrides teamMemberLabel to 'stylist'", () => {
    const terms = getIndustryTerminology("service", "beauty_wellness");
    expect(terms.teamMemberLabel).toBe("stylist");
  });

  test("slug override takes priority over category", () => {
    const terms = getIndustryTerminology("service", "beauty_wellness", "barbershop");
    expect(terms.teamMemberLabel).toBe("barber");
  });

  test("plumbing slug has correct example services", () => {
    const terms = getIndustryTerminology("service", "home_services", "plumbing");
    expect(terms.exampleServices).toContain("Drain Cleaning");
    expect(terms.exampleServices).toContain("Water Heater Repair");
  });

  test("dental slug overrides servicesLabel", () => {
    const terms = getIndustryTerminology("service", "health_medical", "dental");
    expect(terms.servicesLabel).toBe("Dental Procedures");
    expect(terms.addItemButton).toBe("Add Procedure");
  });

  test("sales mode uses 'product' and 'prospect'", () => {
    const terms = getIndustryTerminology("sales");
    expect(terms.serviceItemLabel).toBe("product");
    expect(terms.customerLabel).toBe("prospect");
  });

  test("professional_services overrides to 'consultation'", () => {
    const terms = getIndustryTerminology("service", "professional_services");
    expect(terms.appointmentLabel).toBe("consultation");
    expect(terms.customerLabel).toBe("client");
  });
});


// =============================================================================
// Booking action helpers
// =============================================================================

describe("booking action helpers", () => {
  test("getBookingActionPhrase for 'job'", () => {
    expect(getBookingActionPhrase("job")).toBe("schedule a job");
  });

  test("getBookingActionPhrase for 'appointment'", () => {
    expect(getBookingActionPhrase("appointment")).toBe("book an appointment");
  });

  test("getBookingActionPhrase for 'reservation'", () => {
    expect(getBookingActionPhrase("reservation")).toBe("make a reservation");
  });

  test("getBookingActionPhrase for 'visit'", () => {
    expect(getBookingActionPhrase("visit")).toBe("schedule a visit");
  });

  test("getBookingActionPhrase for 'session'", () => {
    expect(getBookingActionPhrase("session")).toBe("book a session");
  });

  test("getBookingActionPhrase for 'consultation'", () => {
    expect(getBookingActionPhrase("consultation")).toBe("schedule a consultation");
  });

  test("getBookingActionPhrase for 'dispatch'", () => {
    expect(getBookingActionPhrase("dispatch")).toBe("request service");
  });

  test("getAutoBookSummary for 'job'", () => {
    expect(getAutoBookSummary("job")).toBe("schedule jobs automatically");
  });

  test("getAutoBookSummary for 'reservation'", () => {
    expect(getAutoBookSummary("reservation")).toBe("take reservations automatically");
  });

  test("getReadinessVerb for 'job'", () => {
    expect(getReadinessVerb("job")).toBe("schedule jobs");
  });

  test("getReadinessVerb for unknown label falls back", () => {
    expect(getReadinessVerb("whatever")).toBe("book appointments");
  });

  test("getAutoBookSummary for unknown label falls back", () => {
    expect(getAutoBookSummary("whatever")).toBe("book appointments automatically");
  });
});


// =============================================================================
// resolveCardTitle
// =============================================================================

describe("resolveCardTitle", () => {
  test("returns static title when no titleKey", () => {
    expect(resolveCardTitle(undefined, "Fallback Title", "service")).toBe("Fallback Title");
  });

  test("resolves catalogCardTitle for hair-salon", () => {
    const title = resolveCardTitle("catalogCardTitle", "Default", "service", "beauty_wellness", "hair-salon");
    expect(title).toBe("Your Salon Services");
  });

  test("resolves catalogCardTitle for towing", () => {
    const title = resolveCardTitle("catalogCardTitle", "Default", "dispatch", "dispatch_logistics", "towing");
    expect(title).toBe("Your Tow Rates");
  });

  test("resolves faqsCardTitle for medical mode", () => {
    const title = resolveCardTitle("faqsCardTitle", "Default", "medical");
    expect(title).toBe("Patient FAQs");
  });
});


// =============================================================================
// Industry onboarding config (3-tier hierarchy)
// =============================================================================

describe("getIndustryOnboardingConfig", () => {
  test("plumbing slug has pre-answers for mobile, emergency, trip fee, estimates", () => {
    const config = getIndustryOnboardingConfig("service", "home_services", "plumbing");
    expect(config.preAnswers.offersMobileService).toBe(true);
    expect(config.preAnswers.offersSameDayEmergency).toBe(true);
    expect(config.preAnswers.chargesTripFee).toBe(true);
    expect(config.preAnswers.offersFreeEstimates).toBe(true);
  });

  test("hair-salon slug has pre-answers for walk-ins and multiple staff", () => {
    const config = getIndustryOnboardingConfig("service", "beauty_wellness", "hair-salon");
    expect(config.preAnswers.offersWalkIns).toBe(true);
    expect(config.preAnswers.hasMultipleStaff).toBe(true);
  });

  test("category fallback: home_services defaults mobile service to true", () => {
    const config = getIndustryOnboardingConfig("service", "home_services");
    expect(config.preAnswers.offersMobileService).toBe(true);
  });

  test("slug config overrides category config", () => {
    // plumbing has offersSameDayEmergency=true; generic home_services does not
    const slugConfig = getIndustryOnboardingConfig("service", "home_services", "plumbing");
    const categoryConfig = getIndustryOnboardingConfig("service", "home_services");
    expect(slugConfig.preAnswers.offersSameDayEmergency).toBe(true);
    expect(categoryConfig.preAnswers.offersSameDayEmergency).toBeUndefined();
  });

  test("mode default is used when no category or slug", () => {
    const config = getIndustryOnboardingConfig("service");
    expect(config.setupTitle).toBe("your business");
    expect(config.setupChecklist.length).toBeGreaterThan(0);
    expect(config.nextSteps.length).toBeGreaterThan(0);
  });

  test("plumbing has a plumbing-specific setup title", () => {
    const config = getIndustryOnboardingConfig("service", "home_services", "plumbing");
    expect(config.setupTitle).toBe("your plumbing business");
  });

  test("dental has setup checklist with patient-specific items", () => {
    const config = getIndustryOnboardingConfig("service", undefined, "dental");
    const labels = config.setupChecklist.map(i => i.label);
    expect(labels.some(l => l.includes("practice"))).toBe(true);
  });

  test("pizza has menu-specific setup checklist", () => {
    const config = getIndustryOnboardingConfig("food", undefined, "pizza");
    const labels = config.setupChecklist.map(i => i.label);
    expect(labels.some(l => l.toLowerCase().includes("menu"))).toBe(true);
  });

  test("dispatch mode has coverage zone in checklist", () => {
    const config = getIndustryOnboardingConfig("dispatch");
    const labels = config.setupChecklist.map(i => i.label);
    expect(labels.some(l => l.toLowerCase().includes("coverage"))).toBe(true);
  });

  test("all 6 modes return valid configs", () => {
    const modes = ["service", "dispatch", "food", "medical", "general", "sales"] as const;
    for (const mode of modes) {
      const config = getIndustryOnboardingConfig(mode);
      expect(config.setupChecklist.length).toBeGreaterThan(0);
      expect(config.nextSteps.length).toBeGreaterThan(0);
      expect(config.setupTitle).toBeTruthy();
      expect(typeof config.preAnswers).toBe("object");
    }
  });
});


// =============================================================================
// Expected question counts per industry (regression test)
// =============================================================================

describe("expected onboarding question counts", () => {
  function countOnboardingQuestions(slug: string, category: string): number {
    const qs = getQuestionsForMode("service", { slug, category });
    return qs.filter(q => q.onboardingVisible).length;
  }

  test("plumber sees ~5 service questions", () => {
    const count = countOnboardingQuestions("plumbing", "home_services");
    // Expected: auto-book, same-day*, deposits, staff, cancellation
    // (mobile-service, walk-ins, job-tracking all suppressed)
    expect(count).toBeGreaterThanOrEqual(3);
    expect(count).toBeLessThanOrEqual(7);
  });

  test("hair salon sees ~5 service questions", () => {
    const count = countOnboardingQuestions("hair-salon", "beauty_wellness");
    // Expected: auto-book, deposits, walk-ins*, staff, cancellation
    // (mobile-service, same-day-emergency, job-tracking all suppressed)
    expect(count).toBeGreaterThanOrEqual(3);
    expect(count).toBeLessThanOrEqual(7);
  });

  test("auto repair sees more questions (fewer suppressions)", () => {
    const count = countOnboardingQuestions("auto-repair", "auto_services");
    // auto_services has fewer suppressions — job-tracking, same-day visible
    expect(count).toBeGreaterThanOrEqual(5);
  });

  test("lawyer sees moderate questions", () => {
    const count = countOnboardingQuestions("legal", "professional_services");
    // mobile, same-day, deposits, staff, cancellation visible; job-tracking suppressed
    expect(count).toBeGreaterThanOrEqual(4);
    expect(count).toBeLessThanOrEqual(8);
  });

  test("no industry context shows ALL onboarding questions", () => {
    const qs = getQuestionsForMode("service");
    const onboardingVisible = qs.filter(q => q.onboardingVisible).length;
    // Should be the maximum — no suppressions applied
    expect(onboardingVisible).toBeGreaterThanOrEqual(5);
  });
});


// =============================================================================
// Cross-mode integrity
// =============================================================================

describe("cross-mode question integrity", () => {
  test("dispatch mode has its own question set", () => {
    const qs = getQuestionsForMode("dispatch");
    expect(qs.length).toBeGreaterThan(0);
    // Dispatch should not have service-specific questions like walk-ins
    const ids = qs.map(q => q.id);
    expect(ids).not.toContain("walk-ins");
  });

  test("food mode has its own question set", () => {
    const qs = getQuestionsForMode("food");
    expect(qs.length).toBeGreaterThan(0);
  });

  test("medical mode has its own question set", () => {
    const qs = getQuestionsForMode("medical");
    expect(qs.length).toBeGreaterThan(0);
  });

  test("sales mode has its own question set", () => {
    const qs = getQuestionsForMode("sales");
    expect(qs.length).toBeGreaterThan(0);
  });

  test("general mode has its own question set", () => {
    const qs = getQuestionsForMode("general");
    expect(qs.length).toBeGreaterThan(0);
  });

  test("all question IDs are unique within a mode", () => {
    const modes = ["service", "dispatch", "food", "medical", "general", "sales"] as const;
    for (const mode of modes) {
      const qs = getQuestionsForMode(mode);
      const ids = qs.map(q => q.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    }
  });
});
