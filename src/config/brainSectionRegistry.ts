/**
 * Brain Section Registry
 *
 * Pure data file defining every sidebar item for every Brain tab.
 * Each item maps to an editor component rendered by BrainEditorRenderer.
 *
 * Visibility predicates determine which items appear based on
 * business mode, capabilities, and scenario flags.
 */

import {
  Building2, Clock, Calendar, Palette, DollarSign, Tag, UtensilsCrossed,
  MapPin, Navigation, Gauge, FileText, Shield, MessageSquareText, Send,
  Truck, Phone, Warehouse, HeartPulse, Mic, BookOpen, AlertCircle,
  HelpCircle, MessageCircle, Lightbulb, FileUp, Heart, Users, Package,
  FileCheck, Settings2, GitBranch, CalendarCheck, type LucideIcon,
} from "lucide-react";
import type { BusinessMode } from "@/hooks/useTenantConfig";
import type { Capabilities } from "@/hooks/useCapabilities";

// ─── Types ──────────────────────────────────────────────────────────────────

export type NewSectionId = "business" | "services" | "operations" | "ai-voice" | "training" | "intelligence";

export interface VisibilityFlags {
  isFoodMode: boolean;
  foodAcceptsDelivery: boolean;
  foodAcceptsCatering: boolean;
  foodNeedsCoverage: boolean;
  showBookingDelivery: boolean;
  showFoodDelivery: boolean;
  isRelevant: (id: string) => boolean;
  reviewCount: number;
}

export interface BrainSectionItem {
  id: string;
  title: string;
  icon: LucideIcon;
  group: string;
  groupLabel: string;
  order: number;
  tab: NewSectionId;
  isEssential?: boolean;
  /** Setup priority for progressive disclosure in sidebar */
  setupPriority?: "essential" | "recommended" | "advanced";
  isVisible?: (mode: BusinessMode, caps: Capabilities, flags: VisibilityFlags) => boolean;
}

export interface SectionGroup {
  groupKey: string;
  groupLabel: string;
  items: BrainSectionItem[];
}

// ─── Business Tab ───────────────────────────────────────────────────────────

const BUSINESS_ITEMS: BrainSectionItem[] = [
  {
    id: "business-info",
    title: "Business Info",
    icon: Building2,
    group: "essentials",
    groupLabel: "Basics",
    order: 1,
    tab: "business",
    isEssential: true,

  },
  {
    id: "business-hours",
    title: "Your Hours",
    icon: Clock,
    group: "essentials",
    groupLabel: "Basics",
    order: 2,
    tab: "business",
    isEssential: true,

  },
  {
    id: "calendar-sync",
    title: "Calendar",
    icon: Calendar,
    group: "essentials",
    groupLabel: "Basics",
    order: 3,
    tab: "business",

    isVisible: (_mode, caps) => caps.isSchedulingBusiness,
  },
  {
    id: "team",
    title: "Your Team",
    icon: Users,
    group: "team",
    groupLabel: "Your Team",
    order: 4,
    tab: "business",
    setupPriority: "recommended",
  },
  {
    id: "templates",
    title: "Templates",
    icon: Palette,
    group: "quickstart",
    groupLabel: "Get Started",
    order: 1,
    tab: "business",
    setupPriority: "recommended",
  },
];

// ─── Services Tab ───────────────────────────────────────────────────────────

const SERVICES_ITEMS: BrainSectionItem[] = [
  {
    id: "food-service-types",
    title: "Service Types",
    icon: UtensilsCrossed,
    group: "your-catalog",
    groupLabel: "Your Services",
    order: 1,
    tab: "services",
    isEssential: true,

    isVisible: (_mode, _caps, flags) => flags.isFoodMode,
  },
  {
    id: "pricing-rules",
    title: "How You Price Things",
    icon: DollarSign,
    group: "your-catalog",
    groupLabel: "Your Services",
    order: 2,
    tab: "services",

    isVisible: (_mode, caps) => caps.isDispatchBusiness,
  },
  {
    id: "catalog",
    title: "Your Services",
    icon: Tag,
    group: "your-catalog",
    groupLabel: "Your Services",
    order: 3,
    tab: "services",
    isEssential: true,

  },
  {
    id: "price-modifiers",
    title: "Price Modifiers",
    icon: DollarSign,
    group: "pricing-options",
    groupLabel: "Pricing & Fees",
    order: 1,
    tab: "services",

    isVisible: (_mode, _caps, flags) => flags.isRelevant("price-modifiers"),
  },
  {
    id: "service-packages",
    title: "Service Packages",
    icon: Package,
    group: "pricing-options",
    groupLabel: "Pricing & Fees",
    order: 2,
    tab: "services",

    isVisible: (_mode, _caps, flags) => flags.isRelevant("service-packages"),
  },
  {
    id: "dispatch-pricing",
    title: "Dispatch Fees",
    icon: DollarSign,
    group: "pricing-options",
    groupLabel: "Pricing & Fees",
    order: 3,
    tab: "services",

    isVisible: (_mode, _caps, flags) => flags.isRelevant("dispatch-pricing"),
  },
  {
    id: "distance-basis",
    title: "Distance Pricing",
    icon: Navigation,
    group: "pricing-options",
    groupLabel: "Pricing & Fees",
    order: 4,
    tab: "services",

    isVisible: (_mode, _caps, flags) => flags.isRelevant("dispatch-pricing"),
  },
  {
    id: "food-settings-svc",
    title: "Order Settings",
    icon: UtensilsCrossed,
    group: "pricing-options",
    groupLabel: "Pricing & Fees",
    order: 5,
    tab: "services",

    isVisible: (mode, caps, flags) => (mode === "food" || caps.isFoodBusiness || caps.hasFoodOrders) && flags.isRelevant("food-settings"),
  },
  {
    id: "menu-sizes",
    title: "Size Options",
    icon: Tag,
    group: "pricing-options",
    groupLabel: "Pricing & Fees",
    order: 6,
    tab: "services",

    isVisible: (mode, caps, flags) => (mode === "food" || caps.isFoodBusiness || caps.hasFoodOrders) && flags.isRelevant("food-settings"),
  },
  {
    id: "daily-specials",
    title: "Specials & Deals",
    icon: Lightbulb,
    group: "pricing-options",
    groupLabel: "Pricing & Fees",
    order: 7,
    tab: "services",

    isVisible: (mode, caps, flags) => (mode === "food" || caps.isFoodBusiness || caps.hasFoodOrders) && flags.isRelevant("food-settings"),
  },
  {
    id: "medical-pricing",
    title: "Practice Pricing",
    icon: HeartPulse,
    group: "pricing-options",
    groupLabel: "Pricing & Fees",
    order: 8,
    tab: "services",

    isVisible: (mode, caps) => mode === "medical" || caps.isMedicalBusiness,
  },
  {
    id: "additional-services",
    title: "Additional Services",
    icon: Tag,
    group: "other-offerings",
    groupLabel: "Additional Offerings",
    order: 1,
    tab: "services",

  },
  {
    id: "sales-policies",
    title: "Sales Settings",
    icon: DollarSign,
    group: "sales-settings",
    groupLabel: "Sales Settings",
    order: 1,
    tab: "services",
    isVisible: (_mode, caps) => caps.isSalesBusiness,
  },
  {
    id: "lead-pipeline",
    title: "Lead Pipeline",
    icon: GitBranch,
    group: "sales-pipeline",
    groupLabel: "Sales Pipeline",
    order: 1,
    tab: "training",
    isVisible: (_mode, caps) => caps.isSalesBusiness,
  },
  {
    id: "follow-up-sequences",
    title: "Follow-Up Sequences",
    icon: Send,
    group: "sales-pipeline",
    groupLabel: "Sales Pipeline",
    order: 2,
    tab: "training",
    isVisible: (_mode, caps) => caps.isSalesBusiness,
  },
  {
    id: "sales-scripts",
    title: "Sales Objection Playbook",
    icon: MessageSquareText,
    group: "sales-pipeline",
    groupLabel: "Sales Pipeline",
    order: 3,
    tab: "training",
    isVisible: (_mode, caps) => caps.isSalesBusiness,
  },
];

// ─── Operations Tab ─────────────────────────────────────────────────────────

const OPERATIONS_ITEMS: BrainSectionItem[] = [
  // Service Area
  {
    id: "coverage",
    title: "Service Area",
    icon: MapPin,
    group: "where-you-work",
    groupLabel: "Service Area",
    order: 1,
    tab: "operations",
    isEssential: true,

    isVisible: (mode, _caps, flags) =>
      (mode !== "food" && !flags.isFoodMode) || flags.foodNeedsCoverage,
  },
  {
    id: "travel-times",
    title: "ETAs",
    icon: Navigation,
    group: "where-you-work",
    groupLabel: "Service Area",
    order: 2,
    tab: "operations",

    isVisible: (mode, caps, flags) =>
      (caps.isDispatchBusiness || caps.offersMobileService) &&
      ((mode !== "food" && !flags.isFoodMode) || flags.foodNeedsCoverage),
  },
  {
    id: "service-coverage",
    title: "Service Scheduling",
    icon: Clock,
    group: "where-you-work",
    groupLabel: "Service Area",
    order: 3,
    tab: "operations",

    isVisible: (mode, caps) => mode === "service" && caps.isSchedulingBusiness,
  },
  {
    id: "dispatch-zones",
    title: "Coverage Zones & ETA",
    icon: MapPin,
    group: "where-you-work",
    groupLabel: "Service Area",
    order: 4,
    tab: "operations",

    isVisible: (_mode, _caps, flags) => flags.isRelevant("dispatch-zones"),
  },
  {
    id: "delivery-zones",
    title: "Delivery Zones",
    icon: Truck,
    group: "where-you-work",
    groupLabel: "Service Area",
    order: 5,
    tab: "operations",

    isVisible: (_mode, _caps, flags) =>
      flags.isRelevant("delivery-zones") && flags.foodAcceptsDelivery,
  },
  {
    id: "catering-coverage",
    title: "Catering Coverage",
    icon: Users,
    group: "where-you-work",
    groupLabel: "Service Area",
    order: 6,
    tab: "operations",

    isVisible: (_mode, _caps, flags) =>
      flags.isRelevant("delivery-zones") && flags.foodAcceptsCatering,
  },
  {
    id: "medical-coverage",
    title: "Visit Options",
    icon: HeartPulse,
    group: "where-you-work",
    groupLabel: "Service Area",
    order: 7,
    tab: "operations",

    isVisible: (_mode, _caps, flags) => flags.isRelevant("medical-coverage"),
  },
  {
    id: "response-times",
    title: "Response Times",
    icon: Phone,
    group: "where-you-work",
    groupLabel: "Service Area",
    order: 8,
    tab: "operations",

    isVisible: (mode) => mode === "general",
  },
  {
    id: "workload",
    title: "Current Workload",
    icon: Gauge,
    group: "where-you-work",
    groupLabel: "Service Area",
    order: 9,
    tab: "operations",

    isVisible: (_mode, caps) => caps.isDispatchBusiness || caps.isSchedulingBusiness,
  },

  // Notifications
  {
    id: "booking-delivery",
    title: "Booking Alerts",
    icon: Send,
    group: "delivery",
    groupLabel: "Notifications",
    order: 1,
    tab: "operations",

    isVisible: (_mode, _caps, flags) => flags.showBookingDelivery,
  },
  {
    id: "food-settings-ops",
    title: "How Orders Are Handled",
    icon: UtensilsCrossed,
    group: "delivery",
    groupLabel: "Notifications",
    order: 2,
    tab: "operations",

    isVisible: (_mode, _caps, flags) => flags.showFoodDelivery,
  },
  {
    id: "dispatch-settings",
    title: "Where to Send New Jobs",
    icon: Truck,
    group: "delivery",
    groupLabel: "Notifications",
    order: 3,
    tab: "operations",

    isVisible: (_mode, _caps, flags) => flags.isRelevant("dispatch-operations"),
  },
  {
    id: "distance-pricing",
    title: "Distance Pricing",
    icon: Navigation,
    group: "delivery",
    groupLabel: "Notifications",
    order: 4,
    tab: "operations",

    isVisible: (_mode, _caps, flags) => flags.isRelevant("dispatch-operations"),
  },
  {
    id: "ivr-routing",
    title: "Call Routing (IVR)",
    icon: Phone,
    group: "delivery",
    groupLabel: "Notifications",
    order: 5,
    tab: "operations",

    isVisible: (_mode, _caps, flags) => flags.isRelevant("dispatch-operations"),
  },
  {
    id: "callback-delivery",
    title: "Callback Alerts",
    icon: Phone,
    group: "delivery",
    groupLabel: "Notifications",
    order: 6,
    tab: "operations",

  },
  {
    id: "medical-intake-delivery",
    title: "Intake Notification Settings",
    icon: HeartPulse,
    group: "delivery",
    groupLabel: "Notifications",
    order: 7,
    tab: "operations",

    isVisible: (_mode, _caps, flags) => flags.isRelevant("hipaa"),
  },

  // Compliance
  {
    id: "impound-lot",
    title: "Impound Lot Details",
    icon: Warehouse,
    group: "compliance",
    groupLabel: "Compliance",
    order: 1,
    tab: "operations",

    isVisible: (_mode, _caps, flags) => flags.isRelevant("impound-lot"),
  },
  {
    id: "impound-fees",
    title: "Impound Fee Structure",
    icon: DollarSign,
    group: "compliance",
    groupLabel: "Compliance",
    order: 2,
    tab: "operations",

    isVisible: (_mode, _caps, flags) => flags.isRelevant("impound-lot"),
  },
  {
    id: "impound-release",
    title: "Release Requirements",
    icon: FileCheck,
    group: "compliance",
    groupLabel: "Compliance",
    order: 3,
    tab: "operations",

    isVisible: (_mode, _caps, flags) => flags.isRelevant("impound-lot"),
  },
  {
    id: "hipaa",
    title: "HIPAA Compliance",
    icon: HeartPulse,
    group: "compliance",
    groupLabel: "Compliance",
    order: 4,
    tab: "operations",

    isVisible: (_mode, _caps, flags) => flags.isRelevant("hipaa"),
  },

  // Integrations
  {
    id: "tekmetric",
    title: "Tekmetric Integration",
    icon: Truck,
    group: "integrations",
    groupLabel: "Integrations",
    order: 1,
    tab: "operations",
    setupPriority: "advanced",
    isVisible: (_mode, caps) => caps.hasJobTracking,
  },
];

// ─── AI Voice Tab ───────────────────────────────────────────────────────────

const AI_VOICE_ITEMS: BrainSectionItem[] = [];

// ─── Training Tab ───────────────────────────────────────────────────────────

const TRAINING_ITEMS: BrainSectionItem[] = [
  // How Your AI Acts
  {
    id: "ai-behavior-mode",
    title: "AI Mode",
    icon: Settings2,
    group: "how-ai-acts",
    groupLabel: "How Your AI Acts",
    order: 1,
    tab: "training",
  },
  {
    id: "call-flow",
    title: "Call Flow",
    icon: GitBranch,
    group: "how-ai-acts",
    groupLabel: "How Your AI Acts",
    order: 2,
    tab: "training",
    isVisible: (mode) => mode === "service" || mode === "general",
  },
  {
    id: "booking-behavior",
    title: "Booking Behavior",
    icon: CalendarCheck,
    group: "how-ai-acts",
    groupLabel: "How Your AI Acts",
    order: 3,
    tab: "training",
    isVisible: (_mode, caps) => caps.isSchedulingBusiness,
  },
  {
    id: "scripts",
    title: "Greeting Script",
    icon: Mic,
    group: "how-ai-acts",
    groupLabel: "How Your AI Acts",
    order: 4,
    tab: "training",
    isEssential: true,
  },

  // Business Rules
  {
    id: "policies",
    title: "Policies",
    icon: FileText,
    group: "business-rules",
    groupLabel: "Business Rules",
    order: 1,
    tab: "training",
  },
  {
    id: "never-promise",
    title: "AI Limits",
    icon: Shield,
    group: "business-rules",
    groupLabel: "Business Rules",
    order: 2,
    tab: "training",
  },
  {
    id: "required-questions",
    title: "Required Info",
    icon: MessageSquareText,
    group: "business-rules",
    groupLabel: "Business Rules",
    order: 3,
    tab: "training",
    isVisible: () => false, // Hidden until createRequiredQuestionRule is implemented
  },
  {
    id: "custom-policies",
    title: "Custom Rules",
    icon: FileText,
    group: "business-rules",
    groupLabel: "Business Rules",
    order: 4,
    tab: "training",
  },
  {
    id: "guidelines",
    title: "AI Guidelines",
    icon: BookOpen,
    group: "business-rules",
    groupLabel: "Business Rules",
    order: 5,
    tab: "training",
  },

  // Knowledge Base
  {
    id: "review",
    title: "Review Queue",
    icon: AlertCircle,
    group: "knowledge-base",
    groupLabel: "Knowledge Base",
    order: 1,
    tab: "training",
    isVisible: () => false, // Hidden until approveKnowledgeSuggestion/rejectKnowledgeSuggestion are implemented
  },
  {
    id: "faqs",
    title: "FAQs",
    icon: HelpCircle,
    group: "knowledge-base",
    groupLabel: "Knowledge Base",
    order: 2,
    tab: "training",
  },
  {
    id: "objections",
    title: "Objections",
    icon: MessageCircle,
    group: "knowledge-base",
    groupLabel: "Knowledge Base",
    order: 3,
    tab: "training",
  },

  // Industry Expertise
  {
    id: "menu-knowledge",
    title: "Menu Item Details",
    icon: UtensilsCrossed,
    group: "industry-expertise",
    groupLabel: "Industry Expertise",
    order: 1,
    tab: "training",
    isVisible: (_mode, _caps, flags) => flags.isRelevant("food-knowledge"),
  },
  {
    id: "catering-knowledge",
    title: "Catering by Event Type",
    icon: Tag,
    group: "industry-expertise",
    groupLabel: "Industry Expertise",
    order: 2,
    tab: "training",
    isVisible: (_mode, _caps, flags) => flags.isRelevant("food-knowledge"),
  },
  {
    id: "vehicle-knowledge",
    title: "Vehicle Requirements",
    icon: Truck,
    group: "industry-expertise",
    groupLabel: "Industry Expertise",
    order: 3,
    tab: "training",
    isVisible: (_mode, _caps, flags) => flags.isRelevant("dispatch-knowledge"),
  },
  {
    id: "roadside-knowledge",
    title: "Roadside Situations",
    icon: AlertCircle,
    group: "industry-expertise",
    groupLabel: "Industry Expertise",
    order: 4,
    tab: "training",
    isVisible: (_mode, _caps, flags) => flags.isRelevant("dispatch-knowledge"),
  },
  {
    id: "symptom-triage",
    title: "Symptom Triage Scripts",
    icon: HeartPulse,
    group: "industry-expertise",
    groupLabel: "Industry Expertise",
    order: 5,
    tab: "training",
    isVisible: (_mode, _caps, flags) => flags.isRelevant("medical-knowledge"),
  },
  {
    id: "insurance-knowledge",
    title: "Insurance Carrier Info",
    icon: Shield,
    group: "industry-expertise",
    groupLabel: "Industry Expertise",
    order: 6,
    tab: "training",
    isVisible: (_mode, _caps, flags) => flags.isRelevant("medical-knowledge"),
  },
  {
    id: "product-knowledge",
    title: "Product Knowledge",
    icon: Package,
    group: "industry-expertise",
    groupLabel: "Industry Expertise",
    order: 7,
    tab: "training",
    isVisible: (_mode, _caps, flags) => flags.isRelevant("product-knowledge"),
  },

  // Additional Knowledge
  {
    id: "aftercare",
    title: "Aftercare Instructions",
    icon: Heart,
    group: "additional-knowledge",
    groupLabel: "Additional Knowledge",
    order: 1,
    tab: "training",
  },
  {
    id: "competitors",
    title: "Competitor Positioning",
    icon: Users,
    group: "additional-knowledge",
    groupLabel: "Additional Knowledge",
    order: 2,
    tab: "training",
  },
  {
    id: "seasonal",
    title: "Seasonal & Events",
    icon: Calendar,
    group: "additional-knowledge",
    groupLabel: "Additional Knowledge",
    order: 3,
    tab: "training",
  },
  {
    id: "custom",
    title: "Custom Knowledge",
    icon: Lightbulb,
    group: "additional-knowledge",
    groupLabel: "Additional Knowledge",
    order: 4,
    tab: "training",
  },
  {
    id: "documents",
    title: "Documents",
    icon: FileUp,
    group: "additional-knowledge",
    groupLabel: "Additional Knowledge",
    order: 5,
    tab: "training",
    isVisible: () => false, // Hidden until uploadKnowledgeSource/deleteKnowledgeSource are implemented
  },
];

// ─── Tab → Items mapping ────────────────────────────────────────────────────

const TAB_ITEMS: Record<NewSectionId, BrainSectionItem[]> = {
  business: BUSINESS_ITEMS,
  services: SERVICES_ITEMS,
  operations: OPERATIONS_ITEMS,
  "ai-voice": AI_VOICE_ITEMS,
  training: TRAINING_ITEMS,
  intelligence: [], // bypasses sidebar layout entirely
};

// ─── Helper Functions ───────────────────────────────────────────────────────

/**
 * Returns visible items for a tab, filtered by mode/caps/flags and sorted by group+order.
 */
export function getVisibleItems(
  tab: NewSectionId,
  mode: BusinessMode,
  caps: Capabilities,
  flags: VisibilityFlags,
): BrainSectionItem[] {
  const items = TAB_ITEMS[tab] || [];
  return items.filter((item) => {
    if (!item.isVisible) return true;
    return item.isVisible(mode, caps, flags);
  });
}

/**
 * Groups a flat list of items by their group key, preserving group order.
 */
export function groupSectionItems(items: BrainSectionItem[]): SectionGroup[] {
  const groupMap = new Map<string, SectionGroup>();
  const groupOrder: string[] = [];

  for (const item of items) {
    if (!groupMap.has(item.group)) {
      groupMap.set(item.group, {
        groupKey: item.group,
        groupLabel: item.groupLabel,
        items: [],
      });
      groupOrder.push(item.group);
    }
    groupMap.get(item.group)!.items.push(item);
  }

  // Sort items within each group by order
  for (const group of groupMap.values()) {
    group.items.sort((a, b) => a.order - b.order);
  }

  return groupOrder.map((key) => groupMap.get(key)!);
}

/**
 * Find item by ID across all tabs. Used for deep linking.
 */
export function findItemById(tab: NewSectionId, itemId: string): BrainSectionItem | undefined {
  const items = TAB_ITEMS[tab] || [];
  return items.find((item) => item.id === itemId);
}

/**
 * Resolves a hash/legacy param to an item ID within a tab.
 * Checks all items in the tab for a matching ID.
 */
export function findItemForHash(tab: NewSectionId, hash: string): string | null {
  const items = TAB_ITEMS[tab] || [];
  const match = items.find((item) => item.id === hash);
  return match ? match.id : null;
}

// ─── Global Item Lookup (for mode-shaped layout) ────────────────────────────

/** Flat array of every item across all tabs. */
export const ALL_ITEMS: BrainSectionItem[] = [
  ...BUSINESS_ITEMS,
  ...SERVICES_ITEMS,
  ...OPERATIONS_ITEMS,
  ...AI_VOICE_ITEMS,
  ...TRAINING_ITEMS,
];

/** Map of item ID → item for O(1) lookups from brainModeLayout. */
export const ALL_ITEMS_BY_ID: Map<string, BrainSectionItem> = new Map(
  ALL_ITEMS.map((item) => [item.id, item]),
);

/** Find any item by ID, regardless of which tab it was originally defined in. */
export function findItemByIdGlobal(itemId: string): BrainSectionItem | undefined {
  return ALL_ITEMS_BY_ID.get(itemId);
}
