/**
 * Scenario Discovery Questions
 *
 * Mode-specific yes/no questions used during onboarding Step 3 (Discovery).
 * Each question maps to an existing capability key from useBusinessCapabilities.ts
 * and optionally implies modules that should be auto-enabled when answered "yes".
 */

import type { BusinessMode } from "@/components/onboarding/BusinessModeSelector";

export interface ScenarioQuestion {
  id: string;
  capabilityKey: string;       // Key stored in context_fields_json.capabilities
  label: string;               // Short label
  question: string;            // Full question text
  description?: string;        // Helper text
  defaultValue: boolean;
  blocking?: boolean;          // Must be true to proceed (e.g. HIPAA)
  impliesModules?: string[];   // Auto-enable these modules when true
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
  },
  {
    id: "same-day-emergency",
    capabilityKey: "offersSameDayEmergency",
    label: "Same-Day / Emergency",
    question: "Do you handle same-day or emergency requests?",
    description: "Customers can call for urgent, same-day service",
    defaultValue: false,
  },
  {
    id: "deposits",
    capabilityKey: "requiresDeposits",
    label: "Deposits Required",
    question: "Do you require deposits to confirm bookings?",
    description: "Customers pay a deposit upfront before their appointment",
    defaultValue: false,
  },
  {
    id: "walk-ins",
    capabilityKey: "offersWalkIns",
    label: "Walk-Ins Welcome",
    question: "Do you accept walk-in customers?",
    description: "Customers can show up without an appointment",
    defaultValue: true,
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
  },
  {
    id: "motor-club",
    capabilityKey: "offersMotorClub",
    label: "Motor Club / Roadside",
    question: "Do you work with motor clubs or roadside programs?",
    description: "AAA, Agero, or other roadside assistance networks",
    defaultValue: false,
  },
  {
    id: "fleet",
    capabilityKey: "hasFleet",
    label: "Fleet Management",
    question: "Do you manage a fleet of vehicles or drivers?",
    description: "Multiple trucks/drivers that need assignment and tracking",
    defaultValue: false,
    impliesModules: ["fleet_management"],
  },
  {
    id: "distance-pricing",
    capabilityKey: "needsDistancePricing",
    label: "Distance-Based Pricing",
    question: "Do your prices depend on distance or mileage?",
    description: "Pricing varies based on how far the job is",
    defaultValue: true,
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
  },
  {
    id: "catering",
    capabilityKey: "offersCatering",
    label: "Catering",
    question: "Do you offer catering services?",
    description: "Large orders for events, offices, or parties",
    defaultValue: false,
    impliesModules: ["catering"],
  },
  {
    id: "reservations",
    capabilityKey: "offersReservations",
    label: "Reservations",
    question: "Do you accept table reservations?",
    description: "Customers can reserve a table in advance",
    defaultValue: false,
    impliesModules: ["reservations"],
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
  },
  {
    id: "telehealth",
    capabilityKey: "hasTelehealth",
    label: "Telehealth",
    question: "Do you offer telehealth or virtual visits?",
    description: "Patients can have appointments via video or phone",
    defaultValue: false,
  },
  {
    id: "insurance",
    capabilityKey: "requiresInsurance",
    label: "Insurance Verification",
    question: "Do you need to verify insurance before visits?",
    description: "AI will ask callers for insurance information",
    defaultValue: true,
  },
  {
    id: "symptom-triage",
    capabilityKey: "needsSymptomTriage",
    label: "Symptom Triage",
    question: "Should the AI ask about symptoms to help route calls?",
    description: "AI collects basic symptoms to help prioritize appointments",
    defaultValue: false,
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
  },
  {
    id: "callbacks",
    capabilityKey: "offersCallbacks",
    label: "Callback Requests",
    question: "Should the AI offer to have someone call back?",
    description: "When AI can't resolve a question, offer a callback",
    defaultValue: true,
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
// Public helpers
// ---------------------------------------------------------------------------

/** Returns the scenario question set for a given business mode */
export function getQuestionsForMode(mode: BusinessMode): ScenarioQuestion[] {
  return questionsByMode[mode] ?? generalQuestions;
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
export function getDefaultAnswers(mode: BusinessMode): Record<string, boolean> {
  const questions = getQuestionsForMode(mode);
  const answers: Record<string, boolean> = {};
  for (const q of questions) {
    answers[q.capabilityKey] = q.defaultValue;
  }
  return answers;
}
