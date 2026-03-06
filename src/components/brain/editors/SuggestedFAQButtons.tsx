import { Plus, Lightbulb, AlertCircle } from "lucide-react";
import { useTenantConfig } from "@/hooks/useTenantConfig";
import type { BusinessMode } from "@/hooks/useTenantConfig";

interface SuggestedFAQ {
  question: string;
  answer: string;
}

interface PersonalizedFAQ extends SuggestedFAQ {
  needsEditing: boolean;
}

type HoursEntry = { open: string; close: string; closed?: boolean; windows?: { open: string; close: string }[] } | null;

interface SuggestedFAQButtonsProps {
  onAdd: (question: string, answer: string) => void;
  existingQuestions?: string[];
  tenantPolicies?: { cancellation?: string; deposit?: string; refund?: string };
  tenantName?: string;
  tenantAddress?: string;
  tenantHours?: Record<string, HoursEntry>;
  tenantServiceArea?: { radius_miles?: number };
}

const DAY_ORDER = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
const DAY_NAMES: Record<string, string> = {
  monday: "Monday", tuesday: "Tuesday", wednesday: "Wednesday",
  thursday: "Thursday", friday: "Friday", saturday: "Saturday", sunday: "Sunday",
};

function formatTime(t: string): string {
  const [h, m] = t.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 || 12;
  return m === 0 ? `${hour12} ${suffix}` : `${hour12}:${String(m).padStart(2, "0")} ${suffix}`;
}

function dayRangeLabel(days: string[]): string {
  if (days.length === 1) return DAY_NAMES[days[0]];
  if (days.length === 2) return `${DAY_NAMES[days[0]]} and ${DAY_NAMES[days[1]]}`;
  return `${DAY_NAMES[days[0]]} through ${DAY_NAMES[days[days.length - 1]]}`;
}

/**
 * Build a complete, accurate hours description that handles different hours per day group.
 * e.g. "Monday through Friday from 9 AM to 5 PM, Saturday from 8 AM to 12 PM"
 */
function buildFullHoursString(hours: Record<string, HoursEntry>): string | null {
  const openDays = DAY_ORDER.filter(d => {
    const e = hours[d];
    return e && !e.closed;
  });
  if (openDays.length === 0) return null;

  // Group consecutive days with identical hours
  interface Group { days: string[]; open: string; close: string }
  const groups: Group[] = [];
  for (const day of openDays) {
    const entry = hours[day];
    if (!entry) continue;
    const open = entry.windows?.[0]?.open ?? (entry as { open?: string }).open ?? "";
    const close = entry.windows?.[0]?.close ?? (entry as { close?: string }).close ?? "";
    if (!open || !close) continue;
    const last = groups[groups.length - 1];
    if (last && last.open === open && last.close === close) {
      last.days.push(day);
    } else {
      groups.push({ days: [day], open, close });
    }
  }
  if (groups.length === 0) return null;

  const parts = groups.map(g => `${dayRangeLabel(g.days)} from ${formatTime(g.open)} to ${formatTime(g.close)}`);
  return parts.join(", ");
}

/** @deprecated use buildFullHoursString for new code */
function formatHoursString(hours: Record<string, HoursEntry>): { days: string; open: string; close: string } | null {
  const openDays = DAY_ORDER.filter(d => {
    const entry = hours[d];
    return entry && !entry.closed;
  });
  if (openDays.length === 0) return null;

  const firstDay = hours[openDays[0]];
  if (!firstDay) return null;
  const openTime = firstDay.windows?.[0]?.open ?? (firstDay as { open?: string }).open ?? "";
  const closeTime = firstDay.windows?.[0]?.close ?? (firstDay as { close?: string }).close ?? "";
  if (!openTime || !closeTime) return null;

  let daysStr: string;
  if (openDays.length === 7) {
    daysStr = "every day";
  } else if (openDays.length >= 5 && openDays.slice(0, 5).every((d, i) => d === DAY_ORDER[i])) {
    const weekendDays = openDays.slice(5);
    daysStr = weekendDays.length > 0
      ? `Monday through Friday and ${weekendDays.map(d => DAY_NAMES[d]).join(" and ")}`
      : "Monday through Friday";
  } else {
    daysStr = openDays.map(d => DAY_NAMES[d]).join(", ");
  }
  return { days: daysStr, open: formatTime(openTime), close: formatTime(closeTime) };
}

/** Placeholder pattern that can't be auto-filled (needs manual editing) */
const UNFILLABLE_PLACEHOLDERS = /\[signature dish\]|\[second popular item\]|\$\[amount\]|\[hours\]/;

/** Replace placeholders in FAQ answers with real tenant data */
function personalizeFAQ(
  faq: SuggestedFAQ,
  tenantAddress?: string,
  tenantHours?: Record<string, HoursEntry>,
  tenantServiceArea?: { radius_miles?: number },
): PersonalizedFAQ {
  let answer = faq.answer;
  let needsEditing = false;

  // Address
  if (tenantAddress) {
    answer = answer.replace("[your address]", tenantAddress);
    answer = answer.replace(/\. You can find us easily by \[landmark or directions\]/, "");
  }

  // Hours — [hours] gets full accurate string; [days]/[open time]/[close time] for backward compat
  if (tenantHours) {
    const fullHours = buildFullHoursString(tenantHours);
    if (fullHours) {
      answer = answer.replace("[hours]", fullHours);
    }
    const parsed = formatHoursString(tenantHours);
    if (parsed) {
      answer = answer.replace("[days]", parsed.days);
      answer = answer.replace("[open time]", parsed.open);
      answer = answer.replace("[close time]", parsed.close);
    }
  }

  // Service area / delivery radius
  if (tenantServiceArea?.radius_miles) {
    answer = answer.replace(/\[X\]-mile radius/, `${tenantServiceArea.radius_miles}-mile radius`);
  } else {
    answer = answer.replace(/\[X\]-mile radius/, "our delivery area");
  }
  answer = answer.replace("[your service area]", "our service area");

  // Check for remaining unfillable placeholders
  if (UNFILLABLE_PLACEHOLDERS.test(answer)) {
    needsEditing = true;
  }

  return { question: faq.question, answer, needsEditing };
}

/**
 * Industry-aware FAQ suggestions based on business mode
 */
const MODE_FAQS: Record<BusinessMode, SuggestedFAQ[]> = {
  service: [
    {
      question: "What are your hours?",
      answer: "We're open [hours]."
    },
    {
      question: "Where are you located?",
      answer: "We're located at [your address]. You can find us easily by [landmark or directions]."
    },
    {
      question: "How much does it cost?",
      answer: "Our pricing depends on the specific service you need. We'd be happy to provide a quote once we understand your requirements."
    },
    {
      question: "Do you offer free estimates?",
      answer: "Yes, we offer free estimates for most services. We can schedule a time that works for you."
    },
    {
      question: "How long does it take?",
      answer: "The time varies depending on the specific service. We'll give you an accurate estimate when we assess your needs."
    },
    {
      question: "Are you licensed and insured?",
      answer: "Yes, we are fully licensed and insured. We'd be happy to provide our credentials upon request."
    },
    {
      question: "Do you offer payment plans?",
      answer: "Yes, we offer flexible payment options. We can discuss what works best for your situation."
    },
    {
      question: "Do you offer emergency services?",
      answer: "Yes, we handle emergency calls. Let us know your situation and we'll get someone out as quickly as possible."
    },
  ],
  dispatch: [
    {
      question: "How fast can you get here?",
      answer: "Our average response time is about 30-45 minutes depending on your location and current demand. We'll give you an ETA when you call."
    },
    {
      question: "What forms of payment do you accept?",
      answer: "We accept cash, all major credit cards, and Apple Pay. Payment is due when the driver arrives."
    },
    {
      question: "Do you tow all vehicle types?",
      answer: "Yes, we can tow cars, trucks, SUVs, motorcycles, and most commercial vehicles. Just let us know what you're driving."
    },
    {
      question: "Are you available 24/7?",
      answer: "Yes, we're available 24 hours a day, 7 days a week, including holidays."
    },
    {
      question: "Do you work with roadside assistance programs?",
      answer: "Yes, we work with most major roadside assistance programs including AAA. We can bill them directly in most cases."
    },
    {
      question: "What's included in a tow?",
      answer: "The price includes hook-up, transport to your destination, and basic winching if needed. Long-distance or special equipment may have additional charges."
    },
    {
      question: "Can you unlock my car?",
      answer: "Yes, we offer lockout services. Our driver can get you back in your vehicle safely without damaging your locks."
    },
    {
      question: "Do you store vehicles?",
      answer: "Yes, we have a secure lot for vehicle storage. Daily and weekly rates are available."
    },
  ],
  food: [
    {
      question: "What are your hours?",
      answer: "We're open [days] from [open time] to [close time]. Kitchen closes 30 minutes before we close."
    },
    {
      question: "Do you deliver?",
      answer: "Yes, we deliver within a [X]-mile radius. Minimum order is $[amount] and delivery usually takes 30-45 minutes."
    },
    {
      question: "Do you have vegetarian/vegan options?",
      answer: "Yes, we have several vegetarian and vegan options on our menu. Just ask and we'll walk you through them."
    },
    {
      question: "Can you accommodate allergies?",
      answer: "Yes, please let us know about any allergies when you order. We take food allergies very seriously and can modify most dishes."
    },
    {
      question: "Do you do catering?",
      answer: "Yes, we offer catering for events of all sizes. We recommend ordering at least 48 hours in advance for catering orders."
    },
    {
      question: "Can I make a reservation?",
      answer: "Yes, we accept reservations. For parties of 6 or more, we recommend calling ahead."
    },
    {
      question: "What's your most popular dish?",
      answer: "Our [signature dish] is definitely a customer favorite! We also get lots of orders for our [second popular item]."
    },
    {
      question: "Do you have a kids menu?",
      answer: "Yes, we have a kids menu with smaller portions at lower prices. All kids meals come with a drink."
    },
  ],
  medical: [
    {
      question: "Do you take insurance?",
      answer: "Yes, we accept most major insurance providers. Please call us with your specific plan and we can verify coverage."
    },
    {
      question: "How do I schedule an appointment?",
      answer: "You can schedule by calling us or through our online booking system. We'll find a time that works for you."
    },
    {
      question: "Are you accepting new patients?",
      answer: "Yes, we're currently accepting new patients. We'd be happy to schedule your first appointment."
    },
    {
      question: "What should I bring to my first visit?",
      answer: "Please bring your ID, insurance card, and any relevant medical records or test results. Arrive 15 minutes early to complete paperwork."
    },
    {
      question: "Do you offer telehealth appointments?",
      answer: "Yes, we offer virtual visits for many types of appointments. Let us know if you'd prefer a telehealth option."
    },
    {
      question: "What's your cancellation policy?",
      answer: "We ask for 24 hours notice if you need to cancel or reschedule. This allows us to offer that time to other patients."
    },
    {
      question: "Do you offer payment plans?",
      answer: "Yes, we offer flexible payment options for patients without insurance or for services not covered by insurance."
    },
    {
      question: "How long is an appointment?",
      answer: "A typical appointment is 15-30 minutes. Initial consultations or complex visits may take longer."
    },
  ],
  general: [
    {
      question: "What are your hours?",
      answer: "We're open [hours]."
    },
    {
      question: "Where are you located?",
      answer: "We're located at [your address]. You can find us easily by [landmark or directions]."
    },
    {
      question: "How can I contact you?",
      answer: "You can reach us by phone, email, or through our website. We typically respond within 24 hours."
    },
    {
      question: "How much does it cost?",
      answer: "Our pricing depends on your specific needs. We'd be happy to provide a quote once we understand what you're looking for."
    },
    {
      question: "Do you offer consultations?",
      answer: "Yes, we offer initial consultations to discuss your needs and how we can help."
    },
    {
      question: "What areas do you serve?",
      answer: "We serve [your service area]. Contact us to confirm we can help in your location."
    },
    {
      question: "How do I get started?",
      answer: "Just give us a call or send us a message and we'll walk you through the process."
    },
    {
      question: "Do you offer payment plans?",
      answer: "Yes, we offer flexible payment options. We can discuss what works best for your situation."
    },
  ],
  sales: [
    {
      question: "What products do you carry?",
      answer: "We carry a wide selection of products. I can help you find exactly what you're looking for. What are you interested in?"
    },
    {
      question: "Do you offer financing?",
      answer: "Yes, we offer financing options with approved credit. I can walk you through the available plans."
    },
    {
      question: "Can I schedule a viewing?",
      answer: "Absolutely! I can schedule a time for you to come in and see our available inventory."
    },
    {
      question: "Do you accept trade-ins?",
      answer: "Yes, we accept trade-ins. Bring your item in and we'll provide a fair market value assessment."
    },
    {
      question: "What's your return policy?",
      answer: "We offer a 30-day return policy on most items with original receipt and packaging."
    },
    {
      question: "Do you price match?",
      answer: "Yes, we match competitor prices on identical items. Just show us the advertised price."
    },
    {
      question: "Do you deliver?",
      answer: "Yes, we offer delivery for an additional fee depending on your location. I can give you a quote."
    },
    {
      question: "Are there any current promotions?",
      answer: "We often have special promotions running. Let me check what's currently available for you."
    },
  ],
};

export function SuggestedFAQButtons({
  onAdd, existingQuestions = [], tenantPolicies,
  tenantName, tenantAddress, tenantHours, tenantServiceArea,
}: SuggestedFAQButtonsProps) {
  const { businessMode } = useTenantConfig();

  // Get FAQs for current business mode
  const suggestedFaqs = MODE_FAQS[businessMode] || MODE_FAQS.general;

  // Filter out already-added FAQs and policy-covered FAQs
  const policyOverlapPatterns = [
    ...(tenantPolicies?.cancellation ? ["cancellation"] : []),
    ...(tenantPolicies?.deposit ? ["deposit"] : []),
    ...(tenantPolicies?.refund ? ["refund", "return"] : []),
  ];

  const availableFAQs = suggestedFaqs
    .filter(faq => {
      // Skip if already added
      if (existingQuestions.some(q => q.toLowerCase().includes(faq.question.toLowerCase().slice(0, 20)))) return false;
      // Skip if covered by a policy
      if (policyOverlapPatterns.some(pattern => faq.question.toLowerCase().includes(pattern))) return false;
      return true;
    })
    .map(faq => personalizeFAQ(faq, tenantAddress, tenantHours, tenantServiceArea));

  if (availableFAQs.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Lightbulb className="h-3 w-3 shrink-0" />
        <span className="truncate">Quick add:</span>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1 -mb-1 scrollbar-thin">
        {availableFAQs.slice(0, 4).map((faq) => (
          <button
            key={faq.question}
            type="button"
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full border border-border bg-background hover:bg-muted/50 transition-colors whitespace-nowrap shrink-0"
            onClick={() => onAdd(faq.question, faq.answer)}
            title={faq.needsEditing ? "Needs your details — edit after adding" : undefined}
          >
            <Plus className="h-3 w-3" />
            {faq.question}
            {faq.needsEditing && (
              <AlertCircle className="h-3 w-3 text-amber-500 shrink-0" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
