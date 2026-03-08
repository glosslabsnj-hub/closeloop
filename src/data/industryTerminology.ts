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
  // Brain-specific terms (used for dynamic card/category titles)
  catalogCardTitle: string;
  faqsCardTitle: string;
  policiesCardTitle: string;
  coverageCardTitle: string;
  addItemButton: string;
  itemNamePlaceholder: string;
  servicesCategoryTitle: string;
  /**
   * Optional override for the bookings calendar nav label.
   * Use when appointmentLabel would auto-derive a bookingsPageTitle that conflicts with another module.
   * (e.g. GC: appointmentLabel="estimate" auto-derives "Estimates" — clashes with Estimates module nav.)
   */
  bookingsPageTitle?: string;
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
  catalogCardTitle: "Your Services",
  faqsCardTitle: "Customer FAQs",
  policiesCardTitle: "Booking Policies",
  coverageCardTitle: "Service Area",
  addItemButton: "Add Service",
  itemNamePlaceholder: "e.g. Oil Change",
  servicesCategoryTitle: "Services & Pricing",
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
  catalogCardTitle: "Your Tow Services",
  faqsCardTitle: "Caller FAQs",
  policiesCardTitle: "Dispatch Policies",
  coverageCardTitle: "Coverage Zone",
  addItemButton: "Add Service Type",
  itemNamePlaceholder: "e.g. Local Tow (0-10 mi)",
  servicesCategoryTitle: "Tow Rates & Services",
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
  catalogCardTitle: "Your Menu",
  faqsCardTitle: "Guest FAQs",
  policiesCardTitle: "Restaurant Policies",
  coverageCardTitle: "Delivery Area",
  addItemButton: "Add Menu Item",
  itemNamePlaceholder: "e.g. Margherita Pizza",
  servicesCategoryTitle: "Menu & Pricing",
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
  catalogCardTitle: "Your Procedures",
  faqsCardTitle: "Patient FAQs",
  policiesCardTitle: "Practice Policies",
  coverageCardTitle: "Office Location",
  addItemButton: "Add Procedure",
  itemNamePlaceholder: "e.g. Teeth Cleaning",
  servicesCategoryTitle: "Procedures & Fees",
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
  catalogCardTitle: "Your Services",
  faqsCardTitle: "Client FAQs",
  policiesCardTitle: "Business Policies",
  coverageCardTitle: "Service Area",
  addItemButton: "Add Service",
  itemNamePlaceholder: "e.g. Consultation",
  servicesCategoryTitle: "Services & Pricing",
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
  catalogCardTitle: "Your Products",
  faqsCardTitle: "Prospect FAQs",
  policiesCardTitle: "Sales Policies",
  coverageCardTitle: "Showroom Location",
  addItemButton: "Add Product",
  itemNamePlaceholder: "e.g. 2024 Sedan",
  servicesCategoryTitle: "Products & Pricing",
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
    appointmentLabel: "job",
    policiesCardTitle: "Service Policies",
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
    catalogCardTitle: "Your Detailing Packages",
    addItemButton: "Add Package",
    itemNamePlaceholder: "e.g. Full Detail Package",
    servicesCategoryTitle: "Detailing Packages",
    exampleServices: ["Exterior Wash", "Interior Detail", "Full Detail Package", "Ceramic Coating"],
    exampleFAQs: ["How long does a full detail take?", "Do you come to me?", "What's included in the ceramic coating?"],
  },
  // alias: industryCatalog uses underscore slug
  "auto_detailing": {
    servicesLabel: "Detailing Packages",
    catalogCardTitle: "Your Detailing Packages",
    addItemButton: "Add Package",
    itemNamePlaceholder: "e.g. Full Detail Package",
    servicesCategoryTitle: "Detailing Packages",
    exampleServices: ["Exterior Wash", "Interior Detail", "Full Detail Package", "Ceramic Coating"],
    exampleFAQs: ["How long does a full detail take?", "Do you come to me?", "What's included in the ceramic coating?"],
  },
  "hair-salon": {
    servicesLabel: "Salon Services",
    catalogCardTitle: "Your Salon Services",
    addItemButton: "Add Salon Service",
    itemNamePlaceholder: "e.g. Women's Haircut",
    servicesCategoryTitle: "Salon Services",
    teamMemberLabel: "stylist",
    customerLabel: "client",
    exampleServices: ["Women's Haircut", "Men's Haircut", "Color & Highlights", "Keratin Treatment"],
    exampleFAQs: ["Do I need an appointment?", "Can I request a specific stylist?", "What's the best way to book?"],
  },
  // alias: industryCatalog uses "salon" slug
  "salon": {
    servicesLabel: "Salon Services",
    catalogCardTitle: "Your Salon Services",
    addItemButton: "Add Salon Service",
    itemNamePlaceholder: "e.g. Women's Haircut",
    servicesCategoryTitle: "Salon Services",
    teamMemberLabel: "stylist",
    customerLabel: "client",
    exampleServices: ["Women's Haircut", "Men's Haircut", "Color & Highlights", "Keratin Treatment"],
    exampleFAQs: ["Do I need an appointment?", "Can I request a specific stylist?", "What's the best way to book?"],
  },
  "barbershop": {
    servicesLabel: "Barber Services",
    catalogCardTitle: "Your Barber Services",
    addItemButton: "Add Service",
    itemNamePlaceholder: "e.g. Classic Cut",
    servicesCategoryTitle: "Barber Services",
    teamMemberLabel: "barber",
    exampleServices: ["Classic Cut", "Beard Trim", "Hot Towel Shave", "Kids' Cut"],
  },
  "towing": {
    servicesLabel: "Tow Rates",
    catalogCardTitle: "Your Tow Rates",
    addItemButton: "Add Tow Service",
    itemNamePlaceholder: "e.g. Local Tow (0-10 mi)",
    servicesCategoryTitle: "Tow Rates",
    exampleServices: ["Local Tow (0-10 mi)", "Medium Tow (10-25 mi)", "Long-Distance Tow", "Flatbed Transport"],
  },
  "pizza": {
    servicesLabel: "Menu",
    catalogCardTitle: "Your Menu",
    addItemButton: "Add Menu Item",
    itemNamePlaceholder: "e.g. Build Your Own Pizza",
    servicesCategoryTitle: "Menu",
    exampleServices: ["Build Your Own Pizza", "Specialty Pizza", "Wings", "Salads"],
  },
  // alias: industryCatalog uses "pizzeria" slug
  "pizzeria": {
    servicesLabel: "Menu",
    catalogCardTitle: "Your Menu",
    addItemButton: "Add Menu Item",
    itemNamePlaceholder: "e.g. Build Your Own Pizza",
    servicesCategoryTitle: "Menu",
    exampleServices: ["Build Your Own Pizza", "Specialty Pizza", "Wings", "Salads"],
  },
  "bakery": {
    appointmentLabel: "order",
    customerLabel: "customer",
    teamMemberLabel: "baker",
    exampleServices: ["Fresh Bread", "Custom Cake", "Pastry Box", "Catering Platter"],
    exampleFAQs: ["How far in advance do I need to order a custom cake?", "Do you offer gluten-free options?", "Can I place a large order for an event?"],
    itemNamePlaceholder: "e.g. Custom Birthday Cake",
  },
  "coffee_shop": {
    appointmentLabel: "order",
    customerLabel: "customer",
    teamMemberLabel: "barista",
    exampleServices: ["Espresso Drinks", "Drip Coffee", "Pastries", "Catering"],
    exampleFAQs: ["Do you have oat milk?", "Can I order ahead for pickup?", "Do you offer catering for meetings?"],
    itemNamePlaceholder: "e.g. Oat Milk Latte",
  },
  "food_truck": {
    appointmentLabel: "order",
    customerLabel: "customer",
    locationLabel: "today's location",
    coverageCardTitle: "Where We'll Be",
    exampleServices: ["Regular Menu", "Event Booking", "Private Party"],
    exampleFAQs: ["Where are you parked today?", "Can I book you for an event?", "Do you have a set menu?"],
    itemNamePlaceholder: "e.g. Street Tacos",
  },
  "catering_service": {
    appointmentLabel: "event",
    customerLabel: "client",
    teamMemberLabel: "event coordinator",
    servicesLabel: "Catering Packages",
    catalogCardTitle: "Your Catering Packages",
    addItemButton: "Add Package",
    itemNamePlaceholder: "e.g. Corporate Lunch (25 ppl)",
    servicesCategoryTitle: "Catering Packages",
    exampleServices: ["Drop-Off Catering", "Full-Service Event", "Corporate Lunch", "Wedding Reception"],
    exampleFAQs: ["What's the minimum headcount?", "How far in advance should I book?", "Do you handle setup and cleanup?"],
  },
  "bar": {
    teamMemberLabel: "bartender",
    exampleServices: ["Table Reservation", "VIP Section", "Private Event", "Happy Hour"],
    exampleFAQs: ["Do you have a dress code?", "Can I reserve a section for a group?", "What time is happy hour?"],
  },
  "dental": {
    servicesLabel: "Dental Procedures",
    catalogCardTitle: "Your Dental Procedures",
    addItemButton: "Add Procedure",
    itemNamePlaceholder: "e.g. Cleaning & Exam",
    servicesCategoryTitle: "Dental Procedures",
    exampleServices: ["Cleaning & Exam", "Filling", "Crown", "Teeth Whitening"],
    exampleFAQs: ["Do you accept my dental insurance?", "Do you offer payment plans?", "Is there a wait for new patients?"],
  },
  "chiropractic": {
    servicesLabel: "Chiropractic Services",
    catalogCardTitle: "Your Chiropractic Services",
    addItemButton: "Add Service",
    itemNamePlaceholder: "e.g. Adjustment",
    servicesCategoryTitle: "Chiropractic Services",
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
  "auto_repair": {
    servicesLabel: "Repair Services",
    catalogCardTitle: "Your Repair Services",
    addItemButton: "Add Service",
    itemNamePlaceholder: "e.g. Brake Replacement",
    servicesCategoryTitle: "Repair Services",
    teamMemberLabel: "technician",
    exampleServices: ["Oil Change", "Brake Service", "Diagnostics", "Tune-Up", "AC Repair"],
    exampleFAQs: ["How long will my repair take?", "Do you offer free estimates?", "Do you have loaner cars?"],
  },
  "auto-repair": {
    servicesLabel: "Repair Services",
    catalogCardTitle: "Your Repair Services",
    addItemButton: "Add Service",
    itemNamePlaceholder: "e.g. Brake Replacement",
    servicesCategoryTitle: "Repair Services",
    teamMemberLabel: "technician",
    exampleServices: ["Oil Change", "Brake Service", "Diagnostics", "Tune-Up", "AC Repair"],
    exampleFAQs: ["How long will my repair take?", "Do you offer free estimates?", "Do you have loaner cars?"],
  },
  "cleaning": {
    servicesLabel: "Cleaning Services",
    catalogCardTitle: "Your Cleaning Services",
    addItemButton: "Add Service",
    itemNamePlaceholder: "e.g. Deep Clean",
    servicesCategoryTitle: "Cleaning Services",
    teamMemberLabel: "cleaner",
    exampleServices: ["Standard Cleaning", "Deep Cleaning", "Move In/Out Cleaning", "Office Cleaning"],
    exampleFAQs: ["Do you bring your own supplies?", "How long does a cleaning take?", "Do you offer recurring service discounts?"],
  },
  "lawn-care": {
    teamMemberLabel: "crew member",
    exampleServices: ["Mowing", "Fertilization", "Aeration", "Leaf Cleanup"],
  },
  // alias: industryCatalog uses "landscaping" slug
  "landscaping": {
    servicesLabel: "Lawn & Landscaping Services",
    catalogCardTitle: "Your Services",
    addItemButton: "Add Service",
    itemNamePlaceholder: "e.g. Lawn Mowing",
    servicesCategoryTitle: "Lawn & Landscaping Services",
    teamMemberLabel: "crew member",
    exampleServices: ["Lawn Mowing", "Hedge Trimming", "Mulching", "Landscape Design", "Seasonal Cleanup"],
    exampleFAQs: ["Do you offer weekly service?", "Do you provide free estimates?", "Do you handle snow removal?"],
  },
  "painting": {
    servicesLabel: "Painting Services",
    catalogCardTitle: "Your Painting Services",
    addItemButton: "Add Service",
    itemNamePlaceholder: "e.g. Interior Painting",
    servicesCategoryTitle: "Painting Services",
    teamMemberLabel: "painter",
    exampleServices: ["Interior Painting", "Exterior Painting", "Cabinet Painting", "Deck Staining", "Free Estimate"],
    exampleFAQs: ["Do you provide free estimates?", "Do you supply the paint?", "How long does exterior painting take?"],
  },
  "pest_control": {
    servicesLabel: "Pest Control Services",
    catalogCardTitle: "Your Services",
    addItemButton: "Add Service",
    itemNamePlaceholder: "e.g. General Pest Treatment",
    servicesCategoryTitle: "Pest Control Services",
    teamMemberLabel: "pest tech",
    appointmentLabel: "treatment",
    customerLabel: "customer",
    exampleServices: ["General Pest Treatment", "Termite Inspection", "Rodent Control", "Bed Bug Treatment", "Quarterly Plan"],
    exampleFAQs: ["Is your treatment safe for pets?", "How long does treatment take?", "Do you offer a warranty?"],
  },
  "locksmith": {
    servicesLabel: "Locksmith Services",
    catalogCardTitle: "Your Services",
    addItemButton: "Add Service",
    itemNamePlaceholder: "e.g. Lockout Service",
    servicesCategoryTitle: "Locksmith Services",
    teamMemberLabel: "locksmith",
    exampleServices: ["Lockout Service", "Lock Rekey", "Lock Installation", "Deadbolt Replacement", "Car Key Programming"],
    exampleFAQs: ["How quickly can you get here?", "Do you charge a trip fee?", "Can you make a car key without the original?"],
  },
  "moving": {
    servicesLabel: "Moving Services",
    catalogCardTitle: "Your Moving Services",
    addItemButton: "Add Service",
    itemNamePlaceholder: "e.g. Local Move",
    servicesCategoryTitle: "Moving Services",
    teamMemberLabel: "mover",
    exampleServices: ["Local Move", "Long-Distance Move", "Packing Services", "Storage", "Furniture Assembly"],
    exampleFAQs: ["Do you offer free estimates?", "Are you licensed and insured?", "How far in advance should I book?"],
  },
  "carpet_cleaning": {
    servicesLabel: "Carpet Cleaning Services",
    catalogCardTitle: "Your Services",
    addItemButton: "Add Service",
    itemNamePlaceholder: "e.g. Whole-Home Cleaning",
    servicesCategoryTitle: "Carpet Cleaning Services",
    teamMemberLabel: "technician",
    exampleServices: ["Carpet Cleaning", "Upholstery Cleaning", "Area Rug Cleaning", "Stain Treatment", "Pet Odor Removal"],
    exampleFAQs: ["How long does it take to dry?", "Is your solution safe for pets?", "Do you move furniture?"],
  },
  "pool_service": {
    servicesLabel: "Pool Services",
    catalogCardTitle: "Your Pool Services",
    addItemButton: "Add Service",
    itemNamePlaceholder: "e.g. Weekly Cleaning",
    servicesCategoryTitle: "Pool Services",
    teamMemberLabel: "pool tech",
    appointmentLabel: "service visit",
    customerLabel: "customer",
    exampleServices: ["Weekly Cleaning", "Pool Opening", "Pool Closing", "Equipment Repair", "Acid Wash"],
    exampleFAQs: ["How often should my pool be cleaned?", "Do you handle equipment repairs?", "Do you offer monthly contracts?"],
  },
  "tree_service": {
    servicesLabel: "Tree Services",
    catalogCardTitle: "Your Tree Services",
    addItemButton: "Add Service",
    itemNamePlaceholder: "e.g. Tree Removal",
    servicesCategoryTitle: "Tree Services",
    teamMemberLabel: "crew",
    exampleServices: ["Tree Removal", "Tree Trimming", "Stump Grinding", "Emergency Removal", "Free Estimate"],
    exampleFAQs: ["Are you licensed and insured?", "Do you offer free estimates?", "Can you handle emergency storm damage?"],
  },
  "pressure_washing": {
    exampleServices: ["Driveway Cleaning", "House Wash", "Deck Cleaning", "Fence Cleaning", "Commercial Cleaning"],
    exampleFAQs: ["How long does it take?", "Do you use hot water?", "Do you offer package deals?"],
  },
  "junk_removal": {
    servicesLabel: "Junk Removal Services",
    catalogCardTitle: "Your Services",
    addItemButton: "Add Service",
    itemNamePlaceholder: "e.g. Full Truck Load",
    servicesCategoryTitle: "Junk Removal Services",
    teamMemberLabel: "crew member",
    exampleServices: ["Single Item Pickup", "Half Load", "Full Load", "Estate Cleanout", "Construction Debris"],
    exampleFAQs: ["Do you offer free estimates?", "What items won't you take?", "Do you do same-day pickups?"],
  },
  "general_contractor": {
    appointmentLabel: "estimate",
    // Override bookingsPageTitle so the /app/bookings nav item doesn't clash with /app/estimates.
    // applyAppointmentLabel would auto-derive "Estimates" from appointmentLabel="estimate" —
    // creating two sidebar items both labeled "Estimates". "Estimate Schedule" is clearly the calendar.
    bookingsPageTitle: "Estimate Schedule",
    teamMemberLabel: "project manager",
    servicesLabel: "Services & Estimates",
    catalogCardTitle: "Your Services",
    addItemButton: "Add Service",
    itemNamePlaceholder: "e.g. Kitchen Remodel",
    servicesCategoryTitle: "Services & Estimates",
    exampleServices: ["Kitchen Remodel", "Bathroom Remodel", "Room Addition", "Deck Building", "Free Estimate"],
    exampleFAQs: ["Are you licensed and insured?", "How long does a kitchen remodel take?", "Do you handle permits?"],
  },
  "roofing": {
    appointmentLabel: "inspection",
    teamMemberLabel: "crew",
    addItemButton: "Add Service",
    itemNamePlaceholder: "e.g. Roof Inspection",
    exampleServices: ["Free Roof Inspection", "Leak Repair", "Shingle Replacement", "Full Roof Replacement"],
    exampleFAQs: ["Do you handle insurance claims?", "Is your roof inspection free?", "How long does a roof replacement take?"],
  },
  "handyman": {
    teamMemberLabel: "handyman",
    addItemButton: "Add Service",
    itemNamePlaceholder: "e.g. Faucet Repair",
    exampleServices: ["Small Repair", "Half Day", "Full Day", "TV Mounting", "Furniture Assembly"],
    exampleFAQs: ["Do you do minor plumbing?", "Do you charge by the hour or by the job?", "Can you handle multiple repairs in one visit?"],
  },
  "garage_door": {
    servicesLabel: "Garage Door Services",
    catalogCardTitle: "Your Services",
    addItemButton: "Add Service",
    itemNamePlaceholder: "e.g. Spring Replacement",
    servicesCategoryTitle: "Garage Door Services",
    teamMemberLabel: "technician",
    exampleServices: ["Door Repair", "Spring Replacement", "Opener Installation", "Tune-Up & Inspection", "Emergency Service"],
    exampleFAQs: ["Do you offer same-day service?", "What brands do you work with?", "Is there a service call fee?"],
  },
  "appliance_repair": {
    servicesLabel: "Appliance Repair Services",
    catalogCardTitle: "Your Services",
    addItemButton: "Add Service",
    itemNamePlaceholder: "e.g. Washer Repair",
    servicesCategoryTitle: "Appliance Repair Services",
    teamMemberLabel: "technician",
    exampleServices: ["Washer Repair", "Dryer Repair", "Refrigerator Repair", "Dishwasher Repair", "Oven/Range Repair", "Diagnostic Service"],
    exampleFAQs: ["What brands do you service?", "Do you charge a diagnostic fee?", "How quickly can you get parts?"],
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
      return terms.policiesCardTitle;
    case "knowledge":
      return terms.faqsCardTitle;
    default:
      return "";
  }
}

/**
 * Terminology key names that map to IndustryTerminology fields.
 * Used by Brain nav config cards to resolve dynamic titles at render time.
 */
export type TerminologyKey = keyof Pick<
  IndustryTerminology,
  "catalogCardTitle" | "faqsCardTitle" | "policiesCardTitle" | "coverageCardTitle" | "servicesCategoryTitle"
>;

// ---------------------------------------------------------------------------
// Booking action helpers — used by onboarding UI to show industry-native verbs
// ---------------------------------------------------------------------------

const BOOKING_VERBS: Record<string, { actionPhrase: string; autoSummary: string; readinessVerb: string; activeVerb: string }> = {
  job: { actionPhrase: "schedule a job", autoSummary: "schedule jobs automatically", readinessVerb: "schedule jobs", activeVerb: "scheduling jobs" },
  reservation: { actionPhrase: "make a reservation", autoSummary: "take reservations automatically", readinessVerb: "take reservations", activeVerb: "taking reservations" },
  dispatch: { actionPhrase: "request service", autoSummary: "assign dispatches automatically", readinessVerb: "dispatch jobs", activeVerb: "dispatching jobs" },
  visit: { actionPhrase: "schedule a visit", autoSummary: "schedule visits automatically", readinessVerb: "schedule visits", activeVerb: "scheduling visits" },
  session: { actionPhrase: "book a session", autoSummary: "book sessions automatically", readinessVerb: "book sessions", activeVerb: "booking sessions" },
  consultation: { actionPhrase: "schedule a consultation", autoSummary: "schedule consultations automatically", readinessVerb: "schedule consultations", activeVerb: "scheduling consultations" },
  appointment: { actionPhrase: "book an appointment", autoSummary: "book appointments automatically", readinessVerb: "book appointments", activeVerb: "booking appointments" },
  // GC: the "appointment" is a free on-site estimate visit
  estimate: { actionPhrase: "schedule a free estimate", autoSummary: "schedule free estimates automatically", readinessVerb: "schedule estimates", activeVerb: "scheduling estimates" },
  // Roofing: the "appointment" is an inspection
  inspection: { actionPhrase: "schedule a roof inspection", autoSummary: "schedule inspections automatically", readinessVerb: "schedule inspections", activeVerb: "scheduling inspections" },
  // Food mode: placing an order (not "booking")
  order: { actionPhrase: "place an order", autoSummary: "take orders automatically", readinessVerb: "take orders", activeVerb: "taking orders" },
  // Events / entertainment: booking an event
  event: { actionPhrase: "book an event", autoSummary: "book events automatically", readinessVerb: "book events", activeVerb: "booking events" },
  // Pest control: scheduling a treatment
  treatment: { actionPhrase: "schedule a treatment", autoSummary: "schedule treatments automatically", readinessVerb: "schedule treatments", activeVerb: "scheduling treatments" },
};

/** Returns phrasing like "schedule a job" or "book an appointment" based on appointmentLabel */
export function getBookingActionPhrase(appointmentLabel: string): string {
  return BOOKING_VERBS[appointmentLabel]?.actionPhrase ?? `book an ${appointmentLabel}`;
}

/** Returns phrasing like "schedule jobs automatically" for auto-book summary */
export function getAutoBookSummary(appointmentLabel: string): string {
  return BOOKING_VERBS[appointmentLabel]?.autoSummary ?? "book appointments automatically";
}

/** Returns phrasing like "schedule jobs" for readiness descriptions */
export function getReadinessVerb(appointmentLabel: string): string {
  return BOOKING_VERBS[appointmentLabel]?.readinessVerb ?? "book appointments";
}

/** Returns present-participle phrasing like "scheduling jobs" or "booking appointments" */
export function getActiveVerb(appointmentLabel: string): string {
  return BOOKING_VERBS[appointmentLabel]?.activeVerb ?? "booking appointments";
}

/**
 * Resolve a Brain card or category title using industry terminology.
 * If the card has a titleKey, it resolves from terminology; otherwise falls back to the static title.
 */
export function resolveCardTitle(
  titleKey: TerminologyKey | undefined,
  staticTitle: string,
  mode: BusinessMode,
  category?: IndustryCategory,
  slug?: string,
): string {
  if (!titleKey) return staticTitle;
  const terms = getIndustryTerminology(mode, category, slug);
  return terms[titleKey] || staticTitle;
}
