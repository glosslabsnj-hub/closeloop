/**
 * Scenario-to-Content Seeding
 *
 * Seeds high-confidence FAQ and policy content based on scenario answers.
 * Called after template application during onboarding to fill in gaps
 * that templates may not cover.
 *
 * Seeds are additive and duplicate-safe: checks for existing content
 * before inserting to avoid duplicates.
 */

import { supabase } from "@/integrations/supabase/client";

interface SeedFAQ {
  question: string;
  answer: string;
}

interface ScenarioSeed {
  /** Scenario answer key (from capabilityKey) */
  key: string;
  /** Only seed when this value is true */
  faqs?: SeedFAQ[];
  /** Policy field to set on tenants table */
  policy?: { field: "deposit_policy" | "cancellation_policy" | "refund_policy"; value: string };
}

const SCENARIO_SEEDS: ScenarioSeed[] = [
  {
    key: "offersFreeEstimates",
    faqs: [
      { question: "Do you charge for estimates?", answer: "No, we provide free estimates! Give us a call or book online and we'll come take a look at no cost." },
    ],
  },
  {
    key: "chargesTripFee",
    faqs: [
      { question: "Is there a trip fee?", answer: "Yes, a service call fee applies to cover travel to your location. Ask us for details on the current rate." },
    ],
  },
  {
    key: "offersFinancing",
    faqs: [
      { question: "Do you offer financing?", answer: "Yes, we offer financing options for larger jobs. Ask us about available plans when you get your estimate." },
    ],
  },
  {
    key: "requiresDeposits",
    policy: { field: "deposit_policy", value: "A deposit may be required to confirm your booking. The specific amount will be discussed when scheduling." },
  },
  {
    key: "acceptsWalkIns",
    faqs: [
      { question: "Do you accept walk-ins?", answer: "Yes, walk-ins are welcome! While we recommend scheduling ahead for the best availability, you're always welcome to stop by." },
    ],
  },
  {
    key: "offersWalkIns",
    faqs: [
      { question: "Do you accept walk-ins?", answer: "Yes, walk-ins are welcome! While we recommend scheduling ahead for the best availability, you're always welcome to stop by." },
    ],
  },
  {
    key: "offersPaymentPlans",
    faqs: [
      { question: "Do you offer payment plans?", answer: "Yes, we offer flexible payment options. Ask us about our payment plans for services over a certain amount." },
    ],
  },
  {
    key: "offersFreeConsultation",
    faqs: [
      { question: "Is the first consultation free?", answer: "Yes, we offer a free initial consultation so we can understand your needs and provide the best recommendations." },
    ],
  },
];

/**
 * Seeds FAQ and policy content based on scenario answers.
 * Duplicate-safe: checks for existing FAQ entries before inserting.
 */
export async function applyScenarioSeeds(
  tenantId: string,
  scenarioAnswers: Record<string, boolean>,
  _mode: string,
): Promise<void> {
  const faqsToInsert: { tenant_id: string; question: string; answer: string; priority_weight: number }[] = [];
  const policyUpdates: Record<string, string> = {};

  for (const seed of SCENARIO_SEEDS) {
    if (!scenarioAnswers[seed.key]) continue;

    if (seed.faqs) {
      for (const faq of seed.faqs) {
        faqsToInsert.push({
          tenant_id: tenantId,
          question: faq.question,
          answer: faq.answer,
          priority_weight: 50, // Mid-priority (templates use index-based)
        });
      }
    }

    if (seed.policy) {
      policyUpdates[seed.policy.field] = seed.policy.value;
    }
  }

  // Duplicate-safe FAQ insertion: check for existing questions
  if (faqsToInsert.length > 0) {
    const { data: existingFaqs } = await supabase
      .from("business_faqs")
      .select("question")
      .eq("tenant_id", tenantId);

    const existingQuestions = new Set(
      (existingFaqs || []).map((f) => f.question.toLowerCase()),
    );

    const newFaqs = faqsToInsert.filter(
      (faq) => !existingQuestions.has(faq.question.toLowerCase()),
    );

    if (newFaqs.length > 0) {
      const { error } = await supabase.from("business_faqs").insert(newFaqs);
      if (error) {
        console.error("Scenario seed FAQ insert error:", error);
      }
    }
  }

  // Apply policy updates (only if the field is currently empty)
  if (Object.keys(policyUpdates).length > 0) {
    const { data: tenant } = await supabase
      .from("tenants")
      .select("deposit_policy, cancellation_policy, refund_policy")
      .eq("id", tenantId)
      .single();

    if (tenant) {
      const updates: Record<string, string> = {};
      for (const [field, value] of Object.entries(policyUpdates)) {
        // Only set if currently empty
        if (!tenant[field as keyof typeof tenant]) {
          updates[field] = value;
        }
      }

      if (Object.keys(updates).length > 0) {
        const { error } = await supabase
          .from("tenants")
          .update(updates)
          .eq("id", tenantId);
        if (error) {
          console.error("Scenario seed policy update error:", error);
        }
      }
    }
  }
}
