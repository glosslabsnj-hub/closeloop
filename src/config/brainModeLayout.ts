/**
 * Brain Mode Layout
 *
 * Mode-shaped tab navigation for Business Brain.
 * Each business mode gets its own 5-tab structure with mode-appropriate
 * names, groupings, and item placement.
 *
 * Item IDs reference items defined in brainSectionRegistry.ts.
 * No editor components, hooks, or DB schema change.
 */

import {
  Building2,
  DollarSign,
  Sparkles,
  Calendar,
  MapPin,
  Truck,
  UtensilsCrossed,
  Settings,
  type LucideIcon,
} from "lucide-react";
import type { BusinessMode } from "@/hooks/useTenantConfig";
import type { Capabilities } from "@/hooks/useCapabilities";
import type { BrainSectionItem, VisibilityFlags } from "@/config/brainSectionRegistry";
import { ALL_ITEMS_BY_ID } from "@/config/brainSectionRegistry";
import type { CategoryConfig } from "@/components/brain/layout/businessBrainNavConfig";
import type { TerminologyKey } from "@/data/industryTerminology";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ModeTabGroup {
  key: string;
  label: string;
  itemIds: string[];
}

export interface ModeTabDef {
  section: string;
  label: string;
  description: string;
  icon: LucideIcon;
  order: number;
  groups: ModeTabGroup[];
  completionSections: string[];
  titleKey?: TerminologyKey;
}

export interface ModeLayout {
  tabs: ModeTabDef[];
}

// ─── Service Mode ───────────────────────────────────────────────────────────

const SERVICE_LAYOUT: ModeLayout = {
  tabs: [
    {
      section: "about",
      label: "Your Business",
      description: "Name, hours & calendar",
      icon: Building2,
      order: 1,
      groups: [
        { key: "essentials", label: "Basics", itemIds: ["business-info", "business-hours"] },
        { key: "calendar", label: "Calendar", itemIds: ["calendar-sync"] },
        { key: "team", label: "Your Team", itemIds: ["team"] },
        { key: "optional", label: "Quick Start", itemIds: ["templates"] },
      ],
      completionSections: ["profile", "hours", "calendar"],
    },
    {
      section: "services",
      label: "What You Offer",
      description: "Services & pricing",
      icon: DollarSign,
      order: 2,
      titleKey: "servicesCategoryTitle",
      groups: [
        { key: "your-catalog", label: "Your Services", itemIds: ["catalog"] },
        { key: "pricing-options", label: "Pricing & Fees", itemIds: ["price-modifiers", "service-packages"] },
        { key: "other-offerings", label: "Additional Offerings", itemIds: ["additional-services"] },
      ],
      completionSections: ["services"],
    },
    {
      section: "operations",
      label: "How You Operate",
      description: "Coverage & notifications",
      icon: Calendar,
      order: 3,
      groups: [
        { key: "coverage", label: "Service Area", itemIds: ["coverage", "service-coverage", "travel-times", "workload"] },
        { key: "delivery", label: "Notifications", itemIds: ["booking-delivery", "callback-delivery"] },
        { key: "integrations", label: "INTEGRATIONS", itemIds: ["tekmetric"] },
      ],
      completionSections: ["coverage"],
    },
    {
      section: "training",
      label: "AI Behavior",
      description: "Personality, rules & knowledge",
      icon: Sparkles,
      order: 4,
      groups: [
        { key: "ai-behavior", label: "How Your AI Acts", itemIds: ["ai-behavior-mode", "call-flow", "booking-behavior", "scripts"] },
        { key: "business-rules", label: "Business Rules", itemIds: ["policies", "never-promise", "required-questions", "custom-policies", "guidelines"] },
        { key: "knowledge", label: "Knowledge Base", itemIds: ["review", "faqs", "objections"] },
        { key: "industry-knowledge", label: "Industry Expertise", itemIds: ["product-knowledge"] },
        { key: "more-options", label: "Additional Knowledge", itemIds: ["aftercare", "competitors", "seasonal", "custom", "documents"] },
      ],
      completionSections: ["knowledge", "ai-behavior", "policies"],
    },
    {
      section: "intelligence",
      label: "AI Insights",
      description: "Memory & learning",
      icon: Sparkles,
      order: 5,
      groups: [],
      completionSections: [],
    },
    {
      section: "workflow",
      label: "Workflow Config",
      description: "AI behavior customization",
      icon: Settings,
      order: 6,
      groups: [],
      completionSections: [],
    },
  ],
};

// ─── Dispatch Mode ──────────────────────────────────────────────────────────

const DISPATCH_LAYOUT: ModeLayout = {
  tabs: [
    {
      section: "about",
      label: "Your Business",
      description: "Name, hours & calendar",
      icon: Building2,
      order: 1,
      groups: [
        { key: "essentials", label: "Basics", itemIds: ["business-info", "business-hours"] },
        { key: "calendar", label: "Calendar", itemIds: ["calendar-sync"] },
        { key: "team", label: "Your Team", itemIds: ["team"] },
        { key: "optional", label: "Quick Start", itemIds: ["templates"] },
      ],
      completionSections: ["profile", "hours", "calendar"],
    },
    {
      section: "services",
      label: "Rates & Services",
      description: "What you charge",
      icon: DollarSign,
      order: 2,
      titleKey: "servicesCategoryTitle",
      groups: [
        { key: "your-catalog", label: "Your Services", itemIds: ["catalog"] },
        { key: "pricing", label: "Pricing & Fees", itemIds: ["dispatch-pricing", "distance-basis", "price-modifiers"] },
        { key: "other-offerings", label: "Additional Offerings", itemIds: ["additional-services"] },
      ],
      completionSections: ["services"],
    },
    {
      section: "operations",
      label: "How You Operate",
      description: "Coverage & notifications",
      icon: MapPin,
      order: 3,
      groups: [
        { key: "coverage", label: "Service Area", itemIds: ["coverage", "dispatch-zones", "travel-times", "workload"] },
        { key: "dispatch-ops", label: "Dispatch Ops", itemIds: ["dispatch-settings", "ivr-routing", "callback-delivery"] },
        { key: "impound", label: "Impound", itemIds: ["impound-lot", "impound-fees", "impound-release"] },
      ],
      completionSections: ["coverage"],
    },
    {
      section: "training",
      label: "AI Behavior",
      description: "Personality, rules & knowledge",
      icon: Sparkles,
      order: 4,
      groups: [
        { key: "ai-behavior", label: "How Your AI Acts", itemIds: ["ai-behavior-mode", "scripts"] },
        { key: "business-rules", label: "Business Rules", itemIds: ["policies", "never-promise", "required-questions", "custom-policies", "guidelines"] },
        { key: "knowledge", label: "Knowledge Base", itemIds: ["review", "faqs", "objections"] },
        { key: "industry-knowledge", label: "Industry Expertise", itemIds: ["vehicle-knowledge", "roadside-knowledge"] },
        { key: "more-options", label: "Additional Knowledge", itemIds: ["competitors", "seasonal", "custom", "documents"] },
      ],
      completionSections: ["knowledge", "ai-behavior", "policies"],
    },
    {
      section: "intelligence",
      label: "AI Insights",
      description: "Memory & learning",
      icon: Sparkles,
      order: 5,
      groups: [],
      completionSections: [],
    },
    {
      section: "workflow",
      label: "Workflow Config",
      description: "Dispatch behavior customization",
      icon: Settings,
      order: 6,
      groups: [],
      completionSections: [],
    },
  ],
};

// ─── Food Mode ──────────────────────────────────────────────────────────────

const FOOD_LAYOUT: ModeLayout = {
  tabs: [
    {
      section: "about",
      label: "Your Business",
      description: "Name, hours & calendar",
      icon: Building2,
      order: 1,
      groups: [
        { key: "essentials", label: "Basics", itemIds: ["business-info", "business-hours"] },
        { key: "calendar", label: "Calendar", itemIds: ["calendar-sync"] },
        { key: "team", label: "Your Team", itemIds: ["team"] },
        { key: "optional", label: "Quick Start", itemIds: ["templates"] },
      ],
      completionSections: ["profile", "hours", "calendar"],
    },
    {
      section: "services",
      label: "Menu & Pricing",
      description: "What you serve",
      icon: UtensilsCrossed,
      order: 2,
      titleKey: "servicesCategoryTitle",
      groups: [
        { key: "your-menu", label: "Your Menu", itemIds: ["food-service-types", "catalog"] },
        { key: "sizes-specials", label: "Sizes & Specials", itemIds: ["menu-sizes", "daily-specials"] },
        { key: "order-settings", label: "Order Settings", itemIds: ["food-settings-svc"] },
        { key: "other-offerings", label: "Additional Offerings", itemIds: ["additional-services"] },
      ],
      completionSections: ["services"],
    },
    {
      section: "operations",
      label: "How You Operate",
      description: "Coverage & notifications",
      icon: Truck,
      order: 3,
      groups: [
        { key: "coverage", label: "Service Area", itemIds: ["coverage"] },
        { key: "delivery", label: "Delivery Zones", itemIds: ["delivery-zones", "catering-coverage"] },
        { key: "order-handling", label: "Order Handling", itemIds: ["food-settings-ops", "callback-delivery"] },
      ],
      completionSections: ["coverage"],
    },
    {
      section: "training",
      label: "AI Behavior",
      description: "Personality, rules & knowledge",
      icon: Sparkles,
      order: 4,
      groups: [
        { key: "ai-behavior", label: "How Your AI Acts", itemIds: ["ai-behavior-mode", "scripts"] },
        { key: "business-rules", label: "Business Rules", itemIds: ["policies", "never-promise", "required-questions", "custom-policies", "guidelines"] },
        { key: "knowledge", label: "Knowledge Base", itemIds: ["review", "faqs", "objections"] },
        { key: "industry-knowledge", label: "Industry Expertise", itemIds: ["menu-knowledge", "catering-knowledge"] },
        { key: "more-options", label: "Additional Knowledge", itemIds: ["competitors", "seasonal", "custom", "documents"] },
      ],
      completionSections: ["knowledge", "ai-behavior", "policies"],
    },
    {
      section: "intelligence",
      label: "AI Insights",
      description: "Memory & learning",
      icon: Sparkles,
      order: 5,
      groups: [],
      completionSections: [],
    },
    {
      section: "workflow",
      label: "Workflow Config",
      description: "Order workflow customization",
      icon: Settings,
      order: 6,
      groups: [],
      completionSections: [],
    },
  ],
};

// ─── Medical Mode ───────────────────────────────────────────────────────────

const MEDICAL_LAYOUT: ModeLayout = {
  tabs: [
    {
      section: "about",
      label: "Your Practice",
      description: "Practice info, hours & calendar",
      icon: Building2,
      order: 1,
      groups: [
        { key: "essentials", label: "Basics", itemIds: ["business-info", "business-hours"] },
        { key: "calendar", label: "Calendar", itemIds: ["calendar-sync"] },
        { key: "compliance", label: "Compliance", itemIds: ["hipaa"] },
        { key: "team", label: "Your Team", itemIds: ["team"] },
        { key: "optional", label: "Quick Start", itemIds: ["templates"] },
      ],
      completionSections: ["profile", "hours", "calendar"],
    },
    {
      section: "services",
      label: "Services & Insurance",
      description: "Procedures & pricing",
      icon: DollarSign,
      order: 2,
      titleKey: "servicesCategoryTitle",
      groups: [
        { key: "your-procedures", label: "Your Procedures", itemIds: ["catalog"] },
        { key: "pricing", label: "Pricing & Fees", itemIds: ["medical-pricing", "service-packages"] },
      ],
      completionSections: ["services"],
    },
    {
      section: "operations",
      label: "How You Operate",
      description: "Coverage & notifications",
      icon: Calendar,
      order: 3,
      groups: [
        { key: "coverage", label: "Service Area", itemIds: ["coverage", "medical-coverage"] },
        { key: "delivery", label: "Notifications", itemIds: ["booking-delivery", "medical-intake-delivery", "callback-delivery"] },
      ],
      completionSections: ["coverage"],
    },
    {
      section: "training",
      label: "AI Behavior",
      description: "Personality, rules & knowledge",
      icon: Sparkles,
      order: 4,
      groups: [
        { key: "ai-behavior", label: "How Your AI Acts", itemIds: ["ai-behavior-mode", "booking-behavior", "scripts"] },
        { key: "business-rules", label: "Patient Rules", itemIds: ["policies", "never-promise", "required-questions", "custom-policies", "guidelines"] },
        { key: "knowledge", label: "Knowledge Base", itemIds: ["review", "faqs", "objections"] },
        { key: "industry-knowledge", label: "Industry Expertise", itemIds: ["symptom-triage", "insurance-knowledge"] },
        { key: "more-options", label: "Additional Knowledge", itemIds: ["aftercare", "competitors", "seasonal", "custom", "documents"] },
      ],
      completionSections: ["knowledge", "ai-behavior", "policies"],
    },
    {
      section: "intelligence",
      label: "AI Insights",
      description: "Memory & learning",
      icon: Sparkles,
      order: 5,
      groups: [],
      completionSections: [],
    },
    {
      section: "workflow",
      label: "Workflow Config",
      description: "HIPAA & intake customization",
      icon: Settings,
      order: 6,
      groups: [],
      completionSections: [],
    },
  ],
};

// ─── General Mode ───────────────────────────────────────────────────────────

const GENERAL_LAYOUT: ModeLayout = {
  tabs: [
    {
      section: "about",
      label: "Your Business",
      description: "Name, hours & calendar",
      icon: Building2,
      order: 1,
      groups: [
        { key: "essentials", label: "Basics", itemIds: ["business-info", "business-hours"] },
        { key: "calendar", label: "Calendar", itemIds: ["calendar-sync"] },
        { key: "team", label: "Your Team", itemIds: ["team"] },
        { key: "optional", label: "Quick Start", itemIds: ["templates"] },
      ],
      completionSections: ["profile", "hours", "calendar"],
    },
    {
      section: "services",
      label: "What You Offer",
      description: "Services & pricing",
      icon: DollarSign,
      order: 2,
      titleKey: "servicesCategoryTitle",
      groups: [
        { key: "your-catalog", label: "Your Services", itemIds: ["catalog"] },
        { key: "pricing-options", label: "Pricing & Fees", itemIds: ["service-packages"] },
        { key: "other-offerings", label: "Additional Offerings", itemIds: ["additional-services"] },
      ],
      completionSections: ["services"],
    },
    {
      section: "operations",
      label: "How You Operate",
      description: "Coverage & notifications",
      icon: Calendar,
      order: 3,
      groups: [
        { key: "where-you-work", label: "Service Area", itemIds: ["response-times", "coverage"] },
        { key: "delivery", label: "Notifications", itemIds: ["booking-delivery", "callback-delivery"] },
      ],
      completionSections: ["coverage"],
    },
    {
      section: "training",
      label: "AI Behavior",
      description: "Personality, rules & knowledge",
      icon: Sparkles,
      order: 4,
      groups: [
        { key: "ai-behavior", label: "How Your AI Acts", itemIds: ["ai-behavior-mode", "call-flow", "booking-behavior", "scripts"] },
        { key: "business-rules", label: "Business Rules", itemIds: ["policies", "never-promise", "required-questions", "custom-policies", "guidelines"] },
        { key: "knowledge", label: "Knowledge Base", itemIds: ["review", "faqs", "objections"] },
        { key: "industry-knowledge", label: "Industry Expertise", itemIds: ["product-knowledge"] },
        { key: "more-options", label: "Additional Knowledge", itemIds: ["competitors", "seasonal", "custom", "documents"] },
      ],
      completionSections: ["knowledge", "ai-behavior", "policies"],
    },
    {
      section: "intelligence",
      label: "AI Insights",
      description: "Memory & learning",
      icon: Sparkles,
      order: 5,
      groups: [],
      completionSections: [],
    },
    {
      section: "workflow",
      label: "Workflow Config",
      description: "Callback & lead customization",
      icon: Settings,
      order: 6,
      groups: [],
      completionSections: [],
    },
  ],
};

// ─── Sales Mode ─────────────────────────────────────────────────────────────

const SALES_LAYOUT: ModeLayout = {
  tabs: [
    {
      section: "about",
      label: "Your Business",
      description: "Name, hours & calendar",
      icon: Building2,
      order: 1,
      groups: [
        { key: "essentials", label: "Basics", itemIds: ["business-info", "business-hours"] },
        { key: "calendar", label: "Calendar", itemIds: ["calendar-sync"] },
        { key: "team", label: "Your Team", itemIds: ["team"] },
        { key: "optional", label: "Quick Start", itemIds: ["templates"] },
      ],
      completionSections: ["profile", "hours", "calendar"],
    },
    {
      section: "services",
      label: "Products & Pricing",
      description: "What you sell",
      icon: DollarSign,
      order: 2,
      titleKey: "servicesCategoryTitle",
      groups: [
        { key: "your-catalog", label: "Your Services", itemIds: ["catalog"] },
        { key: "pricing-options", label: "Pricing & Fees", itemIds: ["service-packages"] },
        { key: "other-offerings", label: "Additional Offerings", itemIds: ["additional-services"] },
      ],
      completionSections: ["services"],
    },
    {
      section: "operations",
      label: "How You Operate",
      description: "Coverage & notifications",
      icon: Calendar,
      order: 3,
      groups: [
        { key: "where-you-work", label: "Service Area", itemIds: ["coverage"] },
        { key: "sales-settings", label: "Sales Settings", itemIds: ["sales-policies"] },
        { key: "delivery", label: "Notifications", itemIds: ["booking-delivery", "callback-delivery"] },
      ],
      completionSections: ["coverage"],
    },
    {
      section: "training",
      label: "AI Behavior",
      description: "Personality, rules & knowledge",
      icon: Sparkles,
      order: 4,
      groups: [
        { key: "ai-behavior", label: "How Your AI Acts", itemIds: ["ai-behavior-mode", "scripts"] },
        { key: "business-rules", label: "Business Rules", itemIds: ["policies", "never-promise", "required-questions", "custom-policies", "guidelines"] },
        { key: "knowledge", label: "Knowledge Base", itemIds: ["review", "faqs", "objections"] },
        { key: "industry-knowledge", label: "Industry Expertise", itemIds: ["product-knowledge"] },
        { key: "more-options", label: "Additional Knowledge", itemIds: ["competitors", "seasonal", "custom", "documents"] },
      ],
      completionSections: ["knowledge", "ai-behavior", "policies"],
    },
    {
      section: "intelligence",
      label: "AI Insights",
      description: "Memory & learning",
      icon: Sparkles,
      order: 5,
      groups: [],
      completionSections: [],
    },
    {
      section: "workflow",
      label: "Workflow Config",
      description: "Sales workflow customization",
      icon: Settings,
      order: 6,
      groups: [],
      completionSections: [],
    },
  ],
};

// ─── Mode → Layout map ──────────────────────────────────────────────────────

export const MODE_LAYOUTS: Record<BusinessMode, ModeLayout> = {
  service: SERVICE_LAYOUT,
  dispatch: DISPATCH_LAYOUT,
  food: FOOD_LAYOUT,
  medical: MEDICAL_LAYOUT,
  general: GENERAL_LAYOUT,
  sales: SALES_LAYOUT,
};

// ─── Resolver Functions ─────────────────────────────────────────────────────

/**
 * Get a single tab definition for a mode + section.
 */
export function getModeTabDef(
  mode: BusinessMode,
  tabSection: string,
): ModeTabDef | undefined {
  const layout = MODE_LAYOUTS[mode] || MODE_LAYOUTS.general;
  return layout.tabs.find((t) => t.section === tabSection);
}

/**
 * Get essentialFields sections mapped to a mode tab for completion tracking.
 */
export function getCompletionSectionsForModeTab(
  mode: BusinessMode,
  tabSection: string,
): string[] {
  const tab = getModeTabDef(mode, tabSection);
  return tab?.completionSections ?? [];
}

/**
 * Resolve visible items for a mode tab.
 *
 * Looks up item IDs from the mode layout, resolves them from the global
 * registry, applies visibility predicates, and assigns group/groupLabel
 * from the layout definition.
 */
export function getItemsForModeTab(
  mode: BusinessMode,
  tabSection: string,
  caps: Capabilities,
  flags: VisibilityFlags,
): BrainSectionItem[] {
  const tab = getModeTabDef(mode, tabSection);
  if (!tab) return [];

  const result: BrainSectionItem[] = [];

  for (const group of tab.groups) {
    let orderInGroup = 1;
    for (const itemId of group.itemIds) {
      const registryItem = ALL_ITEMS_BY_ID.get(itemId);
      if (!registryItem) continue;

      // Apply visibility predicate from the registry
      if (registryItem.isVisible && !registryItem.isVisible(mode, caps, flags)) {
        continue;
      }

      // Override group/groupLabel/order from the layout
      result.push({
        ...registryItem,
        group: group.key,
        groupLabel: group.label,
        order: orderInGroup++,
      });
    }
  }

  return result;
}

/**
 * Build CategoryConfig-compatible objects for the dashboard cards.
 *
 * Returns the 5 mode-specific tabs as categories (excludes intelligence,
 * which is appended separately by the dashboard).
 */
export function getModeCategories(mode: BusinessMode): CategoryConfig[] {
  const layout = MODE_LAYOUTS[mode] || MODE_LAYOUTS.general;

  return layout.tabs.map((tab) => ({
    id: `mode-${tab.section}`,
    title: tab.label,
    description: tab.description,
    icon: tab.icon,
    section: tab.section,
    order: tab.order,
    cards: [], // Cards not used in mode layout — items come from registry
    titleKey: tab.titleKey,
  }));
}
