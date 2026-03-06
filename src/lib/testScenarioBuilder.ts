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

// Industry-specific scenario sets — more realistic than generic mode defaults.
// Keyed by industry slug (from tenant.industry). Falls through to mode defaults if no match.
const INDUSTRY_DEFAULTS: Record<string, string[]> = {
  electrical: [
    "Hi, my circuit breaker keeps tripping — can you help?",
    "I need an electrician to install some new outlets",
    "My power went out in part of the house, not sure why",
    "How much does a panel upgrade cost?",
    "Do you handle emergency electrical calls?",
  ],
  plumbing: [
    "Hi, I've got a leak under my kitchen sink",
    "My water heater stopped working this morning",
    "I need someone to unclog a drain — how much is that?",
    "There's water backing up in my basement, it's urgent",
    "Do you do free estimates?",
  ],
  "plumber": [
    "Hi, I've got a leak under my kitchen sink",
    "My water heater stopped working this morning",
    "I need someone to unclog a drain — how much is that?",
    "There's water backing up in my basement, it's urgent",
    "Do you do free estimates?",
  ],
  hvac: [
    "My AC stopped working and it's really hot in here",
    "I'd like to schedule a furnace tune-up before winter",
    "How much does it cost to replace an AC unit?",
    "My heat isn't coming on — do you do emergency calls?",
    "Can I get a free estimate for a new system?",
  ],
  "hvac-and-air-conditioning": [
    "My AC stopped working and it's really hot in here",
    "I'd like to schedule a furnace tune-up before winter",
    "How much does it cost to replace an AC unit?",
    "My heat isn't coming on — do you do emergency calls?",
    "Can I get a free estimate for a new system?",
  ],
  "hair-salon": [
    "Hi, I'd like to book an appointment for a haircut",
    "Do you do color services? How much is highlights?",
    "I'm new to the area — are you accepting new clients?",
    "How far in advance do I need to book?",
    "Do you take walk-ins or is it appointment only?",
  ],
  "salon": [
    "Hi, I'd like to book an appointment for a haircut",
    "Do you do color services? How much is highlights?",
    "Are you accepting new clients?",
    "How far in advance do I need to book?",
    "Do you take walk-ins?",
  ],
  "house-cleaning": [
    "Hi, I'm looking to get my house cleaned weekly",
    "How much do you charge for a deep clean?",
    "Do you bring your own supplies?",
    "Are you available on weekends?",
    "I have a 3-bedroom house — what's the price?",
  ],
  "landscaping": [
    "I need my lawn mowed and some hedges trimmed",
    "Do you offer weekly lawn service?",
    "How much for a full yard cleanup?",
    "Do you do snow removal in the winter?",
    "Can I get a free estimate?",
  ],
  "auto-repair": [
    "My check engine light came on — can you run a diagnostic?",
    "I need an oil change and tire rotation",
    "How much does a brake job cost?",
    "My car won't start — can you help?",
    "Do you offer free estimates?",
  ],
};

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
  industrySlug?: string | null,
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

  // 3. Industry-specific fallback (slug), then mode fallback
  const defaults = (industrySlug && INDUSTRY_DEFAULTS[industrySlug]) || MODE_DEFAULTS[mode] || MODE_DEFAULTS.general;
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
