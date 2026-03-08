/**
 * Lightweight terminology helper for edge functions.
 * Mirrors the appointmentLabel resolution from src/data/industryTerminology.ts
 * without requiring the full React-side industry catalog.
 */

// Mode-level defaults
const MODE_LABELS: Record<string, string> = {
  dispatch: "dispatch",
  food: "reservation",
  medical: "visit",
};

// Industry slug → appointmentLabel overrides (highest specificity)
// IMPORTANT: industryCatalog.ts uses underscore slugs (pool_service, tree_service, etc.)
// Both underscore and hyphen forms are listed so both resolve correctly.
const SLUG_LABELS: Record<string, string> = {
  // home_services category → "job"
  plumbing: "job",
  hvac: "job",
  electrical: "job",
  "pest-control": "job",
  pest_control: "job",
  "garage-doors": "job",
  garage_door: "job",
  "carpet-cleaning": "job",
  carpet_cleaning: "job",
  roofing: "inspection",
  "lawn-care": "job",
  landscaping: "job",
  "pressure-washing": "job",
  pressure_washing: "job",
  "pool-service": "job",
  pool_service: "job",
  tree_service: "job",
  junk_removal: "job",
  cleaning: "job",
  handyman: "job",
  general_contractor: "estimate",
  painting: "job",
  moving: "job",
  "moving-company": "job",
  locksmith: "job",
  "appliance-repair": "job",
  appliance_repair: "job",
  auto_repair: "job",
  "auto-repair": "job",
  // professional_services category → "consultation"
  lawyer: "consultation",
  accountant: "consultation",
  "real-estate": "consultation",
  "financial-advisor": "consultation",
  "insurance-agent": "consultation",
  "it-consultant": "consultation",
  // fitness_recreation category → "session"
  "personal-trainer": "session",
  personal_training: "session",
  "yoga-studio": "session",
  // food slug overrides → "order"
  bakery: "order",
  coffee_shop: "order",
  food_truck: "order",
  // catering → "event"
  catering_service: "event",
};

/**
 * Resolve the user-facing appointment label for a tenant.
 * @param mode - business_mode enum (service, dispatch, food, medical, sales, general)
 * @param industrySlug - industry slug from tenants.industry (e.g. "plumbing", "hvac")
 * @returns The appointment label (e.g. "job", "visit", "appointment")
 */
export function getAppointmentLabel(mode: string, industrySlug?: string | null): string {
  if (industrySlug && SLUG_LABELS[industrySlug]) {
    return SLUG_LABELS[industrySlug];
  }
  return MODE_LABELS[mode] || "appointment";
}
