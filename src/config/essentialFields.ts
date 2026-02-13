/**
 * Essential Fields Registry
 * 
 * Defines which fields/sections are Required, Recommended, or Optional
 * for each business mode. This powers:
 * - "Required for AI" badges in the UI
 * - Completion percentage calculation
 * - Go-Live gating logic
 * 
 * IMPORTANT: This does NOT change any AI logic. The AI will work with
 * whatever data exists. This registry just helps business owners
 * understand what they should configure for best results.
 */

import type { BusinessMode } from "@/hooks/useTenantConfig";

// ============================================================================
// TYPES
// ============================================================================

export type FieldPriority = "required" | "recommended" | "optional";

export interface FieldDefinition {
  id: string;
  label: string;
  priority: FieldPriority;
  description: string;
  aiImpact: string; // What happens if not configured
  section: string; // Which Business Brain tab/section
  checkFn?: string; // Name of check function (for dynamic validation)
}

export interface ModeFieldRegistry {
  mode: BusinessMode;
  displayName: string;
  fields: FieldDefinition[];
}

// ============================================================================
// SHARED FIELDS (All Modes)
// ============================================================================

const SHARED_REQUIRED_FIELDS: FieldDefinition[] = [
  {
    id: "business_name",
    label: "Business Name",
    priority: "required",
    description: "Your business name as it should be spoken by the AI",
    aiImpact: "AI will say 'Thank you for calling' without identifying your business",
    section: "profile",
  },
  {
    id: "hours",
    label: "Operating Hours",
    priority: "required",
    description: "When your business is open",
    aiImpact: "AI cannot tell callers when you're open or schedule appointments",
    section: "hours",
  },
  {
    id: "services",
    label: "Services/Menu Items",
    priority: "required",
    description: "What you offer and pricing",
    aiImpact: "AI cannot describe what you offer or quote prices",
    section: "services",
  },
];

const SHARED_RECOMMENDED_FIELDS: FieldDefinition[] = [
  {
    id: "greeting_script",
    label: "Custom Greeting",
    priority: "recommended",
    description: "How the AI should answer calls",
    aiImpact: "AI will use a generic greeting",
    section: "ai-behavior",
  },
  {
    id: "address",
    label: "Business Address",
    priority: "recommended",
    description: "Your physical location",
    aiImpact: "AI cannot give directions or calculate distances",
    section: "profile",
  },
  {
    id: "cancellation_policy",
    label: "Cancellation Policy",
    priority: "recommended",
    description: "Rules for cancellations and no-shows",
    aiImpact: "AI will say 'please contact us for our policy'",
    section: "policies",
  },
  {
    id: "faqs",
    label: "FAQs",
    priority: "recommended",
    description: "Common questions and answers",
    aiImpact: "AI may not answer common questions correctly",
    section: "knowledge",
  },
];

const SHARED_OPTIONAL_FIELDS: FieldDefinition[] = [
  {
    id: "tagline",
    label: "Business Tagline",
    priority: "optional",
    description: "A short phrase describing your business",
    aiImpact: "AI won't mention your unique value proposition",
    section: "profile",
  },
  {
    id: "ai_guidelines",
    label: "AI Guidelines",
    priority: "optional",
    description: "Custom rules for AI behavior",
    aiImpact: "AI uses default behavior",
    section: "ai-behavior",
  },
  {
    id: "objection_responses",
    label: "Objection Handling",
    priority: "optional",
    description: "How to respond to common objections",
    aiImpact: "AI uses generic responses to pushback",
    section: "knowledge",
  },
];

// ============================================================================
// FOOD MODE FIELDS
// ============================================================================

const FOOD_REQUIRED_FIELDS: FieldDefinition[] = [
  {
    id: "service_types",
    label: "Service Types",
    priority: "required",
    description: "What you offer: Pickup, Delivery, Dine-in, Catering",
    aiImpact: "AI doesn't know what ordering options are available",
    section: "services",
  },
];

const FOOD_RECOMMENDED_FIELDS: FieldDefinition[] = [
  {
    id: "prep_time",
    label: "Prep Time Estimate",
    priority: "recommended",
    description: "How long orders typically take",
    aiImpact: "AI cannot give accurate wait time estimates",
    section: "policies",
  },
  {
    id: "delivery_zones",
    label: "Delivery Zones",
    priority: "recommended",
    description: "Where you deliver and delivery fees",
    aiImpact: "AI cannot confirm if delivery is available to an address",
    section: "coverage",
    checkFn: "checkDeliveryEnabled",
  },
  {
    id: "catering_settings",
    label: "Catering Settings",
    priority: "recommended",
    description: "Lead time, minimums, and deposit requirements",
    aiImpact: "AI cannot properly handle catering inquiries",
    section: "policies",
    checkFn: "checkCateringEnabled",
  },
  {
    id: "reservation_settings",
    label: "Reservation Settings",
    priority: "recommended",
    description: "Party size limits and reservation policies",
    aiImpact: "AI cannot book tables correctly",
    section: "calendar",
    checkFn: "checkReservationsEnabled",
  },
];

const FOOD_OPTIONAL_FIELDS: FieldDefinition[] = [
  {
    id: "daily_specials",
    label: "Daily Specials",
    priority: "optional",
    description: "Rotating menu items or deals",
    aiImpact: "AI won't mention special offers",
    section: "services",
  },
  {
    id: "allergy_info",
    label: "Allergy Information",
    priority: "optional",
    description: "Common allergen warnings",
    aiImpact: "AI cannot advise on food allergies",
    section: "policies",
  },
];

// ============================================================================
// DISPATCH MODE FIELDS
// ============================================================================

const DISPATCH_REQUIRED_FIELDS: FieldDefinition[] = [
  {
    id: "service_area",
    label: "Service Area",
    priority: "required",
    description: "Where you provide service",
    aiImpact: "AI cannot confirm if a location is serviceable",
    section: "coverage",
  },
  {
    id: "vehicle_types",
    label: "Vehicle Types Serviced",
    priority: "required",
    description: "What vehicles you can tow/service",
    aiImpact: "AI cannot match jobs to appropriate equipment",
    section: "services",
  },
];

const DISPATCH_RECOMMENDED_FIELDS: FieldDefinition[] = [
  {
    id: "distance_pricing",
    label: "Distance Pricing",
    priority: "recommended",
    description: "How you charge based on distance",
    aiImpact: "AI cannot quote accurate prices",
    section: "services",
  },
  {
    id: "eta_settings",
    label: "ETA Settings",
    priority: "recommended",
    description: "Base ETA and traffic adjustments",
    aiImpact: "AI gives generic 'we'll be there soon' responses",
    section: "coverage",
  },
  {
    id: "after_hours_pricing",
    label: "After-Hours Pricing",
    priority: "recommended",
    description: "Night/weekend rate adjustments",
    aiImpact: "AI cannot accurately quote for off-hours calls",
    section: "services",
  },
  {
    id: "impound_settings",
    label: "Impound Lot Settings",
    priority: "recommended",
    description: "Storage rates and release requirements",
    aiImpact: "AI cannot handle impound inquiries",
    section: "policies",
    checkFn: "checkImpoundEnabled",
  },
];

const DISPATCH_OPTIONAL_FIELDS: FieldDefinition[] = [
  {
    id: "motor_club_rates",
    label: "Motor Club Rates",
    priority: "optional",
    description: "AAA and other club pricing",
    aiImpact: "AI uses standard pricing for club calls",
    section: "services",
  },
  {
    id: "fleet_vehicles",
    label: "Fleet Vehicles",
    priority: "optional",
    description: "Your tow trucks and equipment",
    aiImpact: "AI cannot reference specific equipment",
    section: "coverage",
  },
];

// ============================================================================
// SERVICE MODE FIELDS
// ============================================================================

const SERVICE_REQUIRED_FIELDS: FieldDefinition[] = [
  {
    id: "service_location",
    label: "Service Location Type",
    priority: "required",
    description: "Shop-based, mobile, or both",
    aiImpact: "AI doesn't know if you come to customers",
    section: "coverage",
  },
];

const SERVICE_RECOMMENDED_FIELDS: FieldDefinition[] = [
  {
    id: "ai_behavior_mode",
    label: "AI Behavior Mode",
    priority: "recommended",
    description: "What your AI does on calls — take messages, book, or full service",
    aiImpact: "AI uses default behavior mode which may not match your business needs",
    section: "ai-behavior",
  },
  {
    id: "service_default_flow",
    label: "Service Call Flow",
    priority: "recommended",
    description: "Whether your AI leads with scheduling or urgency check",
    aiImpact: "AI uses default call flow which may not optimize for your conversion style",
    section: "ai-behavior",
  },
  {
    id: "calendar_connection",
    label: "Calendar Connection",
    priority: "recommended",
    description: "Sync with Google/Outlook for real-time availability",
    aiImpact: "AI may offer times that conflict with your schedule",
    section: "calendar",
  },
  {
    id: "service_area",
    label: "Service Area",
    priority: "recommended",
    description: "Where you provide mobile service",
    aiImpact: "AI cannot confirm if you serve a location",
    section: "coverage",
    checkFn: "checkMobileServiceEnabled",
  },
  {
    id: "deposit_settings",
    label: "Deposit Requirements",
    priority: "recommended",
    description: "If/when deposits are required",
    aiImpact: "AI doesn't mention deposits until too late",
    section: "policies",
  },
  {
    id: "appointment_buffer",
    label: "Appointment Buffer",
    priority: "recommended",
    description: "Time between appointments",
    aiImpact: "AI may book back-to-back without travel time",
    section: "calendar",
  },
];

const SERVICE_OPTIONAL_FIELDS: FieldDefinition[] = [
  {
    id: "service_packages",
    label: "Service Packages",
    priority: "optional",
    description: "Bundled services at discounted rates",
    aiImpact: "AI won't suggest package deals",
    section: "services",
  },
  {
    id: "aftercare_instructions",
    label: "Aftercare Instructions",
    priority: "optional",
    description: "Post-service care guidance",
    aiImpact: "AI won't provide aftercare info",
    section: "knowledge",
  },
];

// ============================================================================
// MEDICAL MODE FIELDS
// ============================================================================

const MEDICAL_REQUIRED_FIELDS: FieldDefinition[] = [
  {
    id: "hipaa_acknowledgment",
    label: "HIPAA Configuration",
    priority: "required",
    description: "PHI handling and recording settings",
    aiImpact: "AI may inadvertently collect/store PHI",
    section: "policies",
  },
  {
    id: "appointment_types",
    label: "Appointment Types",
    priority: "required",
    description: "New patient, follow-up, etc.",
    aiImpact: "AI cannot correctly categorize appointments",
    section: "services",
  },
];

const MEDICAL_RECOMMENDED_FIELDS: FieldDefinition[] = [
  {
    id: "insurance_carriers",
    label: "Insurance Carriers Accepted",
    priority: "recommended",
    description: "Which insurance you take",
    aiImpact: "AI cannot tell patients if you accept their insurance",
    section: "services",
  },
  {
    id: "new_patient_intake",
    label: "New Patient Intake Questions",
    priority: "recommended",
    description: "What to ask new patients",
    aiImpact: "AI asks generic questions instead of your intake flow",
    section: "policies",
  },
  {
    id: "symptom_triage",
    label: "Symptom Triage Rules",
    priority: "recommended",
    description: "When to escalate vs. schedule normally",
    aiImpact: "AI may not appropriately triage urgent cases",
    section: "policies",
    checkFn: "checkSymptomTriageEnabled",
  },
  {
    id: "telehealth_settings",
    label: "Telehealth Settings",
    priority: "recommended",
    description: "Virtual visit availability and requirements",
    aiImpact: "AI cannot offer telehealth options",
    section: "services",
    checkFn: "checkTelehealthEnabled",
  },
];

const MEDICAL_OPTIONAL_FIELDS: FieldDefinition[] = [
  {
    id: "self_pay_rates",
    label: "Self-Pay Rates",
    priority: "optional",
    description: "Pricing for uninsured patients",
    aiImpact: "AI cannot quote cash pay prices",
    section: "services",
  },
];

// ============================================================================
// GENERAL MODE FIELDS
// ============================================================================

const GENERAL_REQUIRED_FIELDS: FieldDefinition[] = [];

const GENERAL_RECOMMENDED_FIELDS: FieldDefinition[] = [
  {
    id: "callback_settings",
    label: "Callback Settings",
    priority: "recommended",
    description: "How you want callbacks handled",
    aiImpact: "AI uses default callback behavior",
    section: "policies",
  },
];

const GENERAL_OPTIONAL_FIELDS: FieldDefinition[] = [];

// ============================================================================
// SALES MODE FIELDS
// ============================================================================

const SALES_REQUIRED_FIELDS: FieldDefinition[] = [
  {
    id: "products_inventory",
    label: "Products / Inventory Description",
    priority: "required",
    description: "What you sell or offer — products, services, listings, etc.",
    aiImpact: "AI cannot describe your offerings or match customer interest",
    section: "services",
  },
];

const SALES_RECOMMENDED_FIELDS: FieldDefinition[] = [
  {
    id: "financing_info",
    label: "Financing Information",
    priority: "recommended",
    description: "Available financing options and partners",
    aiImpact: "AI cannot address financing questions",
    section: "policies",
  },
  {
    id: "trade_in_policy",
    label: "Trade-In / Exchange Policy",
    priority: "recommended",
    description: "How you handle trade-ins, exchanges, or returns",
    aiImpact: "AI cannot set trade-in expectations",
    section: "policies",
  },
  {
    id: "test_drive_settings",
    label: "Visit / Demo Settings",
    priority: "recommended",
    description: "Duration, requirements, and scheduling for visits and demos",
    aiImpact: "AI uses default 30-minute visit settings",
    section: "services",
  },
  {
    id: "sales_team_names",
    label: "Sales Team Names",
    priority: "recommended",
    description: "Names of sales reps for assignment and routing",
    aiImpact: "AI cannot route to specific reps or mention names",
    section: "profile",
  },
];

const SALES_OPTIONAL_FIELDS: FieldDefinition[] = [
  {
    id: "crm_integration",
    label: "CRM / DMS Integration",
    priority: "optional",
    description: "Connect to your dealer management system",
    aiImpact: "Leads require manual entry in your CRM",
    section: "integrations",
  },
  {
    id: "current_promotions",
    label: "Current Promotions",
    priority: "optional",
    description: "Active specials, incentives, or deals",
    aiImpact: "AI cannot mention promotions to callers",
    section: "services",
  },
];

// ============================================================================
// REGISTRY
// ============================================================================

export const ESSENTIAL_FIELDS_REGISTRY: Record<BusinessMode, ModeFieldRegistry> = {
  food: {
    mode: "food",
    displayName: "Restaurant & Food Service",
    fields: [
      ...SHARED_REQUIRED_FIELDS,
      ...FOOD_REQUIRED_FIELDS,
      ...SHARED_RECOMMENDED_FIELDS,
      ...FOOD_RECOMMENDED_FIELDS,
      ...SHARED_OPTIONAL_FIELDS,
      ...FOOD_OPTIONAL_FIELDS,
    ],
  },
  dispatch: {
    mode: "dispatch",
    displayName: "Towing & Dispatch",
    fields: [
      ...SHARED_REQUIRED_FIELDS,
      ...DISPATCH_REQUIRED_FIELDS,
      ...SHARED_RECOMMENDED_FIELDS,
      ...DISPATCH_RECOMMENDED_FIELDS,
      ...SHARED_OPTIONAL_FIELDS,
      ...DISPATCH_OPTIONAL_FIELDS,
    ],
  },
  service: {
    mode: "service",
    displayName: "Service Business",
    fields: [
      ...SHARED_REQUIRED_FIELDS,
      ...SERVICE_REQUIRED_FIELDS,
      ...SHARED_RECOMMENDED_FIELDS,
      ...SERVICE_RECOMMENDED_FIELDS,
      ...SHARED_OPTIONAL_FIELDS,
      ...SERVICE_OPTIONAL_FIELDS,
    ],
  },
  medical: {
    mode: "medical",
    displayName: "Medical Practice",
    fields: [
      ...SHARED_REQUIRED_FIELDS,
      ...MEDICAL_REQUIRED_FIELDS,
      ...SHARED_RECOMMENDED_FIELDS,
      ...MEDICAL_RECOMMENDED_FIELDS,
      ...SHARED_OPTIONAL_FIELDS,
      ...MEDICAL_OPTIONAL_FIELDS,
    ],
  },
  general: {
    mode: "general",
    displayName: "General Business",
    fields: [
      ...SHARED_REQUIRED_FIELDS,
      ...GENERAL_REQUIRED_FIELDS,
      ...SHARED_RECOMMENDED_FIELDS,
      ...GENERAL_RECOMMENDED_FIELDS,
      ...SHARED_OPTIONAL_FIELDS,
      ...GENERAL_OPTIONAL_FIELDS,
    ],
  },
  sales: {
    mode: "sales",
    displayName: "Sales & Dealership",
    fields: [
      ...SHARED_REQUIRED_FIELDS,
      ...SALES_REQUIRED_FIELDS,
      ...SHARED_RECOMMENDED_FIELDS,
      ...SALES_RECOMMENDED_FIELDS,
      ...SHARED_OPTIONAL_FIELDS,
      ...SALES_OPTIONAL_FIELDS,
    ],
  },
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get all fields for a specific mode
 */
export function getFieldsForMode(mode: BusinessMode): FieldDefinition[] {
  return ESSENTIAL_FIELDS_REGISTRY[mode]?.fields ?? ESSENTIAL_FIELDS_REGISTRY.general.fields;
}

/**
 * Get only required fields for a mode
 */
export function getRequiredFields(mode: BusinessMode): FieldDefinition[] {
  return getFieldsForMode(mode).filter(f => f.priority === "required");
}

/**
 * Get only recommended fields for a mode
 */
export function getRecommendedFields(mode: BusinessMode): FieldDefinition[] {
  return getFieldsForMode(mode).filter(f => f.priority === "recommended");
}

/**
 * Get fields grouped by section
 */
export function getFieldsBySection(mode: BusinessMode): Record<string, FieldDefinition[]> {
  const fields = getFieldsForMode(mode);
  return fields.reduce((acc, field) => {
    if (!acc[field.section]) {
      acc[field.section] = [];
    }
    acc[field.section].push(field);
    return acc;
  }, {} as Record<string, FieldDefinition[]>);
}

/**
 * Get field definition by ID
 */
export function getFieldById(mode: BusinessMode, fieldId: string): FieldDefinition | undefined {
  return getFieldsForMode(mode).find(f => f.id === fieldId);
}

/**
 * Check if a field should be shown based on capability flags
 */
export function shouldShowField(
  field: FieldDefinition,
  capabilities: Record<string, boolean>
): boolean {
  if (!field.checkFn) return true;
  
  // Map checkFn names to capability keys
  const checkFnToCapability: Record<string, string> = {
    checkDeliveryEnabled: "offersDelivery",
    checkCateringEnabled: "offersCatering",
    checkReservationsEnabled: "offersReservations",
    checkImpoundEnabled: "hasImpoundLot",
    checkMobileServiceEnabled: "offersMobileService",
    checkTelehealthEnabled: "hasTelehealth",
    checkSymptomTriageEnabled: "needsSymptomTriage",
  };
  
  const capabilityKey = checkFnToCapability[field.checkFn];
  if (!capabilityKey) return true;
  
  return capabilities[capabilityKey] === true;
}

/**
 * Get the priority badge color class
 */
export function getPriorityColor(priority: FieldPriority): string {
  switch (priority) {
    case "required":
      return "text-red-600 bg-red-100 dark:bg-red-900/30";
    case "recommended":
      return "text-amber-600 bg-amber-100 dark:bg-amber-900/30";
    case "optional":
      return "text-muted-foreground bg-muted";
  }
}

/**
 * Get the priority badge label
 */
export function getPriorityLabel(priority: FieldPriority): string {
  switch (priority) {
    case "required":
      return "Required for AI";
    case "recommended":
      return "Recommended";
    case "optional":
      return "Optional";
  }
}
