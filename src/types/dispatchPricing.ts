/**
 * Dispatch Pricing Configuration Types
 * 
 * These types define the complex pricing structures needed for dispatch businesses
 * like towing, HVAC, plumbing, etc. where pricing depends on variables like
 * distance, vehicle type, and time of day.
 */

export type PricingModel = "flat" | "distance_tiered" | "per_unit" | "package" | "variable";

/**
 * Distance basis determines which distance measurement is used for pricing calculations.
 * Different businesses have different pricing models:
 * - tow_distance: Charge based on how far the vehicle is towed (pickup → dropoff)
 * - dispatch_distance: Charge based on how far we travel to reach the customer (base → pickup)
 * - total_trip: Charge for the entire trip (base → pickup → dropoff)
 * - flat: Distance doesn't affect pricing
 */
export type DistanceBasis = 
  | "tow_distance"      // Pickup → Dropoff (most common for towing)
  | "dispatch_distance" // Base → Pickup (charge for coming to you)
  | "total_trip"        // Base → Pickup → Dropoff (full trip)
  | "flat";             // Ignore distance

export const DISTANCE_BASIS_OPTIONS = [
  {
    value: "default" as const,
    label: "Use Business Default",
    description: "Use the default set in your Business Brain",
  },
  { 
    value: "tow_distance" as const, 
    label: "Tow Distance (pickup → dropoff)", 
    description: "Price based on how far the vehicle is towed" 
  },
  { 
    value: "dispatch_distance" as const, 
    label: "Dispatch Distance (base → pickup)", 
    description: "Price based on how far we travel to reach customer" 
  },
  { 
    value: "total_trip" as const, 
    label: "Total Trip (base → pickup → dropoff)", 
    description: "Price based on entire round trip distance" 
  },
] as const;

export interface DistanceTier {
  min_miles: number;
  max_miles: number | null; // null = unlimited
  base_price: number;
  per_mile_price?: number;
}

export interface PriceModifier {
  value: string; // "sedan", "suv", "truck", "motorcycle"
  price_adjustment: number;
  adjustment_type: "fixed" | "percent";
}

export interface PricingVariable {
  key: string; // "vehicle_type", "fuel_type", "urgency"
  label: string;
  modifiers: PriceModifier[];
}

export interface DestinationRule {
  type: "customer_choice" | "nearest_shop" | "home" | "specified";
  price_adjustment?: number;
  label: string;
}

/** AI quoting behavior — business owner controls how the AI handles pricing on calls */
export type AIQuoteBehavior =
  | "calculate_total"       // AI computes and speaks the total (e.g., "4 rooms at $45 = $180")
  | "quote_rate_only"       // AI states the rate but doesn't compute (e.g., "We charge $45 per room")
  | "always_quote_required"; // AI says "we'll provide a custom quote" regardless of model

/** Trip fee / service call fee that applies before the main service charge */
export interface TripFee {
  enabled: boolean;
  amount: number;
  label: string;                // "Service Call Fee", "Trip Charge", "Diagnostic Fee", "Travel Fee"
  waived_with_service?: boolean; // "Waived if you book the repair"
}

/** Package tier for package-based pricing */
export interface PackageTier {
  name: string;
  price: number;
  description?: string;
  is_popular?: boolean;
}

/** Common unit labels for per-unit pricing */
export const UNIT_LABEL_OPTIONS = [
  { value: "hour", label: "Per Hour" },
  { value: "room", label: "Per Room" },
  { value: "unit", label: "Per Unit" },
  { value: "load", label: "Per Load" },
  { value: "day", label: "Per Day" },
  { value: "week", label: "Per Week" },
  { value: "month", label: "Per Month" },
  { value: "lock", label: "Per Lock" },
  { value: "tree", label: "Per Tree" },
  { value: "sqft", label: "Per Sq Ft" },
  { value: "custom", label: "Custom" },
] as const;

export interface DispatchPricingConfig {
  pricing_model: PricingModel;

  /**
   * Which distance to use for pricing calculations.
   * Defaults to "tow_distance" for towing services, "dispatch_distance" for others.
   */
  distance_basis?: DistanceBasis;

  // For distance-tiered pricing (towing, delivery)
  distance_tiers?: DistanceTier[];

  // For variable pricing based on factors like vehicle type
  variables?: PricingVariable[];

  // Price bounds
  min_price?: number;
  max_price?: number;

  // Destination-based pricing rules
  destination_rules?: DestinationRule[];

  /**
   * For flat-rate services: miles included in the base price before overage kicks in.
   * Example: 25 means the first 25 miles are included in the flat rate.
   */
  included_miles?: number;

  /**
   * Per-mile rate charged beyond included_miles.
   * Example: 3 means $3/mile beyond the included distance.
   */
  overage_per_mile?: number;

  // --- Trip / Service Call Fee (applies to ANY pricing model) ---
  trip_fee?: TripFee;

  // --- Per-Unit Model ---
  unit_label?: string;       // "hour", "room", "load", "day", etc.
  per_unit_price?: number;
  min_units?: number;
  max_units?: number;

  // --- Package Model ---
  packages?: PackageTier[];

  // --- AI Quoting Behavior ---
  ai_quote_behavior?: AIQuoteBehavior;
}

// Service categories for dispatch businesses
export type DispatchServiceCategory =
  | "towing"
  | "roadside"
  | "recovery"
  | "transport"
  | "add-ons"
  | "emergency"
  | "home_services"
  | "mobile_services"
  | "hauling_rental"
  | "uncategorized";

// Service type presets for quick setup
export type DispatchServiceType =
  | "local_tow"
  | "long_distance_tow"
  | "motorcycle_tow"
  | "heavy_duty_tow"
  | "jump_start"
  | "lockout"
  | "tire_change"
  | "fuel_delivery"
  | "winch_out"
  | "flatbed"
  | "roadside_assist"
  // Home services
  | "plumbing_repair"
  | "hvac_service"
  | "electrical_work"
  | "locksmith_service"
  | "carpet_cleaning"
  | "pest_control"
  | "lawn_care"
  | "handyman"
  | "pool_service"
  | "appliance_repair"
  // Mobile services
  | "mobile_detailing"
  | "car_wash"
  | "mobile_mechanic"
  | "mobile_vet"
  | "it_support_remote"
  | "it_support_onsite"
  // Hauling & rental
  | "junk_removal"
  | "dumpster_rental"
  | "courier"
  | "septic_service"
  | "custom";

// Preset templates for common dispatch services
export interface DispatchServicePreset {
  type: DispatchServiceType;
  name: string;
  description: string;
  category: DispatchServiceCategory;
  icon: string;
  defaultDuration: number;
  defaultPricingConfig: DispatchPricingConfig;
  /** Whether this service type requires a dropoff/destination location */
  requires_dropoff: boolean;
  /** Which tab this preset appears in on the selection grid */
  presetTab: PresetCategoryTab;
}

// Vehicle type options for towing
export const VEHICLE_TYPES = [
  { value: "motorcycle", label: "Motorcycle", adjustment: -25 },
  { value: "sedan", label: "Sedan/Compact", adjustment: 0 },
  { value: "suv", label: "SUV/Crossover", adjustment: 25 },
  { value: "truck", label: "Pickup Truck", adjustment: 50 },
  { value: "van", label: "Van", adjustment: 50 },
  { value: "rv", label: "RV/Motorhome", adjustment: 100 },
  { value: "commercial", label: "Commercial Vehicle", adjustment: 150 },
] as const;

// Fuel types for fuel delivery
export const FUEL_TYPES = [
  { value: "regular", label: "Regular Unleaded", adjustment: 0 },
  { value: "premium", label: "Premium", adjustment: 5 },
  { value: "diesel", label: "Diesel", adjustment: 0 },
] as const;

// Service category metadata
export const DISPATCH_CATEGORIES: Record<DispatchServiceCategory, { label: string; order: number }> = {
  towing: { label: "Towing Services", order: 1 },
  roadside: { label: "Roadside Assistance", order: 2 },
  recovery: { label: "Recovery & Specialty", order: 3 },
  transport: { label: "Transport & Hauling", order: 4 },
  emergency: { label: "Emergency Services", order: 5 },
  home_services: { label: "Home Services", order: 6 },
  mobile_services: { label: "Mobile Services", order: 7 },
  hauling_rental: { label: "Hauling & Rental", order: 8 },
  "add-ons": { label: "Add-On Services", order: 9 },
  uncategorized: { label: "Other Services", order: 99 },
};

/** Preset categories for organizing the Step 1 selection grid */
export const PRESET_CATEGORY_TABS = [
  { id: "towing_roadside", label: "Towing & Roadside" },
  { id: "home_services", label: "Home Services" },
  { id: "mobile_services", label: "Mobile Services" },
  { id: "hauling_rental", label: "Hauling & Rental" },
] as const;

export type PresetCategoryTab = typeof PRESET_CATEGORY_TABS[number]["id"];

// Preset service templates
export const DISPATCH_SERVICE_PRESETS: DispatchServicePreset[] = [
  // ── Towing & Roadside ──
  {
    type: "local_tow",
    name: "Local Tow",
    description: "Standard towing within city limits",
    category: "towing",
    icon: "truck",
    defaultDuration: 60,
    requires_dropoff: true,
    presetTab: "towing_roadside",
    defaultPricingConfig: {
      pricing_model: "distance_tiered",
      distance_tiers: [
        { min_miles: 0, max_miles: 10, base_price: 125, per_mile_price: 0 },
        { min_miles: 10, max_miles: 25, base_price: 125, per_mile_price: 5 },
        { min_miles: 25, max_miles: null, base_price: 200, per_mile_price: 4 },
      ],
      variables: [
        {
          key: "vehicle_type",
          label: "Vehicle Type",
          modifiers: [
            { value: "motorcycle", price_adjustment: -25, adjustment_type: "fixed" },
            { value: "suv", price_adjustment: 25, adjustment_type: "fixed" },
            { value: "truck", price_adjustment: 50, adjustment_type: "fixed" },
          ],
        },
      ],
      min_price: 85,
      ai_quote_behavior: "calculate_total",
    },
  },
  {
    type: "long_distance_tow",
    name: "Long Distance Tow",
    description: "Towing over 25 miles",
    category: "towing",
    icon: "truck",
    defaultDuration: 180,
    requires_dropoff: true,
    presetTab: "towing_roadside",
    defaultPricingConfig: {
      pricing_model: "distance_tiered",
      distance_tiers: [
        { min_miles: 0, max_miles: null, base_price: 200, per_mile_price: 3.5 },
      ],
      variables: [
        {
          key: "vehicle_type",
          label: "Vehicle Type",
          modifiers: [
            { value: "suv", price_adjustment: 50, adjustment_type: "fixed" },
            { value: "truck", price_adjustment: 75, adjustment_type: "fixed" },
          ],
        },
      ],
      min_price: 200,
      ai_quote_behavior: "calculate_total",
    },
  },
  {
    type: "jump_start",
    name: "Jump Start",
    description: "Battery jump start service",
    category: "roadside",
    icon: "zap",
    defaultDuration: 30,
    requires_dropoff: false,
    presetTab: "towing_roadside",
    defaultPricingConfig: {
      pricing_model: "flat",
      min_price: 65,
      ai_quote_behavior: "calculate_total",
    },
  },
  {
    type: "lockout",
    name: "Lockout Service",
    description: "Vehicle lockout assistance",
    category: "roadside",
    icon: "key",
    defaultDuration: 30,
    requires_dropoff: false,
    presetTab: "towing_roadside",
    defaultPricingConfig: {
      pricing_model: "flat",
      min_price: 75,
      ai_quote_behavior: "calculate_total",
    },
  },
  {
    type: "tire_change",
    name: "Tire Change",
    description: "Flat tire change with spare",
    category: "roadside",
    icon: "circle",
    defaultDuration: 30,
    requires_dropoff: false,
    presetTab: "towing_roadside",
    defaultPricingConfig: {
      pricing_model: "flat",
      min_price: 85,
      ai_quote_behavior: "calculate_total",
    },
  },
  {
    type: "fuel_delivery",
    name: "Fuel Delivery",
    description: "Emergency fuel delivery",
    category: "roadside",
    icon: "fuel",
    defaultDuration: 45,
    requires_dropoff: false,
    presetTab: "towing_roadside",
    defaultPricingConfig: {
      pricing_model: "variable",
      variables: [
        {
          key: "fuel_type",
          label: "Fuel Type",
          modifiers: [
            { value: "regular", price_adjustment: 0, adjustment_type: "fixed" },
            { value: "premium", price_adjustment: 5, adjustment_type: "fixed" },
            { value: "diesel", price_adjustment: 0, adjustment_type: "fixed" },
          ],
        },
      ],
      min_price: 55,
      ai_quote_behavior: "calculate_total",
    },
  },
  {
    type: "winch_out",
    name: "Winch Out",
    description: "Vehicle recovery from ditch or stuck position",
    category: "recovery",
    icon: "anchor",
    defaultDuration: 60,
    requires_dropoff: false,
    presetTab: "towing_roadside",
    defaultPricingConfig: {
      pricing_model: "variable",
      min_price: 100,
      max_price: 500,
      ai_quote_behavior: "always_quote_required",
    },
  },
  {
    type: "heavy_duty_tow",
    name: "Heavy Duty Tow",
    description: "Towing for large trucks, RVs, commercial vehicles",
    category: "towing",
    icon: "truck",
    defaultDuration: 120,
    requires_dropoff: true,
    presetTab: "towing_roadside",
    defaultPricingConfig: {
      pricing_model: "distance_tiered",
      distance_tiers: [
        { min_miles: 0, max_miles: 10, base_price: 250, per_mile_price: 0 },
        { min_miles: 10, max_miles: null, base_price: 250, per_mile_price: 8 },
      ],
      min_price: 250,
      ai_quote_behavior: "calculate_total",
    },
  },

  // ── Home Services ──
  {
    type: "plumbing_repair",
    name: "Plumbing Repair",
    description: "General plumbing repair service",
    category: "home_services",
    icon: "wrench",
    defaultDuration: 120,
    requires_dropoff: false,
    presetTab: "home_services",
    defaultPricingConfig: {
      pricing_model: "per_unit",
      unit_label: "hour",
      per_unit_price: 125,
      min_units: 1,
      trip_fee: { enabled: true, amount: 95, label: "Diagnostic Fee", waived_with_service: false },
      ai_quote_behavior: "quote_rate_only",
    },
  },
  {
    type: "hvac_service",
    name: "HVAC Service",
    description: "Heating and cooling repair & maintenance",
    category: "home_services",
    icon: "thermometer",
    defaultDuration: 120,
    requires_dropoff: false,
    presetTab: "home_services",
    defaultPricingConfig: {
      pricing_model: "per_unit",
      unit_label: "hour",
      per_unit_price: 100,
      min_units: 1,
      trip_fee: { enabled: true, amount: 85, label: "Diagnostic Fee", waived_with_service: false },
      ai_quote_behavior: "quote_rate_only",
    },
  },
  {
    type: "electrical_work",
    name: "Electrical Work",
    description: "Electrical repair and installation",
    category: "home_services",
    icon: "zap",
    defaultDuration: 120,
    requires_dropoff: false,
    presetTab: "home_services",
    defaultPricingConfig: {
      pricing_model: "per_unit",
      unit_label: "hour",
      per_unit_price: 90,
      min_units: 1,
      trip_fee: { enabled: true, amount: 75, label: "Service Call Fee", waived_with_service: false },
      ai_quote_behavior: "quote_rate_only",
    },
  },
  {
    type: "locksmith_service",
    name: "Locksmith Service",
    description: "Residential and commercial lock services",
    category: "home_services",
    icon: "key",
    defaultDuration: 60,
    requires_dropoff: false,
    presetTab: "home_services",
    defaultPricingConfig: {
      pricing_model: "flat",
      min_price: 75,
      trip_fee: { enabled: true, amount: 25, label: "Trip Charge", waived_with_service: false },
      ai_quote_behavior: "calculate_total",
    },
  },
  {
    type: "carpet_cleaning",
    name: "Carpet Cleaning",
    description: "Professional carpet cleaning service",
    category: "home_services",
    icon: "sparkles",
    defaultDuration: 120,
    requires_dropoff: false,
    presetTab: "home_services",
    defaultPricingConfig: {
      pricing_model: "per_unit",
      unit_label: "room",
      per_unit_price: 45,
      min_units: 3,
      min_price: 135,
      ai_quote_behavior: "calculate_total",
    },
  },
  {
    type: "pest_control",
    name: "Pest Control",
    description: "Pest treatment and prevention",
    category: "home_services",
    icon: "bug",
    defaultDuration: 90,
    requires_dropoff: false,
    presetTab: "home_services",
    defaultPricingConfig: {
      pricing_model: "flat",
      min_price: 200,
      trip_fee: { enabled: true, amount: 50, label: "Inspection Fee", waived_with_service: true },
      ai_quote_behavior: "calculate_total",
    },
  },
  {
    type: "lawn_care",
    name: "Lawn Care",
    description: "Lawn mowing, trimming, and maintenance",
    category: "home_services",
    icon: "leaf",
    defaultDuration: 60,
    requires_dropoff: false,
    presetTab: "home_services",
    defaultPricingConfig: {
      pricing_model: "package",
      packages: [
        { name: "Small Yard", price: 40, description: "Under 5,000 sq ft" },
        { name: "Medium Yard", price: 65, description: "5,000-10,000 sq ft", is_popular: true },
        { name: "Large Yard", price: 95, description: "Over 10,000 sq ft" },
      ],
      ai_quote_behavior: "calculate_total",
    },
  },
  {
    type: "handyman",
    name: "Handyman",
    description: "General repairs and odd jobs",
    category: "home_services",
    icon: "hammer",
    defaultDuration: 120,
    requires_dropoff: false,
    presetTab: "home_services",
    defaultPricingConfig: {
      pricing_model: "per_unit",
      unit_label: "hour",
      per_unit_price: 75,
      min_units: 2,
      min_price: 150,
      ai_quote_behavior: "quote_rate_only",
    },
  },
  {
    type: "pool_service",
    name: "Pool Service",
    description: "Pool cleaning, maintenance, and repair",
    category: "home_services",
    icon: "waves",
    defaultDuration: 90,
    requires_dropoff: false,
    presetTab: "home_services",
    defaultPricingConfig: {
      pricing_model: "package",
      packages: [
        { name: "Monthly Maintenance", price: 125, description: "Weekly cleaning & chemicals", is_popular: true },
        { name: "One-Time Clean", price: 200, description: "Deep clean & balance" },
        { name: "Season Opening", price: 350, description: "Full startup service" },
      ],
      ai_quote_behavior: "calculate_total",
    },
  },
  {
    type: "appliance_repair",
    name: "Appliance Repair",
    description: "Major appliance diagnosis and repair",
    category: "home_services",
    icon: "settings",
    defaultDuration: 90,
    requires_dropoff: false,
    presetTab: "home_services",
    defaultPricingConfig: {
      pricing_model: "variable",
      min_price: 150,
      max_price: 350,
      trip_fee: { enabled: true, amount: 75, label: "Service Call Fee", waived_with_service: true },
      ai_quote_behavior: "always_quote_required",
    },
  },

  // ── Mobile Services ──
  {
    type: "mobile_detailing",
    name: "Mobile Detailing",
    description: "Professional mobile auto detailing",
    category: "mobile_services",
    icon: "sparkles",
    defaultDuration: 180,
    requires_dropoff: false,
    presetTab: "mobile_services",
    defaultPricingConfig: {
      pricing_model: "package",
      packages: [
        { name: "Basic Wash", price: 80, description: "Exterior wash, interior vacuum" },
        { name: "Standard Detail", price: 150, description: "Full interior & exterior cleaning", is_popular: true },
        { name: "Premium Detail", price: 250, description: "Full detail + ceramic coating" },
      ],
      variables: [
        {
          key: "vehicle_type",
          label: "Vehicle Size",
          modifiers: [
            { value: "sedan", price_adjustment: 0, adjustment_type: "fixed" },
            { value: "suv", price_adjustment: 30, adjustment_type: "fixed" },
            { value: "truck", price_adjustment: 40, adjustment_type: "fixed" },
            { value: "van", price_adjustment: 50, adjustment_type: "fixed" },
          ],
        },
      ],
      ai_quote_behavior: "calculate_total",
    },
  },
  {
    type: "car_wash",
    name: "Car Wash",
    description: "Mobile car wash service",
    category: "mobile_services",
    icon: "droplets",
    defaultDuration: 60,
    requires_dropoff: false,
    presetTab: "mobile_services",
    defaultPricingConfig: {
      pricing_model: "package",
      packages: [
        { name: "Express Wash", price: 25, description: "Exterior wash & dry" },
        { name: "Full Wash", price: 50, description: "Interior & exterior", is_popular: true },
        { name: "Detail Wash", price: 100, description: "Full wash + wax & tire shine" },
      ],
      ai_quote_behavior: "calculate_total",
    },
  },
  {
    type: "mobile_mechanic",
    name: "Mobile Mechanic",
    description: "On-site vehicle diagnosis and repair",
    category: "mobile_services",
    icon: "wrench",
    defaultDuration: 120,
    requires_dropoff: false,
    presetTab: "mobile_services",
    defaultPricingConfig: {
      pricing_model: "variable",
      min_price: 100,
      max_price: 500,
      trip_fee: { enabled: true, amount: 75, label: "Diagnostic Fee", waived_with_service: true },
      ai_quote_behavior: "always_quote_required",
    },
  },
  {
    type: "mobile_vet",
    name: "Mobile Vet",
    description: "In-home veterinary care",
    category: "mobile_services",
    icon: "heart",
    defaultDuration: 60,
    requires_dropoff: false,
    presetTab: "mobile_services",
    defaultPricingConfig: {
      pricing_model: "flat",
      min_price: 100,
      trip_fee: { enabled: true, amount: 35, label: "Travel Fee", waived_with_service: false },
      ai_quote_behavior: "calculate_total",
    },
  },
  {
    type: "it_support_remote",
    name: "IT Support (Remote)",
    description: "Remote tech support and troubleshooting",
    category: "mobile_services",
    icon: "monitor",
    defaultDuration: 60,
    requires_dropoff: false,
    presetTab: "mobile_services",
    defaultPricingConfig: {
      pricing_model: "per_unit",
      unit_label: "hour",
      per_unit_price: 75,
      min_units: 0.5,
      ai_quote_behavior: "quote_rate_only",
    },
  },
  {
    type: "it_support_onsite",
    name: "IT Support (On-Site)",
    description: "On-site tech support and setup",
    category: "mobile_services",
    icon: "monitor",
    defaultDuration: 120,
    requires_dropoff: false,
    presetTab: "mobile_services",
    defaultPricingConfig: {
      pricing_model: "per_unit",
      unit_label: "hour",
      per_unit_price: 125,
      min_units: 1,
      trip_fee: { enabled: true, amount: 50, label: "Travel Fee", waived_with_service: false },
      ai_quote_behavior: "quote_rate_only",
    },
  },

  // ── Hauling & Rental ──
  {
    type: "junk_removal",
    name: "Junk Removal",
    description: "Residential and commercial junk removal",
    category: "hauling_rental",
    icon: "trash",
    defaultDuration: 120,
    requires_dropoff: false,
    presetTab: "hauling_rental",
    defaultPricingConfig: {
      pricing_model: "package",
      packages: [
        { name: "Quarter Load", price: 150, description: "1/4 truck load" },
        { name: "Half Load", price: 275, description: "1/2 truck load", is_popular: true },
        { name: "Three-Quarter Load", price: 375, description: "3/4 truck load" },
        { name: "Full Load", price: 475, description: "Full truck load" },
      ],
      ai_quote_behavior: "calculate_total",
    },
  },
  {
    type: "dumpster_rental",
    name: "Dumpster Rental",
    description: "Roll-off dumpster delivery and pickup",
    category: "hauling_rental",
    icon: "container",
    defaultDuration: 30,
    requires_dropoff: false,
    presetTab: "hauling_rental",
    defaultPricingConfig: {
      pricing_model: "per_unit",
      unit_label: "day",
      per_unit_price: 25,
      min_units: 3,
      min_price: 350,
      trip_fee: { enabled: true, amount: 100, label: "Delivery Fee", waived_with_service: false },
      ai_quote_behavior: "calculate_total",
    },
  },
  {
    type: "courier",
    name: "Courier / Delivery",
    description: "Package pickup and delivery service",
    category: "hauling_rental",
    icon: "package",
    defaultDuration: 60,
    requires_dropoff: true,
    presetTab: "hauling_rental",
    defaultPricingConfig: {
      pricing_model: "distance_tiered",
      distance_tiers: [
        { min_miles: 0, max_miles: 10, base_price: 15, per_mile_price: 0 },
        { min_miles: 10, max_miles: null, base_price: 15, per_mile_price: 2 },
      ],
      min_price: 15,
      ai_quote_behavior: "calculate_total",
    },
  },
  {
    type: "septic_service",
    name: "Septic Service",
    description: "Septic tank pumping and maintenance",
    category: "hauling_rental",
    icon: "droplets",
    defaultDuration: 120,
    requires_dropoff: false,
    presetTab: "hauling_rental",
    defaultPricingConfig: {
      pricing_model: "flat",
      min_price: 400,
      ai_quote_behavior: "calculate_total",
    },
  },
];

/**
 * Generate a human-readable pricing summary for AI voice output.
 * Respects ai_quote_behavior to control how much pricing detail is spoken.
 */
export function generatePricingSummary(config: DispatchPricingConfig | null, serviceName: string): string {
  if (!config) {
    return `${serviceName} requires a custom quote based on your situation.`;
  }

  // If business owner says "always quote required", override regardless of model
  if (config.ai_quote_behavior === "always_quote_required") {
    const prefix = config.trip_fee?.enabled
      ? `There's a $${config.trip_fee.amount} ${config.trip_fee.label.toLowerCase()}. `
      : "";
    return `${prefix}${serviceName} pricing depends on your specific needs. We'll provide a custom quote.`;
  }

  const parts: string[] = [];

  // Trip fee prefix
  if (config.trip_fee?.enabled) {
    const waiveNote = config.trip_fee.waived_with_service
      ? " (waived if you book the service)"
      : "";
    parts.push(`There's a $${config.trip_fee.amount} ${config.trip_fee.label.toLowerCase()}${waiveNote}`);
  }

  if (config.pricing_model === "flat" && config.min_price) {
    let flatText = `${serviceName} is $${config.min_price} flat rate`;
    if (config.included_miles && config.overage_per_mile) {
      flatText += ` within ${config.included_miles} miles, +$${config.overage_per_mile}/mile beyond`;
    }
    parts.push(flatText);
  } else if (config.pricing_model === "distance_tiered" && config.distance_tiers?.length) {
    const firstTier = config.distance_tiers[0];
    parts.push(`${serviceName} starts at $${firstTier.base_price}`);

    if (firstTier.max_miles) {
      parts.push(`for the first ${firstTier.max_miles} miles`);
    }

    const tiersWithPerMile = config.distance_tiers.filter(t => t.per_mile_price && t.per_mile_price > 0);
    if (tiersWithPerMile.length > 0) {
      const avgRate = tiersWithPerMile.reduce((sum, t) => sum + (t.per_mile_price || 0), 0) / tiersWithPerMile.length;
      parts.push(`then $${avgRate.toFixed(0)} per mile after that`);
    }
  } else if (config.pricing_model === "per_unit" && config.per_unit_price && config.unit_label) {
    const unitLabel = config.unit_label;
    if (config.ai_quote_behavior === "quote_rate_only") {
      // Just state the rate, don't compute
      parts.push(`${serviceName} is $${config.per_unit_price} per ${unitLabel}`);
      if (config.min_units && config.min_units > 1) {
        parts.push(`with a ${config.min_units}-${unitLabel} minimum`);
      }
    } else {
      // Calculate total: state rate + minimum charge
      parts.push(`${serviceName} is $${config.per_unit_price} per ${unitLabel}`);
      if (config.min_units && config.min_units > 1) {
        const minTotal = config.per_unit_price * config.min_units;
        parts.push(`${config.min_units}-${unitLabel} minimum, so starting at $${minTotal}`);
      }
    }
  } else if (config.pricing_model === "package" && config.packages?.length) {
    const pkgs = config.packages;
    if (pkgs.length <= 3) {
      const tierList = pkgs.map(p => `${p.name} for $${p.price}`).join(", ");
      parts.push(`We offer ${tierList}`);
    } else {
      const first = pkgs[0];
      const last = pkgs[pkgs.length - 1];
      parts.push(`${serviceName} packages range from $${first.price} to $${last.price}`);
    }
  } else if (config.pricing_model === "variable") {
    if (config.min_price && config.max_price) {
      parts.push(`${serviceName} ranges from $${config.min_price} to $${config.max_price}`);
    } else if (config.min_price) {
      parts.push(`${serviceName} starts at $${config.min_price}`);
    } else {
      parts.push(`${serviceName} pricing depends on your specific situation`);
    }
  }

  const vehicleVar = config.variables?.find(v => v.key === "vehicle_type");
  if (vehicleVar && vehicleVar.modifiers.length > 0) {
    const maxAdjustment = Math.max(...vehicleVar.modifiers.map(m => Math.abs(m.price_adjustment)));
    if (maxAdjustment > 0) {
      parts.push(`Vehicle type may add $25-${maxAdjustment} depending on size`);
    }
  }

  return parts.join(". ") + ".";
}

/**
 * Calculate sample quotes for display in the editor.
 * Returns distance-based quotes for distance models, or unit-based quotes for per_unit/package.
 */
export function calculateScenarioQuotes(
  config: DispatchPricingConfig,
  serviceName: string,
): { distance: number; price: number; label: string }[] {
  if (config.pricing_model === "per_unit" && config.per_unit_price && config.unit_label) {
    const units = [1, 2, 3, 5];
    const minUnits = config.min_units || 0;
    return units.map((u) => {
      const effectiveUnits = Math.max(u, minUnits);
      const result = calculateDispatchPrice(config, 0, { units: String(effectiveUnits) });
      return { distance: u, price: result.min, label: `${u} ${config.unit_label}${u !== 1 ? "s" : ""} → $${result.min}` };
    });
  }

  if (config.pricing_model === "package" && config.packages?.length) {
    return config.packages.map((pkg, i) => {
      const tripFee = config.trip_fee?.enabled ? config.trip_fee.amount : 0;
      return { distance: i, price: pkg.price + tripFee, label: `${pkg.name} → $${pkg.price + tripFee}` };
    });
  }

  const distances = [5, 15, 30, 50];
  return distances.map((d) => {
    const result = calculateDispatchPrice(config, d);
    return { distance: d, price: result.min, label: `${d}-mile job → $${result.min}` };
  });
}

/**
 * Calculate estimated price based on config and variables.
 * Supports all 5 pricing models: flat, distance_tiered, per_unit, package, variable.
 */
export function calculateDispatchPrice(
  config: DispatchPricingConfig,
  distanceMiles: number = 0,
  variables: Record<string, string> = {}
): { min: number; max: number; description: string } {
  let basePrice = config.min_price || 0;
  let description = "";

  // Trip fee component
  const tripFee = config.trip_fee?.enabled ? config.trip_fee.amount : 0;

  if (config.pricing_model === "flat") {
    basePrice = config.min_price || 0;
    description = `Flat: $${basePrice}`;
    if (config.included_miles && config.overage_per_mile && distanceMiles > config.included_miles) {
      const overage = (distanceMiles - config.included_miles) * config.overage_per_mile;
      basePrice += overage;
      description += ` + $${overage.toFixed(0)} overage`;
    }
  } else if (config.pricing_model === "distance_tiered" && config.distance_tiers) {
    for (const tier of config.distance_tiers) {
      const tierMin = tier.min_miles;
      const tierMax = tier.max_miles ?? Infinity;

      if (distanceMiles >= tierMin && distanceMiles <= tierMax) {
        basePrice = tier.base_price;
        if (tier.per_mile_price && distanceMiles > tierMin) {
          basePrice += (distanceMiles - tierMin) * tier.per_mile_price;
        }
        description = `Base: $${tier.base_price}`;
        if (tier.per_mile_price) {
          const extraMiles = Math.max(0, distanceMiles - tierMin);
          description += ` + ${extraMiles} mi × $${tier.per_mile_price}/mi`;
        }
        break;
      }
    }
  } else if (config.pricing_model === "per_unit" && config.per_unit_price) {
    const units = parseFloat(variables.units || String(config.min_units || 1));
    const effectiveUnits = Math.max(units, config.min_units || 0);
    basePrice = config.per_unit_price * effectiveUnits;
    description = `${effectiveUnits} ${config.unit_label || "unit"}${effectiveUnits !== 1 ? "s" : ""} × $${config.per_unit_price}`;
    // Enforce min_price
    if (config.min_price && basePrice < config.min_price) {
      basePrice = config.min_price;
    }
  } else if (config.pricing_model === "package" && config.packages?.length) {
    // Use selected package or default to first
    const selectedPkg = variables.package
      ? config.packages.find(p => p.name.toLowerCase() === variables.package.toLowerCase())
      : config.packages[0];
    if (selectedPkg) {
      basePrice = selectedPkg.price;
      description = selectedPkg.name;
    }
  } else if (config.pricing_model === "variable") {
    basePrice = config.min_price || 0;
    description = config.min_price && config.max_price
      ? `$${config.min_price}-$${config.max_price}`
      : `$${basePrice}`;
  }

  // Apply variable modifiers
  let adjustment = 0;
  if (config.variables) {
    for (const variable of config.variables) {
      const selectedValue = variables[variable.key];
      if (selectedValue) {
        const modifier = variable.modifiers.find(m => m.value === selectedValue);
        if (modifier) {
          if (modifier.adjustment_type === "percent") {
            adjustment += basePrice * (modifier.price_adjustment / 100);
          } else {
            adjustment += modifier.price_adjustment;
          }
        }
      }
    }
  }

  const subtotal = basePrice + adjustment;
  const totalPrice = Math.max(subtotal, config.min_price || 0) + tripFee;
  const maxPrice = config.max_price ? Math.min(totalPrice, config.max_price + tripFee) : totalPrice;

  if (tripFee > 0) {
    description = `${config.trip_fee?.label || "Trip fee"}: $${tripFee} + ${description}`;
  }

  return {
    min: Math.round(totalPrice),
    max: Math.round(maxPrice),
    description: description || `$${Math.round(totalPrice)}`,
  };
}
