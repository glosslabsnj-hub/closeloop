/**
 * Hook to get AI impact status for Business Brain sections
 * 
 * Maps section IDs to their essential field definitions,
 * providing priority, impact text, and completion status.
 */

import { useMemo } from "react";
import { ESSENTIAL_FIELDS_REGISTRY, type FieldPriority, type FieldDefinition } from "@/config/essentialFields";
import { useBusinessCapabilities } from "./useBusinessCapabilities";

export interface SectionFieldStatus {
  priority: FieldPriority | null;
  aiImpactText: string | null;
  isComplete: boolean;
  fieldDefinition: FieldDefinition | null;
}

/**
 * Maps Business Brain section card IDs to their essential field definitions
 */
const SECTION_TO_FIELD_MAP: Record<string, string> = {
  // Profile section
  "business-info": "business_name",
  
  // Hours section
  "business-hours": "hours",
  
  // Services section
  "catalog": "services",
  "food-service-types": "service_types",
  "pricing-rules": "pricing_rules",
  "dispatch-pricing": "distance_pricing",
  "distance-basis": "distance_pricing",
  "menu-sizes": "menu_sizes",
  "daily-specials": "daily_specials",
  "medical-pricing": "insurance_carriers",
  
  // Coverage section
  "coverage": "service_area",
  "service-area": "service_area",
  "travel-times": "eta_settings",
  "dispatch-zones": "eta_settings",
  "delivery-zones": "delivery_zones",
  "service-coverage": "service_location",
  "medical-coverage": "telehealth_settings",
  "workload": "busyness",
  
  // Calendar section
  "calendar-sync": "calendar_connection",
  
  // Policies section
  "policies": "cancellation_policy",
  "never-promise": "ai_never_promise",
  "required-questions": "required_questions",
  "booking-delivery": "booking_delivery",
  "dispatch-delivery": "dispatch_delivery",
  "food-delivery": "food_delivery",
  "hipaa-settings": "hipaa_acknowledgment",
  "intake-requirements": "new_patient_intake",
  "impound-lot": "impound_settings",
  "impound-fees": "impound_settings",
  "impound-release": "impound_settings",
  "dispatch-policies": "dispatch_policies",
  "food-policies": "food_policies",
  "medical-policies": "symptom_triage",
  "service-policies": "deposit_settings",
  "general-policies": "callback_settings",
  
  // AI Behavior section
  "scripts": "greeting_script",
  "business-rules": "ai_guidelines",
  "intelligence": "memory_settings",
  "call-flow": "call_flow",
  
  // Knowledge section
  "faqs": "faqs",
  "objections": "objection_responses",
  "custom-knowledge": "custom_knowledge",
  "documents": "documents",
};

/**
 * Get the AI impact status for a specific section
 */
export function useEssentialFieldStatus(sectionId: string): SectionFieldStatus {
  const capabilities = useBusinessCapabilities();
  
  return useMemo(() => {
    const fieldId = SECTION_TO_FIELD_MAP[sectionId];
    if (!fieldId) {
      return { priority: null, aiImpactText: null, isComplete: false, fieldDefinition: null };
    }
    
    const registry = ESSENTIAL_FIELDS_REGISTRY[capabilities.mode];
    if (!registry) {
      return { priority: null, aiImpactText: null, isComplete: false, fieldDefinition: null };
    }
    
    const field = registry.fields.find(f => f.id === fieldId);
    if (!field) {
      return { priority: null, aiImpactText: null, isComplete: false, fieldDefinition: null };
    }
    
    // Check if this field applies based on capabilities
    // Fields with checkFn should only show if their condition is met
    const fieldApplies = checkFieldApplies(field, capabilities);
    if (!fieldApplies) {
      return { priority: null, aiImpactText: null, isComplete: false, fieldDefinition: null };
    }
    
    return {
      priority: field.priority,
      aiImpactText: field.aiImpact,
      isComplete: false, // Completion is tracked elsewhere
      fieldDefinition: field,
    };
  }, [sectionId, capabilities]);
}

/**
 * Check if a field applies based on business capabilities
 */
function checkFieldApplies(
  field: FieldDefinition,
  capabilities: ReturnType<typeof useBusinessCapabilities>
): boolean {
  if (!field.checkFn) return true;
  
  switch (field.checkFn) {
    case "checkDeliveryEnabled":
      return capabilities.food.offersDelivery;
    case "checkCateringEnabled":
      return capabilities.food.offersCatering;
    case "checkReservationsEnabled":
      return capabilities.food.offersReservations;
    case "checkImpoundEnabled":
      return capabilities.dispatch.hasImpoundLot;
    case "checkMobileServiceEnabled":
      return capabilities.service.offersMobileService;
    case "checkTelehealthEnabled":
      return capabilities.medical.hasTelehealth;
    case "checkSymptomTriageEnabled":
      return capabilities.medical.needsSymptomTriage;
    default:
      return true;
  }
}

/**
 * Get all applicable essential fields for the current mode
 */
export function useApplicableFields(): FieldDefinition[] {
  const capabilities = useBusinessCapabilities();
  
  return useMemo(() => {
    const registry = ESSENTIAL_FIELDS_REGISTRY[capabilities.mode];
    if (!registry) return [];
    
    return registry.fields.filter(field => checkFieldApplies(field, capabilities));
  }, [capabilities]);
}

/**
 * Get counts of required/recommended/optional fields by completion status
 */
export function useFieldCompletionStats(): {
  required: { total: number; complete: number };
  recommended: { total: number; complete: number };
  optional: { total: number; complete: number };
} {
  const applicableFields = useApplicableFields();
  const capabilities = useBusinessCapabilities();
  
  return useMemo(() => {
    const stats = {
      required: { total: 0, complete: 0 },
      recommended: { total: 0, complete: 0 },
      optional: { total: 0, complete: 0 },
    };
    
    // Count by priority
    for (const field of applicableFields) {
      const isComplete = checkFieldComplete(field.id, capabilities);
      stats[field.priority].total++;
      if (isComplete) {
        stats[field.priority].complete++;
      }
    }
    
    return stats;
  }, [applicableFields, capabilities]);
}

/**
 * Check if a specific field is complete based on capabilities
 */
function checkFieldComplete(
  fieldId: string,
  capabilities: ReturnType<typeof useBusinessCapabilities>
): boolean {
  switch (fieldId) {
    case "business_name":
      return capabilities.hasBusinessInfo;
    case "hours":
      return capabilities.hasHoursConfigured;
    case "services":
      return capabilities.hasServices;
    case "greeting_script":
      return capabilities.hasGreeting;
    case "faqs":
      return capabilities.hasFAQs;
    case "calendar_connection":
      return capabilities.hasCalendarConnected;
    case "cancellation_policy":
      return capabilities.hasPoliciesConfigured;
    // Add more field checks as needed
    default:
      return false;
  }
}
