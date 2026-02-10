/**
 * Tab Sub-Section Configuration
 *
 * Defines which card IDs belong to which sub-section within the heavy tabs
 * (Operations, Training, Services). Used by BusinessBrainPage to render
 * pill navigation and filter visible groups per sub-section.
 */

import type { BusinessMode } from "@/hooks/useTenantConfig";
import type { Capabilities } from "@/hooks/useCapabilities";

export interface SubSectionDef {
  id: string;
  label: string;
  /** Card IDs that belong to this sub-section */
  cardIds: string[];
  /** Visibility predicate — omit to always show */
  isVisible?: (mode: BusinessMode, caps: Capabilities) => boolean;
}

// ─── Operations sub-sections ────────────────────────────────────────────────

export const OPERATIONS_SUB_SECTIONS: SubSectionDef[] = [
  {
    id: "coverage",
    label: "Coverage",
    cardIds: [
      "coverage", "travel-times", "service-coverage", "dispatch-zones",
      "delivery-zones", "catering-coverage", "medical-coverage",
      "response-times", "workload",
    ],
  },
  {
    id: "rules",
    label: "Rules",
    cardIds: ["policies", "never-promise", "required-questions", "custom-policies"],
  },
  {
    id: "delivery",
    label: "Delivery",
    cardIds: ["booking-delivery", "food-settings", "dispatch-settings", "distance-pricing", "ivr-routing"],
    isVisible: (mode, caps) =>
      caps.isSchedulingBusiness || caps.hasFoodOrders || caps.isDispatchBusiness,
  },
  {
    id: "compliance",
    label: "Compliance",
    cardIds: ["impound-lot", "impound-fees", "impound-release", "hipaa"],
    isVisible: (mode, caps) =>
      caps.isDispatchBusiness || mode === "medical",
  },
];

// ─── Training sub-sections ──────────────────────────────────────────────────

export const TRAINING_SUB_SECTIONS: SubSectionDef[] = [
  {
    id: "faq-objections",
    label: "FAQ & Objections",
    cardIds: ["review", "faqs", "objections"],
  },
  {
    id: "industry-knowledge",
    label: "Industry Knowledge",
    cardIds: [
      "menu-knowledge", "catering-knowledge", "vehicle-knowledge",
      "roadside-knowledge", "symptom-triage", "insurance-knowledge",
      "product-knowledge",
    ],
    isVisible: (mode) => mode !== "general",
  },
  {
    id: "documents-more",
    label: "Documents & More",
    cardIds: ["aftercare", "competitors", "seasonal", "custom", "documents"],
  },
];

// ─── Services sub-sections ──────────────────────────────────────────────────

export const SERVICES_SUB_SECTIONS: SubSectionDef[] = [
  {
    id: "catalog",
    label: "Your Catalog",
    cardIds: ["food-service-types", "pricing-rules", "catalog"],
  },
  {
    id: "advanced-pricing",
    label: "Advanced Pricing",
    cardIds: [
      "price-modifiers", "service-packages", "dispatch-pricing",
      "distance-basis", "food-settings", "menu-sizes", "daily-specials",
      "medical-pricing",
    ],
  },
  {
    id: "other-offerings",
    label: "Other Offerings",
    cardIds: ["additional-services"],
  },
];

// ─── Lookup map: tabSection → sub-sections ──────────────────────────────────

const TAB_SUB_SECTIONS: Record<string, SubSectionDef[]> = {
  operations: OPERATIONS_SUB_SECTIONS,
  training: TRAINING_SUB_SECTIONS,
  services: SERVICES_SUB_SECTIONS,
};

/**
 * Given a tab section and card ID, find which sub-section contains that card.
 * Used for deep-linking: `#impound-lot` → auto-select "compliance" sub-section.
 */
export function findSubSectionForCard(
  tabSection: string,
  cardId: string,
): string | null {
  const subs = TAB_SUB_SECTIONS[tabSection];
  if (!subs) return null;
  for (const sub of subs) {
    if (sub.cardIds.includes(cardId)) return sub.id;
  }
  return null;
}

/**
 * Filter sub-sections to only those that are visible for the current mode/caps.
 */
export function getVisibleSubSections(
  tabSection: string,
  mode: BusinessMode,
  caps: Capabilities,
): SubSectionDef[] {
  const subs = TAB_SUB_SECTIONS[tabSection];
  if (!subs) return [];
  return subs.filter((s) => !s.isVisible || s.isVisible(mode, caps));
}
