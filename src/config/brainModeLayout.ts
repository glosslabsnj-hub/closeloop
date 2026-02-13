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
        { key: "essentials", label: "ESSENTIALS", itemIds: ["business-info", "business-hours"] },
        { key: "calendar", label: "CALENDAR", itemIds: ["calendar-sync"] },
        { key: "team", label: "TEAM", itemIds: ["team"] },
        { key: "optional", label: "OPTIONAL", itemIds: ["templates"] },
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
        { key: "your-catalog", label: "YOUR CATALOG", itemIds: ["catalog"] },
        { key: "pricing-options", label: "PRICING OPTIONS", itemIds: ["price-modifiers", "service-packages"] },
        { key: "other-offerings", label: "OTHER", itemIds: ["additional-services"] },
      ],
      completionSections: ["services"],
    },
    {
      section: "operations",
      label: "How You Operate",
      description: "Coverage, policies & delivery",
      icon: Calendar,
      order: 3,
      groups: [
        { key: "coverage", label: "COVERAGE", itemIds: ["coverage", "service-coverage", "travel-times", "workload"] },
        { key: "policies", label: "POLICIES", itemIds: ["policies", "never-promise", "custom-policies"] },
        { key: "delivery", label: "DELIVERY", itemIds: ["booking-delivery", "callback-delivery"] },
        { key: "integrations", label: "INTEGRATIONS", itemIds: ["tekmetric"] },
      ],
      completionSections: ["coverage", "policies"],
    },
    {
      section: "training",
      label: "Train Your AI",
      description: "Knowledge, scripts & rules",
      icon: Sparkles,
      order: 4,
      groups: [
        { key: "call-essentials", label: "CALL ESSENTIALS", itemIds: ["required-questions", "scripts", "guidelines"] },
        { key: "knowledge", label: "KNOWLEDGE", itemIds: ["review", "faqs", "objections"] },
        { key: "industry-knowledge", label: "INDUSTRY KNOWLEDGE", itemIds: ["product-knowledge"] },
        { key: "more-options", label: "MORE", itemIds: ["aftercare", "competitors", "seasonal", "custom", "documents"] },
      ],
      completionSections: ["knowledge", "ai-behavior", "policies"],
    },
    {
      section: "intelligence",
      label: "AI Learning",
      description: "Memory & insights",
      icon: Sparkles,
      order: 5,
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
        { key: "essentials", label: "ESSENTIALS", itemIds: ["business-info", "business-hours"] },
        { key: "calendar", label: "CALENDAR", itemIds: ["calendar-sync"] },
        { key: "team", label: "TEAM", itemIds: ["team"] },
        { key: "optional", label: "OPTIONAL", itemIds: ["templates"] },
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
        { key: "your-catalog", label: "YOUR CATALOG", itemIds: ["catalog"] },
        { key: "pricing", label: "PRICING", itemIds: ["dispatch-pricing", "distance-basis", "price-modifiers"] },
        { key: "other-offerings", label: "OTHER", itemIds: ["additional-services"] },
      ],
      completionSections: ["services"],
    },
    {
      section: "operations",
      label: "How You Operate",
      description: "Coverage, dispatch & policies",
      icon: MapPin,
      order: 3,
      groups: [
        { key: "coverage", label: "COVERAGE", itemIds: ["coverage", "dispatch-zones", "travel-times", "workload"] },
        { key: "dispatch-ops", label: "DISPATCH OPS", itemIds: ["dispatch-settings", "ivr-routing", "callback-delivery"] },
        { key: "policies", label: "POLICIES", itemIds: ["policies", "never-promise", "custom-policies"] },
        { key: "impound", label: "IMPOUND", itemIds: ["impound-lot", "impound-fees", "impound-release"] },
      ],
      completionSections: ["coverage", "policies"],
    },
    {
      section: "training",
      label: "Train Your AI",
      description: "Knowledge, scripts & rules",
      icon: Sparkles,
      order: 4,
      groups: [
        { key: "call-essentials", label: "CALL ESSENTIALS", itemIds: ["required-questions", "scripts", "guidelines"] },
        { key: "knowledge", label: "KNOWLEDGE", itemIds: ["review", "faqs", "objections"] },
        { key: "industry-knowledge", label: "INDUSTRY KNOWLEDGE", itemIds: ["vehicle-knowledge", "roadside-knowledge"] },
        { key: "more-options", label: "MORE", itemIds: ["competitors", "seasonal", "custom", "documents"] },
      ],
      completionSections: ["knowledge", "ai-behavior", "policies"],
    },
    {
      section: "intelligence",
      label: "AI Learning",
      description: "Memory & insights",
      icon: Sparkles,
      order: 5,
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
        { key: "essentials", label: "ESSENTIALS", itemIds: ["business-info", "business-hours"] },
        { key: "calendar", label: "CALENDAR", itemIds: ["calendar-sync"] },
        { key: "team", label: "TEAM", itemIds: ["team"] },
        { key: "optional", label: "OPTIONAL", itemIds: ["templates"] },
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
        { key: "your-menu", label: "YOUR MENU", itemIds: ["food-service-types", "catalog"] },
        { key: "sizes-specials", label: "SIZES & SPECIALS", itemIds: ["menu-sizes", "daily-specials"] },
        { key: "order-settings", label: "ORDER SETTINGS", itemIds: ["food-settings-svc"] },
        { key: "other-offerings", label: "OTHER", itemIds: ["additional-services"] },
      ],
      completionSections: ["services"],
    },
    {
      section: "operations",
      label: "How You Operate",
      description: "Orders, delivery & policies",
      icon: Truck,
      order: 3,
      groups: [
        { key: "coverage", label: "COVERAGE", itemIds: ["coverage"] },
        { key: "delivery", label: "DELIVERY", itemIds: ["delivery-zones", "catering-coverage"] },
        { key: "order-handling", label: "ORDER HANDLING", itemIds: ["food-settings-ops", "callback-delivery"] },
        { key: "policies", label: "POLICIES", itemIds: ["policies", "never-promise", "custom-policies"] },
      ],
      completionSections: ["coverage", "policies"],
    },
    {
      section: "training",
      label: "Train Your AI",
      description: "Knowledge, scripts & rules",
      icon: Sparkles,
      order: 4,
      groups: [
        { key: "call-essentials", label: "CALL ESSENTIALS", itemIds: ["required-questions", "scripts", "guidelines"] },
        { key: "knowledge", label: "KNOWLEDGE", itemIds: ["review", "faqs", "objections"] },
        { key: "industry-knowledge", label: "INDUSTRY KNOWLEDGE", itemIds: ["menu-knowledge", "catering-knowledge"] },
        { key: "more-options", label: "MORE", itemIds: ["competitors", "seasonal", "custom", "documents"] },
      ],
      completionSections: ["knowledge", "ai-behavior", "policies"],
    },
    {
      section: "intelligence",
      label: "AI Learning",
      description: "Memory & insights",
      icon: Sparkles,
      order: 5,
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
        { key: "essentials", label: "ESSENTIALS", itemIds: ["business-info", "business-hours"] },
        { key: "calendar", label: "CALENDAR", itemIds: ["calendar-sync"] },
        { key: "compliance", label: "COMPLIANCE", itemIds: ["hipaa"] },
        { key: "team", label: "TEAM", itemIds: ["team"] },
        { key: "optional", label: "OPTIONAL", itemIds: ["templates"] },
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
        { key: "your-procedures", label: "YOUR PROCEDURES", itemIds: ["catalog"] },
        { key: "pricing", label: "PRICING", itemIds: ["medical-pricing", "service-packages"] },
      ],
      completionSections: ["services"],
    },
    {
      section: "operations",
      label: "How You Operate",
      description: "Coverage, delivery & policies",
      icon: Calendar,
      order: 3,
      groups: [
        { key: "coverage", label: "COVERAGE", itemIds: ["coverage", "medical-coverage"] },
        { key: "delivery", label: "DELIVERY", itemIds: ["booking-delivery", "medical-intake-delivery", "callback-delivery"] },
        { key: "policies", label: "PATIENT POLICIES", itemIds: ["policies", "never-promise", "custom-policies"] },
      ],
      completionSections: ["coverage", "policies"],
    },
    {
      section: "training",
      label: "Train Your AI",
      description: "Knowledge, scripts & rules",
      icon: Sparkles,
      order: 4,
      groups: [
        { key: "call-essentials", label: "CALL ESSENTIALS", itemIds: ["required-questions", "scripts", "guidelines"] },
        { key: "knowledge", label: "KNOWLEDGE", itemIds: ["review", "faqs", "objections"] },
        { key: "industry-knowledge", label: "INDUSTRY KNOWLEDGE", itemIds: ["symptom-triage", "insurance-knowledge"] },
        { key: "more-options", label: "MORE", itemIds: ["aftercare", "competitors", "seasonal", "custom", "documents"] },
      ],
      completionSections: ["knowledge", "ai-behavior", "policies"],
    },
    {
      section: "intelligence",
      label: "AI Learning",
      description: "Memory & insights",
      icon: Sparkles,
      order: 5,
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
        { key: "essentials", label: "ESSENTIALS", itemIds: ["business-info", "business-hours"] },
        { key: "calendar", label: "CALENDAR", itemIds: ["calendar-sync"] },
        { key: "team", label: "TEAM", itemIds: ["team"] },
        { key: "optional", label: "OPTIONAL", itemIds: ["templates"] },
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
        { key: "your-catalog", label: "YOUR CATALOG", itemIds: ["catalog"] },
        { key: "pricing-options", label: "PRICING OPTIONS", itemIds: ["service-packages"] },
        { key: "other-offerings", label: "OTHER", itemIds: ["additional-services"] },
      ],
      completionSections: ["services"],
    },
    {
      section: "operations",
      label: "How You Operate",
      description: "Coverage, delivery & policies",
      icon: Calendar,
      order: 3,
      groups: [
        { key: "where-you-work", label: "WHERE YOU WORK", itemIds: ["response-times", "coverage"] },
        { key: "delivery", label: "DELIVERY", itemIds: ["booking-delivery", "callback-delivery"] },
        { key: "policies", label: "POLICIES", itemIds: ["policies", "never-promise", "custom-policies"] },
      ],
      completionSections: ["coverage", "policies"],
    },
    {
      section: "training",
      label: "Train Your AI",
      description: "Knowledge, scripts & rules",
      icon: Sparkles,
      order: 4,
      groups: [
        { key: "call-essentials", label: "CALL ESSENTIALS", itemIds: ["required-questions", "scripts", "guidelines"] },
        { key: "knowledge", label: "KNOWLEDGE", itemIds: ["review", "faqs", "objections"] },
        { key: "industry-knowledge", label: "INDUSTRY KNOWLEDGE", itemIds: ["product-knowledge"] },
        { key: "more-options", label: "MORE", itemIds: ["competitors", "seasonal", "custom", "documents"] },
      ],
      completionSections: ["knowledge", "ai-behavior", "policies"],
    },
    {
      section: "intelligence",
      label: "AI Learning",
      description: "Memory & insights",
      icon: Sparkles,
      order: 5,
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
        { key: "essentials", label: "ESSENTIALS", itemIds: ["business-info", "business-hours"] },
        { key: "calendar", label: "CALENDAR", itemIds: ["calendar-sync"] },
        { key: "team", label: "TEAM", itemIds: ["team"] },
        { key: "optional", label: "OPTIONAL", itemIds: ["templates"] },
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
        { key: "your-catalog", label: "YOUR CATALOG", itemIds: ["catalog"] },
        { key: "pricing-options", label: "PRICING OPTIONS", itemIds: ["service-packages"] },
        { key: "other-offerings", label: "OTHER", itemIds: ["additional-services"] },
      ],
      completionSections: ["services"],
    },
    {
      section: "operations",
      label: "How You Operate",
      description: "Coverage, delivery & policies",
      icon: Calendar,
      order: 3,
      groups: [
        { key: "where-you-work", label: "WHERE YOU WORK", itemIds: ["coverage"] },
        { key: "delivery", label: "DELIVERY", itemIds: ["booking-delivery", "callback-delivery"] },
        { key: "policies", label: "POLICIES", itemIds: ["policies", "never-promise", "custom-policies"] },
      ],
      completionSections: ["coverage", "policies"],
    },
    {
      section: "training",
      label: "Train Your AI",
      description: "Knowledge, scripts & rules",
      icon: Sparkles,
      order: 4,
      groups: [
        { key: "call-essentials", label: "CALL ESSENTIALS", itemIds: ["required-questions", "scripts", "guidelines"] },
        { key: "knowledge", label: "KNOWLEDGE", itemIds: ["review", "faqs", "objections"] },
        { key: "industry-knowledge", label: "INDUSTRY KNOWLEDGE", itemIds: ["product-knowledge"] },
        { key: "more-options", label: "MORE", itemIds: ["competitors", "seasonal", "custom", "documents"] },
      ],
      completionSections: ["knowledge", "ai-behavior", "policies"],
    },
    {
      section: "intelligence",
      label: "AI Learning",
      description: "Memory & insights",
      icon: Sparkles,
      order: 5,
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
