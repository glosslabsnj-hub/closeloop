/**
 * Dispatch Pricing Configuration Types
 * 
 * These types define the complex pricing structures needed for dispatch businesses
 * like towing, HVAC, plumbing, etc. where pricing depends on variables like
 * distance, vehicle type, and time of day.
 */

export type PricingModel = "flat" | "distance_tiered" | "variable";

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
}

// Service categories for dispatch businesses
export type DispatchServiceCategory = 
  | "towing"
  | "roadside"
  | "recovery"
  | "transport"
  | "add-ons"
  | "emergency"
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
  "add-ons": { label: "Add-On Services", order: 6 },
  uncategorized: { label: "Other Services", order: 99 },
};

// Preset service templates
export const DISPATCH_SERVICE_PRESETS: DispatchServicePreset[] = [
  {
    type: "local_tow",
    name: "Local Tow",
    description: "Standard towing within city limits",
    category: "towing",
    icon: "truck",
    defaultDuration: 60,
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
    },
  },
  {
    type: "long_distance_tow",
    name: "Long Distance Tow",
    description: "Towing over 25 miles",
    category: "towing",
    icon: "truck",
    defaultDuration: 180,
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
    },
  },
  {
    type: "jump_start",
    name: "Jump Start",
    description: "Battery jump start service",
    category: "roadside",
    icon: "zap",
    defaultDuration: 30,
    defaultPricingConfig: {
      pricing_model: "flat",
      min_price: 65,
    },
  },
  {
    type: "lockout",
    name: "Lockout Service",
    description: "Vehicle lockout assistance",
    category: "roadside",
    icon: "key",
    defaultDuration: 30,
    defaultPricingConfig: {
      pricing_model: "flat",
      min_price: 75,
    },
  },
  {
    type: "tire_change",
    name: "Tire Change",
    description: "Flat tire change with spare",
    category: "roadside",
    icon: "circle",
    defaultDuration: 30,
    defaultPricingConfig: {
      pricing_model: "flat",
      min_price: 85,
    },
  },
  {
    type: "fuel_delivery",
    name: "Fuel Delivery",
    description: "Emergency fuel delivery",
    category: "roadside",
    icon: "fuel",
    defaultDuration: 45,
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
    },
  },
  {
    type: "winch_out",
    name: "Winch Out",
    description: "Vehicle recovery from ditch or stuck position",
    category: "recovery",
    icon: "anchor",
    defaultDuration: 60,
    defaultPricingConfig: {
      pricing_model: "variable",
      min_price: 100,
      max_price: 500,
    },
  },
  {
    type: "heavy_duty_tow",
    name: "Heavy Duty Tow",
    description: "Towing for large trucks, RVs, commercial vehicles",
    category: "towing",
    icon: "truck",
    defaultDuration: 120,
    defaultPricingConfig: {
      pricing_model: "distance_tiered",
      distance_tiers: [
        { min_miles: 0, max_miles: 10, base_price: 250, per_mile_price: 0 },
        { min_miles: 10, max_miles: null, base_price: 250, per_mile_price: 8 },
      ],
      min_price: 250,
    },
  },
];

/**
 * Generate a human-readable pricing summary for AI voice output
 */
export function generatePricingSummary(config: DispatchPricingConfig | null, serviceName: string): string {
  if (!config) {
    return `${serviceName} requires a custom quote based on your situation.`;
  }

  const parts: string[] = [];
  
  if (config.pricing_model === "flat" && config.min_price) {
    parts.push(`${serviceName} is $${config.min_price} flat rate`);
  } else if (config.pricing_model === "distance_tiered" && config.distance_tiers?.length) {
    const firstTier = config.distance_tiers[0];
    parts.push(`${serviceName} starts at $${firstTier.base_price}`);
    
    if (firstTier.max_miles) {
      parts.push(`for the first ${firstTier.max_miles} miles`);
    }
    
    // Check for per-mile rates
    const tiersWithPerMile = config.distance_tiers.filter(t => t.per_mile_price && t.per_mile_price > 0);
    if (tiersWithPerMile.length > 0) {
      const avgRate = tiersWithPerMile.reduce((sum, t) => sum + (t.per_mile_price || 0), 0) / tiersWithPerMile.length;
      parts.push(`then $${avgRate.toFixed(0)} per mile after that`);
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
  
  // Add vehicle type note if applicable
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
 * Calculate estimated price based on config and variables
 */
export function calculateDispatchPrice(
  config: DispatchPricingConfig,
  distanceMiles: number = 0,
  variables: Record<string, string> = {}
): { min: number; max: number; description: string } {
  let basePrice = config.min_price || 0;
  let description = "";
  
  // Calculate distance-based pricing
  if (config.pricing_model === "distance_tiered" && config.distance_tiers) {
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
  
  const totalPrice = Math.max(basePrice + adjustment, config.min_price || 0);
  const maxPrice = config.max_price ? Math.min(totalPrice, config.max_price) : totalPrice;
  
  return {
    min: Math.round(totalPrice),
    max: Math.round(maxPrice),
    description: description || `$${Math.round(totalPrice)}`,
  };
}
