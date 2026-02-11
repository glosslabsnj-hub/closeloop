/**
 * Industry Terminology Map
 *
 * Provides industry-specific labels and placeholders used by brain editors
 * to display contextually appropriate wording.
 */

import type { BusinessMode } from "@/components/onboarding/BusinessModeSelector";
import type { IndustryCategory } from "@/data/industryCatalog";

export interface IndustryTerminology {
  servicesLabel: string;
  serviceItemLabel: string;
  customerLabel: string;
  appointmentLabel: string;
  pricingLabel: string;
  locationLabel: string;
  teamMemberLabel: string;
  exampleServices: string[];
  exampleFAQs: string[];
}

// ---------------------------------------------------------------------------
// Default per mode
// ---------------------------------------------------------------------------

const serviceDefaults: IndustryTerminology = {
  servicesLabel: "Services & Pricing",
  serviceItemLabel: "service",
  customerLabel: "customer",
  appointmentLabel: "appointment",
  pricingLabel: "pricing",
  locationLabel: "service area",
  teamMemberLabel: "technician",
  exampleServices: ["Basic Service", "Premium Service", "Rush Service"],
  exampleFAQs: ["What are your hours?", "Do you offer free estimates?", "What forms of payment do you accept?"],
};

const dispatchDefaults: IndustryTerminology = {
  servicesLabel: "Tow Rates & Services",
  serviceItemLabel: "service type",
  customerLabel: "customer",
  appointmentLabel: "dispatch",
  pricingLabel: "rates",
  locationLabel: "coverage zone",
  teamMemberLabel: "driver",
  exampleServices: ["Local Tow", "Long-Distance Tow", "Flatbed Transport"],
  exampleFAQs: ["What is your response time?", "Do you accept roadside club calls?", "What are your after-hours rates?"],
};

const foodDefaults: IndustryTerminology = {
  servicesLabel: "Menu & Pricing",
  serviceItemLabel: "menu item",
  customerLabel: "guest",
  appointmentLabel: "reservation",
  pricingLabel: "menu prices",
  locationLabel: "delivery area",
  teamMemberLabel: "server",
  exampleServices: ["Dine-In", "Takeout", "Delivery", "Catering"],
  exampleFAQs: ["Do you have gluten-free options?", "Can I make a reservation?", "What are your delivery hours?"],
};

const medicalDefaults: IndustryTerminology = {
  servicesLabel: "Procedures & Fee Schedule",
  serviceItemLabel: "procedure",
  customerLabel: "patient",
  appointmentLabel: "visit",
  pricingLabel: "fee schedule",
  locationLabel: "office",
  teamMemberLabel: "provider",
  exampleServices: ["New Patient Visit", "Follow-Up", "Annual Exam"],
  exampleFAQs: ["Do you accept my insurance?", "How do I request my records?", "What should I bring to my first visit?"],
};

const generalDefaults: IndustryTerminology = {
  servicesLabel: "Services & Pricing",
  serviceItemLabel: "service",
  customerLabel: "client",
  appointmentLabel: "appointment",
  pricingLabel: "pricing",
  locationLabel: "service area",
  teamMemberLabel: "team member",
  exampleServices: ["Consultation", "Standard Service", "Premium Package"],
  exampleFAQs: ["What are your hours?", "Do you offer consultations?", "What is your pricing?"],
};

const salesDefaults: IndustryTerminology = {
  servicesLabel: "Products & Pricing",
  serviceItemLabel: "product",
  customerLabel: "prospect",
  appointmentLabel: "appointment",
  pricingLabel: "pricing",
  locationLabel: "showroom",
  teamMemberLabel: "sales rep",
  exampleServices: ["New Vehicles", "Pre-Owned Vehicles", "Financing", "Trade-In"],
  exampleFAQs: ["Do you offer financing?", "What's your return policy?", "Do you accept trade-ins?"],
};

const MODE_DEFAULTS: Record<BusinessMode, IndustryTerminology> = {
  service: serviceDefaults,
  dispatch: dispatchDefaults,
  food: foodDefaults,
  medical: medicalDefaults,
  general: generalDefaults,
  sales: salesDefaults,
};

// ---------------------------------------------------------------------------
// Category-specific overrides (merged on top of mode defaults)
// ---------------------------------------------------------------------------

const CATEGORY_OVERRIDES: Partial<Record<IndustryCategory, Partial<IndustryTerminology>>> = {
  beauty_wellness: {
    teamMemberLabel: "stylist",
    exampleServices: ["Haircut", "Color & Highlights", "Blowout", "Balayage"],
    exampleFAQs: ["Do I need an appointment?", "How long does a color service take?", "Do you do kids' haircuts?"],
  },
  auto_services: {
    teamMemberLabel: "technician",
    exampleServices: ["Oil Change", "Brake Service", "Full Detail", "Tire Rotation"],
    exampleFAQs: ["Do you offer free estimates?", "How long will the repair take?", "Do you have loaner vehicles?"],
  },
  home_services: {
    teamMemberLabel: "technician",
    exampleServices: ["Service Call", "Diagnostic", "Installation", "Emergency Repair"],
    exampleFAQs: ["Do you charge a trip fee?", "Are you licensed and insured?", "Do you offer financing?"],
  },
  health_medical: {
    teamMemberLabel: "provider",
    appointmentLabel: "visit",
    customerLabel: "patient",
    pricingLabel: "fee schedule",
    exampleFAQs: ["Do you accept my insurance?", "What should I bring to my first visit?", "Do you offer telehealth?"],
  },
  pet_services: {
    customerLabel: "pet parent",
    teamMemberLabel: "groomer",
    exampleServices: ["Bath & Brush", "Full Groom", "Nail Trim", "Puppy Package"],
    exampleFAQs: ["Are vaccinations required?", "How long does grooming take?", "Do you handle aggressive dogs?"],
  },
  professional_services: {
    customerLabel: "client",
    teamMemberLabel: "advisor",
    appointmentLabel: "consultation",
    exampleServices: ["Initial Consultation", "Document Review", "Full Service Package"],
    exampleFAQs: ["Do you offer free consultations?", "What are your fees?", "How long does the process take?"],
  },
  fitness_recreation: {
    customerLabel: "member",
    teamMemberLabel: "trainer",
    appointmentLabel: "session",
    exampleServices: ["Personal Training", "Group Class", "Assessment"],
    exampleFAQs: ["Do you offer trial classes?", "What is your cancellation policy?", "Do you have family plans?"],
  },
  dispatch_logistics: {
    teamMemberLabel: "driver",
    exampleServices: ["Standard Tow", "Flatbed", "Lockout", "Jump Start", "Tire Change"],
    exampleFAQs: ["How fast can you get here?", "Do you take AAA?", "What are your impound release hours?"],
  },
  food_hospitality: {
    customerLabel: "guest",
    teamMemberLabel: "server",
    exampleServices: ["Dine-In", "Takeout", "Delivery", "Catering"],
    exampleFAQs: ["Do you have vegan options?", "Can I place a large order?", "Do you deliver to my area?"],
  },
};

// ---------------------------------------------------------------------------
// Slug-specific overrides (highest priority)
// ---------------------------------------------------------------------------

const SLUG_OVERRIDES: Record<string, Partial<IndustryTerminology>> = {
  "auto-detailing": {
    servicesLabel: "Detailing Packages",
    exampleServices: ["Exterior Wash", "Interior Detail", "Full Detail Package", "Ceramic Coating"],
    exampleFAQs: ["How long does a full detail take?", "Do you come to me?", "What's included in the ceramic coating?"],
  },
  "hair-salon": {
    servicesLabel: "Salon Services",
    exampleServices: ["Women's Haircut", "Men's Haircut", "Color & Highlights", "Keratin Treatment"],
  },
  "barbershop": {
    servicesLabel: "Barber Services",
    teamMemberLabel: "barber",
    exampleServices: ["Classic Cut", "Beard Trim", "Hot Towel Shave", "Kids' Cut"],
  },
  "towing": {
    servicesLabel: "Tow Rates",
    exampleServices: ["Local Tow (0-10 mi)", "Medium Tow (10-25 mi)", "Long-Distance Tow", "Flatbed Transport"],
  },
  "pizza": {
    servicesLabel: "Menu",
    exampleServices: ["Build Your Own Pizza", "Specialty Pizza", "Wings", "Salads"],
  },
  "dental": {
    servicesLabel: "Dental Procedures",
    exampleServices: ["Cleaning & Exam", "Filling", "Crown", "Teeth Whitening"],
    exampleFAQs: ["Do you accept my dental insurance?", "Do you offer payment plans?", "Is there a wait for new patients?"],
  },
  "chiropractic": {
    servicesLabel: "Chiropractic Services",
    exampleServices: ["Initial Exam", "Adjustment", "X-Ray", "Rehab Therapy"],
  },
  "plumbing": {
    exampleServices: ["Drain Cleaning", "Water Heater Repair", "Pipe Repair", "Leak Detection"],
  },
  "electrical": {
    exampleServices: ["Outlet Install", "Panel Upgrade", "Lighting Install", "Troubleshooting"],
  },
  "hvac": {
    exampleServices: ["AC Tune-Up", "Furnace Repair", "Duct Cleaning", "System Install"],
  },
  "lawn-care": {
    teamMemberLabel: "crew member",
    exampleServices: ["Mowing", "Fertilization", "Aeration", "Leaf Cleanup"],
  },
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Get industry-specific terminology by resolving mode defaults → category overrides → slug overrides.
 */
export function getIndustryTerminology(
  mode: BusinessMode,
  category?: IndustryCategory,
  slug?: string
): IndustryTerminology {
  const base = { ...MODE_DEFAULTS[mode] };

  if (category && CATEGORY_OVERRIDES[category]) {
    Object.assign(base, CATEGORY_OVERRIDES[category]);
  }

  if (slug && SLUG_OVERRIDES[slug]) {
    Object.assign(base, SLUG_OVERRIDES[slug]);
  }

  return base;
}

/**
 * Get a dynamic step title for the brain hub based on mode and optional industry context.
 */
export function getDynamicStepTitle(
  stepId: string,
  mode: BusinessMode,
  category?: IndustryCategory,
  slug?: string
): string {
  const terms = getIndustryTerminology(mode, category, slug);

  switch (stepId) {
    case "offerings":
      return terms.servicesLabel;
    case "calendar":
      return mode === "medical" ? "Appointment Calendar" : "Schedule & Availability";
    case "policies":
      if (mode === "medical") return "Patient Intake & HIPAA";
      if (mode === "dispatch") return "Dispatch Policies";
      return "Booking Policies";
    case "knowledge":
      if (mode === "medical") return "Patient FAQs";
      if (mode === "food") return "Menu FAQs";
      return "Customer FAQs";
    default:
      return "";
  }
}
