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
  isLoading?: boolean;
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
    // While capabilities are still loading, return a loading state instead of 0%
    // which would misleadingly show incomplete progress
    if (capabilities.isLoading) {
      return { totalFields: 0, completedFields: 0, percentage: 100, hasRequiredIncomplete: false, isLoading: true };
    }

    const essentialSections = getCompletionSections(businessMode, categorySection);
    if (essentialSections.length === 0) {
      return { totalFields: 0, completedFields: 0, percentage: 100, hasRequiredIncomplete: false };
    }

    const allFields = getFieldsForMode(capabilities.mode);
    const capFlags = buildCapabilityFlags(capabilities);

    // Only count required and recommended fields for completion percentage.
    // Optional fields should not drag down the score.
    const sectionFields = allFields.filter(
      (f) => essentialSections.includes(f.section) && shouldShowField(f, capFlags)
        && f.priority !== "optional",
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
    // When no required/recommended fields exist (all optional), don't default to 100%.
    // Instead, check if any optional fields are complete for a more honest indicator.
    let percentage: number;
    if (total > 0) {
      percentage = Math.round((completed / total) * 100);
    } else {
      // Count optional fields in this section to avoid misleading "Done" on empty sections
      const optionalFields = allFields.filter(
        (f) => essentialSections.includes(f.section) && shouldShowField(f, capFlags)
          && f.priority === "optional",
      );
      if (optionalFields.length === 0) {
        percentage = 100; // Truly no fields at all
      } else {
        // Show 100% only if at least one optional field is complete
        const anyOptionalComplete = optionalFields.some(
          (f) => isFieldComplete(f.id, capabilities, tenant as Record<string, unknown> | null)
        );
        percentage = anyOptionalComplete ? 100 : 0;
      }
    }

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
    const result: Record<string, CategoryCompletionStats> = {};

    // While capabilities are still loading, return loading state for all categories
    if (capabilities.isLoading) {
      const keys = sectionKeys ?? ["about", "services", "operations", "training"];
      for (const k of keys) {
        result[k] = { totalFields: 0, completedFields: 0, percentage: 100, hasRequiredIncomplete: false, isLoading: true };
      }
      return result;
    }

    const allFields = getFieldsForMode(capabilities.mode);
    const capFlags = buildCapabilityFlags(capabilities);

    // Default section keys: the standard mode tabs
    const keys = sectionKeys ?? ["about", "services", "operations", "training"];

    for (const catSection of keys) {
      const essentialSections = getCompletionSections(businessMode, catSection);

      if (essentialSections.length === 0) {
        result[catSection] = { totalFields: 0, completedFields: 0, percentage: 100, hasRequiredIncomplete: false };
        continue;
      }

      // Only count required and recommended fields for completion percentage.
      // Optional fields should not drag down the score.
      const sectionFields = allFields.filter(
        (f) => essentialSections.includes(f.section) && shouldShowField(f, capFlags)
          && f.priority !== "optional",
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
