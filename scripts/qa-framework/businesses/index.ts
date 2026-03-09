/**
 * Business configurations for QA testing.
 * Each config represents a realistic business scenario.
 */
import type { BusinessConfig } from "../core/types.js";

// Hours must match Supabase format: { day: { closed: bool, windows: [{open, close}] } }
function makeHours(schedule: Record<string, { open: string; close: string } | null>) {
  const result: Record<string, any> = {};
  for (const [day, hours] of Object.entries(schedule)) {
    if (hours === null) {
      result[day] = { closed: true, windows: [] };
    } else {
      result[day] = { closed: false, windows: [{ open: hours.open, close: hours.close }] };
    }
  }
  return result;
}

const standardHours = makeHours({
  monday: { open: "08:00", close: "17:00" },
  tuesday: { open: "08:00", close: "17:00" },
  wednesday: { open: "08:00", close: "17:00" },
  thursday: { open: "08:00", close: "17:00" },
  friday: { open: "08:00", close: "17:00" },
  saturday: null,
  sunday: null,
});

const extendedHours = makeHours({
  monday: { open: "07:00", close: "19:00" },
  tuesday: { open: "07:00", close: "19:00" },
  wednesday: { open: "07:00", close: "19:00" },
  thursday: { open: "07:00", close: "19:00" },
  friday: { open: "07:00", close: "19:00" },
  saturday: { open: "08:00", close: "14:00" },
  sunday: null,
});

const retailHours = makeHours({
  monday: { open: "09:00", close: "20:00" },
  tuesday: { open: "09:00", close: "20:00" },
  wednesday: { open: "09:00", close: "20:00" },
  thursday: { open: "09:00", close: "20:00" },
  friday: { open: "09:00", close: "20:00" },
  saturday: { open: "09:00", close: "18:00" },
  sunday: { open: "10:00", close: "16:00" },
});

// ── Solo HVAC Technician ────────────────────────────────────────────

export const soloHvac: BusinessConfig = {
  name: "QA Comfort Air HVAC",
  slug: "solo-hvac",
  mode: "service",
  industry: "hvac",
  timezone: "America/New_York",
  size: "solo",
  phone: "+15550001001",
  address: "123 Test Ave, Edison, NJ 08817",
  hours: standardHours,
  services: [
    { name: "AC Tune-Up", duration_minutes: 60, price_type: "fixed", price_amount: 89 },
    { name: "Furnace Repair", duration_minutes: 120, price_type: "starting_at", price_amount: 150 },
    { name: "AC Installation", duration_minutes: 480, price_type: "quote_only", booking_type: "estimate_first" },
    { name: "Emergency HVAC Repair", duration_minutes: 90, price_type: "starting_at", price_amount: 200 },
  ],
  settings: {
    ai_booking_mode: "auto_confirm",
    same_day_enabled: true,
    buffer_minutes: 30,
    max_advance_days: 30,
  },
};

// ── 3-Person Plumbing Company ───────────────────────────────────────

export const teamPlumbing: BusinessConfig = {
  name: "QA DrainPro Plumbing",
  slug: "team-plumbing",
  mode: "service",
  industry: "plumbing",
  timezone: "America/New_York",
  size: "small",
  phone: "+15550001002",
  address: "456 Pipeline Rd, Newark, NJ 07102",
  hours: extendedHours,
  services: [
    { name: "Drain Cleaning", duration_minutes: 60, price_type: "fixed", price_amount: 125 },
    { name: "Water Heater Repair", duration_minutes: 120, price_type: "starting_at", price_amount: 175 },
    { name: "Water Heater Installation", duration_minutes: 240, price_type: "quote_only", booking_type: "estimate_first" },
    { name: "Leak Detection", duration_minutes: 90, price_type: "fixed", price_amount: 199 },
    { name: "Sewer Line Inspection", duration_minutes: 60, price_type: "fixed", price_amount: 250 },
  ],
  staff: [
    { name: "Mike Rodriguez", role: "lead_tech" },
    { name: "Jake Thompson", role: "technician" },
    { name: "Chris Patel", role: "apprentice" },
  ],
  settings: {
    ai_booking_mode: "auto_confirm",
    same_day_enabled: true,
    buffer_minutes: 15,
    max_advance_days: 14,
  },
};

// ── Auto Detailer (Mobile + In-Shop) ────────────────────────────────

export const autoDetailer: BusinessConfig = {
  name: "QA Shine Auto Detailing",
  slug: "auto-detailer",
  mode: "service",
  industry: "auto_detailing",
  timezone: "America/New_York",
  size: "solo",
  phone: "+15550001003",
  address: "789 Detail Lane, Freehold, NJ 07728",
  hours: makeHours({
    monday: { open: "08:00", close: "18:00" },
    tuesday: { open: "08:00", close: "18:00" },
    wednesday: { open: "08:00", close: "18:00" },
    thursday: { open: "08:00", close: "18:00" },
    friday: { open: "08:00", close: "18:00" },
    saturday: { open: "09:00", close: "15:00" },
    sunday: null,
  }),
  services: [
    {
      name: "Interior Detail",
      duration_minutes: 120,
      price_type: "starting_at",
      price_amount: 150,
      confirmation_mode: "auto_confirm",
      requires_dropoff: true,
      preparation_instructions: "Remove all personal belongings from the vehicle before your appointment.",
    },
    {
      name: "Exterior Detail",
      duration_minutes: 90,
      price_type: "starting_at",
      price_amount: 100,
      confirmation_mode: "auto_confirm",
      requires_dropoff: true,
    },
    {
      name: "Interior & Exterior Combo",
      duration_minutes: 240,
      price_type: "starting_at",
      price_amount: 225,
      confirmation_mode: "auto_confirm",
      requires_dropoff: true,
    },
    {
      name: "Mobile Interior Detail",
      duration_minutes: 150,
      price_type: "starting_at",
      price_amount: 200,
      confirmation_mode: "pending", // Mobile services require approval
      requires_dropoff: false,
    },
    {
      name: "Mobile Full Detail",
      duration_minutes: 300,
      price_type: "starting_at",
      price_amount: 350,
      confirmation_mode: "pending", // Mobile services require approval
      requires_dropoff: false,
    },
  ],
  settings: {
    ai_booking_mode: "auto_confirm",
    same_day_enabled: false,
    buffer_minutes: 15,
    max_advance_days: 30,
    dropoff_instructions: "You can drop your vehicle off anytime. Park in our lot and leave keys in the lockbox by the garage door. We will text you when it is ready.",
  },
};

// ── Barber Shop (5 Chairs) ──────────────────────────────────────────

export const barberShop: BusinessConfig = {
  name: "QA Kings Barber Shop",
  slug: "barber-shop",
  mode: "service",
  industry: "barber",
  timezone: "America/New_York",
  size: "small",
  phone: "+15550001004",
  address: "321 Main St, Jersey City, NJ 07302",
  hours: retailHours,
  services: [
    { name: "Haircut", duration_minutes: 30, price_type: "fixed", price_amount: 30 },
    { name: "Haircut & Beard Trim", duration_minutes: 45, price_type: "fixed", price_amount: 45 },
    { name: "Beard Trim", duration_minutes: 20, price_type: "fixed", price_amount: 20 },
    { name: "Hot Towel Shave", duration_minutes: 30, price_type: "fixed", price_amount: 35 },
    { name: "Kids Haircut", duration_minutes: 20, price_type: "fixed", price_amount: 20 },
  ],
  staff: [
    { name: "Tony Reyes", role: "owner_barber" },
    { name: "Marcus Johnson", role: "barber" },
    { name: "Danny Kim", role: "barber" },
    { name: "Alex Morales", role: "barber" },
    { name: "Jaylen Brooks", role: "apprentice" },
  ],
  settings: {
    ai_booking_mode: "auto_confirm",
    same_day_enabled: true,
    buffer_minutes: 5,
    max_advance_days: 7,
  },
};

// ── Towing Company (Dispatch Mode) ──────────────────────────────────

export const towingCompany: BusinessConfig = {
  name: "QA Rapid Tow Services",
  slug: "towing-dispatch",
  mode: "dispatch",
  industry: "towing",
  timezone: "America/New_York",
  size: "small",
  phone: "+15550001005",
  address: "555 Highway Blvd, Trenton, NJ 08608",
  hours: makeHours({
    monday: { open: "00:00", close: "23:59" },
    tuesday: { open: "00:00", close: "23:59" },
    wednesday: { open: "00:00", close: "23:59" },
    thursday: { open: "00:00", close: "23:59" },
    friday: { open: "00:00", close: "23:59" },
    saturday: { open: "00:00", close: "23:59" },
    sunday: { open: "00:00", close: "23:59" },
  }),
  services: [
    { name: "Standard Tow", duration_minutes: 60, price_type: "starting_at", price_amount: 75, requires_dropoff: true },
    { name: "Flatbed Tow", duration_minutes: 60, price_type: "starting_at", price_amount: 125, requires_dropoff: true },
    { name: "Jump Start", duration_minutes: 30, price_type: "fixed", price_amount: 50, requires_dropoff: false },
    { name: "Lockout Service", duration_minutes: 30, price_type: "fixed", price_amount: 65, requires_dropoff: false },
    { name: "Tire Change", duration_minutes: 30, price_type: "fixed", price_amount: 60, requires_dropoff: false },
  ],
  staff: [
    { name: "Dave Wilson", role: "driver" },
    { name: "Rob Martinez", role: "driver" },
    { name: "Sam Lee", role: "driver" },
  ],
  settings: {
    ai_booking_mode: "auto_confirm",
    same_day_enabled: true,
    buffer_minutes: 0,
    max_advance_days: 1,
  },
};

// ── Pizza Restaurant (Food Mode) ────────────────────────────────────

export const pizzaShop: BusinessConfig = {
  name: "QA Tony's Pizza",
  slug: "pizza-shop",
  mode: "food",
  industry: "restaurant",
  timezone: "America/New_York",
  size: "small",
  phone: "+15550001006",
  address: "100 Pizza Ave, Hoboken, NJ 07030",
  hours: makeHours({
    monday: { open: "11:00", close: "22:00" },
    tuesday: { open: "11:00", close: "22:00" },
    wednesday: { open: "11:00", close: "22:00" },
    thursday: { open: "11:00", close: "22:00" },
    friday: { open: "11:00", close: "23:00" },
    saturday: { open: "11:00", close: "23:00" },
    sunday: { open: "12:00", close: "21:00" },
  }),
  services: [],
  settings: {
    ai_booking_mode: "auto_confirm",
    same_day_enabled: true,
    buffer_minutes: 0,
    max_advance_days: 7,
  },
};

// ── Medical Office (Medical Mode) ───────────────────────────────────

export const medicalOffice: BusinessConfig = {
  name: "QA Garden State Family Medicine",
  slug: "medical-office",
  mode: "medical",
  industry: "medical",
  timezone: "America/New_York",
  size: "medium",
  phone: "+15550001007",
  address: "200 Health Blvd, Princeton, NJ 08540",
  hours: standardHours,
  services: [
    { name: "Annual Physical", duration_minutes: 45, price_type: "fixed", price_amount: 200 },
    { name: "Sick Visit", duration_minutes: 20, price_type: "fixed", price_amount: 150 },
    { name: "Follow-Up Visit", duration_minutes: 15, price_type: "fixed", price_amount: 100 },
    { name: "Telehealth Consultation", duration_minutes: 20, price_type: "fixed", price_amount: 75 },
  ],
  staff: [
    { name: "Dr. Sarah Chen", role: "physician" },
    { name: "Dr. James Park", role: "physician" },
    { name: "Nurse Maria Lopez", role: "nurse_practitioner" },
  ],
  settings: {
    ai_booking_mode: "pending",
    same_day_enabled: true,
    buffer_minutes: 10,
    max_advance_days: 60,
  },
};

// ── Car Dealership (Sales Mode) ─────────────────────────────────────

export const carDealership: BusinessConfig = {
  name: "QA Metro Motors",
  slug: "car-dealership",
  mode: "sales",
  industry: "auto_dealer",
  timezone: "America/New_York",
  size: "medium",
  phone: "+15550001008",
  address: "900 Auto Mall Dr, Cherry Hill, NJ 08002",
  hours: retailHours,
  services: [
    { name: "Test Drive", duration_minutes: 30, price_type: "quote_only" },
    { name: "Vehicle Appraisal", duration_minutes: 45, price_type: "quote_only" },
    { name: "Finance Consultation", duration_minutes: 60, price_type: "quote_only" },
  ],
  staff: [
    { name: "Sarah Kim", role: "sales_manager" },
    { name: "Mike Torres", role: "sales" },
    { name: "Lisa Brown", role: "sales" },
    { name: "David Chen", role: "finance" },
  ],
  settings: {
    ai_booking_mode: "pending",
    same_day_enabled: true,
    buffer_minutes: 15,
    max_advance_days: 14,
  },
};

// ── General Contractor (Large Team) ─────────────────────────────────

export const generalContractor: BusinessConfig = {
  name: "QA BuildRight Construction",
  slug: "general-contractor",
  mode: "service",
  industry: "general_contractor",
  timezone: "America/New_York",
  size: "large",
  phone: "+15550001009",
  address: "500 Builder Way, Morristown, NJ 07960",
  hours: standardHours,
  services: [
    { name: "Kitchen Remodel Consultation", duration_minutes: 90, price_type: "quote_only", booking_type: "consultation" },
    { name: "Bathroom Remodel Consultation", duration_minutes: 60, price_type: "quote_only", booking_type: "consultation" },
    { name: "Deck/Patio Estimate", duration_minutes: 60, price_type: "quote_only", booking_type: "estimate_first" },
    { name: "Handyman Service", duration_minutes: 120, price_type: "starting_at", price_amount: 150, booking_type: "direct_book" },
    { name: "Emergency Repair", duration_minutes: 120, price_type: "starting_at", price_amount: 200, booking_type: "direct_book" },
  ],
  staff: [
    { name: "Tom Builder", role: "project_manager" },
    { name: "Carlos Reyes", role: "foreman" },
    { name: "Ahmed Hassan", role: "estimator" },
  ],
  settings: {
    ai_booking_mode: "pending",
    same_day_enabled: false,
    buffer_minutes: 30,
    max_advance_days: 60,
  },
};

// ── Salon (Service Mode, Medium) ────────────────────────────────────

export const hairSalon: BusinessConfig = {
  name: "QA Luxe Hair Studio",
  slug: "hair-salon",
  mode: "service",
  industry: "salon",
  timezone: "America/New_York",
  size: "medium",
  phone: "+15550001010",
  address: "88 Beauty Blvd, Red Bank, NJ 07701",
  hours: makeHours({
    monday: null,
    tuesday: { open: "09:00", close: "19:00" },
    wednesday: { open: "09:00", close: "19:00" },
    thursday: { open: "09:00", close: "20:00" },
    friday: { open: "09:00", close: "20:00" },
    saturday: { open: "08:00", close: "17:00" },
    sunday: null,
  }),
  services: [
    { name: "Women's Haircut", duration_minutes: 45, price_type: "fixed", price_amount: 65 },
    { name: "Men's Haircut", duration_minutes: 30, price_type: "fixed", price_amount: 35 },
    { name: "Color & Highlights", duration_minutes: 120, price_type: "starting_at", price_amount: 150 },
    { name: "Blowout", duration_minutes: 30, price_type: "fixed", price_amount: 45 },
    { name: "Keratin Treatment", duration_minutes: 180, price_type: "fixed", price_amount: 300 },
    { name: "Bridal Hair", duration_minutes: 120, price_type: "starting_at", price_amount: 200, confirmation_mode: "pending" },
  ],
  staff: [
    { name: "Jessica Lane", role: "owner_stylist" },
    { name: "Emma Watson", role: "senior_stylist" },
    { name: "Priya Sharma", role: "stylist" },
    { name: "Olivia Nguyen", role: "junior_stylist" },
  ],
  settings: {
    ai_booking_mode: "auto_confirm",
    same_day_enabled: true,
    buffer_minutes: 10,
    max_advance_days: 30,
  },
};

// ── All businesses for full suite runs ──────────────────────────────

export const ALL_BUSINESSES: BusinessConfig[] = [
  soloHvac,
  teamPlumbing,
  autoDetailer,
  barberShop,
  towingCompany,
  pizzaShop,
  medicalOffice,
  carDealership,
  generalContractor,
  hairSalon,
];

// Filtered groups
export const SERVICE_BUSINESSES = ALL_BUSINESSES.filter(b => b.mode === "service");
export const DISPATCH_BUSINESSES = ALL_BUSINESSES.filter(b => b.mode === "dispatch");
export const FOOD_BUSINESSES = ALL_BUSINESSES.filter(b => b.mode === "food");
export const MEDICAL_BUSINESSES = ALL_BUSINESSES.filter(b => b.mode === "medical");
export const SALES_BUSINESSES = ALL_BUSINESSES.filter(b => b.mode === "sales");
