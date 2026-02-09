/**
 * Scenario Discovery Questions
 *
 * Mode-specific yes/no questions used during onboarding Step 3 (Discovery).
 * Each question maps to an existing capability key from useBusinessCapabilities.ts
 * and optionally implies modules that should be auto-enabled when answered "yes".
 */

import type { BusinessMode } from "@/components/onboarding/BusinessModeSelector";

export type QuestionGroup = "core" | "ai_behavior" | "advanced";

export interface ScenarioQuestion {
  id: string;
  capabilityKey: string;       // Key stored in context_fields_json.capabilities
  label: string;               // Short label
  question: string;            // Full question text
  description?: string;        // Helper text
  defaultValue: boolean;
  blocking?: boolean;          // Must be true to proceed (e.g. HIPAA)
  impliesModules?: string[];   // Auto-enable these modules when true
  showWhen?: { capabilityKey: string; value: boolean };  // conditional visibility
  industryFilter?: { categories?: string[]; slugs?: string[] };  // industry-gated
  group?: QuestionGroup;       // visual grouping
  requiredForAI?: boolean;     // shows "AI uses this" badge
}

// ---------------------------------------------------------------------------
// Question sets by mode
// ---------------------------------------------------------------------------

const serviceQuestions: ScenarioQuestion[] = [
  {
    id: "mobile-service",
    capabilityKey: "offersMobileService",
    label: "Mobile / On-Site Service",
    question: "Do you offer mobile or on-site services?",
    description: "You travel to the customer's location to perform work",
    defaultValue: false,
    group: "core",
  },
  {
    id: "same-day-emergency",
    capabilityKey: "offersSameDayEmergency",
    label: "Same-Day / Emergency",
    question: "Do you handle same-day or emergency requests?",
    description: "Customers can call for urgent, same-day service",
    defaultValue: false,
    group: "core",
  },
  {
    id: "deposits",
    capabilityKey: "requiresDeposits",
    label: "Deposits Required",
    question: "Do you require deposits to confirm bookings?",
    description: "Customers pay a deposit upfront before their appointment",
    defaultValue: false,
    group: "core",
  },
  {
    id: "walk-ins",
    capabilityKey: "offersWalkIns",
    label: "Walk-Ins Welcome",
    question: "Do you accept walk-in customers?",
    description: "Customers can show up without an appointment",
    defaultValue: true,
    group: "core",
  },
  // New questions
  {
    id: "staff-scheduling",
    capabilityKey: "hasMultipleStaff",
    label: "Multiple Staff",
    question: "Do you have multiple technicians or staff?",
    description: "Assign jobs to specific team members",
    defaultValue: false,
    impliesModules: ["staff_scheduling"],
    group: "core",
  },
  {
    id: "packages",
    capabilityKey: "offersPackages",
    label: "Packages / Memberships",
    question: "Do you offer service packages or memberships?",
    description: "Recurring packages or membership plans for customers",
    defaultValue: false,
    impliesModules: ["packages"],
    group: "advanced",
  },
  {
    id: "stylist-preference",
    capabilityKey: "collectsStylistPreference",
    label: "Stylist Preference",
    question: "Should the AI ask which stylist the client prefers?",
    description: "AI will ask callers for their preferred service provider",
    defaultValue: true,
    group: "ai_behavior",
    requiredForAI: true,
    industryFilter: { categories: ["beauty_wellness"] },
  },
  {
    id: "warranty-check",
    capabilityKey: "requiresWarrantyCheck",
    label: "Warranty Check",
    question: "Do you verify warranties or service contracts?",
    description: "AI will ask about warranty or contract status",
    defaultValue: false,
    group: "ai_behavior",
    industryFilter: { categories: ["home_services", "auto_services"] },
  },
];

const dispatchQuestions: ScenarioQuestion[] = [
  {
    id: "impound-lot",
    capabilityKey: "hasImpoundLot",
    label: "Impound Lot",
    question: "Do you operate an impound or storage lot?",
    description: "You store vehicles for police holds, private property tows, etc.",
    defaultValue: false,
    impliesModules: ["impound_lot"],
    group: "core",
  },
  {
    id: "motor-club",
    capabilityKey: "offersMotorClub",
    label: "Motor Club / Roadside",
    question: "Do you work with motor clubs or roadside programs?",
    description: "AAA, Agero, or other roadside assistance networks",
    defaultValue: false,
    group: "core",
  },
  {
    id: "fleet",
    capabilityKey: "hasFleet",
    label: "Fleet Management",
    question: "Do you manage a fleet of vehicles or drivers?",
    description: "Multiple trucks/drivers that need assignment and tracking",
    defaultValue: false,
    impliesModules: ["fleet_management"],
    group: "core",
  },
  {
    id: "distance-pricing",
    capabilityKey: "needsDistancePricing",
    label: "Distance-Based Pricing",
    question: "Do your prices depend on distance or mileage?",
    description: "Pricing varies based on how far the job is",
    defaultValue: true,
    group: "core",
  },
  // New questions
  {
    id: "police-impound",
    capabilityKey: "handlesPoliceImpound",
    label: "Police Impound",
    question: "Do you handle police or law enforcement impounds?",
    description: "Police-hold vehicles with specific release requirements",
    defaultValue: false,
    impliesModules: ["police_impound"],
    group: "core",
    showWhen: { capabilityKey: "hasImpoundLot", value: true },
  },
  {
    id: "ppi-towing",
    capabilityKey: "handlesPPITowing",
    label: "PPI Towing",
    question: "Do you do private property impound (PPI) towing?",
    description: "Towing from private lots, apartments, or businesses",
    defaultValue: false,
    impliesModules: ["ppi_towing"],
    group: "core",
  },
  {
    id: "recovery",
    capabilityKey: "offersRecovery",
    label: "Recovery Services",
    question: "Do you offer winch-out or vehicle recovery?",
    description: "Off-road recovery, ditch pull-outs, winch services",
    defaultValue: false,
    impliesModules: ["recovery_services"],
    group: "core",
  },
  {
    id: "phone-quotes",
    capabilityKey: "offersPhoneQuotes",
    label: "Phone Quotes",
    question: "Can your AI give price quotes over the phone?",
    description: "AI uses your pricing rules to quote callers",
    defaultValue: true,
    impliesModules: ["phone_quotes"],
    group: "ai_behavior",
    requiredForAI: true,
  },
];

const foodQuestions: ScenarioQuestion[] = [
  {
    id: "delivery",
    capabilityKey: "offersDelivery",
    label: "Delivery",
    question: "Do you offer delivery?",
    description: "Customers can order food delivered to their location",
    defaultValue: false,
    group: "core",
  },
  {
    id: "catering",
    capabilityKey: "offersCatering",
    label: "Catering",
    question: "Do you offer catering services?",
    description: "Large orders for events, offices, or parties",
    defaultValue: false,
    impliesModules: ["catering"],
    group: "core",
  },
  {
    id: "reservations",
    capabilityKey: "offersReservations",
    label: "Reservations",
    question: "Do you accept table reservations?",
    description: "Customers can reserve a table in advance",
    defaultValue: false,
    impliesModules: ["reservations"],
    group: "core",
  },
  // New questions
  {
    id: "dietary",
    capabilityKey: "collectsDietaryRestrictions",
    label: "Dietary Restrictions",
    question: "Should the AI ask about dietary restrictions?",
    description: "AI will ask callers about allergies and dietary needs",
    defaultValue: false,
    impliesModules: ["dietary_intake"],
    group: "ai_behavior",
    requiredForAI: true,
  },
  {
    id: "curbside",
    capabilityKey: "offersCurbside",
    label: "Curbside Pickup",
    question: "Do you offer curbside pickup?",
    description: "Customers pick up orders from your curb without entering",
    defaultValue: false,
    impliesModules: ["curbside"],
    group: "core",
  },
  {
    id: "kds",
    capabilityKey: "hasKDSIntegration",
    label: "Kitchen Display",
    question: "Do you use a kitchen display system?",
    description: "Orders route to a kitchen display for prep tracking",
    defaultValue: false,
    impliesModules: ["kds_integration"],
    group: "advanced",
  },
];

const medicalQuestions: ScenarioQuestion[] = [
  {
    id: "hipaa",
    capabilityKey: "requiresHIPAA",
    label: "HIPAA Compliance",
    question: "This practice handles protected health information (PHI)",
    description: "Required for all medical practices. Call recordings and full transcripts are disabled.",
    defaultValue: true,
    blocking: true,
    group: "core",
  },
  {
    id: "telehealth",
    capabilityKey: "hasTelehealth",
    label: "Telehealth",
    question: "Do you offer telehealth or virtual visits?",
    description: "Patients can have appointments via video or phone",
    defaultValue: false,
    group: "core",
  },
  {
    id: "insurance",
    capabilityKey: "requiresInsurance",
    label: "Insurance Verification",
    question: "Do you need to verify insurance before visits?",
    description: "AI will ask callers for insurance information",
    defaultValue: true,
    group: "core",
  },
  {
    id: "symptom-triage",
    capabilityKey: "needsSymptomTriage",
    label: "Symptom Triage",
    question: "Should the AI ask about symptoms to help route calls?",
    description: "AI collects basic symptoms to help prioritize appointments",
    defaultValue: false,
    group: "ai_behavior",
  },
  // New questions
  {
    id: "new-patient-forms",
    capabilityKey: "requiresNewPatientForms",
    label: "New Patient Forms",
    question: "Do new patients need paperwork before their first visit?",
    description: "AI will mention required forms to new callers",
    defaultValue: true,
    impliesModules: ["new_patient_forms"],
    group: "ai_behavior",
    requiredForAI: true,
  },
  {
    id: "referrals",
    capabilityKey: "collectsReferralInfo",
    label: "Referral Info",
    question: "Do you collect referring provider information?",
    description: "AI will ask who referred the patient",
    defaultValue: false,
    impliesModules: ["referrals"],
    group: "ai_behavior",
  },
  {
    id: "medications",
    capabilityKey: "collectsMedications",
    label: "Medications",
    question: "Should the AI ask about current medications?",
    description: "AI will collect a brief medication list from callers",
    defaultValue: false,
    impliesModules: ["medications_intake"],
    group: "ai_behavior",
  },
];

const generalQuestions: ScenarioQuestion[] = [
  {
    id: "appointments",
    capabilityKey: "offersAppointments",
    label: "Appointments",
    question: "Do you schedule appointments or consultations?",
    description: "AI can book appointments directly into your calendar",
    defaultValue: true,
    impliesModules: ["booking"],
    group: "core",
  },
  {
    id: "callbacks",
    capabilityKey: "offersCallbacks",
    label: "Callback Requests",
    question: "Should the AI offer to have someone call back?",
    description: "When AI can't resolve a question, offer a callback",
    defaultValue: true,
    group: "core",
  },
  // New question
  {
    id: "faq-handling",
    capabilityKey: "handlesFAQs",
    label: "FAQ Handling",
    question: "Should the AI answer common questions from your knowledge base?",
    description: "AI uses your FAQs and knowledge base to answer caller questions",
    defaultValue: true,
    impliesModules: ["knowledge_base"],
    group: "ai_behavior",
    requiredForAI: true,
  },
];

// ---------------------------------------------------------------------------
// Question map
// ---------------------------------------------------------------------------

const questionsByMode: Record<BusinessMode, ScenarioQuestion[]> = {
  service: serviceQuestions,
  dispatch: dispatchQuestions,
  food: foodQuestions,
  medical: medicalQuestions,
  general: generalQuestions,
};

// ---------------------------------------------------------------------------
// Group labels for visual grouping
// ---------------------------------------------------------------------------

export const groupLabels: Record<QuestionGroup, string> = {
  core: "Core Operations",
  ai_behavior: "AI Behavior",
  advanced: "Advanced",
};

// ---------------------------------------------------------------------------
// Public helpers
// ---------------------------------------------------------------------------

/** Returns the scenario question set for a given business mode, optionally filtered by industry */
export function getQuestionsForMode(
  mode: BusinessMode,
  industryContext?: { slug: string; category: string }
): ScenarioQuestion[] {
  const all = questionsByMode[mode] ?? generalQuestions;

  if (!industryContext) return all;

  return all.filter((q) => {
    if (!q.industryFilter) return true;

    const { categories, slugs } = q.industryFilter;
    if (categories && !categories.includes(industryContext.category)) return false;
    if (slugs && !slugs.includes(industryContext.slug)) return false;
    return true;
  });
}

/**
 * Merges implied modules from scenario answers into the base module set.
 * When a scenario answer is `true` and has `impliesModules`, those modules
 * are added to the set. When `false`, they are removed (unless they came
 * from the industry template, which is the base set).
 */
export function deriveModulesFromScenario(
  baseModules: string[],
  answers: Record<string, boolean>,
  questions: ScenarioQuestion[]
): string[] {
  const moduleSet = new Set(baseModules);

  for (const q of questions) {
    if (!q.impliesModules) continue;

    const answered = answers[q.capabilityKey];
    for (const mod of q.impliesModules) {
      if (answered) {
        moduleSet.add(mod);
      } else if (answered === false && !baseModules.includes(mod)) {
        // Only remove if it wasn't in the original base set
        moduleSet.delete(mod);
      }
    }
  }

  return Array.from(moduleSet);
}

/**
 * Builds the initial scenario answers from question defaults for a mode
 */
export function getDefaultAnswers(
  mode: BusinessMode,
  industryContext?: { slug: string; category: string }
): Record<string, boolean> {
  const questions = getQuestionsForMode(mode, industryContext);
  const answers: Record<string, boolean> = {};
  for (const q of questions) {
    answers[q.capabilityKey] = q.defaultValue;
  }
  return answers;
}
