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
  FileCheck, type LucideIcon,
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
    title: "About Your Business",
    icon: Building2,
    group: "essentials",
    groupLabel: "ESSENTIALS",
    order: 1,
    tab: "business",
    isEssential: true,
  },
  {
    id: "business-hours",
    title: "Your Hours",
    icon: Clock,
    group: "essentials",
    groupLabel: "ESSENTIALS",
    order: 2,
    tab: "business",
    isEssential: true,
  },
  {
    id: "calendar-sync",
    title: "Calendar & Availability",
    icon: Calendar,
    group: "essentials",
    groupLabel: "ESSENTIALS",
    order: 3,
    tab: "business",
    isVisible: (_mode, caps) => caps.isSchedulingBusiness,
  },
  {
    id: "templates",
    title: "Quick Setup Templates",
    icon: Palette,
    group: "optional",
    groupLabel: "OPTIONAL",
    order: 1,
    tab: "business",
  },
];

// ─── Services Tab ───────────────────────────────────────────────────────────

const SERVICES_ITEMS: BrainSectionItem[] = [
  {
    id: "food-service-types",
    title: "Service Types",
    icon: UtensilsCrossed,
    group: "your-catalog",
    groupLabel: "YOUR CATALOG",
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
    groupLabel: "YOUR CATALOG",
    order: 2,
    tab: "services",
    isVisible: (_mode, caps) => !caps.isDispatchBusiness && !caps.hasFoodOrders,
  },
  {
    id: "catalog",
    title: "Your Services",
    icon: Tag,
    group: "your-catalog",
    groupLabel: "YOUR CATALOG",
    order: 3,
    tab: "services",
    isEssential: true,
  },
  {
    id: "price-modifiers",
    title: "Extra Fees & Surcharges",
    icon: DollarSign,
    group: "pricing-options",
    groupLabel: "PRICING OPTIONS",
    order: 1,
    tab: "services",
    isVisible: (_mode, _caps, flags) => flags.isRelevant("price-modifiers"),
  },
  {
    id: "service-packages",
    title: "Service Packages",
    icon: Package,
    group: "pricing-options",
    groupLabel: "PRICING OPTIONS",
    order: 2,
    tab: "services",
    isVisible: (_mode, _caps, flags) => flags.isRelevant("service-packages"),
  },
  {
    id: "dispatch-pricing",
    title: "Dispatch Fees",
    icon: DollarSign,
    group: "pricing-options",
    groupLabel: "PRICING OPTIONS",
    order: 3,
    tab: "services",
    isVisible: (_mode, _caps, flags) => flags.isRelevant("dispatch-pricing"),
  },
  {
    id: "distance-basis",
    title: "Distance Pricing",
    icon: Navigation,
    group: "pricing-options",
    groupLabel: "PRICING OPTIONS",
    order: 4,
    tab: "services",
    isVisible: (_mode, _caps, flags) => flags.isRelevant("dispatch-pricing"),
  },
  {
    id: "food-settings-svc",
    title: "Order Settings",
    icon: UtensilsCrossed,
    group: "pricing-options",
    groupLabel: "PRICING OPTIONS",
    order: 5,
    tab: "services",
    isVisible: (mode, caps, flags) => (mode === "food" || caps.isFoodBusiness || caps.hasFoodOrders) && flags.isRelevant("food-settings"),
  },
  {
    id: "menu-sizes",
    title: "Size Options",
    icon: Tag,
    group: "pricing-options",
    groupLabel: "PRICING OPTIONS",
    order: 6,
    tab: "services",
    isVisible: (mode, caps, flags) => (mode === "food" || caps.isFoodBusiness || caps.hasFoodOrders) && flags.isRelevant("food-settings"),
  },
  {
    id: "daily-specials",
    title: "Specials & Deals",
    icon: Lightbulb,
    group: "pricing-options",
    groupLabel: "PRICING OPTIONS",
    order: 7,
    tab: "services",
    isVisible: (mode, caps, flags) => (mode === "food" || caps.isFoodBusiness || caps.hasFoodOrders) && flags.isRelevant("food-settings"),
  },
  {
    id: "medical-pricing",
    title: "Practice Pricing",
    icon: HeartPulse,
    group: "pricing-options",
    groupLabel: "PRICING OPTIONS",
    order: 8,
    tab: "services",
    isVisible: (mode, caps) => mode === "medical" || caps.isMedicalBusiness,
  },
  {
    id: "additional-services",
    title: "Other Things You Offer",
    icon: Tag,
    group: "other-offerings",
    groupLabel: "OTHER OFFERINGS",
    order: 1,
    tab: "services",
  },
];

// ─── Operations Tab ─────────────────────────────────────────────────────────

const OPERATIONS_ITEMS: BrainSectionItem[] = [
  // WHERE YOU WORK
  {
    id: "coverage",
    title: "Your Service Area",
    icon: MapPin,
    group: "where-you-work",
    groupLabel: "WHERE YOU WORK",
    order: 1,
    tab: "operations",
    isEssential: true,
    isVisible: (mode, _caps, flags) =>
      (mode !== "food" && !flags.isFoodMode) || flags.foodNeedsCoverage,
  },
  {
    id: "travel-times",
    title: "Arrival Estimates",
    icon: Navigation,
    group: "where-you-work",
    groupLabel: "WHERE YOU WORK",
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
    groupLabel: "WHERE YOU WORK",
    order: 3,
    tab: "operations",
    isVisible: (mode, caps) => mode === "service" && caps.isSchedulingBusiness,
  },
  {
    id: "dispatch-zones",
    title: "Coverage Zones & ETA",
    icon: MapPin,
    group: "where-you-work",
    groupLabel: "WHERE YOU WORK",
    order: 4,
    tab: "operations",
    isVisible: (_mode, _caps, flags) => flags.isRelevant("dispatch-zones"),
  },
  {
    id: "delivery-zones",
    title: "Delivery Zones",
    icon: Truck,
    group: "where-you-work",
    groupLabel: "WHERE YOU WORK",
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
    groupLabel: "WHERE YOU WORK",
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
    groupLabel: "WHERE YOU WORK",
    order: 7,
    tab: "operations",
    isVisible: (_mode, _caps, flags) => flags.isRelevant("medical-coverage"),
  },
  {
    id: "response-times",
    title: "Response Times",
    icon: Phone,
    group: "where-you-work",
    groupLabel: "WHERE YOU WORK",
    order: 8,
    tab: "operations",
    isVisible: (mode) => mode === "general",
  },
  {
    id: "workload",
    title: "How Busy Are You Right Now?",
    icon: Gauge,
    group: "where-you-work",
    groupLabel: "WHERE YOU WORK",
    order: 9,
    tab: "operations",
    isVisible: (_mode, caps) => caps.isDispatchBusiness || caps.isSchedulingBusiness,
  },

  // YOUR RULES
  {
    id: "policies",
    title: "Cancellation, Deposits & Payments",
    icon: FileText,
    group: "your-rules",
    groupLabel: "YOUR RULES",
    order: 1,
    tab: "operations",
  },
  {
    id: "never-promise",
    title: "What Your AI Should Never Promise",
    icon: Shield,
    group: "your-rules",
    groupLabel: "YOUR RULES",
    order: 2,
    tab: "operations",
  },
  {
    id: "required-questions",
    title: "Info to Collect on Every Call",
    icon: MessageSquareText,
    group: "your-rules",
    groupLabel: "YOUR RULES",
    order: 3,
    tab: "operations",
  },
  {
    id: "custom-policies",
    title: "Other Rules for Your AI",
    icon: FileText,
    group: "your-rules",
    groupLabel: "YOUR RULES",
    order: 4,
    tab: "operations",
  },

  // DELIVERY
  {
    id: "booking-delivery",
    title: "Where to Send New Bookings",
    icon: Send,
    group: "delivery",
    groupLabel: "DELIVERY",
    order: 1,
    tab: "operations",
    isVisible: (_mode, _caps, flags) => flags.showBookingDelivery,
  },
  {
    id: "food-settings-ops",
    title: "How Orders Are Handled",
    icon: UtensilsCrossed,
    group: "delivery",
    groupLabel: "DELIVERY",
    order: 2,
    tab: "operations",
    isVisible: (_mode, _caps, flags) => flags.showFoodDelivery,
  },
  {
    id: "dispatch-settings",
    title: "Where to Send New Jobs",
    icon: Truck,
    group: "delivery",
    groupLabel: "DELIVERY",
    order: 3,
    tab: "operations",
    isVisible: (_mode, _caps, flags) => flags.isRelevant("dispatch-operations"),
  },
  {
    id: "distance-pricing",
    title: "How You Charge for Distance",
    icon: Navigation,
    group: "delivery",
    groupLabel: "DELIVERY",
    order: 4,
    tab: "operations",
    isVisible: (_mode, _caps, flags) => flags.isRelevant("dispatch-operations"),
  },
  {
    id: "ivr-routing",
    title: "Call Routing (IVR)",
    icon: Phone,
    group: "delivery",
    groupLabel: "DELIVERY",
    order: 5,
    tab: "operations",
    isVisible: (_mode, _caps, flags) => flags.isRelevant("dispatch-operations"),
  },
  {
    id: "callback-delivery",
    title: "Callback Request Alerts",
    icon: Phone,
    group: "delivery",
    groupLabel: "DELIVERY",
    order: 6,
    tab: "operations",
  },
  {
    id: "medical-intake-delivery",
    title: "Intake Notification Settings",
    icon: HeartPulse,
    group: "delivery",
    groupLabel: "DELIVERY",
    order: 7,
    tab: "operations",
    isVisible: (_mode, _caps, flags) => flags.isRelevant("hipaa"),
  },

  // COMPLIANCE
  {
    id: "impound-lot",
    title: "Impound Lot Details",
    icon: Warehouse,
    group: "compliance",
    groupLabel: "COMPLIANCE",
    order: 1,
    tab: "operations",
    isVisible: (_mode, _caps, flags) => flags.isRelevant("impound-lot"),
  },
  {
    id: "impound-fees",
    title: "Impound Fee Structure",
    icon: DollarSign,
    group: "compliance",
    groupLabel: "COMPLIANCE",
    order: 2,
    tab: "operations",
    isVisible: (_mode, _caps, flags) => flags.isRelevant("impound-lot"),
  },
  {
    id: "impound-release",
    title: "Release Requirements",
    icon: FileCheck,
    group: "compliance",
    groupLabel: "COMPLIANCE",
    order: 3,
    tab: "operations",
    isVisible: (_mode, _caps, flags) => flags.isRelevant("impound-lot"),
  },
  {
    id: "hipaa",
    title: "HIPAA Compliance",
    icon: HeartPulse,
    group: "compliance",
    groupLabel: "COMPLIANCE",
    order: 4,
    tab: "operations",
    isVisible: (_mode, _caps, flags) => flags.isRelevant("hipaa"),
  },
];

// ─── AI Voice Tab ───────────────────────────────────────────────────────────

const AI_VOICE_ITEMS: BrainSectionItem[] = [
  {
    id: "scripts",
    title: "How Your AI Answers the Phone",
    icon: Mic,
    group: "voice-scripts",
    groupLabel: "VOICE & SCRIPTS",
    order: 1,
    tab: "ai-voice",
    isEssential: true,
  },
  {
    id: "guidelines",
    title: "Special Instructions for Your AI",
    icon: BookOpen,
    group: "advanced",
    groupLabel: "ADVANCED",
    order: 1,
    tab: "ai-voice",
  },
];

// ─── Training Tab ───────────────────────────────────────────────────────────

const TRAINING_ITEMS: BrainSectionItem[] = [
  // ESSENTIALS
  {
    id: "review",
    title: "Items Needing Your Approval",
    icon: AlertCircle,
    group: "essentials",
    groupLabel: "ESSENTIALS",
    order: 1,
    tab: "training",
    isVisible: (_mode, _caps, flags) => flags.reviewCount > 0,
  },
  {
    id: "faqs",
    title: "Common Questions & Answers",
    icon: HelpCircle,
    group: "essentials",
    groupLabel: "ESSENTIALS",
    order: 2,
    tab: "training",
  },
  {
    id: "objections",
    title: "When Customers Push Back",
    icon: MessageCircle,
    group: "essentials",
    groupLabel: "ESSENTIALS",
    order: 3,
    tab: "training",
  },

  // INDUSTRY KNOWLEDGE
  {
    id: "menu-knowledge",
    title: "Menu Item Details",
    icon: UtensilsCrossed,
    group: "industry-knowledge",
    groupLabel: "INDUSTRY KNOWLEDGE",
    order: 1,
    tab: "training",
    isVisible: (_mode, _caps, flags) => flags.isRelevant("food-knowledge"),
  },
  {
    id: "catering-knowledge",
    title: "Catering by Event Type",
    icon: Tag,
    group: "industry-knowledge",
    groupLabel: "INDUSTRY KNOWLEDGE",
    order: 2,
    tab: "training",
    isVisible: (_mode, _caps, flags) => flags.isRelevant("food-knowledge"),
  },
  {
    id: "vehicle-knowledge",
    title: "Vehicle Requirements",
    icon: Truck,
    group: "industry-knowledge",
    groupLabel: "INDUSTRY KNOWLEDGE",
    order: 3,
    tab: "training",
    isVisible: (_mode, _caps, flags) => flags.isRelevant("dispatch-knowledge"),
  },
  {
    id: "roadside-knowledge",
    title: "Roadside Situations",
    icon: AlertCircle,
    group: "industry-knowledge",
    groupLabel: "INDUSTRY KNOWLEDGE",
    order: 4,
    tab: "training",
    isVisible: (_mode, _caps, flags) => flags.isRelevant("dispatch-knowledge"),
  },
  {
    id: "symptom-triage",
    title: "Symptom Triage Scripts",
    icon: HeartPulse,
    group: "industry-knowledge",
    groupLabel: "INDUSTRY KNOWLEDGE",
    order: 5,
    tab: "training",
    isVisible: (_mode, _caps, flags) => flags.isRelevant("medical-knowledge"),
  },
  {
    id: "insurance-knowledge",
    title: "Insurance Carrier Info",
    icon: Shield,
    group: "industry-knowledge",
    groupLabel: "INDUSTRY KNOWLEDGE",
    order: 6,
    tab: "training",
    isVisible: (_mode, _caps, flags) => flags.isRelevant("medical-knowledge"),
  },
  {
    id: "product-knowledge",
    title: "Product & Material Knowledge",
    icon: Package,
    group: "industry-knowledge",
    groupLabel: "INDUSTRY KNOWLEDGE",
    order: 7,
    tab: "training",
    isVisible: (_mode, _caps, flags) => flags.isRelevant("product-knowledge"),
  },

  // MORE OPTIONS
  {
    id: "aftercare",
    title: "Aftercare Instructions",
    icon: Heart,
    group: "more-options",
    groupLabel: "MORE OPTIONS",
    order: 1,
    tab: "training",
  },
  {
    id: "competitors",
    title: "Competitor Positioning",
    icon: Users,
    group: "more-options",
    groupLabel: "MORE OPTIONS",
    order: 2,
    tab: "training",
  },
  {
    id: "seasonal",
    title: "Seasonal & Events",
    icon: Calendar,
    group: "more-options",
    groupLabel: "MORE OPTIONS",
    order: 3,
    tab: "training",
  },
  {
    id: "custom",
    title: "Extra Info for Your AI",
    icon: Lightbulb,
    group: "more-options",
    groupLabel: "MORE OPTIONS",
    order: 4,
    tab: "training",
  },
  {
    id: "documents",
    title: "Reference Documents",
    icon: FileUp,
    group: "more-options",
    groupLabel: "MORE OPTIONS",
    order: 5,
    tab: "training",
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
