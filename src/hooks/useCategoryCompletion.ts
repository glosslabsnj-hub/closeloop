/**
 * Category-level completion hook
 *
 * Uses the mode-specific `completionSections` from brainModeLayout.ts
 * so percentages always align with the actual tabs shown on the dashboard.
 *
 * Read-only dependency on essentialFields + brainModeLayout.
 */

import { useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useBusinessCapabilities } from "./useBusinessCapabilities";
import { useTenantConfig } from "./useTenantConfig";
import {
  getFieldsForMode,
  shouldShowField,
} from "@/config/essentialFields";
import { isFieldComplete } from "@/lib/brainFieldCompletion";
import { getModeTabDef } from "@/config/brainModeLayout";

// ── Types ──────────────────────────────────────────────────────────────────

export interface CategoryCompletionStats {
  totalFields: number;
  completedFields: number;
  percentage: number;
  hasRequiredIncomplete: boolean;
}

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

/**
 * Resolve completion sections for a category using the mode layout.
 * Falls back to a static map for legacy/unmapped sections.
 */
function getCompletionSections(mode: string, categorySection: string): string[] {
  // Try mode layout first (source of truth)
  const tabDef = getModeTabDef(mode as any, categorySection);
  if (tabDef && tabDef.completionSections.length > 0) {
    return tabDef.completionSections;
  }

  // Legacy fallback for sections not in mode layout
  const LEGACY_MAP: Record<string, string[]> = {
    business: ["profile", "hours", "calendar"],
    "ai-voice": ["ai-behavior"],
    rules: ["policies"],
  };
  return LEGACY_MAP[categorySection] ?? [];
}

// ── Hooks ──────────────────────────────────────────────────────────────────

/**
 * Completion stats for a single dashboard category.
 */
export function useCategoryCompletion(categorySection: string): CategoryCompletionStats {
  const { tenant } = useAuth();
  const capabilities = useBusinessCapabilities();
  const { businessMode } = useTenantConfig();

  return useMemo(() => {
    const essentialSections = getCompletionSections(businessMode, categorySection);
    if (essentialSections.length === 0) {
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
  }, [categorySection, tenant, capabilities, businessMode]);
}

/**
 * Completion stats for dashboard categories.
 * Uses mode-aware completion sections from brainModeLayout.ts.
 * Pass specific section keys to compute only for those categories.
 */
export function useAllCategoriesCompletion(
  sectionKeys?: string[],
): Record<string, CategoryCompletionStats> {
  const { tenant } = useAuth();
  const capabilities = useBusinessCapabilities();
  const { businessMode } = useTenantConfig();

  return useMemo(() => {
    const allFields = getFieldsForMode(capabilities.mode);
    const capFlags = buildCapabilityFlags(capabilities);

    const result: Record<string, CategoryCompletionStats> = {};

    // Default section keys: the standard mode tabs
    const keys = sectionKeys ?? ["about", "services", "operations", "training"];

    for (const catSection of keys) {
      const essentialSections = getCompletionSections(businessMode, catSection);

      if (essentialSections.length === 0) {
        result[catSection] = { totalFields: 0, completedFields: 0, percentage: 100, hasRequiredIncomplete: false };
        continue;
      }

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
  }, [tenant, capabilities, sectionKeys, businessMode]);
}
