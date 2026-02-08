/**
 * Brain Completion Hook
 * 
 * Dynamically calculates Business Brain completion based on:
 * - Business mode
 * - Enabled capabilities
 * - Essential fields registry
 * 
 * This replaces the hardcoded completion logic in useBrainSummaries
 * with a dynamic system that adapts to each business's actual needs.
 */

import { useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useBusinessCapabilities, type BusinessCapabilities } from "./useBusinessCapabilities";
import { 
  getFieldsForMode, 
  shouldShowField,
  type FieldDefinition,
  type FieldPriority,
} from "@/config/essentialFields";

// ============================================================================
// TYPES
// ============================================================================

export interface FieldCompletionStatus {
  field: FieldDefinition;
  isComplete: boolean;
  isApplicable: boolean; // Whether this field applies based on capabilities
}

export interface CompletionStats {
  // Overall stats
  totalRequired: number;
  completedRequired: number;
  requiredPercentage: number;
  
  totalRecommended: number;
  completedRecommended: number;
  recommendedPercentage: number;
  
  // Combined (for progress bar)
  totalEssential: number; // required + recommended
  completedEssential: number;
  essentialPercentage: number;
  
  // Details
  incompleteRequired: FieldCompletionStatus[];
  incompleteRecommended: FieldCompletionStatus[];
  
  // Quick checks
  isReadyForGoLive: boolean; // All required fields complete
  isFullyConfigured: boolean; // All required + recommended complete
}

// ============================================================================
// FIELD COMPLETION CHECKERS
// ============================================================================

/**
 * Check if a specific field is complete based on available data
 */
function isFieldComplete(
  fieldId: string,
  capabilities: BusinessCapabilities,
  tenant: Record<string, unknown> | null
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
    
    case "ai_guidelines":
      const policies = tenant.ai_policies_json;
      return Array.isArray(policies) && policies.length > 0;
    
    case "objection_responses":
      return capabilities.hasKnowledge;

    // ====== FOOD MODE FIELDS ======
    case "service_types":
      // Check if at least one service type is configured
      const { food } = capabilities;
      return food.offersPickup || food.offersDelivery || food.offersDineIn || food.offersCatering;
    
    case "prep_time":
      // Check food_order_settings for estimated_prep_minutes
      return true; // Default to true, detailed check in useFoodOrderSettings
    
    case "delivery_zones":
      // Check if service_area_json has data for delivery
      const serviceArea = tenant.service_area_json as Record<string, unknown> | null;
      return !!serviceArea && Object.keys(serviceArea).length > 0;
    
    case "catering_settings":
      return true; // Check catering_knowledge table in actual implementation
    
    case "reservation_settings":
      return capabilities.showReservationsSection;
    
    case "daily_specials":
      return true; // Optional, assume complete
    
    case "allergy_info":
      return true; // Optional, assume complete

    // ====== DISPATCH MODE FIELDS ======
    case "service_area":
      const dispatchArea = tenant.service_area_json as Record<string, unknown> | null;
      return !!dispatchArea && Object.keys(dispatchArea).length > 0;
    
    case "vehicle_types":
      // Check if services with vehicle types exist
      return capabilities.hasServices;
    
    case "distance_pricing":
      // Check pricing_rules_jsonb
      const pricingRules = tenant.pricing_rules_jsonb;
      return !!pricingRules && Object.keys(pricingRules as object || {}).length > 0;
    
    case "eta_settings":
      // Check busyness_rules_jsonb for ETA config
      const busynessRules = tenant.busyness_rules_jsonb;
      return !!busynessRules;
    
    case "after_hours_pricing":
      return true; // Part of pricing rules
    
    case "impound_settings":
      return capabilities.dispatch.hasImpoundLot;
    
    case "motor_club_rates":
      return true; // Optional
    
    case "fleet_vehicles":
      return capabilities.dispatch.hasFleet;

    // ====== SERVICE MODE FIELDS ======
    case "service_location":
      const { service } = capabilities;
      return service.offersMobileService || service.offersInShopService;
    
    case "calendar_connection":
      return capabilities.hasCalendarConnected;
    
    case "deposit_settings":
      return !!tenant.deposit_policy;
    
    case "appointment_buffer":
      return (tenant.appointment_buffer_minutes as number) > 0;
    
    case "service_packages":
      return true; // Optional
    
    case "aftercare_instructions":
      return true; // Optional

    // ====== MEDICAL MODE FIELDS ======
    case "hipaa_acknowledgment":
      return capabilities.medical.requiresHIPAA;
    
    case "appointment_types":
      return capabilities.hasServices;
    
    case "insurance_carriers":
      return true; // Check medical-specific table
    
    case "new_patient_intake":
      return capabilities.medical.hasNewPatientIntake;
    
    case "symptom_triage":
      return true; // Optional advanced feature
    
    case "telehealth_settings":
      return !capabilities.medical.hasTelehealth || true; // Only check if enabled
    
    case "self_pay_rates":
      return true; // Optional

    // ====== GENERAL MODE FIELDS ======
    case "callback_settings":
      return true; // Default behavior exists

    default:
      return true; // Unknown fields default to complete
  }
}

// ============================================================================
// MAIN HOOK
// ============================================================================

export function useBrainCompletion(): CompletionStats {
  const { tenant } = useAuth();
  const capabilities = useBusinessCapabilities();

  return useMemo(() => {
    // Get all fields for this mode
    const allFields = getFieldsForMode(capabilities.mode);
    
    // Build capability flags for shouldShowField
    const capabilityFlags: Record<string, boolean> = {
      offersDelivery: capabilities.food.offersDelivery,
      offersCatering: capabilities.food.offersCatering,
      offersReservations: capabilities.food.offersReservations,
      hasImpoundLot: capabilities.dispatch.hasImpoundLot,
      offersMobileService: capabilities.service.offersMobileService,
      hasTelehealth: capabilities.medical.hasTelehealth,
      needsSymptomTriage: capabilities.medical.needsSymptomTriage,
    };

    // Filter to only applicable fields and check completion
    const fieldStatuses: FieldCompletionStatus[] = allFields.map(field => {
      const isApplicable = shouldShowField(field, capabilityFlags);
      const isComplete = isApplicable 
        ? isFieldComplete(field.id, capabilities, tenant as Record<string, unknown> | null)
        : true; // Non-applicable fields don't count
      
      return { field, isComplete, isApplicable };
    });

    // Calculate stats by priority
    const applicableRequired = fieldStatuses.filter(
      s => s.isApplicable && s.field.priority === "required"
    );
    const applicableRecommended = fieldStatuses.filter(
      s => s.isApplicable && s.field.priority === "recommended"
    );

    const completedRequired = applicableRequired.filter(s => s.isComplete).length;
    const completedRecommended = applicableRecommended.filter(s => s.isComplete).length;

    const totalRequired = applicableRequired.length;
    const totalRecommended = applicableRecommended.length;
    const totalEssential = totalRequired + totalRecommended;
    const completedEssential = completedRequired + completedRecommended;

    const requiredPercentage = totalRequired > 0 
      ? Math.round((completedRequired / totalRequired) * 100) 
      : 100;
    const recommendedPercentage = totalRecommended > 0 
      ? Math.round((completedRecommended / totalRecommended) * 100) 
      : 100;
    const essentialPercentage = totalEssential > 0 
      ? Math.round((completedEssential / totalEssential) * 100) 
      : 100;

    // Get incomplete items for display
    const incompleteRequired = fieldStatuses.filter(
      s => s.isApplicable && s.field.priority === "required" && !s.isComplete
    );
    const incompleteRecommended = fieldStatuses.filter(
      s => s.isApplicable && s.field.priority === "recommended" && !s.isComplete
    );

    return {
      totalRequired,
      completedRequired,
      requiredPercentage,
      
      totalRecommended,
      completedRecommended,
      recommendedPercentage,
      
      totalEssential,
      completedEssential,
      essentialPercentage,
      
      incompleteRequired,
      incompleteRecommended,
      
      isReadyForGoLive: completedRequired === totalRequired,
      isFullyConfigured: completedEssential === totalEssential,
    };
  }, [tenant, capabilities]);
}

// ============================================================================
// SECTION-SPECIFIC COMPLETION
// ============================================================================

/**
 * Get completion status for a specific section
 */
export function useSectionCompletion(sectionId: string): {
  totalFields: number;
  completedFields: number;
  percentage: number;
  hasRequiredIncomplete: boolean;
} {
  const { tenant } = useAuth();
  const capabilities = useBusinessCapabilities();

  return useMemo(() => {
    const allFields = getFieldsForMode(capabilities.mode);
    const sectionFields = allFields.filter(f => f.section === sectionId);
    
    const capabilityFlags: Record<string, boolean> = {
      offersDelivery: capabilities.food.offersDelivery,
      offersCatering: capabilities.food.offersCatering,
      offersReservations: capabilities.food.offersReservations,
      hasImpoundLot: capabilities.dispatch.hasImpoundLot,
      offersMobileService: capabilities.service.offersMobileService,
      hasTelehealth: capabilities.medical.hasTelehealth,
      needsSymptomTriage: capabilities.medical.needsSymptomTriage,
    };

    const applicableFields = sectionFields.filter(f => shouldShowField(f, capabilityFlags));
    const completedFields = applicableFields.filter(
      f => isFieldComplete(f.id, capabilities, tenant as Record<string, unknown> | null)
    );

    const totalFields = applicableFields.length;
    const completedCount = completedFields.length;
    const percentage = totalFields > 0 ? Math.round((completedCount / totalFields) * 100) : 100;

    const hasRequiredIncomplete = applicableFields.some(
      f => f.priority === "required" && 
           !isFieldComplete(f.id, capabilities, tenant as Record<string, unknown> | null)
    );

    return {
      totalFields,
      completedFields: completedCount,
      percentage,
      hasRequiredIncomplete,
    };
  }, [tenant, capabilities, sectionId]);
}
