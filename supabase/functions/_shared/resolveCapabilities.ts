/**
 * Capability resolution for Deno edge functions.
 *
 * Mirrors the React `useCapabilities` hook logic but as a plain function
 * with no React dependency.
 *
 * Usage:
 *   import { resolveCapabilities } from "../_shared/resolveCapabilities.ts";
 *   const caps = resolveCapabilities(tenant.business_mode, tenant.enabled_modules, tenant.capabilities_json);
 */

export type BusinessMode = "service" | "dispatch" | "food" | "medical" | "general";

export interface Capabilities {
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

  isFoodBusiness: boolean;
  isDispatchBusiness: boolean;
  isMedicalBusiness: boolean;
  isSchedulingBusiness: boolean;
  isServiceBusiness: boolean;

  derivedPrimaryMode: BusinessMode;
}

const MODE_DEFAULTS: Record<BusinessMode, string[]> = {
  service: ["ai_voice", "instant_text_back", "booking"],
  dispatch: ["ai_voice", "instant_text_back", "dispatch_queue"],
  food: ["ai_voice", "instant_text_back", "food_orders", "menu_knowledge", "reservations", "catering"],
  medical: ["ai_voice", "instant_text_back", "booking", "medical_intake"],
  general: ["ai_voice", "instant_text_back"],
};

/**
 * Resolve capabilities from raw tenant data.
 *
 * @param rawMode       - tenant.business_mode (may be null)
 * @param rawModules    - tenant.enabled_modules (Json — array, string, object, or null)
 * @param rawCapsJson   - tenant.capabilities_json (Json — object, string, or null)
 */
export function resolveCapabilities(
  rawMode: string | null | undefined,
  rawModules: unknown,
  rawCapsJson: unknown,
): Capabilities {
  const businessMode: BusinessMode =
    (["service", "dispatch", "food", "medical", "general"].includes(rawMode as string)
      ? rawMode as BusinessMode
      : "service");

  // Parse enabled_modules
  let enabledModules: string[] = [];
  try {
    if (Array.isArray(rawModules)) {
      enabledModules = rawModules as string[];
    } else if (typeof rawModules === "string") {
      enabledModules = JSON.parse(rawModules);
    } else if (rawModules && typeof rawModules === "object") {
      enabledModules = Object.keys(rawModules).filter(
        (k) => (rawModules as Record<string, boolean>)[k],
      );
    }
  } catch {
    enabledModules = [];
  }

  // Parse capabilities_json
  let capabilitiesJson: Record<string, boolean> | null = null;
  try {
    if (rawCapsJson && typeof rawCapsJson === "object" && !Array.isArray(rawCapsJson)) {
      capabilitiesJson = rawCapsJson as Record<string, boolean>;
    } else if (typeof rawCapsJson === "string") {
      capabilitiesJson = JSON.parse(rawCapsJson);
    }
  } catch {
    capabilitiesJson = null;
  }

  const hasExplicitCaps = capabilitiesJson !== null && Object.keys(capabilitiesJson).length > 0;

  const modules = enabledModules.length > 0
    ? enabledModules
    : MODE_DEFAULTS[businessMode] || MODE_DEFAULTS.service;

  function cap(key: string): boolean {
    if (hasExplicitCaps && key in capabilitiesJson!) {
      return capabilitiesJson![key];
    }
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

  const isFoodBusiness = hasFoodOrders || hasMenuKnowledge || hasReservations || hasCatering;
  const isDispatchBusiness = hasDispatchQueue;
  const isMedicalBusiness = hasMedicalIntake;
  const isSchedulingBusiness = hasBooking || hasReservations;
  const isServiceBusiness = hasBooking && !isFoodBusiness && !isDispatchBusiness && !isMedicalBusiness;

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
    isFoodBusiness,
    isDispatchBusiness,
    isMedicalBusiness,
    isSchedulingBusiness,
    isServiceBusiness,
    derivedPrimaryMode,
  };
}
