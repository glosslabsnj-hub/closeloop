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
import { useBusinessCapabilities } from "./useBusinessCapabilities";
import {
  getFieldsForMode,
  shouldShowField,
  type FieldDefinition,
} from "@/config/essentialFields";
import { isFieldComplete } from "@/lib/brainFieldCompletion";

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
