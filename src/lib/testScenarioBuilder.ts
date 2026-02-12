import type { TopGap } from "@/hooks/useKnowledgeGaps";
import type { BusinessMode } from "@/hooks/useTenantConfig";

export interface TestScenario {
  text: string;
  source: "gap" | "service" | "industry";
  badge?: string;
}

interface ServiceInfo {
  name: string;
  price_amount?: number | null;
  price_type?: string | null;
}

const MODE_DEFAULTS: Record<string, string[]> = {
  service: [
    "Hi, I need to schedule an appointment",
    "What are your prices?",
    "Are you available tomorrow at 2pm?",
    "Do you offer emergency services?",
    "What's your cancellation policy?",
  ],
  food: [
    "I'd like to place an order for pickup",
    "Do you deliver to my area?",
    "What are your hours today?",
    "Can I make a reservation for 4 people?",
    "Do you have vegetarian options?",
  ],
  dispatch: [
    "I need a tow truck right now",
    "How quickly can you get here?",
    "What's the cost for a 10-mile tow?",
    "Are you available 24/7?",
    "Do you handle roadside assistance?",
  ],
  medical: [
    "I need to schedule a new patient appointment",
    "Do you accept my insurance?",
    "What are your office hours?",
    "Can I get a same-day appointment?",
    "What should I bring to my first visit?",
  ],
  sales: [
    "I'm interested in scheduling a test drive",
    "What do you have available in my budget?",
    "Do you offer financing options?",
    "I'd like to book an appointment with a sales rep",
    "What's your return or exchange policy?",
  ],
  general: [
    "What services do you offer?",
    "How can I contact you?",
    "What are your business hours?",
    "Where are you located?",
    "Do you offer consultations?",
  ],
};

/**
 * Builds test scenarios in priority order from real data:
 * 1. Gap-based — questions the AI couldn't answer
 * 2. Service-based — questions about actual services/prices
 * 3. Industry fallback — mode-based defaults
 *
 * Returns max 6 scenarios.
 */
export function buildTestScenarios(
  services: ServiceInfo[],
  gaps: TopGap[],
  mode: BusinessMode,
  _industrySlug?: string | null,
): TestScenario[] {
  const scenarios: TestScenario[] = [];
  const MAX = 6;

  // 1. Gap-based scenarios (highest priority)
  for (const gap of gaps.slice(0, 3)) {
    if (scenarios.length >= MAX) break;
    const question = gap.latest_question || gap.description;
    if (question) {
      scenarios.push({
        text: question,
        source: "gap",
        badge: "From your calls",
      });
    }
  }

  // 2. Service-based scenarios
  const activeServices = services.filter((s) => s.name);
  for (const svc of activeServices.slice(0, 3)) {
    if (scenarios.length >= MAX) break;
    const hasPricing = svc.price_amount && svc.price_amount > 0;
    const text = hasPricing
      ? `Hi, I need a ${svc.name}. How much is it?`
      : `I'm interested in ${svc.name}. What can you tell me about it?`;
    scenarios.push({
      text,
      source: "service",
      badge: "Your services",
    });
  }

  // 3. Industry/mode fallback
  const defaults = MODE_DEFAULTS[mode] || MODE_DEFAULTS.general;
  for (const text of defaults) {
    if (scenarios.length >= MAX) break;
    // Avoid duplicates with similar content
    const alreadyCovered = scenarios.some(
      (s) => s.text.toLowerCase().includes(text.toLowerCase().slice(0, 20))
    );
    if (!alreadyCovered) {
      scenarios.push({ text, source: "industry" });
    }
  }

  return scenarios.slice(0, MAX);
}
