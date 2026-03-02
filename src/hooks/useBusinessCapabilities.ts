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
  collectsDietaryRestrictions: boolean;
  offersCurbside: boolean;
  hasKDSIntegration: boolean;
  servesAlcohol: boolean;
  offersFamilyMeals: boolean;
  hasLoyaltyProgram: boolean;
  acceptsOnlineOrders: boolean;
  offersMealPrep: boolean;
  handlesGroupOrders: boolean;
  // Cross-mode capabilities
  offersEventBooking: boolean;
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
  handlesPoliceImpound: boolean;
  handlesPPITowing: boolean;
  offersRecovery: boolean;
  offersPhoneQuotes: boolean;
  operates24Hours: boolean;
  handlesHeavyDuty: boolean;
  worksWithInsurance: boolean;
  offersStorage: boolean;
  offersLockoutJumpstart: boolean;
  handlesAccidentTowing: boolean;
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
  hasMultipleStaff: boolean;
  offersPackages: boolean;
  collectsStylistPreference: boolean;
  requiresWarrantyCheck: boolean;
  offersFreeEstimates: boolean;
  chargesTripFee: boolean;
  offersFinancing: boolean;
  sendsReminders: boolean;
  hasMinimumCharge: boolean;
  offersAfterHours: boolean;
  // Cross-mode capabilities
  acceptsDropOffs: boolean;
  collectsHealthInfo: boolean;
}

export interface MedicalCapabilities {
  hasTelehealth: boolean;
  hasInPersonVisits: boolean;
  hasNewPatientIntake: boolean;
  requiresInsurance: boolean;
  requiresHIPAA: boolean;
  needsSymptomTriage: boolean;
  requiresNewPatientForms: boolean;
  collectsReferralInfo: boolean;
  collectsMedications: boolean;
  hasMultipleLocations: boolean;
  handlesWorkersComp: boolean;
  acceptsWalkIns: boolean;
  offersSameDayAppointments: boolean;
  hasOnSiteLab: boolean;
  offersPaymentPlans: boolean;
  // Cross-mode capabilities
  sellsRetailProducts: boolean;
}

export interface GeneralCapabilities {
  offersAppointments: boolean;
  offersCallbacks: boolean;
  offersMessaging: boolean;
  handlesFAQs: boolean;
  offersFreeConsultation: boolean;
  servesResidentialCommercial: boolean;
  needsAfterHoursContact: boolean;
  hasPhysicalOffice: boolean;
  providesWrittenQuotes: boolean;
  // Cross-mode capabilities
  offersLocalDelivery: boolean;
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

  // Knowledge-table counts (for accurate completion checks)
  hasPriceModifiers: boolean;
  hasServicePackages: boolean;
  hasMenuItems: boolean;
  hasCateringKnowledge: boolean;
  hasVehicleKnowledge: boolean;
  hasRoadsideKnowledge: boolean;
  hasSymptomTriage: boolean;
  hasInsuranceKnowledge: boolean;
  hasAftercare: boolean;
  hasProductKnowledge: boolean;
  hasPrepTimeConfigured: boolean;

  // Derived visibility flags (what sections to show)
  showCoverageSection: boolean;
  showCalendarSection: boolean;
  showDeliverySection: boolean;
  showImpoundSection: boolean;
  showReservationsSection: boolean;
  showCateringSection: boolean;
  showMedicalIntakeSection: boolean;
  showFleetSection: boolean;
  showStaffSection: boolean;
  showRecoverySection: boolean;
  showPoliceImpoundSection: boolean;
  showCurbsideSection: boolean;
  showNewPatientFormsSection: boolean;

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
  collectsDietaryRestrictions: false,
  offersCurbside: false,
  hasKDSIntegration: false,
  servesAlcohol: false,
  offersFamilyMeals: false,
  hasLoyaltyProgram: false,
  acceptsOnlineOrders: false,
  offersMealPrep: false,
  handlesGroupOrders: false,
  offersEventBooking: false,
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
  handlesPoliceImpound: false,
  handlesPPITowing: false,
  offersRecovery: false,
  offersPhoneQuotes: true,
  operates24Hours: false,
  handlesHeavyDuty: false,
  worksWithInsurance: false,
  offersStorage: false,
  offersLockoutJumpstart: true,
  handlesAccidentTowing: false,
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
  hasMultipleStaff: false,
  offersPackages: false,
  collectsStylistPreference: false,
  requiresWarrantyCheck: false,
  offersFreeEstimates: false,
  chargesTripFee: false,
  offersFinancing: false,
  sendsReminders: true,
  hasMinimumCharge: false,
  offersAfterHours: false,
  acceptsDropOffs: false,
  collectsHealthInfo: false,
};

const defaultMedicalCapabilities: MedicalCapabilities = {
  hasTelehealth: false,
  hasInPersonVisits: true,
  hasNewPatientIntake: true,
  requiresInsurance: true,
  requiresHIPAA: true,
  needsSymptomTriage: false,
  requiresNewPatientForms: true,
  collectsReferralInfo: false,
  collectsMedications: false,
  hasMultipleLocations: false,
  handlesWorkersComp: false,
  acceptsWalkIns: false,
  offersSameDayAppointments: false,
  hasOnSiteLab: false,
  offersPaymentPlans: false,
  sellsRetailProducts: false,
};

const defaultGeneralCapabilities: GeneralCapabilities = {
  offersAppointments: true,
  offersCallbacks: true,
  offersMessaging: true,
  handlesFAQs: true,
  offersFreeConsultation: false,
  servesResidentialCommercial: true,
  needsAfterHoursContact: false,
  hasPhysicalOffice: true,
  providesWrittenQuotes: false,
  offersLocalDelivery: false,
};

// ============================================================================
// HOOK
// ============================================================================

export function useBusinessCapabilities(): BusinessCapabilities {
  const { tenant } = useAuth();
  const { businessMode, enabledModules, hipaaMode } = useTenantConfig();
  const { settings: foodSettings, isLoading: foodLoading } = useFoodOrderSettings();

  // Fetch additional data needed to derive capabilities
  // Only query mode-relevant tables to avoid RLS errors on unrelated tables
  const isDispatch = businessMode === "dispatch";
  const isFood = businessMode === "food";
  const isMedical = businessMode === "medical";
  const isService = businessMode === "service";
  const isSales = businessMode === "sales";
  const isGeneral = businessMode === "general";
  const hasBookingMode = isService || isMedical || isSales;

  const noCount = Promise.resolve({ data: null, error: null, count: 0 } as any);
  const noSingle = Promise.resolve({ data: null, error: null } as any);

  const { data: additionalData, isLoading: dataLoading } = useQuery({
    queryKey: ["business-capabilities", tenant?.id, businessMode],
    queryFn: async () => {
      if (!tenant?.id) return null;

      // Parallel fetch — mode-irrelevant queries use dummy results
      const [
        servicesResult,
        assistantResult,
        calendarResult,
        bookingDeliveryResult,
        dispatchDeliveryResult,
        faqsResult,
        knowledgeResult,
        fleetResult,
        // Knowledge-table counts
        priceModifiersResult,
        servicePackagesResult,
        menuItemsResult,
        cateringKnowledgeResult,
        vehicleKnowledgeResult,
        roadsideKnowledgeResult,
        symptomTriageResult,
        insuranceKnowledgeResult,
        aftercareResult,
        productKnowledgeResult,
        foodOrderSettingsResult,
      ] = await Promise.all([
        supabase
          .from("services")
          .select("id", { count: "exact", head: false })
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
        hasBookingMode
          ? supabase.from("booking_delivery_settings").select("enabled, notify_email, webhook_url").eq("tenant_id", tenant.id).single()
          : noSingle,
        isDispatch
          ? supabase.from("dispatch_delivery_settings").select("enabled, notify_email").eq("tenant_id", tenant.id).single()
          : noSingle,
        supabase
          .from("business_faqs")
          .select("id", { count: "exact", head: true })
          .eq("tenant_id", tenant.id),
        supabase
          .from("ai_knowledge_base")
          .select("id", { count: "exact", head: true })
          .eq("tenant_id", tenant.id),
        isDispatch
          ? supabase.from("fleet_vehicles").select("id", { count: "exact", head: true }).eq("tenant_id", tenant.id)
          : noCount,
        // Knowledge-table head counts
        supabase
          .from("price_modifiers")
          .select("id", { count: "exact", head: true })
          .eq("tenant_id", tenant.id),
        supabase
          .from("services")
          .select("id", { count: "exact", head: true })
          .eq("tenant_id", tenant.id)
          .eq("is_active", true),
        isFood
          ? supabase.from("menu_items").select("id", { count: "exact", head: true }).eq("tenant_id", tenant.id)
          : noCount,
        isFood
          ? supabase.from("catering_knowledge").select("id", { count: "exact", head: true }).eq("tenant_id", tenant.id)
          : noCount,
        isDispatch
          ? supabase.from("vehicle_knowledge").select("id", { count: "exact", head: true }).eq("tenant_id", tenant.id)
          : noCount,
        isDispatch
          ? supabase.from("roadside_knowledge").select("id", { count: "exact", head: true }).eq("tenant_id", tenant.id)
          : noCount,
        isMedical
          ? supabase.from("symptom_triage").select("id", { count: "exact", head: true }).eq("tenant_id", tenant.id)
          : noCount,
        isMedical
          ? supabase.from("insurance_knowledge").select("id", { count: "exact", head: true }).eq("tenant_id", tenant.id)
          : noCount,
        isService || isMedical
          ? supabase.from("aftercare_instructions").select("id", { count: "exact", head: true }).eq("tenant_id", tenant.id)
          : noCount,
        isService || isSales || isGeneral
          ? supabase.from("product_knowledge").select("id", { count: "exact", head: true }).eq("tenant_id", tenant.id)
          : noCount,
        isFood
          ? (supabase as any).from("food_order_settings").select("estimated_prep_minutes").eq("tenant_id", tenant.id).maybeSingle()
          : noSingle,
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
        // Knowledge-table counts
        priceModifiersCount: priceModifiersResult.count || 0,
        servicePackagesCount: servicePackagesResult.count || 0,
        menuItemsCount: menuItemsResult.count || 0,
        cateringKnowledgeCount: cateringKnowledgeResult.count || 0,
        vehicleKnowledgeCount: vehicleKnowledgeResult.count || 0,
        roadsideKnowledgeCount: roadsideKnowledgeResult.count || 0,
        symptomTriageCount: symptomTriageResult.count || 0,
        insuranceKnowledgeCount: insuranceKnowledgeResult.count || 0,
        aftercareCount: aftercareResult.count || 0,
        productKnowledgeCount: productKnowledgeResult.count || 0,
        hasPrepTimeConfigured: !!(foodOrderSettingsResult.data as any)?.estimated_prep_minutes,
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
    collectsDietaryRestrictions: additionalData?.scenarioFlags?.collectsDietaryRestrictions ?? false,
    offersCurbside: additionalData?.scenarioFlags?.offersCurbside ?? false,
    hasKDSIntegration: additionalData?.scenarioFlags?.hasKDSIntegration ?? false,
    servesAlcohol: additionalData?.scenarioFlags?.servesAlcohol ?? false,
    offersFamilyMeals: additionalData?.scenarioFlags?.offersFamilyMeals ?? false,
    hasLoyaltyProgram: additionalData?.scenarioFlags?.hasLoyaltyProgram ?? false,
    acceptsOnlineOrders: additionalData?.scenarioFlags?.acceptsOnlineOrders ?? false,
    offersMealPrep: additionalData?.scenarioFlags?.offersMealPrep ?? false,
    handlesGroupOrders: additionalData?.scenarioFlags?.handlesGroupOrders ?? false,
    offersEventBooking: additionalData?.scenarioFlags?.offersEventBooking ?? false,
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
    handlesPoliceImpound: additionalData?.scenarioFlags?.handlesPoliceImpound ?? false,
    handlesPPITowing: additionalData?.scenarioFlags?.handlesPPITowing ?? false,
    offersRecovery: additionalData?.scenarioFlags?.offersRecovery ?? false,
    offersPhoneQuotes: additionalData?.scenarioFlags?.offersPhoneQuotes ?? true,
    operates24Hours: additionalData?.scenarioFlags?.operates24Hours ?? false,
    handlesHeavyDuty: additionalData?.scenarioFlags?.handlesHeavyDuty ?? false,
    worksWithInsurance: additionalData?.scenarioFlags?.worksWithInsurance ?? false,
    offersStorage: additionalData?.scenarioFlags?.offersStorage ?? false,
    offersLockoutJumpstart: additionalData?.scenarioFlags?.offersLockoutJumpstart ?? true,
    handlesAccidentTowing: additionalData?.scenarioFlags?.handlesAccidentTowing ?? false,
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
    hasMultipleStaff: additionalData?.scenarioFlags?.hasMultipleStaff ?? false,
    offersPackages: additionalData?.scenarioFlags?.offersPackages ?? false,
    collectsStylistPreference: additionalData?.scenarioFlags?.collectsStylistPreference ?? false,
    requiresWarrantyCheck: additionalData?.scenarioFlags?.requiresWarrantyCheck ?? false,
    offersFreeEstimates: additionalData?.scenarioFlags?.offersFreeEstimates ?? false,
    chargesTripFee: additionalData?.scenarioFlags?.chargesTripFee ?? false,
    offersFinancing: additionalData?.scenarioFlags?.offersFinancing ?? false,
    sendsReminders: additionalData?.scenarioFlags?.sendsReminders ?? true,
    hasMinimumCharge: additionalData?.scenarioFlags?.hasMinimumCharge ?? false,
    offersAfterHours: additionalData?.scenarioFlags?.offersAfterHours ?? false,
    acceptsDropOffs: additionalData?.scenarioFlags?.acceptsDropOffs ?? false,
    collectsHealthInfo: additionalData?.scenarioFlags?.collectsHealthInfo ?? false,
  };

  const medical: MedicalCapabilities = {
    hasTelehealth: additionalData?.scenarioFlags?.hasTelehealth ?? false,
    hasInPersonVisits: additionalData?.scenarioFlags?.hasInPersonVisits ?? true,
    hasNewPatientIntake: enabledModules.includes("medical_intake"),
    requiresInsurance: additionalData?.scenarioFlags?.requiresInsurance ?? true,
    requiresHIPAA: hipaaMode,
    needsSymptomTriage: additionalData?.scenarioFlags?.needsSymptomTriage ?? false,
    requiresNewPatientForms: additionalData?.scenarioFlags?.requiresNewPatientForms ?? true,
    collectsReferralInfo: additionalData?.scenarioFlags?.collectsReferralInfo ?? false,
    collectsMedications: additionalData?.scenarioFlags?.collectsMedications ?? false,
    hasMultipleLocations: additionalData?.scenarioFlags?.hasMultipleLocations ?? false,
    handlesWorkersComp: additionalData?.scenarioFlags?.handlesWorkersComp ?? false,
    acceptsWalkIns: additionalData?.scenarioFlags?.acceptsWalkIns ?? false,
    offersSameDayAppointments: additionalData?.scenarioFlags?.offersSameDayAppointments ?? false,
    hasOnSiteLab: additionalData?.scenarioFlags?.hasOnSiteLab ?? false,
    offersPaymentPlans: additionalData?.scenarioFlags?.offersPaymentPlans ?? false,
    sellsRetailProducts: additionalData?.scenarioFlags?.sellsRetailProducts ?? false,
  };

  const general: GeneralCapabilities = {
    offersAppointments: enabledModules.includes("booking"),
    offersCallbacks: true,
    offersMessaging: enabledModules.includes("instant_text_back"),
    handlesFAQs: additionalData?.scenarioFlags?.handlesFAQs ?? true,
    offersFreeConsultation: additionalData?.scenarioFlags?.offersFreeConsultation ?? false,
    servesResidentialCommercial: additionalData?.scenarioFlags?.servesResidentialCommercial ?? true,
    needsAfterHoursContact: additionalData?.scenarioFlags?.needsAfterHoursContact ?? false,
    hasPhysicalOffice: additionalData?.scenarioFlags?.hasPhysicalOffice ?? true,
    providesWrittenQuotes: additionalData?.scenarioFlags?.providesWrittenQuotes ?? false,
    offersLocalDelivery: additionalData?.scenarioFlags?.offersLocalDelivery ?? false,
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

  const showStaffSection =
    businessMode === "service" && service.hasMultipleStaff;

  const showRecoverySection =
    businessMode === "dispatch" && dispatch.offersRecovery;

  const showPoliceImpoundSection =
    businessMode === "dispatch" && dispatch.handlesPoliceImpound && dispatch.hasImpoundLot;

  const showCurbsideSection =
    businessMode === "food" && food.offersCurbside;

  const showNewPatientFormsSection =
    businessMode === "medical" && medical.requiresNewPatientForms;

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

    // Knowledge-table flags
    hasPriceModifiers: (additionalData?.priceModifiersCount ?? 0) > 0,
    hasServicePackages: (additionalData?.servicePackagesCount ?? 0) > 0,
    hasMenuItems: (additionalData?.menuItemsCount ?? 0) > 0,
    hasCateringKnowledge: (additionalData?.cateringKnowledgeCount ?? 0) > 0,
    hasVehicleKnowledge: (additionalData?.vehicleKnowledgeCount ?? 0) > 0,
    hasRoadsideKnowledge: (additionalData?.roadsideKnowledgeCount ?? 0) > 0,
    hasSymptomTriage: (additionalData?.symptomTriageCount ?? 0) > 0,
    hasInsuranceKnowledge: (additionalData?.insuranceKnowledgeCount ?? 0) > 0,
    hasAftercare: (additionalData?.aftercareCount ?? 0) > 0,
    hasProductKnowledge: (additionalData?.productKnowledgeCount ?? 0) > 0,
    hasPrepTimeConfigured: additionalData?.hasPrepTimeConfigured ?? false,
    
    showCoverageSection,
    showCalendarSection,
    showDeliverySection,
    showImpoundSection,
    showReservationsSection,
    showCateringSection,
    showMedicalIntakeSection,
    showFleetSection,
    showStaffSection,
    showRecoverySection,
    showPoliceImpoundSection,
    showCurbsideSection,
    showNewPatientFormsSection,

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
