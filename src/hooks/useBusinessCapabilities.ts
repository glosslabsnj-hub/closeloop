/**
 * Business Capabilities Discovery Hook
 * 
 * Single source of truth for what a business actually offers/does.
 * Used to conditionally show/hide sections in Business Brain based on
 * the business's actual capabilities rather than just their mode.
 * 
 * This hook aggregates data from multiple sources:
 * - tenants.business_mode
 * - tenants.enabled_modules
 * - tenants.config_json (scenario answers)
 * - food_order_settings
 * - assistant_settings
 * - services table (what they've actually added)
 */

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useTenantConfig, type BusinessMode } from "./useTenantConfig";
import { useFoodOrderSettings } from "./useFoodOrderSettings";

// ============================================================================
// TYPES
// ============================================================================

export interface FoodCapabilities {
  offersPickup: boolean;
  offersDelivery: boolean;
  offersDineIn: boolean;
  offersCatering: boolean;
  offersReservations: boolean;
  hasMenuItems: boolean;
  needsDeliveryZones: boolean;
  needsCateringSettings: boolean;
}

export interface DispatchCapabilities {
  offersTowing: boolean;
  offersRoadside: boolean;
  hasImpoundLot: boolean;
  offersMotorClub: boolean;
  hasFleet: boolean;
  needsDistancePricing: boolean;
  needsEquipmentFees: boolean;
  needsStorageRates: boolean;
}

export interface ServiceCapabilities {
  offersMobileService: boolean;
  offersInShopService: boolean;
  offersSameDayEmergency: boolean;
  offersAppointments: boolean;
  offersWalkIns: boolean;
  requiresDeposits: boolean;
  needsServiceArea: boolean;
  needsTravelTimes: boolean;
}

export interface MedicalCapabilities {
  hasTelehealth: boolean;
  hasInPersonVisits: boolean;
  hasNewPatientIntake: boolean;
  requiresInsurance: boolean;
  requiresHIPAA: boolean;
  needsSymptomTriage: boolean;
}

export interface GeneralCapabilities {
  offersAppointments: boolean;
  offersCallbacks: boolean;
  offersMessaging: boolean;
}

export interface BusinessCapabilities {
  // Core identity
  mode: BusinessMode;
  businessName: string;
  hasBusinessInfo: boolean;
  hasHoursConfigured: boolean;
  hasServices: boolean;
  hasGreeting: boolean;
  
  // Mode-specific capabilities (only one will be populated based on mode)
  food: FoodCapabilities;
  dispatch: DispatchCapabilities;
  service: ServiceCapabilities;
  medical: MedicalCapabilities;
  general: GeneralCapabilities;
  
  // Cross-cutting capabilities
  hasCalendarConnected: boolean;
  hasDeliverySettings: boolean;
  hasWebhookConfigured: boolean;
  hasPoliciesConfigured: boolean;
  hasFAQs: boolean;
  hasKnowledge: boolean;
  
  // Derived visibility flags (what sections to show)
  showCoverageSection: boolean;
  showCalendarSection: boolean;
  showDeliverySection: boolean;
  showImpoundSection: boolean;
  showReservationsSection: boolean;
  showCateringSection: boolean;
  showMedicalIntakeSection: boolean;
  showFleetSection: boolean;
  
  // Loading state
  isLoading: boolean;
}

// ============================================================================
// DEFAULT VALUES
// ============================================================================

const defaultFoodCapabilities: FoodCapabilities = {
  offersPickup: true,
  offersDelivery: false,
  offersDineIn: true,
  offersCatering: false,
  offersReservations: false,
  hasMenuItems: false,
  needsDeliveryZones: false,
  needsCateringSettings: false,
};

const defaultDispatchCapabilities: DispatchCapabilities = {
  offersTowing: true,
  offersRoadside: true,
  hasImpoundLot: false,
  offersMotorClub: false,
  hasFleet: false,
  needsDistancePricing: true,
  needsEquipmentFees: true,
  needsStorageRates: false,
};

const defaultServiceCapabilities: ServiceCapabilities = {
  offersMobileService: false,
  offersInShopService: true,
  offersSameDayEmergency: false,
  offersAppointments: true,
  offersWalkIns: true,
  requiresDeposits: false,
  needsServiceArea: false,
  needsTravelTimes: false,
};

const defaultMedicalCapabilities: MedicalCapabilities = {
  hasTelehealth: false,
  hasInPersonVisits: true,
  hasNewPatientIntake: true,
  requiresInsurance: true,
  requiresHIPAA: true,
  needsSymptomTriage: false,
};

const defaultGeneralCapabilities: GeneralCapabilities = {
  offersAppointments: true,
  offersCallbacks: true,
  offersMessaging: true,
};

// ============================================================================
// HOOK
// ============================================================================

export function useBusinessCapabilities(): BusinessCapabilities {
  const { tenant } = useAuth();
  const { businessMode, enabledModules, hipaaMode } = useTenantConfig();
  const { settings: foodSettings, isLoading: foodLoading } = useFoodOrderSettings();

  // Fetch additional data needed to derive capabilities
  const { data: additionalData, isLoading: dataLoading } = useQuery({
    queryKey: ["business-capabilities", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return null;

      // Parallel fetch all needed data
      const [
        servicesResult,
        assistantResult,
        calendarResult,
        bookingDeliveryResult,
        dispatchDeliveryResult,
        faqsResult,
        knowledgeResult,
        fleetResult,
      ] = await Promise.all([
        supabase
          .from("services")
          .select("id, category", { count: "exact", head: false })
          .eq("tenant_id", tenant.id)
          .eq("is_active", true)
          .limit(10),
        supabase
          .from("ai_assistants")
          .select("greeting_script")
          .eq("tenant_id", tenant.id)
          .single(),
        supabase
          .from("calendar_connections")
          .select("id, status")
          .eq("tenant_id", tenant.id)
          .eq("status", "connected"),
        supabase
          .from("booking_delivery_settings")
          .select("enabled, notify_email, webhook_url")
          .eq("tenant_id", tenant.id)
          .single(),
        supabase
          .from("dispatch_delivery_settings")
          .select("enabled, notify_email")
          .eq("tenant_id", tenant.id)
          .single(),
        supabase
          .from("business_faqs")
          .select("id", { count: "exact", head: true })
          .eq("tenant_id", tenant.id),
        supabase
          .from("ai_knowledge_base")
          .select("id", { count: "exact", head: true })
          .eq("tenant_id", tenant.id),
        supabase
          .from("fleet_vehicles")
          .select("id", { count: "exact", head: true })
          .eq("tenant_id", tenant.id),
      ]);

      // Parse context_fields_json for scenario answers (using existing JSONB column)
      const contextFields = tenant.context_fields_json as Record<string, unknown> | null;
      const scenarioFlags = contextFields?.capabilities as Record<string, boolean> | undefined;

      return {
        services: servicesResult.data || [],
        serviceCount: servicesResult.count || 0,
        hasGreeting: !!assistantResult.data?.greeting_script,
        hasCalendarConnected: (calendarResult.data?.length ?? 0) > 0,
        bookingDelivery: bookingDeliveryResult.data,
        dispatchDelivery: dispatchDeliveryResult.data,
        faqCount: faqsResult.count || 0,
        knowledgeCount: knowledgeResult.count || 0,
        fleetCount: fleetResult.count || 0,
        scenarioFlags: scenarioFlags || {},
      };
    },
    enabled: !!tenant?.id,
    staleTime: 30000, // Cache for 30 seconds
  });

  // Derive capabilities from all data sources
  const isLoading = dataLoading || foodLoading;

  // Check if hours are configured
  const hasHoursConfigured = (() => {
    const hoursJson = tenant?.hours_json as Record<string, { closed?: boolean; windows?: { open: string; close: string }[] }> | null;
    if (!hoursJson || typeof hoursJson !== "object") return false;
    return Object.values(hoursJson).some(day => {
      if (!day || day.closed) return false;
      if (Array.isArray(day.windows) && day.windows.length > 0) return true;
      return false;
    });
  })();

  // Build mode-specific capabilities
  const food: FoodCapabilities = {
    offersPickup: foodSettings?.accepts_pickup ?? true,
    offersDelivery: foodSettings?.accepts_delivery ?? false,
    offersDineIn: foodSettings?.accepts_dine_in ?? true,
    offersCatering: foodSettings?.accepts_catering ?? false,
    offersReservations: enabledModules.includes("reservations"),
    hasMenuItems: (additionalData?.serviceCount ?? 0) > 0,
    needsDeliveryZones: foodSettings?.accepts_delivery ?? false,
    needsCateringSettings: foodSettings?.accepts_catering ?? false,
  };

  const dispatch: DispatchCapabilities = {
    offersTowing: additionalData?.scenarioFlags?.offersTowing ?? true,
    offersRoadside: additionalData?.scenarioFlags?.offersRoadside ?? true,
    hasImpoundLot: additionalData?.scenarioFlags?.hasImpoundLot ?? false,
    offersMotorClub: additionalData?.scenarioFlags?.offersMotorClub ?? false,
    hasFleet: (additionalData?.fleetCount ?? 0) > 0,
    needsDistancePricing: true, // Always needed for dispatch
    needsEquipmentFees: true,
    needsStorageRates: additionalData?.scenarioFlags?.hasImpoundLot ?? false,
  };

  const service: ServiceCapabilities = {
    offersMobileService: additionalData?.scenarioFlags?.offersMobileService ?? false,
    offersInShopService: additionalData?.scenarioFlags?.offersInShopService ?? true,
    offersSameDayEmergency: additionalData?.scenarioFlags?.offersSameDayEmergency ?? false,
    offersAppointments: enabledModules.includes("booking"),
    offersWalkIns: additionalData?.scenarioFlags?.offersWalkIns ?? true,
    requiresDeposits: additionalData?.bookingDelivery?.enabled ?? false,
    needsServiceArea: additionalData?.scenarioFlags?.offersMobileService ?? false,
    needsTravelTimes: additionalData?.scenarioFlags?.offersMobileService ?? false,
  };

  const medical: MedicalCapabilities = {
    hasTelehealth: additionalData?.scenarioFlags?.hasTelehealth ?? false,
    hasInPersonVisits: additionalData?.scenarioFlags?.hasInPersonVisits ?? true,
    hasNewPatientIntake: enabledModules.includes("medical_intake"),
    requiresInsurance: additionalData?.scenarioFlags?.requiresInsurance ?? true,
    requiresHIPAA: hipaaMode,
    needsSymptomTriage: additionalData?.scenarioFlags?.needsSymptomTriage ?? false,
  };

  const general: GeneralCapabilities = {
    offersAppointments: enabledModules.includes("booking"),
    offersCallbacks: true,
    offersMessaging: enabledModules.includes("instant_text_back"),
  };

  // Derive cross-cutting capabilities
  const hasDeliverySettings = 
    additionalData?.bookingDelivery?.enabled || 
    additionalData?.dispatchDelivery?.enabled ||
    false;
  
  const hasWebhookConfigured = !!additionalData?.bookingDelivery?.webhook_url;
  
  const hasPoliciesConfigured = !!(
    tenant?.cancellation_policy || 
    tenant?.deposit_policy || 
    tenant?.refund_policy
  );

  // Derive section visibility based on mode + capabilities
  const showCoverageSection = 
    businessMode === "dispatch" ||
    (businessMode === "food" && (food.offersDelivery || food.offersCatering)) ||
    (businessMode === "service" && service.offersMobileService) ||
    (businessMode === "medical" && medical.hasTelehealth);

  const showCalendarSection = 
    businessMode !== "dispatch" && // Dispatch rarely needs calendars
    enabledModules.includes("booking");

  const showDeliverySection = 
    businessMode === "dispatch" ||
    (businessMode === "food" && food.offersDelivery);

  const showImpoundSection = 
    businessMode === "dispatch" && dispatch.hasImpoundLot;

  const showReservationsSection = 
    businessMode === "food" && food.offersReservations;

  const showCateringSection = 
    businessMode === "food" && food.offersCatering;

  const showMedicalIntakeSection = 
    businessMode === "medical" && medical.hasNewPatientIntake;

  const showFleetSection = 
    businessMode === "dispatch" && dispatch.hasFleet;

  return {
    mode: businessMode,
    businessName: tenant?.name || "",
    hasBusinessInfo: !!tenant?.name && !!tenant?.address,
    hasHoursConfigured,
    hasServices: (additionalData?.serviceCount ?? 0) > 0,
    hasGreeting: additionalData?.hasGreeting ?? false,
    
    food,
    dispatch,
    service,
    medical,
    general,
    
    hasCalendarConnected: additionalData?.hasCalendarConnected ?? false,
    hasDeliverySettings,
    hasWebhookConfigured,
    hasPoliciesConfigured,
    hasFAQs: (additionalData?.faqCount ?? 0) > 0,
    hasKnowledge: (additionalData?.knowledgeCount ?? 0) > 0,
    
    showCoverageSection,
    showCalendarSection,
    showDeliverySection,
    showImpoundSection,
    showReservationsSection,
    showCateringSection,
    showMedicalIntakeSection,
    showFleetSection,
    
    isLoading,
  };
}

// ============================================================================
// UTILITY: Update Scenario Flags
// ============================================================================

/**
 * Updates the scenario capability flags stored in tenants.context_fields_json
 * Call this when users answer scenario questions
 */
export async function updateCapabilityFlags(
  tenantId: string,
  flags: Partial<Record<string, boolean>>
): Promise<void> {
  // Fetch current context_fields_json
  const { data: tenant } = await supabase
    .from("tenants")
    .select("context_fields_json")
    .eq("id", tenantId)
    .single();

  const currentConfig = (tenant?.context_fields_json as Record<string, unknown>) || {};
  const currentCapabilities = (currentConfig.capabilities as Record<string, boolean>) || {};

  // Merge new flags
  const updatedCapabilities = {
    ...currentCapabilities,
    ...flags,
  };

  // Save back
  await supabase
    .from("tenants")
    .update({
      context_fields_json: {
        ...currentConfig,
        capabilities: updatedCapabilities,
      },
    })
    .eq("id", tenantId);
}
