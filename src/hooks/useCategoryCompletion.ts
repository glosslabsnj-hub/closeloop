/**
 * Category-level completion hook
 *
 * Maps the 5 dashboard categories to the essentialFields section IDs
 * so each card on the BrainDashboard can show its own progress ring.
 *
 * Read-only dependency on useBrainCompletion / essentialFields.
 */

import { useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useBusinessCapabilities } from "./useBusinessCapabilities";
import {
  getFieldsForMode,
  shouldShowField,
} from "@/config/essentialFields";
import { isFieldComplete } from "@/lib/brainFieldCompletion";

// ── Types ──────────────────────────────────────────────────────────────────

export interface CategoryCompletionStats {
  totalFields: number;
  completedFields: number;
  percentage: number;
  hasRequiredIncomplete: boolean;
}

// ── Section mapping ────────────────────────────────────────────────────────
// Maps each dashboard category (section param) to the essentialFields
// `field.section` values it encompasses.

const CATEGORY_SECTION_MAP: Record<string, string[]> = {
  // Legacy (kept for backward compat)
  business:   ["profile", "hours", "calendar"],
  services:   ["services"],
  operations: ["coverage", "policies"],
  "ai-voice": ["ai-behavior"],
  // Mode-aware sections
  about:      ["profile", "hours"],
  rules:      ["policies"],
  training:   ["knowledge", "ai-behavior"],
};

// ── Capability flags builder (shared) ──────────────────────────────────────

function buildCapabilityFlags(capabilities: ReturnType<typeof useBusinessCapabilities>) {
  return {
    offersDelivery: capabilities.food.offersDelivery,
    offersCatering: capabilities.food.offersCatering,
    offersReservations: capabilities.food.offersReservations,
    hasImpoundLot: capabilities.dispatch.hasImpoundLot,
    offersMobileService: capabilities.service.offersMobileService,
    hasTelehealth: capabilities.medical.hasTelehealth,
    needsSymptomTriage: capabilities.medical.needsSymptomTriage,
  };
}

// ── Hooks ──────────────────────────────────────────────────────────────────

/**
 * Completion stats for a single dashboard category.
 */
export function useCategoryCompletion(categorySection: string): CategoryCompletionStats {
  const { tenant } = useAuth();
  const capabilities = useBusinessCapabilities();

  return useMemo(() => {
    const essentialSections = CATEGORY_SECTION_MAP[categorySection];
    if (!essentialSections) {
      return { totalFields: 0, completedFields: 0, percentage: 100, hasRequiredIncomplete: false };
    }

    const allFields = getFieldsForMode(capabilities.mode);
    const capFlags = buildCapabilityFlags(capabilities);

    const sectionFields = allFields.filter(
      (f) => essentialSections.includes(f.section) && shouldShowField(f, capFlags),
    );

    let completed = 0;
    let hasRequiredIncomplete = false;

    for (const field of sectionFields) {
      if (isFieldComplete(field.id, capabilities, tenant as Record<string, unknown> | null)) {
        completed++;
      } else if (field.priority === "required") {
        hasRequiredIncomplete = true;
      }
    }

    const total = sectionFields.length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 100;

    return { totalFields: total, completedFields: completed, percentage, hasRequiredIncomplete };
  }, [categorySection, tenant, capabilities]);
}

/**
 * Completion stats for dashboard categories.
 * Defaults to all entries in CATEGORY_SECTION_MAP, or pass specific section keys
 * to compute only for those (used by mode-shaped dashboard).
 */
export function useAllCategoriesCompletion(
  sectionKeys?: string[],
): Record<string, CategoryCompletionStats> {
  const { tenant } = useAuth();
  const capabilities = useBusinessCapabilities();

  return useMemo(() => {
    const allFields = getFieldsForMode(capabilities.mode);
    const capFlags = buildCapabilityFlags(capabilities);

    const result: Record<string, CategoryCompletionStats> = {};

    const entries = sectionKeys
      ? sectionKeys
          .filter((k) => CATEGORY_SECTION_MAP[k])
          .map((k) => [k, CATEGORY_SECTION_MAP[k]] as const)
      : Object.entries(CATEGORY_SECTION_MAP);

    for (const [catSection, essentialSections] of entries) {
      const sectionFields = allFields.filter(
        (f) => essentialSections.includes(f.section) && shouldShowField(f, capFlags),
      );

      let completed = 0;
      let hasRequiredIncomplete = false;

      for (const field of sectionFields) {
        if (isFieldComplete(field.id, capabilities, tenant as Record<string, unknown> | null)) {
          completed++;
        } else if (field.priority === "required") {
          hasRequiredIncomplete = true;
        }
      }

      const total = sectionFields.length;
      const percentage = total > 0 ? Math.round((completed / total) * 100) : 100;

      result[catSection] = { totalFields: total, completedFields: completed, percentage, hasRequiredIncomplete };
    }

    return result;
  }, [tenant, capabilities, sectionKeys]);
}
