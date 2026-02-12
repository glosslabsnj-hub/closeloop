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

// ── Field completion checker (mirrors useBrainCompletion) ──────────────────

function isFieldComplete(
  fieldId: string,
  capabilities: ReturnType<typeof useBusinessCapabilities>,
  tenant: Record<string, unknown> | null,
): boolean {
  if (!tenant) return false;

  switch (fieldId) {
    case "business_name":
      return !!tenant.name && (tenant.name as string).length > 0;
    case "hours":
      return capabilities.hasHoursConfigured;
    case "services":
      return capabilities.hasServices;
    case "greeting_script":
      return capabilities.hasGreeting;
    case "address":
      return !!tenant.address && (tenant.address as string).length > 0;
    case "cancellation_policy":
      return !!tenant.cancellation_policy;
    case "faqs":
      return capabilities.hasFAQs;
    case "tagline":
      return !!tenant.tagline;
    case "ai_guidelines": {
      const policies = tenant.ai_policies_json;
      return Array.isArray(policies) && policies.length > 0;
    }
    case "objection_responses":
      return capabilities.hasKnowledge;
    case "service_types": {
      const { food } = capabilities;
      return food.offersPickup || food.offersDelivery || food.offersDineIn || food.offersCatering;
    }
    case "prep_time":
      return true;
    case "delivery_zones": {
      const serviceArea = tenant.service_area_json as Record<string, unknown> | null;
      return !!serviceArea && Object.keys(serviceArea).length > 0;
    }
    case "catering_settings":
      return true;
    case "reservation_settings":
      return capabilities.showReservationsSection;
    case "daily_specials":
      return true;
    case "allergy_info":
      return true;
    case "service_area": {
      const dispatchArea = tenant.service_area_json as Record<string, unknown> | null;
      return !!dispatchArea && Object.keys(dispatchArea).length > 0;
    }
    case "vehicle_types":
      return capabilities.hasServices;
    case "distance_pricing": {
      const pricingRules = tenant.pricing_rules_jsonb;
      return !!pricingRules && Object.keys(pricingRules as object || {}).length > 0;
    }
    case "eta_settings":
      return !!tenant.busyness_rules_jsonb;
    case "after_hours_pricing":
      return true;
    case "impound_settings":
      return capabilities.dispatch.hasImpoundLot;
    case "motor_club_rates":
      return true;
    case "fleet_vehicles":
      return capabilities.dispatch.hasFleet;
    case "service_location": {
      const { service } = capabilities;
      return service.offersMobileService || service.offersInShopService;
    }
    case "calendar_connection":
      return capabilities.hasCalendarConnected;
    case "deposit_settings":
      return !!tenant.deposit_policy;
    case "appointment_buffer":
      return (tenant.appointment_buffer_minutes as number) > 0;
    case "service_packages":
      return true;
    case "aftercare_instructions":
      return true;
    case "hipaa_acknowledgment":
      return capabilities.medical.requiresHIPAA;
    case "appointment_types":
      return capabilities.hasServices;
    case "insurance_carriers":
      return true;
    case "new_patient_intake":
      return capabilities.medical.hasNewPatientIntake;
    case "symptom_triage":
      return true;
    case "telehealth_settings":
      return !capabilities.medical.hasTelehealth || true;
    case "self_pay_rates":
      return true;
    case "callback_settings":
      return true;
    default:
      return true;
  }
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
