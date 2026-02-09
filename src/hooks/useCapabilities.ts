import { useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import type { BusinessMode } from "./useTenantConfig";

/**
 * Capability flags derived from `capabilities_json` on the tenant,
 * falling back to `enabled_modules` + `business_mode` defaults.
 */
export interface Capabilities {
  // ── Individual module flags ──
  hasAiVoice: boolean;
  hasInstantTextBack: boolean;
  hasBooking: boolean;
  hasDispatchQueue: boolean;
  hasImpoundLot: boolean;
  hasFleetManagement: boolean;
  hasFoodOrders: boolean;
  hasMenuKnowledge: boolean;
  hasReservations: boolean;
  hasCatering: boolean;
  hasMedicalIntake: boolean;
  hasEstimates: boolean;
  hasReviewRequests: boolean;
  hasLeadFollowUp: boolean;
  hasPricingRules: boolean;
  hasEtaTracking: boolean;
  hasCalendarSync: boolean;
  hasPaymentProcessing: boolean;
  hasAfterHoursHandling: boolean;
  hasSmsCampaigns: boolean;
  hasKnowledgeBase: boolean;
  // ── New module flags ──
  hasStaffScheduling: boolean;
  hasPackages: boolean;
  hasPoliceImpound: boolean;
  hasPPITowing: boolean;
  hasRecoveryServices: boolean;
  hasPhoneQuotes: boolean;
  hasDietaryIntake: boolean;
  hasCurbside: boolean;
  hasKDSIntegration: boolean;
  hasNewPatientForms: boolean;
  hasReferrals: boolean;
  hasMedicationsIntake: boolean;

  // ── Computed helpers (convenience) ──
  isFoodBusiness: boolean;
  isDispatchBusiness: boolean;
  isMedicalBusiness: boolean;
  isSchedulingBusiness: boolean;
  isServiceBusiness: boolean;

  // ── Derived primary mode (for agent routing / terminology) ──
  derivedPrimaryMode: BusinessMode;
}

/** Module keys that map 1:1 to capability flags */
const MODULE_TO_CAP: Record<string, keyof Capabilities> = {
  ai_voice: "hasAiVoice",
  instant_text_back: "hasInstantTextBack",
  booking: "hasBooking",
  dispatch_queue: "hasDispatchQueue",
  impound_lot: "hasImpoundLot",
  fleet_management: "hasFleetManagement",
  food_orders: "hasFoodOrders",
  menu_knowledge: "hasMenuKnowledge",
  reservations: "hasReservations",
  catering: "hasCatering",
  medical_intake: "hasMedicalIntake",
  estimates: "hasEstimates",
  review_requests: "hasReviewRequests",
  lead_follow_up: "hasLeadFollowUp",
  pricing_rules: "hasPricingRules",
  eta_tracking: "hasEtaTracking",
  calendar_sync: "hasCalendarSync",
  payment_processing: "hasPaymentProcessing",
  after_hours_handling: "hasAfterHoursHandling",
  sms_campaigns: "hasSmsCampaigns",
  knowledge_base: "hasKnowledgeBase",
  staff_scheduling: "hasStaffScheduling",
  packages: "hasPackages",
  police_impound: "hasPoliceImpound",
  ppi_towing: "hasPPITowing",
  recovery_services: "hasRecoveryServices",
  phone_quotes: "hasPhoneQuotes",
  dietary_intake: "hasDietaryIntake",
  curbside: "hasCurbside",
  kds_integration: "hasKDSIntegration",
  new_patient_forms: "hasNewPatientForms",
  referrals: "hasReferrals",
  medications_intake: "hasMedicationsIntake",
};

/** Default modules per business mode (mirrors useTenantConfig defaults) */
const MODE_DEFAULTS: Record<BusinessMode, string[]> = {
  service: ["ai_voice", "instant_text_back", "booking"],
  dispatch: ["ai_voice", "instant_text_back", "dispatch_queue"],
  food: ["ai_voice", "instant_text_back", "food_orders", "menu_knowledge", "reservations", "catering"],
  medical: ["ai_voice", "instant_text_back", "booking", "medical_intake"],
  general: ["ai_voice", "instant_text_back"],
};

/**
 * Core resolution logic shared between React hook and edge function helper.
 * Takes raw tenant data and returns resolved Capabilities.
 */
export function resolveCapabilitiesFromTenant(
  businessMode: BusinessMode,
  enabledModules: string[],
  capabilitiesJson: Record<string, boolean> | null | undefined,
): Capabilities {
  // Build the base boolean flags.
  // Priority: capabilities_json → enabled_modules → mode defaults
  const hasExplicitCaps = capabilitiesJson && Object.keys(capabilitiesJson).length > 0;

  const modules = enabledModules.length > 0
    ? enabledModules
    : MODE_DEFAULTS[businessMode] || MODE_DEFAULTS.service;

  // Helper: resolve a single capability flag
  function cap(key: string): boolean {
    // Explicit capability takes priority
    if (hasExplicitCaps && key in capabilitiesJson!) {
      return capabilitiesJson![key];
    }
    // Fall back to module list
    return modules.includes(key);
  }

  const hasAiVoice = cap("ai_voice");
  const hasInstantTextBack = cap("instant_text_back");
  const hasBooking = cap("booking");
  const hasDispatchQueue = cap("dispatch_queue");
  const hasImpoundLot = cap("impound_lot");
  const hasFleetManagement = cap("fleet_management");
  const hasFoodOrders = cap("food_orders");
  const hasMenuKnowledge = cap("menu_knowledge");
  const hasReservations = cap("reservations");
  const hasCatering = cap("catering");
  const hasMedicalIntake = cap("medical_intake");
  const hasEstimates = cap("estimates");
  const hasReviewRequests = cap("review_requests");
  const hasLeadFollowUp = cap("lead_follow_up");
  const hasPricingRules = cap("pricing_rules");
  const hasEtaTracking = cap("eta_tracking");
  const hasCalendarSync = cap("calendar_sync");
  const hasPaymentProcessing = cap("payment_processing");
  const hasAfterHoursHandling = cap("after_hours_handling");
  const hasSmsCampaigns = cap("sms_campaigns");
  const hasKnowledgeBase = cap("knowledge_base");
  const hasStaffScheduling = cap("staff_scheduling");
  const hasPackages = cap("packages");
  const hasPoliceImpound = cap("police_impound");
  const hasPPITowing = cap("ppi_towing");
  const hasRecoveryServices = cap("recovery_services");
  const hasPhoneQuotes = cap("phone_quotes");
  const hasDietaryIntake = cap("dietary_intake");
  const hasCurbside = cap("curbside");
  const hasKDSIntegration = cap("kds_integration");
  const hasNewPatientForms = cap("new_patient_forms");
  const hasReferrals = cap("referrals");
  const hasMedicationsIntake = cap("medications_intake");

  // Computed helpers
  const isFoodBusiness = hasFoodOrders || hasMenuKnowledge || hasReservations || hasCatering;
  const isDispatchBusiness = hasDispatchQueue;
  const isMedicalBusiness = hasMedicalIntake;
  const isSchedulingBusiness = hasBooking || hasReservations;
  const isServiceBusiness = hasBooking && !isFoodBusiness && !isDispatchBusiness && !isMedicalBusiness;

  // Derived primary mode — for agent routing and terminology.
  // Uses explicit business_mode when no capabilities_json override exists,
  // otherwise infers from capabilities.
  let derivedPrimaryMode: BusinessMode = businessMode;
  if (hasExplicitCaps) {
    if (isMedicalBusiness) derivedPrimaryMode = "medical";
    else if (isDispatchBusiness) derivedPrimaryMode = "dispatch";
    else if (isFoodBusiness) derivedPrimaryMode = "food";
    else if (isServiceBusiness) derivedPrimaryMode = "service";
    else derivedPrimaryMode = "general";
  }

  return {
    hasAiVoice,
    hasInstantTextBack,
    hasBooking,
    hasDispatchQueue,
    hasImpoundLot,
    hasFleetManagement,
    hasFoodOrders,
    hasMenuKnowledge,
    hasReservations,
    hasCatering,
    hasMedicalIntake,
    hasEstimates,
    hasReviewRequests,
    hasLeadFollowUp,
    hasPricingRules,
    hasEtaTracking,
    hasCalendarSync,
    hasPaymentProcessing,
    hasAfterHoursHandling,
    hasSmsCampaigns,
    hasKnowledgeBase,
    hasStaffScheduling,
    hasPackages,
    hasPoliceImpound,
    hasPPITowing,
    hasRecoveryServices,
    hasPhoneQuotes,
    hasDietaryIntake,
    hasCurbside,
    hasKDSIntegration,
    hasNewPatientForms,
    hasReferrals,
    hasMedicationsIntake,
    isFoodBusiness,
    isDispatchBusiness,
    isMedicalBusiness,
    isSchedulingBusiness,
    isServiceBusiness,
    derivedPrimaryMode,
  };
}

/** Map from capability flag name to the module ID for enabledModules compat */
export { MODULE_TO_CAP };

/**
 * React hook that resolves the current tenant's capabilities.
 *
 * Reads `capabilities_json` (cast from Supabase Json) with automatic
 * fallback to `enabled_modules` + `business_mode` defaults.
 */
export function useCapabilities(): Capabilities {
  const { tenant } = useAuth();

  return useMemo(() => {
    if (!tenant) {
      return resolveCapabilitiesFromTenant("service", [], null);
    }

    const businessMode = (tenant.business_mode as BusinessMode) || "service";

    // Parse enabled_modules
    let enabledModules: string[] = [];
    try {
      const modules = tenant.enabled_modules;
      if (Array.isArray(modules)) {
        // Filter to only strings to satisfy TypeScript (Json[] can contain non-strings)
        enabledModules = modules.filter((m): m is string => typeof m === "string");
      } else if (typeof modules === "string") {
        enabledModules = JSON.parse(modules);
      } else if (modules && typeof modules === "object") {
        enabledModules = Object.keys(modules).filter(k => (modules as Record<string, boolean>)[k]);
      }
    } catch {
      enabledModules = [];
    }

    // Parse capabilities_json — column may not exist yet (pre-migration)
    let capabilitiesJson: Record<string, boolean> | null = null;
    try {
      const raw = (tenant as Record<string, unknown>).capabilities_json;
      if (raw && typeof raw === "object" && !Array.isArray(raw)) {
        capabilitiesJson = raw as Record<string, boolean>;
      } else if (typeof raw === "string") {
        capabilitiesJson = JSON.parse(raw);
      }
    } catch {
      capabilitiesJson = null;
    }

    return resolveCapabilitiesFromTenant(businessMode, enabledModules, capabilitiesJson);
  }, [tenant]);
}
