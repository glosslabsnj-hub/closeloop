/**
 * Shared Brain Field Completion Checker
 *
 * Single source of truth for isFieldComplete logic used by both
 * useBrainCompletion and useCategoryCompletion.
 *
 * Critical fix: Fields that previously always returned `true` now
 * check actual data via capabilities flags. Default case changed
 * from `return true` to `return false`.
 */

import type { BusinessCapabilities } from "@/hooks/useBusinessCapabilities";

/**
 * Check if a specific field is complete based on available data.
 * Returns false for unknown fields (was previously true, inflating scores).
 */
export function isFieldComplete(
  fieldId: string,
  capabilities: BusinessCapabilities,
  tenant: Record<string, unknown> | null,
): boolean {
  if (!tenant) return false;

  switch (fieldId) {
    // ====== SHARED FIELDS ======
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

    // ====== FOOD MODE FIELDS ======
    case "service_types": {
      const { food } = capabilities;
      return food.offersPickup || food.offersDelivery || food.offersDineIn || food.offersCatering;
    }

    case "prep_time":
      return capabilities.hasPrepTimeConfigured;

    case "delivery_zones": {
      const serviceArea = tenant.service_area_json as Record<string, unknown> | null;
      return !!serviceArea && Object.keys(serviceArea).length > 0;
    }

    case "catering_settings":
      return capabilities.hasCateringKnowledge;

    case "reservation_settings":
      return capabilities.showReservationsSection;

    case "daily_specials":
      return false; // No longer assumed complete

    case "allergy_info":
      return false; // No longer assumed complete

    // ====== DISPATCH MODE FIELDS ======
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
      return capabilities.hasPriceModifiers;

    case "impound_settings":
      return capabilities.dispatch.hasImpoundLot;

    case "motor_club_rates":
      return capabilities.hasPriceModifiers;

    case "fleet_vehicles":
      return capabilities.dispatch.hasFleet;

    // ====== SERVICE MODE FIELDS ======
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
      return capabilities.hasServicePackages;

    case "aftercare_instructions":
      return capabilities.hasAftercare;

    // ====== MEDICAL MODE FIELDS ======
    case "hipaa_acknowledgment":
      return capabilities.medical.requiresHIPAA;

    case "appointment_types":
      return capabilities.hasServices;

    case "insurance_carriers":
      return capabilities.hasInsuranceKnowledge;

    case "new_patient_intake":
      return capabilities.medical.hasNewPatientIntake;

    case "symptom_triage":
      return capabilities.hasSymptomTriage;

    case "telehealth_settings":
      return capabilities.medical.hasTelehealth;

    case "self_pay_rates":
      return false; // No longer assumed complete

    // ====== GENERAL MODE FIELDS ======
    case "callback_settings":
      return false; // No longer assumed complete — check assistant_settings

    // ====== SALES MODE FIELDS ======
    case "products_inventory":
      return capabilities.hasServices;

    case "financing_info":
      return false;

    case "trade_in_policy":
      return false;

    case "test_drive_settings":
      return false;

    case "sales_team_names":
      return false;

    case "ai_behavior_mode":
      return false;

    case "service_default_flow":
      return false;

    default:
      // CRITICAL: Changed from `return true` to `return false`
      // Unknown fields should not inflate completion scores
      return false;
  }
}
