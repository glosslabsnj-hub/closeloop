/**
 * Business Brain Navigation Configuration
 * 
 * Single source of truth for:
 * - Navigation categories and cards
 * - Mode-aware visibility rules
 * - Speech-ready field indicators
 * - Component references
 */

import { 
  Building2, 
  Clock, 
  Package, 
  MapPin, 
  Calendar, 
  Shield, 
  Sparkles, 
  BookOpen,
  Truck,
  type LucideIcon
} from "lucide-react";
import type { BusinessMode } from "@/hooks/useTenantConfig";

export interface CardConfig {
  id: string;
  title: string;
  purpose: string;
  usedByAI: string[];
  speechReadyFields?: string[];
  defaultCollapsed?: boolean;
  priority?: "default" | "warning" | "error" | "success";
  /** Function to determine visibility based on mode/modules */
  isVisible?: (mode: BusinessMode, modules: string[]) => boolean;
  /** Show mode-specific emphasis */
  emphasis?: BusinessMode[];
}

export interface CategoryConfig {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  /** URL section parameter */
  section: string;
  cards: CardConfig[];
  /** Modes where this category should be emphasized */
  emphasis?: BusinessMode[];
}

/**
 * Complete navigation structure with mode-aware visibility
 */
export const BRAIN_CATEGORIES: CategoryConfig[] = [
  {
    id: "identity",
    title: "Identity",
    description: "Who you are",
    icon: Building2,
    section: "profile",
    cards: [
      {
        id: "business-info",
        title: "Business Information",
        purpose: "Name, contact, timezone, and location your AI introduces",
        usedByAI: [
          "Introduces your business by name on every call",
          "Mentions years in business to build trust",
          "Answers location and contact questions",
        ],
        speechReadyFields: ["tagline", "location_summary"],
        defaultCollapsed: false,
      },
      {
        id: "industry-templates",
        title: "Quick Start Templates",
        purpose: "Pre-built setups for common business types",
        usedByAI: [
          "Applies industry best practices automatically",
          "Pre-fills common services and policies",
        ],
      },
    ],
  },
  {
    id: "operations",
    title: "Operations",
    description: "Business hours",
    icon: Clock,
    section: "hours",
    cards: [
      {
        id: "business-hours",
        title: "Weekly Schedule",
        purpose: "When your business is open for calls and appointments",
        usedByAI: [
          "Tells callers if you're open or closed",
          "Suggests available booking times",
          "Explains hours when asked",
        ],
        defaultCollapsed: false,
      },
    ],
  },
  {
    id: "calendar",
    title: "Calendar",
    description: "Availability sync",
    icon: Calendar,
    section: "availability",
    cards: [
      {
        id: "calendar-sync",
        title: "Calendar Connections",
        purpose: "Connect external calendars for real-time availability",
        usedByAI: [
          "Checks your calendar before offering appointment times",
          "Avoids double-booking automatically",
          "Respects blocked times and buffers",
        ],
        defaultCollapsed: false,
      },
    ],
  },
  {
    id: "offerings",
    title: "Offerings",
    description: "What you sell",
    icon: Package,
    section: "services",
    cards: [
      {
        id: "pricing-readiness",
        title: "Pricing Readiness",
        purpose: "Check if your AI can accurately quote prices",
        usedByAI: [
          "Determines if AI can give quotes vs. 'callback for pricing'",
          "Shows what's missing for accurate pricing",
        ],
        defaultCollapsed: false,
      },
      {
        id: "pricing-rules",
        title: "Pricing Rules",
        purpose: "How your AI quotes prices — fixed, ranges, or callback",
        usedByAI: [
          "Decides between exact quote vs. 'starting at' vs. 'I'll have someone call you'",
          "Applies discounts or upsells when appropriate",
        ],
        isVisible: (mode) => mode !== "dispatch",
      },
      {
        id: "catalog",
        title: "Your Services",
        purpose: "All your services/menu items and their pricing",
        usedByAI: [
          "Reads item details when customers ask what you offer",
          "Quotes prices accurately for each item",
          "Matches caller needs to the right service",
        ],
        defaultCollapsed: false,
      },
    ],
    emphasis: ["service", "food", "dispatch"],
  },
  {
    id: "coverage",
    title: "Coverage & ETA",
    description: "Where you serve",
    icon: MapPin,
    section: "service-area",
    emphasis: ["dispatch", "service"],
    cards: [
      {
        id: "coverage-summary",
        title: "Current Coverage",
        purpose: "Quick view of where you currently serve",
        usedByAI: [
          "Checks if caller location is in your service area",
          "Politely declines jobs outside coverage",
        ],
        defaultCollapsed: false,
      },
      {
        id: "service-area-settings",
        title: "Service Area Rules",
        purpose: "Define exactly where your business provides service",
        usedByAI: [
          "Uses radius, ZIP codes, or counties to determine coverage",
          "Delivers out-of-area message when needed",
        ],
        speechReadyFields: ["out_of_area_message"],
      },
      {
        id: "eta-settings",
        title: "ETA & Travel Times",
        purpose: "How long it takes to reach customers",
        usedByAI: [
          "Calculates arrival estimates based on distance",
          "Quotes realistic timeframes to callers",
        ],
      },
      {
        id: "busyness",
        title: "Busy Level",
        purpose: "Adjust wait times based on how busy you are right now",
        usedByAI: [
          "Adds wait time to ETAs when you're busy",
          "Manages caller expectations realistically",
        ],
      },
    ],
  },
  {
    id: "rules",
    title: "Policies",
    description: "Rules & settings",
    icon: Shield,
    section: "policies",
    cards: [
      {
        id: "business-policies",
        title: "Business Policies",
        purpose: "Cancellations, deposits, and payment terms",
        usedByAI: [
          "Explains policies before they become objections",
          "Answers payment and cancellation questions",
        ],
        speechReadyFields: ["cancellation_policy", "deposit_policy"],
        defaultCollapsed: false,
      },
      {
        id: "never-promise",
        title: "What AI Should Never Promise",
        purpose: "Hard limits on what your AI can commit to",
        usedByAI: [
          "Prevents over-promising on pricing or timelines",
          "Redirects to 'let me have someone call you' when appropriate",
        ],
      },
      {
        id: "required-questions",
        title: "Required Questions",
        purpose: "Information your AI must collect from every caller",
        usedByAI: [
          "Ensures every call captures the essentials (name, phone, etc.)",
          "Collects mode-specific info (address for dispatch, party size for reservations)",
        ],
        defaultCollapsed: false,
      },
      {
        id: "booking-delivery",
        title: "Where Bookings Go",
        purpose: "Where new bookings get sent after confirmation",
        usedByAI: [
          "Routes confirmed bookings to your preferred destination",
        ],
        isVisible: (mode) => ["service", "medical", "general"].includes(mode),
      },
      {
        id: "food-delivery",
        title: "Order Settings",
        purpose: "Pickup, delivery, and order handling",
        usedByAI: [
          "Determines if delivery is available and minimums",
          "Sets pickup procedures and wait times",
        ],
        isVisible: (mode, modules) => mode === "food" || modules.includes("food_orders"),
      },
      {
        id: "dispatch-delivery",
        title: "Where Jobs Go",
        purpose: "Where new jobs get routed after booking",
        usedByAI: [
          "Sends new jobs to your dispatch queue or system",
        ],
        isVisible: (mode) => mode === "dispatch",
      },
      {
        id: "hipaa-settings",
        title: "HIPAA & Compliance",
        purpose: "Medical practice compliance settings",
        usedByAI: [
          "Applies HIPAA-safe language and data handling",
          "Limits what gets stored for compliance",
        ],
        priority: "warning",
        isVisible: (mode) => mode === "medical",
      },
    ],
  },
  {
    id: "knowledge",
    title: "Knowledge",
    description: "FAQs & training",
    icon: BookOpen,
    section: "knowledge",
    cards: [
      {
        id: "review-queue",
        title: "Review Queue",
        purpose: "Items needing your approval before the AI uses them",
        usedByAI: [
          "Pending items won't be used until you approve",
          "Ensures AI only says what you've vetted",
        ],
        priority: "error",
      },
      {
        id: "faqs",
        title: "Frequently Asked Questions",
        purpose: "Common questions and your approved answers",
        usedByAI: [
          "Answers FAQs instantly without guessing",
          "Reduces 'I don't know' responses",
        ],
        defaultCollapsed: false,
      },
      {
        id: "objections",
        title: "Handling Objections",
        purpose: "How to respond when customers push back",
        usedByAI: [
          "Addresses 'too expensive' or 'not sure' concerns",
          "Keeps conversations moving toward booking",
        ],
      },
      {
        id: "custom-knowledge",
        title: "Custom Knowledge",
        purpose: "Additional facts and information",
        usedByAI: [
          "Provides extra context for unusual questions",
        ],
      },
      {
        id: "documents",
        title: "Uploaded Documents",
        purpose: "PDFs, menus, and reference materials",
        usedByAI: [
          "References uploaded files for detailed info",
        ],
      },
    ],
  },
  {
    id: "ai-setup",
    title: "AI Setup",
    description: "Voice & behavior",
    icon: Sparkles,
    section: "ai-behavior",
    cards: [
      {
        id: "scripts",
        title: "Greeting & Scripts",
        purpose: "How your AI starts and ends calls",
        usedByAI: [
          "Delivers your custom greeting on every call",
          "Uses your fallback script when uncertain",
        ],
        speechReadyFields: ["greeting_script", "fallback_script"],
        defaultCollapsed: false,
      },
      {
        id: "business-rules",
        title: "Business Guidelines",
        purpose: "High-level instructions for your AI",
        usedByAI: [
          "Follows your rules about when to offer vs. require callbacks",
          "Adjusts tone and approach per your preferences",
        ],
      },
      {
        id: "intelligence",
        title: "AI Memory & Learning",
        purpose: "How your AI remembers and adapts",
        usedByAI: [
          "Controls memory, learning, and adaptation features",
        ],
      },
    ],
  },
];

/**
 * Get categories ordered by relevance for a given mode
 */
export function getOrderedCategories(_mode: BusinessMode): CategoryConfig[] {
  // Return categories in their defined order (no reordering by emphasis)
  return [...BRAIN_CATEGORIES];
}

/**
 * Filter cards in a category based on mode and modules
 */
export function getVisibleCards(
  category: CategoryConfig,
  mode: BusinessMode,
  modules: string[]
): CardConfig[] {
  return category.cards.filter(card => {
    if (!card.isVisible) return true;
    return card.isVisible(mode, modules);
  });
}

/**
 * Map old section IDs to new category IDs for deep link compatibility
 */
export const SECTION_TO_CATEGORY: Record<string, string> = {
  profile: "identity",
  hours: "operations",
  services: "offerings",
  "service-area": "coverage",
  availability: "calendar",
  policies: "rules",
  "ai-behavior": "ai-setup",
  knowledge: "knowledge",
};

/**
 * Map category IDs to section params for URL
 */
export const CATEGORY_TO_SECTION: Record<string, string> = {
  identity: "profile",
  operations: "hours",
  offerings: "services",
  coverage: "service-area",
  calendar: "availability",
  rules: "policies",
  "ai-setup": "ai-behavior",
  knowledge: "knowledge",
};
