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
    title: "Missing business name",
    reason: "AI needs to know your business name to introduce itself properly",
    fixLink: "/app/business-brain#profile",
    fixType: "brain",
    fixLabel: "Add Name",
    priority: "p0",
  },
  missing_timezone: {
    title: "Missing timezone",
    reason: "AI needs timezone to communicate accurate scheduling",
    fixLink: "/app/business-brain#profile",
    fixType: "brain",
    fixLabel: "Set Timezone",
    priority: "p0",
  },
  missing_hours: {
    title: "Business hours not configured",
    reason: "AI needs to know when you're open to schedule correctly",
    fixLink: "/app/business-brain#scheduling",
    fixType: "brain",
    fixLabel: "Set Hours",
    priority: "p0",
  },
  missing_policies: {
    title: "No business policies",
    reason: "AI needs policies to answer questions about cancellation, deposits, etc.",
    fixLink: "/app/business-brain#policies",
    fixType: "brain",
    fixLabel: "Add Policies",
    priority: "p1",
  },
  missing_faqs: {
    title: "Need at least 5 FAQs",
    reason: "FAQs help AI answer common questions accurately",
    fixLink: "/app/business-brain#faqs",
    fixType: "brain",
    fixLabel: "Add FAQs",
    priority: "p1",
  },
  few_faqs: {
    title: "Need more FAQs (5+)",
    reason: "More FAQs improve AI's ability to answer customer questions",
    fixLink: "/app/business-brain#faqs",
    fixType: "brain",
    fixLabel: "Add FAQs",
    priority: "p1",
  },

  // ============================================================================
  // SERVICE MODE ISSUES
  // ============================================================================
  no_services: {
    title: "No services added",
    reason: "AI needs to know what services you offer to help customers",
    fixLink: "/app/business-brain#services",
    fixType: "brain",
    fixLabel: "Add Services",
    priority: "p0",
  },
  few_services: {
    title: "Need at least 3 services",
    reason: "Add more services for AI to recommend to customers",
    fixLink: "/app/business-brain#services",
    fixType: "brain",
    fixLabel: "Add Services",
    priority: "p1",
  },
  missing_pricing: {
    title: "Services missing pricing",
    reason: "AI cannot quote prices without pricing information",
    fixLink: "/app/business-brain#services",
    fixType: "brain",
    fixLabel: "Set Pricing",
    priority: "p0",
  },
  missing_booking_mode: {
    title: "Booking mode not configured",
    reason: "Configure how AI should handle booking requests",
    fixLink: "/app/business-brain#policies",
    fixType: "brain",
    fixLabel: "Configure",
    priority: "p1",
  },
  missing_name_intake: {
    title: "Intake missing customer name",
    reason: "AI needs to collect customer name for bookings",
    fixLink: "/app/business-brain#policies",
    fixType: "brain",
    fixLabel: "Add Field",
    priority: "p0",
  },
  missing_phone_intake: {
    title: "Intake missing phone number",
    reason: "AI needs customer phone for follow-up and booking confirmation",
    fixLink: "/app/business-brain#policies",
    fixType: "brain",
    fixLabel: "Add Field",
    priority: "p0",
  },
  missing_service_area: {
    title: "Service area not defined",
    reason: "AI needs to know your service area to filter out-of-area requests",
    fixLink: "/app/business-brain#service-area",
    fixType: "brain",
    fixLabel: "Set Area",
    priority: "p1",
  },

  // ============================================================================
  // FOOD MODE ISSUES
  // ============================================================================
  no_menu_items: {
    title: "No menu items added",
    reason: "AI needs your menu to take orders",
    fixLink: "/app/business-brain#services",
    fixType: "brain",
    fixLabel: "Add Menu",
    priority: "p0",
  },
  few_menu_items: {
    title: "Need at least 10 menu items",
    reason: "Add more items for a complete menu experience",
    fixLink: "/app/business-brain#services",
    fixType: "brain",
    fixLabel: "Add Items",
    priority: "p1",
  },
  ordering_disabled: {
    title: "Ordering not enabled",
    reason: "Enable ordering for AI to take food orders",
    fixLink: "/app/business-brain#policies",
    fixType: "brain",
    fixLabel: "Enable",
    priority: "p0",
  },
  ordering_not_configured: {
    title: "Ordering settings incomplete",
    reason: "Configure pickup, delivery, and payment options",
    fixLink: "/app/business-brain#policies",
    fixType: "brain",
    fixLabel: "Configure",
    priority: "p0",
  },
  missing_menu_prices: {
    title: "Menu items missing prices",
    reason: "AI cannot process orders without prices",
    fixLink: "/app/business-brain#services",
    fixType: "brain",
    fixLabel: "Set Prices",
    priority: "p0",
  },

  // ============================================================================
  // DISPATCH MODE ISSUES
  // ============================================================================
  missing_pickup_intake: {
    title: "Intake missing pickup address",
    reason: "AI needs pickup location for dispatch jobs",
    fixLink: "/app/business-brain#policies",
    fixType: "brain",
    fixLabel: "Add Field",
    priority: "p0",
  },
  missing_vehicle_intake: {
    title: "Intake missing vehicle type",
    reason: "AI needs vehicle info for accurate dispatch",
    fixLink: "/app/business-brain#policies",
    fixType: "brain",
    fixLabel: "Add Field",
    priority: "p1",
  },
  missing_urgency_intake: {
    title: "Intake missing urgency/priority",
    reason: "AI needs to assess job urgency for dispatch prioritization",
    fixLink: "/app/business-brain#policies",
    fixType: "brain",
    fixLabel: "Add Field",
    priority: "p1",
  },
  no_dispatch_services: {
    title: "No dispatch services defined",
    reason: "AI needs to know what dispatch services you offer",
    fixLink: "/app/business-brain#services",
    fixType: "brain",
    fixLabel: "Add Services",
    priority: "p0",
  },

  // ============================================================================
  // MEDICAL MODE ISSUES
  // ============================================================================
  hipaa_disabled: {
    title: "HIPAA compliance mode disabled",
    reason: "Medical practices require HIPAA-compliant call handling",
    fixLink: "/app/business-brain#policies",
    fixType: "brain",
    fixLabel: "Enable HIPAA",
    priority: "p0",
  },
  missing_data_retention: {
    title: "Data retention not configured",
    reason: "HIPAA requires defined data retention policies",
    fixLink: "/app/business-brain#policies",
    fixType: "brain",
    fixLabel: "Configure",
    priority: "p0",
  },
  hipaa_storage_warning: {
    title: "Review HIPAA storage settings",
    reason: "Ensure PHI storage meets compliance requirements",
    fixLink: "/app/business-brain#policies",
    fixType: "brain",
    fixLabel: "Review",
    priority: "p1",
  },
  no_medical_services: {
    title: "No appointment types added",
    reason: "AI needs to know what appointment types you offer",
    fixLink: "/app/business-brain#services",
    fixType: "brain",
    fixLabel: "Add Types",
    priority: "p0",
  },

  // ============================================================================
  // INTEGRATION ISSUES
  // ============================================================================
  phone_not_connected: {
    title: "Phone not connected",
    reason: "AI needs a phone number to receive calls",
    fixLink: "/app/integrations",
    fixType: "integration",
    fixLabel: "Connect Phone",
    priority: "p0",
  },
  calendar_not_connected: {
    title: "Calendar not connected",
    reason: "Connect calendar for automatic availability and booking sync",
    fixLink: "/app/integrations/schedule",
    fixType: "integration",
    fixLabel: "Connect Calendar",
    priority: "p1",
  },
  webhook_not_configured: {
    title: "Delivery webhook not configured",
    reason: "Configure where booking data should be sent",
    fixLink: "/app/integrations",
    fixType: "integration",
    fixLabel: "Configure",
    priority: "p1",
  },
  test_call_not_completed: {
    title: "Test call not completed",
    reason: "Complete a test call to verify AI is working correctly",
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

  // Fallback for unknown codes - route to Business Brain
  return {
    code,
    title: formatUnknownCode(code),
    reason: "This item needs attention before going live",
    fixLink: "/app/business-brain",
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
