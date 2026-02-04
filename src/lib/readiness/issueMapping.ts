/**
 * Readiness Issue Mapping
 *
 * Maps issue_code flags from useAIReadinessV2 to actionable fix links.
 * This ensures users are routed to the correct place to fix issues,
 * NOT to plan selection unless the issue is actually plan-gated.
 */

export type FixType = "brain" | "integration" | "plan" | "settings";

export interface ReadinessIssue {
  /** Issue code from the backend */
  code: string;
  /** Human-readable title */
  title: string;
  /** Why this matters for AI readiness */
  reason: string;
  /** Where to fix it */
  fixLink: string;
  /** Type of fix for UI styling */
  fixType: FixType;
  /** Button label */
  fixLabel: string;
  /** Priority: p0 = blocker, p1 = recommended */
  priority: "p0" | "p1";
}

/**
 * Comprehensive mapping of all readiness issue codes to fix destinations.
 * Links route to Business Brain anchors where possible.
 */
export const READINESS_ISSUE_MAP: Record<string, Omit<ReadinessIssue, "code">> = {
  // ============================================================================
  // GLOBAL ISSUES (all modes)
  // ============================================================================
  missing_business_name: {
    title: "Add your business name",
    reason: "Your AI introduces itself with your business name on every call",
    fixLink: "/app/business-brain?section=profile",
    fixType: "brain",
    fixLabel: "Add Name",
    priority: "p0",
  },
  missing_timezone: {
    title: "Set your timezone",
    reason: "Your AI needs this to schedule appointments correctly",
    fixLink: "/app/business-brain?section=profile",
    fixType: "brain",
    fixLabel: "Set Timezone",
    priority: "p0",
  },
  missing_hours: {
    title: "Set your business hours",
    reason: "Your AI can't tell callers when you're open without hours",
    fixLink: "/app/business-brain?section=hours",
    fixType: "brain",
    fixLabel: "Set Hours",
    priority: "p0",
  },
  missing_policies: {
    title: "Add payment & cancellation info",
    reason: "Callers ask about deposits, cancellations — your AI needs answers",
    fixLink: "/app/business-brain?section=policies",
    fixType: "brain",
    fixLabel: "Add Policies",
    priority: "p1",
  },
  missing_faqs: {
    title: "Add at least 5 FAQs",
    reason: "FAQs let your AI answer common questions instantly",
    fixLink: "/app/business-brain?section=knowledge",
    fixType: "brain",
    fixLabel: "Add FAQs",
    priority: "p1",
  },
  few_faqs: {
    title: "Add more FAQs (need 5+)",
    reason: "More FAQs = better answers. Aim for your top 10 questions.",
    fixLink: "/app/business-brain?section=knowledge",
    fixType: "brain",
    fixLabel: "Add FAQs",
    priority: "p1",
  },

  // ============================================================================
  // SERVICE MODE ISSUES
  // ============================================================================
  no_services: {
    title: "Add your services",
    reason: "Your AI can't recommend or quote services until you add them",
    fixLink: "/app/business-brain?section=services",
    fixType: "brain",
    fixLabel: "Add Services",
    priority: "p0",
  },
  few_services: {
    title: "Add at least 3 services",
    reason: "More services help your AI match callers to what they need",
    fixLink: "/app/business-brain?section=services",
    fixType: "brain",
    fixLabel: "Add Services",
    priority: "p1",
  },
  missing_pricing: {
    title: "Add prices to your services",
    reason: "Your AI can't quote prices without this info",
    fixLink: "/app/business-brain?section=services",
    fixType: "brain",
    fixLabel: "Set Pricing",
    priority: "p0",
  },
  missing_booking_mode: {
    title: "Set how bookings work",
    reason: "Tell your AI whether to book directly or send a link",
    fixLink: "/app/business-brain?section=policies",
    fixType: "brain",
    fixLabel: "Configure",
    priority: "p1",
  },
  missing_name_intake: {
    title: "Require customer name",
    reason: "Your AI needs to collect the caller's name for bookings",
    fixLink: "/app/business-brain?section=policies#required-questions",
    fixType: "brain",
    fixLabel: "Add Field",
    priority: "p0",
  },
  missing_phone_intake: {
    title: "Require phone number",
    reason: "Your AI needs a callback number to confirm bookings",
    fixLink: "/app/business-brain?section=policies#required-questions",
    fixType: "brain",
    fixLabel: "Add Field",
    priority: "p0",
  },
  missing_service_area: {
    title: "Define where you serve",
    reason: "Your AI needs to know your service area to decline out-of-area jobs",
    fixLink: "/app/business-brain?section=service-area",
    fixType: "brain",
    fixLabel: "Set Area",
    priority: "p1",
  },

  // ============================================================================
  // FOOD MODE ISSUES
  // ============================================================================
  no_menu_items: {
    title: "Add your menu",
    reason: "Your AI can't take orders without menu items",
    fixLink: "/app/business-brain?section=services",
    fixType: "brain",
    fixLabel: "Add Menu",
    priority: "p0",
  },
  few_menu_items: {
    title: "Add more menu items (need 10+)",
    reason: "A complete menu helps your AI take orders smoothly",
    fixLink: "/app/business-brain?section=services",
    fixType: "brain",
    fixLabel: "Add Items",
    priority: "p1",
  },
  ordering_disabled: {
    title: "Turn on ordering",
    reason: "Enable ordering so your AI can accept food orders",
    fixLink: "/app/business-brain?section=policies",
    fixType: "brain",
    fixLabel: "Enable",
    priority: "p0",
  },
  ordering_not_configured: {
    title: "Finish ordering setup",
    reason: "Set up pickup, delivery, and payment options",
    fixLink: "/app/business-brain?section=policies",
    fixType: "brain",
    fixLabel: "Configure",
    priority: "p0",
  },
  missing_menu_prices: {
    title: "Add prices to menu items",
    reason: "Your AI can't process orders without prices",
    fixLink: "/app/business-brain?section=services",
    fixType: "brain",
    fixLabel: "Set Prices",
    priority: "p0",
  },

  // ============================================================================
  // DISPATCH MODE ISSUES
  // ============================================================================
  missing_pickup_intake: {
    title: "Require pickup address",
    reason: "Your AI needs to collect pickup location for dispatch",
    fixLink: "/app/business-brain?section=policies#required-questions",
    fixType: "brain",
    fixLabel: "Add Field",
    priority: "p0",
  },
  missing_vehicle_intake: {
    title: "Ask for vehicle type",
    reason: "Vehicle info helps dispatch the right equipment",
    fixLink: "/app/business-brain?section=policies#required-questions",
    fixType: "brain",
    fixLabel: "Add Field",
    priority: "p1",
  },
  missing_urgency_intake: {
    title: "Ask about urgency",
    reason: "Urgency helps prioritize dispatch queue",
    fixLink: "/app/business-brain?section=policies#required-questions",
    fixType: "brain",
    fixLabel: "Add Field",
    priority: "p1",
  },
  no_dispatch_services: {
    title: "Add your dispatch services",
    reason: "Your AI can't quote jobs without dispatch services defined",
    fixLink: "/app/business-brain?section=services",
    fixType: "brain",
    fixLabel: "Add Services",
    priority: "p0",
  },

  // ============================================================================
  // MEDICAL MODE ISSUES
  // ============================================================================
  hipaa_disabled: {
    title: "Enable HIPAA mode",
    reason: "Medical practices require HIPAA-compliant call handling",
    fixLink: "/app/business-brain?section=policies",
    fixType: "brain",
    fixLabel: "Enable HIPAA",
    priority: "p0",
  },
  missing_data_retention: {
    title: "Set data retention rules",
    reason: "HIPAA requires defined data retention policies",
    fixLink: "/app/business-brain?section=policies",
    fixType: "brain",
    fixLabel: "Configure",
    priority: "p0",
  },
  hipaa_storage_warning: {
    title: "Review HIPAA storage",
    reason: "Make sure PHI storage meets compliance requirements",
    fixLink: "/app/business-brain?section=policies",
    fixType: "brain",
    fixLabel: "Review",
    priority: "p1",
  },
  no_medical_services: {
    title: "Add appointment types",
    reason: "Your AI needs to know what appointments you offer",
    fixLink: "/app/business-brain?section=services",
    fixType: "brain",
    fixLabel: "Add Types",
    priority: "p0",
  },

  // ============================================================================
  // INTEGRATION ISSUES
  // ============================================================================
  phone_not_connected: {
    title: "Connect your phone",
    reason: "Your AI needs a phone number to receive calls",
    fixLink: "/app/integrations",
    fixType: "integration",
    fixLabel: "Connect Phone",
    priority: "p0",
  },
  calendar_not_connected: {
    title: "Connect your calendar",
    reason: "Calendar sync prevents double-booking",
    fixLink: "/app/integrations/schedule",
    fixType: "integration",
    fixLabel: "Connect Calendar",
    priority: "p1",
  },
  webhook_not_configured: {
    title: "Set up booking delivery",
    reason: "Tell us where to send booking data",
    fixLink: "/app/integrations",
    fixType: "integration",
    fixLabel: "Configure",
    priority: "p1",
  },
  test_call_not_completed: {
    title: "Make a test call",
    reason: "Try your AI before going live",
    fixLink: "/app/simulator",
    fixType: "integration",
    fixLabel: "Test AI",
    priority: "p1",
  },

  // ============================================================================
  // PLAN-GATED ISSUES (only these should show plan upgrade)
  // ============================================================================
  voice_feature_locked: {
    title: "Voice calls require upgrade",
    reason: "Your current plan doesn't include voice AI features",
    fixLink: "/app/go-live",
    fixType: "plan",
    fixLabel: "View Plans",
    priority: "p0",
  },
  sms_feature_locked: {
    title: "SMS requires upgrade",
    reason: "Your current plan doesn't include SMS features",
    fixLink: "/app/go-live",
    fixType: "plan",
    fixLabel: "View Plans",
    priority: "p0",
  },
  usage_limit_reached: {
    title: "Usage limit reached",
    reason: "You've reached your plan's usage limit",
    fixLink: "/app/usage",
    fixType: "plan",
    fixLabel: "View Usage",
    priority: "p0",
  },
};
/**
 * Get the full issue details for a given code
 */
export function getIssueDetails(code: string): ReadinessIssue {
  const mapping = READINESS_ISSUE_MAP[code];
  if (mapping) {
    return { code, ...mapping };
  }

  // Fallback for unknown codes - route to Business Brain with generic section
  return {
    code,
    title: formatUnknownCode(code),
    reason: "This item needs attention before going live",
    fixLink: "/app/business-brain?section=profile",
    fixType: "brain",
    fixLabel: "Fix",
    priority: "p1",
  };
}

/**
 * Format an unknown code into a readable title
 */
function formatUnknownCode(code: string): string {
  return code
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Get all issues with their details from a list of codes
 */
export function getIssuesFromCodes(codes: string[]): ReadinessIssue[] {
  return codes.map(getIssueDetails);
}

/**
 * Check if an issue requires plan upgrade (vs setup fix)
 */
export function isPlanGatedIssue(code: string): boolean {
  const mapping = READINESS_ISSUE_MAP[code];
  return mapping?.fixType === "plan";
}

/**
 * Get icon name for fix type
 */
export function getFixTypeIcon(fixType: FixType): string {
  switch (fixType) {
    case "brain":
      return "Brain";
    case "integration":
      return "Link2";
    case "plan":
      return "CreditCard";
    case "settings":
      return "Settings";
    default:
      return "Wrench";
  }
}
