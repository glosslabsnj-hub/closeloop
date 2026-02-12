/**
 * Business Brain Navigation Configuration
 *
 * Single source of truth for:
 * - Navigation categories and cards
 * - Mode-aware visibility rules
 * - Speech-ready field indicators
 * - Component references
 *
 * REDESIGNED: 8 tabs → 5 tabs with business-language naming
 */

import {
  Building2,
  DollarSign,
  Shield,
  Sparkles,
  BookOpen,
  BarChart3,
  type LucideIcon
} from "lucide-react";
import type { BusinessMode } from "@/hooks/useTenantConfig";
import type { BusinessCapabilities } from "@/hooks/useBusinessCapabilities";
import type { Capabilities } from "@/hooks/useCapabilities";
import type { TerminologyKey } from "@/data/industryTerminology";

export interface CardConfig {
  id: string;
  title: string;
  purpose: string;
  usedByAI: string[];
  speechReadyFields?: string[];
  defaultCollapsed?: boolean;
  priority?: "default" | "warning" | "error" | "success";
  /** Function to determine visibility based on mode/modules (legacy) */
  isVisible?: (mode: BusinessMode, modules: string[]) => boolean;
  /** NEW: Function to determine visibility based on business capabilities */
  isVisibleWithCapabilities?: (capabilities: BusinessCapabilities) => boolean;
  /** Capability-based visibility (preferred over isVisible) */
  isCapabilityVisible?: (caps: Capabilities) => boolean;
  /** Show mode-specific emphasis */
  emphasis?: BusinessMode[];
  /** Whether this is an essential section (must-complete for AI to work well) */
  isEssential?: boolean;
  /** Essential only for specific modes */
  essentialForModes?: BusinessMode[];
  /** Maps to an IndustryTerminology field for dynamic title resolution */
  titleKey?: TerminologyKey;
  /** Setup priority for progressive disclosure */
  setupPriority?: "essential" | "recommended" | "advanced";
}

export interface CategoryConfig {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  /** URL section parameter */
  section: string;
  /** Display order (1-based) */
  order: number;
  cards: CardConfig[];
  /** Modes where this category should be emphasized */
  emphasis?: BusinessMode[];
  /** Maps to an IndustryTerminology field for dynamic category title resolution */
  titleKey?: TerminologyKey;
}

/**
 * Complete navigation structure — 5 consolidated tabs
 */
export const BRAIN_CATEGORIES: CategoryConfig[] = [
  {
    id: "your-business",
    title: "Your Business",
    description: "Name, hours & calendar",
    icon: Building2,
    section: "business",
    order: 1,
    cards: [
      // Merged from: identity + operations + calendar
      {
        id: "business-info",
        title: "About Your Business",
        purpose: "Name, contact, timezone, and location your AI introduces",
        usedByAI: [
          "Introduces your business by name on every call",
          "Mentions years in business to build trust",
          "Answers location and contact questions",
        ],
        speechReadyFields: ["tagline", "location_summary"],
        defaultCollapsed: false,
        isEssential: true,
        setupPriority: "essential",
      },
      {
        id: "business-hours",
        title: "Your Hours",
        purpose: "When your business is open for calls and appointments",
        usedByAI: [
          "Tells callers if you're open or closed",
          "Suggests available booking times",
          "Explains hours when asked",
        ],
        defaultCollapsed: false,
        isEssential: true,
        setupPriority: "essential",
      },
      {
        id: "calendar-sync",
        title: "Calendar & Availability",
        purpose: "Connect external calendars for real-time availability",
        usedByAI: [
          "Checks your calendar before offering appointment times",
          "Avoids double-booking automatically",
          "Respects blocked times and buffers",
        ],
        defaultCollapsed: false,
        setupPriority: "recommended",
      },
      {
        id: "industry-templates",
        title: "Quick Setup Templates",
        purpose: "Pre-built setups for common business types",
        usedByAI: [
          "Applies industry best practices automatically",
          "Pre-fills common services and policies",
        ],
        setupPriority: "advanced",
      },
    ],
  },
  {
    id: "services-pricing",
    title: "Services & Pricing",
    description: "What you sell",
    icon: DollarSign,
    section: "services",
    order: 2,
    emphasis: ["service", "food", "dispatch"],
    titleKey: "servicesCategoryTitle",
    cards: [
      {
        id: "pricing-readiness",
        title: "Can Your AI Quote Prices?",
        purpose: "Check if your AI can accurately quote prices",
        usedByAI: [
          "Determines if AI can give quotes vs. 'callback for pricing'",
          "Shows what's missing for accurate pricing",
        ],
        defaultCollapsed: false,
        setupPriority: "recommended",
      },
      {
        id: "pricing-rules",
        title: "How You Price Things",
        purpose: "How your AI quotes prices — fixed, ranges, or callback",
        usedByAI: [
          "Decides between exact quote vs. 'starting at' vs. 'I'll have someone call you'",
          "Applies discounts or upsells when appropriate",
        ],
        isVisible: (mode) => mode !== "dispatch",
        isVisibleWithCapabilities: (caps) => caps.mode !== "dispatch",
        isCapabilityVisible: (caps) => !caps.isDispatchBusiness,
        setupPriority: "recommended",
      },
      {
        id: "catalog",
        title: "Your Services",
        titleKey: "catalogCardTitle",
        purpose: "All your services/menu items and their pricing",
        usedByAI: [
          "Reads item details when customers ask what you offer",
          "Quotes prices accurately for each item",
          "Matches caller needs to the right service",
        ],
        defaultCollapsed: false,
        isEssential: true,
        setupPriority: "essential",
      },
      {
        id: "price-modifiers",
        title: "Extra Fees & Surcharges",
        purpose: "Size, urgency, and after-hours rate adjustments",
        usedByAI: [
          "Applies vehicle/property size adjustments to quotes",
          "Adds urgency or after-hours surcharges",
          "Explains additional fees to customers",
        ],
        isVisible: (mode) => ["service", "dispatch"].includes(mode),
        isVisibleWithCapabilities: (caps) => ["service", "dispatch"].includes(caps.mode),
        setupPriority: "advanced",
      },
      {
        id: "service-packages",
        title: "Service Packages",
        purpose: "Discounted bundles and membership plans",
        usedByAI: [
          "Suggests packages when relevant to customer needs",
          "Explains savings compared to individual pricing",
          "Mentions membership benefits",
        ],
        isVisible: (mode) => ["service", "medical"].includes(mode),
        isVisibleWithCapabilities: (caps) => ["service", "medical"].includes(caps.mode),
        setupPriority: "advanced",
      },
      {
        id: "dispatch-pricing",
        title: "Dispatch Fees",
        purpose: "Equipment, storage, release, and emergency fees",
        usedByAI: [
          "Applies equipment fees (flatbed, dolly, winch)",
          "Calculates storage rates",
          "Adds emergency/after-hours surcharges",
        ],
        isVisible: (mode) => mode === "dispatch",
        isVisibleWithCapabilities: (caps) => caps.mode === "dispatch",
        setupPriority: "essential",
      },
      {
        id: "food-settings",
        title: "Order Settings",
        purpose: "Delivery, pickup, and catering configuration",
        usedByAI: [
          "Explains delivery radius and fees",
          "Quotes prep times",
          "Handles catering inquiries",
        ],
        isVisible: (mode, modules) => mode === "food" || modules.includes("food_orders"),
        isVisibleWithCapabilities: (caps) => caps.mode === "food" || caps.food.offersDelivery || caps.food.offersCatering,
        setupPriority: "essential",
      },
      {
        id: "menu-sizes",
        title: "Size Options",
        purpose: "Size variants for menu items (S/M/L, Personal/Family)",
        usedByAI: [
          "Asks which size the customer wants",
          "Quotes correct price per size",
        ],
        isVisible: (mode, modules) => mode === "food" || modules.includes("menu_knowledge"),
        isVisibleWithCapabilities: (caps) => caps.mode === "food",
        setupPriority: "advanced",
      },
      {
        id: "daily-specials",
        title: "Specials & Deals",
        purpose: "Time-limited offers and recurring specials",
        usedByAI: [
          "Mentions active specials to customers",
          "Explains what's included in deals",
        ],
        isVisible: (mode, modules) => mode === "food" || modules.includes("menu_knowledge"),
        isVisibleWithCapabilities: (caps) => caps.mode === "food",
        setupPriority: "advanced",
      },
      {
        id: "medical-pricing",
        title: "Practice Pricing",
        purpose: "Insurance, consultation fees, and payment options",
        usedByAI: [
          "Answers insurance coverage questions",
          "Quotes self-pay rates",
          "Explains payment options",
        ],
        isVisible: (mode) => mode === "medical",
        isVisibleWithCapabilities: (caps) => caps.mode === "medical",
        setupPriority: "essential",
      },
      {
        id: "additional-services",
        title: "Other Things You Offer",
        purpose: "Secondary services you offer beyond your core business",
        usedByAI: [
          "Mentions these when relevant (e.g., 'We also offer body work')",
          "Quotes prices or offers callbacks based on configuration",
          "Helps cross-sell when appropriate",
        ],
        defaultCollapsed: true,
        setupPriority: "advanced",
      },
    ],
  },
  {
    id: "how-you-operate",
    title: "How You Operate",
    description: "Coverage & rules",
    icon: Shield,
    section: "operations",
    order: 3,
    emphasis: ["dispatch", "service"],
    cards: [
      // Merged from: coverage + rules
      // Coverage cards first
      {
        id: "coverage-summary",
        title: "Where You Serve",
        purpose: "Quick view of where you currently serve",
        usedByAI: [
          "Checks if caller location is in your service area",
          "Politely declines jobs outside coverage",
        ],
        defaultCollapsed: false,
        setupPriority: "recommended",
      },
      {
        id: "service-area-settings",
        title: "Your Service Area",
        titleKey: "coverageCardTitle",
        purpose: "Define exactly where your business provides service",
        usedByAI: [
          "Uses radius, ZIP codes, or counties to determine coverage",
          "Delivers out-of-area message when needed",
        ],
        speechReadyFields: ["out_of_area_message"],
        isEssential: true,
        essentialForModes: ["dispatch", "service", "food"],
        setupPriority: "essential",
      },
      {
        id: "eta-settings",
        title: "Arrival Estimates",
        purpose: "How long it takes to reach customers",
        usedByAI: [
          "Calculates arrival estimates based on distance",
          "Quotes realistic timeframes to callers",
        ],
        setupPriority: "recommended",
      },
      {
        id: "busyness",
        title: "How Busy Are You Right Now?",
        purpose: "Adjust wait times based on how busy you are right now",
        usedByAI: [
          "Adds wait time to ETAs when you're busy",
          "Manages caller expectations realistically",
        ],
        setupPriority: "advanced",
      },
      // Policy cards
      {
        id: "business-policies",
        title: "Cancellation, Deposits & Payments",
        titleKey: "policiesCardTitle",
        purpose: "Cancellations, deposits, and payment terms",
        usedByAI: [
          "Explains policies before they become objections",
          "Answers payment and cancellation questions",
        ],
        speechReadyFields: ["cancellation_policy", "deposit_policy"],
        defaultCollapsed: false,
        setupPriority: "recommended",
      },
      {
        id: "never-promise",
        title: "What Your AI Should Never Promise",
        purpose: "Hard limits on what your AI can commit to",
        usedByAI: [
          "Prevents over-promising on pricing or timelines",
          "Redirects to 'let me have someone call you' when appropriate",
        ],
        setupPriority: "advanced",
      },
      {
        id: "required-questions",
        title: "Info to Collect on Every Call",
        purpose: "Information your AI must collect from every caller",
        usedByAI: [
          "Ensures every call captures the essentials (name, phone, etc.)",
          "Collects mode-specific info (address for dispatch, party size for reservations)",
        ],
        defaultCollapsed: false,
        setupPriority: "recommended",
      },
      {
        id: "booking-delivery",
        title: "Where to Send New Bookings",
        purpose: "Where new bookings get sent after confirmation",
        usedByAI: [
          "Routes confirmed bookings to your preferred destination",
        ],
        isVisible: (mode) => ["service", "medical", "general"].includes(mode),
        isVisibleWithCapabilities: (caps) => ["service", "medical", "general"].includes(caps.mode),
        isCapabilityVisible: (caps) => caps.isSchedulingBusiness,
        setupPriority: "recommended",
      },
      {
        id: "food-delivery",
        title: "How Orders Are Handled",
        purpose: "Pickup, delivery, and order handling",
        usedByAI: [
          "Determines if delivery is available and minimums",
          "Sets pickup procedures and wait times",
        ],
        isVisible: (mode, modules) => mode === "food" || modules.includes("food_orders"),
        isVisibleWithCapabilities: (caps) => caps.mode === "food",
        isCapabilityVisible: (caps) => caps.hasFoodOrders,
        setupPriority: "recommended",
      },
      {
        id: "dispatch-delivery",
        title: "Where to Send New Jobs",
        purpose: "Where new jobs get routed after booking",
        usedByAI: [
          "Sends new jobs to your dispatch queue or system",
        ],
        isVisible: (mode) => mode === "dispatch",
        isVisibleWithCapabilities: (caps) => caps.mode === "dispatch",
        isCapabilityVisible: (caps) => caps.isDispatchBusiness,
        setupPriority: "recommended",
      },
      {
        id: "team-management",
        title: "Your Team",
        purpose: "Manage your staff and assign jobs to team members",
        usedByAI: [
          "Knows your team members and their specialties",
          "Can mention technician names when relevant",
        ],
        isCapabilityVisible: (caps) => caps.isDispatchBusiness || caps.hasFleetManagement || caps.hasStaffScheduling,
        isVisible: (mode) => mode === "dispatch",
        setupPriority: "recommended",
      },
      {
        id: "hipaa-settings",
        title: "HIPAA Compliance",
        purpose: "Medical practice compliance settings",
        usedByAI: [
          "Applies HIPAA-safe language and data handling",
          "Limits what gets stored for compliance",
        ],
        priority: "warning",
        isVisible: (mode) => mode === "medical",
        isVisibleWithCapabilities: (caps) => caps.mode === "medical" && caps.medical.requiresHIPAA,
        isCapabilityVisible: (caps) => caps.isMedicalBusiness,
        setupPriority: "essential",
      },
      {
        id: "tekmetric",
        title: "Tekmetric Integration",
        purpose: "Sync repair orders from Tekmetric into Active Jobs",
        usedByAI: [
          "Keeps your job board up to date automatically",
        ],
        isCapabilityVisible: (caps) => caps.hasJobTracking,
        setupPriority: "advanced",
      },
    ],
  },
  {
    id: "ai-personality",
    title: "AI Personality",
    description: "Voice & behavior",
    icon: Sparkles,
    section: "ai-voice",
    order: 4,
    cards: [
      {
        id: "scripts",
        title: "How Your AI Answers the Phone",
        purpose: "How your AI starts and ends calls",
        usedByAI: [
          "Delivers your custom greeting on every call",
          "Uses your fallback script when uncertain",
        ],
        speechReadyFields: ["greeting_script", "fallback_script"],
        defaultCollapsed: false,
        isEssential: true,
        setupPriority: "essential",
      },
      {
        id: "business-rules",
        title: "Special Instructions for Your AI",
        purpose: "High-level instructions for your AI",
        usedByAI: [
          "Follows your rules about when to offer vs. require callbacks",
          "Adjusts tone and approach per your preferences",
        ],
        setupPriority: "recommended",
      },
      {
        id: "intelligence",
        title: "Learning Preferences",
        purpose: "How your AI remembers and adapts",
        usedByAI: [
          "Controls memory, learning, and adaptation features",
        ],
        setupPriority: "advanced",
      },
    ],
  },
  {
    id: "knowledge",
    title: "Knowledge",
    description: "FAQs & training",
    icon: BookOpen,
    section: "training",
    order: 5,
    cards: [
      {
        id: "review-queue",
        title: "Items Needing Your Approval",
        purpose: "Items needing your approval before the AI uses them",
        usedByAI: [
          "Pending items won't be used until you approve",
          "Ensures AI only says what you've vetted",
        ],
        priority: "error",
        setupPriority: "recommended",
      },
      {
        id: "faqs",
        title: "Common Questions & Answers",
        titleKey: "faqsCardTitle",
        purpose: "Common questions and your approved answers",
        usedByAI: [
          "Answers FAQs instantly without guessing",
          "Reduces 'I don't know' responses",
        ],
        defaultCollapsed: false,
        setupPriority: "essential",
      },
      {
        id: "objections",
        title: "When Customers Push Back",
        purpose: "How to respond when customers push back",
        usedByAI: [
          "Addresses 'too expensive' or 'not sure' concerns",
          "Keeps conversations moving toward booking",
        ],
        setupPriority: "recommended",
      },
      {
        id: "custom-knowledge",
        title: "Extra Info for Your AI",
        purpose: "Additional facts and information",
        usedByAI: [
          "Provides extra context for unusual questions",
        ],
        setupPriority: "advanced",
      },
      {
        id: "documents",
        title: "Reference Documents",
        purpose: "PDFs, menus, and reference materials",
        usedByAI: [
          "References uploaded files for detailed info",
        ],
        setupPriority: "advanced",
      },
    ],
  },
  {
    id: "intelligence",
    title: "Intelligence",
    description: "Insights & analytics",
    icon: BarChart3,
    section: "intelligence",
    order: 6,
    cards: [
      {
        id: "conversion-metrics",
        title: "Call Performance",
        purpose: "Conversion tracking and call outcome analytics",
        usedByAI: [
          "Tracks every call outcome automatically",
          "Measures conversion rates over time",
          "Estimates revenue from AI-handled calls",
        ],
        defaultCollapsed: false,
        setupPriority: "advanced",
      },
      {
        id: "insights",
        title: "Insights & Recommendations",
        purpose: "Actionable insights generated from call patterns",
        usedByAI: [
          "Detects when callers aren't getting answers",
          "Finds services with low conversion rates",
          "Identifies peak times and capacity issues",
        ],
        defaultCollapsed: false,
        setupPriority: "advanced",
      },
      {
        id: "patterns",
        title: "Business Patterns",
        purpose: "Trends detected across calls",
        usedByAI: [
          "Tracks peak call hours and conversion times",
          "Monitors service request trends",
          "Detects escalation patterns",
        ],
        setupPriority: "advanced",
      },
      {
        id: "weekly-digest",
        title: "Weekly Digest",
        purpose: "Weekly performance summary",
        usedByAI: [
          "Summarizes call volume and conversion trends",
          "Highlights top patterns discovered",
        ],
        setupPriority: "advanced",
      },
      {
        id: "intelligence-settings",
        title: "Learning Preferences",
        purpose: "Control how your AI learns and adapts",
        usedByAI: [
          "Controls memory, learning, and adaptation features",
        ],
        setupPriority: "advanced",
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
 * Filter cards in a category based on mode and modules (legacy)
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
 * Filter cards in a category based on business capabilities (new)
 */
export function getVisibleCardsWithCapabilities(
  category: CategoryConfig,
  capabilities: BusinessCapabilities
): CardConfig[] {
  return category.cards.filter(card => {
    if (card.isVisibleWithCapabilities) {
      return card.isVisibleWithCapabilities(capabilities);
    }
    if (card.isVisible) {
      return true;
    }
    return true;
  });
}

/**
 * Filter cards using capabilities (preferred over getVisibleCards).
 * Falls back to legacy isVisible when isCapabilityVisible is not defined.
 */
export function getVisibleCardsV2(
  category: CategoryConfig,
  capabilities: Capabilities,
  mode: BusinessMode,
  modules: string[]
): CardConfig[] {
  return category.cards.filter(card => {
    if (card.isCapabilityVisible) return card.isCapabilityVisible(capabilities);
    if (card.isVisible) return card.isVisible(mode, modules);
    return true;
  });
}

/**
 * Map section URL params to category IDs
 * Includes both new and legacy section params for backward compatibility
 */
export const SECTION_TO_CATEGORY: Record<string, string> = {
  // Mode-shaped sections
  about: "your-business",
  services: "services-pricing",
  operations: "how-you-operate",
  rules: "how-you-operate",
  training: "knowledge",
  intelligence: "intelligence",
  // Legacy sections (for backward compatibility)
  business: "your-business",
  "ai-voice": "ai-personality",
  profile: "your-business",
  hours: "your-business",
  availability: "your-business",
  "calendar-sync": "your-business",
  "service-area": "how-you-operate",
  policies: "how-you-operate",
  "ai-behavior": "ai-personality",
  knowledge: "knowledge",
};

/**
 * Map category IDs to section URL params
 */
export const CATEGORY_TO_SECTION: Record<string, string> = {
  "your-business": "business",
  "services-pricing": "services",
  "how-you-operate": "operations",
  "ai-personality": "ai-voice",
  knowledge: "training",
  intelligence: "intelligence",
};
