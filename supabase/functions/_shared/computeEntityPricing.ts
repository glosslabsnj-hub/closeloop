/**
 * Entity Pricing Bridge
 *
 * Connects the pure pricing engine (computeQuote.ts / pricingResolution.ts)
 * to persist functions by fetching DB data and computing final prices.
 *
 * Used by: persistBooking, persistFoodOrder, persistDispatchJob
 */

import { computePriceQuote, type QuoteResult, type PricingRule, type OfferingContext } from "./computeQuote.ts";
import { resolvePricing, type PricingResolutionResult } from "./pricingResolution.ts";

// ============= TYPES =============

export interface BookingPriceResult {
  price_cents: number | null;
  price_breakdown: Record<string, unknown>;
  duration_minutes: number;
}

export interface FoodOrderTotalsResult {
  subtotal_cents: number;
  tax_cents: number;
  delivery_fee_cents: number | null;
  total_cents: number;
  breakdown: Record<string, unknown>;
}

export interface DispatchPriceResult {
  price_cents: number | null;
  price_breakdown: Record<string, unknown>;
  distance_miles: number | null;
  estimated_eta_minutes: number | null;
}

// ============= BOOKING PRICING =============

/**
 * Compute booking price from service + pricing_rules + price_modifiers.
 * Returns null price_cents if service is quote_only or no pricing available.
 */
export async function computeBookingPrice(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  tenantId: string,
  serviceId: string | null,
  // deno-lint-ignore no-explicit-any
  payload: any
): Promise<BookingPriceResult> {
  const defaultResult: BookingPriceResult = {
    price_cents: null,
    price_breakdown: { method: "none", reason: "no_service" },
    duration_minutes: 60,
  };

  if (!serviceId) return defaultResult;

  // Fetch service with pricing details
  const { data: service } = await supabase
    .from("services")
    .select("id, name, duration_minutes, price_amount, price_type")
    .eq("id", serviceId)
    .eq("tenant_id", tenantId)
    .single();

  if (!service) return defaultResult;

  const duration = service.duration_minutes || 60;

  // Quote-only services: no price, just duration
  if (service.price_type === "quote_only") {
    return {
      price_cents: null,
      price_breakdown: { method: "quote_only", service_name: service.name },
      duration_minutes: duration,
    };
  }

  // Fetch pricing rules (from pricing_rules_jsonb on tenants table)
  const { data: tenant } = await supabase
    .from("tenants")
    .select("pricing_rules_jsonb")
    .eq("id", tenantId)
    .single();

  const pricingRulesRaw = tenant?.pricing_rules_jsonb || [];
  const pricingRules: PricingRule[] = Array.isArray(pricingRulesRaw) ? pricingRulesRaw : [];

  // Fetch price_modifiers that apply to this service
  const { data: modifiers } = await supabase
    .from("price_modifiers")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("is_active", true);

  // Build offering context
  const offering: OfferingContext = {
    serviceId: service.id,
    serviceName: service.name,
    name: service.name,
    duration: duration,
    basePrice: service.price_amount ? Math.round(service.price_amount * 100) : undefined,
    priceType: service.price_type === "fixed" ? "fixed" :
               service.price_type === "deposit_based" ? "starting_at" : "quote_only",
  };

  // Try computePriceQuote first
  const quoteResult = computePriceQuote({
    rules: pricingRules,
    businessMode: "service",
    offering,
    inputs: {},
  });

  let basePriceCents: number | null = null;

  if (quoteResult.type === "EXACT" && quoteResult.value) {
    basePriceCents = quoteResult.value;
  } else if (quoteResult.type === "ESTIMATE" && quoteResult.rangeMin) {
    basePriceCents = quoteResult.rangeMin; // Conservative estimate
  } else if (offering.basePrice) {
    basePriceCents = offering.basePrice;
  }

  if (basePriceCents === null) {
    return {
      price_cents: null,
      price_breakdown: {
        method: "unknown",
        quote_type: quoteResult.type,
        explanation: quoteResult.explanation,
      },
      duration_minutes: duration,
    };
  }

  // Apply price modifiers
  let finalPriceCents = basePriceCents;
  const appliedModifiers: Array<{ name: string; type: string; adjustment: number }> = [];

  if (modifiers && modifiers.length > 0) {
    const now = new Date();
    const dayOfWeek = now.toLocaleDateString("en-US", { weekday: "long" }).toLowerCase();

    for (const mod of modifiers) {
      // Check if modifier applies to this service
      if (mod.applies_to_services && mod.applies_to_services.length > 0) {
        if (!mod.applies_to_services.includes(serviceId)) continue;
      }

      // Check active days
      if (mod.active_days && mod.active_days.length > 0) {
        if (!mod.active_days.includes(dayOfWeek)) continue;
      }

      let adjustment = 0;
      switch (mod.adjustment_type) {
        case "fixed":
          adjustment = Math.round(mod.adjustment_value * 100); // Convert dollars to cents
          finalPriceCents += adjustment;
          break;
        case "percentage":
          adjustment = Math.round(finalPriceCents * (mod.adjustment_value / 100));
          finalPriceCents += adjustment;
          break;
        case "multiplier":
          adjustment = Math.round(finalPriceCents * mod.adjustment_value) - finalPriceCents;
          finalPriceCents = Math.round(finalPriceCents * mod.adjustment_value);
          break;
      }

      appliedModifiers.push({
        name: mod.modifier_type || mod.name || "modifier",
        type: mod.adjustment_type,
        adjustment,
      });
    }
  }

  return {
    price_cents: finalPriceCents,
    price_breakdown: {
      method: "computed",
      base_price_cents: basePriceCents,
      service_name: service.name,
      modifiers_applied: appliedModifiers,
      final_price_cents: finalPriceCents,
    },
    duration_minutes: duration,
  };
}

// ============= FOOD ORDER TOTALS =============

/**
 * Compute food order totals: tax + delivery fee + final total.
 * Tax rate comes from tenant config (context_fields_json.tax_rate_percent).
 * Delivery fee comes from delivery_zones table.
 */
export async function computeFoodOrderTotals(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  tenantId: string,
  subtotalCents: number,
  orderType: string | null,
  deliveryAddress: string | null
): Promise<FoodOrderTotalsResult> {
  // Fetch tenant tax config
  const { data: tenant } = await supabase
    .from("tenants")
    .select("context_fields_json")
    .eq("id", tenantId)
    .single();

  const contextFields = tenant?.context_fields_json || {};
  const taxRatePercent = contextFields.tax_rate_percent ?? 0;
  const taxCents = Math.round(subtotalCents * (taxRatePercent / 100));

  let deliveryFeeCents: number | null = null;

  // Calculate delivery fee if delivery order
  if (orderType === "delivery" && deliveryAddress) {
    // Extract zip code from address
    const zipMatch = deliveryAddress.match(/\b(\d{5})(-\d{4})?\b/);
    const zip = zipMatch ? zipMatch[1] : null;

    if (zip) {
      // Look up delivery zone by zip code
      const { data: zones } = await supabase
        .from("delivery_zones")
        .select("id, name, delivery_fee_cents, zip_codes")
        .eq("tenant_id", tenantId);

      if (zones && zones.length > 0) {
        const matchingZone = zones.find(
          // deno-lint-ignore no-explicit-any
          (z: any) => z.zip_codes && Array.isArray(z.zip_codes) && z.zip_codes.includes(zip)
        );

        if (matchingZone) {
          deliveryFeeCents = matchingZone.delivery_fee_cents || 0;
        }
        // If no zone matches, leave as null (TBD)
      }
    }
  }

  const totalCents = subtotalCents + taxCents + (deliveryFeeCents || 0);

  return {
    subtotal_cents: subtotalCents,
    tax_cents: taxCents,
    delivery_fee_cents: deliveryFeeCents,
    total_cents: totalCents,
    breakdown: {
      subtotal_cents: subtotalCents,
      tax_rate_percent: taxRatePercent,
      tax_cents: taxCents,
      delivery_fee_cents: deliveryFeeCents,
      total_cents: totalCents,
      delivery_zone_matched: deliveryFeeCents !== null,
    },
  };
}

// ============= DISPATCH PRICING =============

/**
 * Distance tier interface matching frontend DispatchPricingConfig
 */
interface DistanceTier {
  min_miles: number;
  max_miles: number | null;
  base_price: number;
  per_mile_price?: number;
}

interface PackageTier {
  name: string;
  price: number;
  description?: string;
  is_popular?: boolean;
}

interface TripFee {
  enabled: boolean;
  amount: number;
  label: string;
  waived_with_service?: boolean;
}

interface PricingConfigJson {
  pricing_model: string;
  distance_basis?: string;
  distance_tiers?: DistanceTier[];
  // deno-lint-ignore no-explicit-any
  variables?: Array<{ key: string; label: string; modifiers: any[] }>;
  min_price?: number;
  max_price?: number;
  included_miles?: number;
  overage_per_mile?: number;
  trip_fee?: TripFee;
  unit_label?: string;
  per_unit_price?: number;
  min_units?: number;
  max_units?: number;
  packages?: PackageTier[];
  ai_quote_behavior?: string;
}

/**
 * Compute dispatch job price using the service's pricing_config_json (single source of truth).
 * Falls back to pricingResolution (pricing_rules_jsonb) for tenants not yet migrated.
 * Optionally calls compute-distance-eta for real distance if addresses provided.
 * Now applies price_modifiers from DB (previously bookings-only).
 */
export async function computeDispatchPrice(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  supabaseUrl: string,
  supabaseKey: string,
  tenantId: string,
  pickupAddress: string | null,
  dropoffAddress: string | null,
  jobType: string | null,
  urgency: string,
  serviceId?: string | null
): Promise<DispatchPriceResult> {
  const defaultResult: DispatchPriceResult = {
    price_cents: null,
    price_breakdown: { method: "none", reason: "insufficient_data" },
    distance_miles: null,
    estimated_eta_minutes: null,
  };

  // Fetch services, distance settings, and price_modifiers in parallel
  const [servicesResult, distSettingsResult, modifiersResult] = await Promise.all([
    supabase
      .from("services")
      .select("id, name, price_amount, price_type, pricing_config_json, service_category")
      .eq("tenant_id", tenantId)
      .eq("is_active", true),
    supabase
      .from("tenant_distance_settings")
      .select("default_distance_basis")
      .eq("tenant_id", tenantId)
      .maybeSingle(),
    supabase
      .from("price_modifiers")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("is_active", true),
  ]);

  const allServices = servicesResult.data || [];

  // Find the matching service — by ID, by name match, or by category
  // deno-lint-ignore no-explicit-any
  let matchedService: any = null;
  if (serviceId) {
    // deno-lint-ignore no-explicit-any
    matchedService = allServices.find((s: any) => s.id === serviceId);
  }
  if (!matchedService && jobType) {
    // Try name match
    const normalizedJobType = jobType.toLowerCase();
    matchedService = allServices.find(
      // deno-lint-ignore no-explicit-any
      (s: any) => s.name.toLowerCase().includes(normalizedJobType)
    ) || allServices.find(
      // deno-lint-ignore no-explicit-any
      (s: any) => normalizedJobType.includes(s.name.toLowerCase())
    );
  }
  if (!matchedService) {
    // Fallback: first towing service
    matchedService = allServices.find(
      // deno-lint-ignore no-explicit-any
      (s: any) => s.service_category === "towing" || s.name.toLowerCase().includes("tow")
    ) || allServices[0];
  }

  const pricingConfig: PricingConfigJson | null =
    matchedService?.pricing_config_json &&
    typeof matchedService.pricing_config_json === "object"
      ? matchedService.pricing_config_json as PricingConfigJson
      : null;

  // Try to get distance if both addresses are provided
  let distanceMiles: number | null = null;
  let etaMinutes: number | null = null;

  if (pickupAddress && dropoffAddress) {
    try {
      const distanceResponse = await fetch(`${supabaseUrl}/functions/v1/compute-distance-eta`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({
          tenant_id: tenantId,
          pickup_address: pickupAddress,
          dropoff_address: dropoffAddress,
        }),
      });

      if (distanceResponse.ok) {
        const distanceData = await distanceResponse.json();
        distanceMiles = distanceData.distance_miles ?? distanceData.distanceMiles ?? null;
        etaMinutes = distanceData.eta_minutes ?? distanceData.etaMinutes ?? null;
      }
    } catch (e) {
      console.warn("[computeDispatchPrice] Distance API failed (non-blocking):", e);
    }
  }

  // ── PRIMARY PATH: Calculate from pricing_config_json (single source of truth) ──
  if (pricingConfig) {
    // Determine correct distance for pricing based on distance_basis
    const tenantDefaultBasis = distSettingsResult.data?.default_distance_basis || "tow_distance";
    const serviceBasis = pricingConfig.distance_basis || tenantDefaultBasis;
    // For webhook path, we only have pickup→dropoff distance — use it directly
    const pricingDistanceMiles = distanceMiles;

    let basePriceDollars: number | null = null;
    const breakdownParts: Record<string, unknown> = {
      method: "pricing_config_json",
      service_id: matchedService?.id,
      service_name: matchedService?.name,
      pricing_model: pricingConfig.pricing_model,
      distance_basis: serviceBasis,
      distance_miles: pricingDistanceMiles,
    };

    switch (pricingConfig.pricing_model) {
      case "flat": {
        basePriceDollars = pricingConfig.min_price || 0;
        if (pricingConfig.included_miles && pricingConfig.overage_per_mile && pricingDistanceMiles) {
          if (pricingDistanceMiles > pricingConfig.included_miles) {
            const overage = (pricingDistanceMiles - pricingConfig.included_miles) * pricingConfig.overage_per_mile;
            basePriceDollars += overage;
            breakdownParts.overage_miles = pricingDistanceMiles - pricingConfig.included_miles;
            breakdownParts.overage_charge = overage;
          }
        }
        break;
      }
      case "distance_tiered": {
        if (pricingConfig.distance_tiers && pricingDistanceMiles !== null) {
          for (const tier of pricingConfig.distance_tiers) {
            const tierMin = tier.min_miles;
            const tierMax = tier.max_miles ?? Infinity;
            if (pricingDistanceMiles >= tierMin && pricingDistanceMiles <= tierMax) {
              basePriceDollars = tier.base_price;
              if (tier.per_mile_price && pricingDistanceMiles > tierMin) {
                basePriceDollars += (pricingDistanceMiles - tierMin) * tier.per_mile_price;
              }
              breakdownParts.tier_used = { min: tierMin, max: tierMax, base: tier.base_price, per_mile: tier.per_mile_price };
              break;
            }
          }
        }
        if (basePriceDollars === null) {
          basePriceDollars = pricingConfig.min_price || null;
        }
        break;
      }
      case "per_unit": {
        if (pricingConfig.per_unit_price) {
          const units = pricingConfig.min_units || 1;
          basePriceDollars = pricingConfig.per_unit_price * units;
          if (pricingConfig.min_price && basePriceDollars < pricingConfig.min_price) {
            basePriceDollars = pricingConfig.min_price;
          }
          breakdownParts.unit_label = pricingConfig.unit_label;
          breakdownParts.per_unit_price = pricingConfig.per_unit_price;
          breakdownParts.units = units;
        }
        break;
      }
      case "package": {
        if (pricingConfig.packages?.length) {
          // Default to the "popular" package or first one for entity creation
          const defaultPkg = pricingConfig.packages.find(p => p.is_popular) || pricingConfig.packages[0];
          basePriceDollars = defaultPkg.price;
          breakdownParts.package_name = defaultPkg.name;
        }
        break;
      }
      case "variable": {
        // Variable = quote required, use min_price as estimate
        if (pricingConfig.min_price) {
          basePriceDollars = pricingConfig.min_price;
          breakdownParts.price_type = "estimate";
        }
        break;
      }
    }

    // Apply trip fee
    let tripFeeDollars = 0;
    if (pricingConfig.trip_fee?.enabled) {
      tripFeeDollars = pricingConfig.trip_fee.amount;
      breakdownParts.trip_fee = tripFeeDollars;
      breakdownParts.trip_fee_label = pricingConfig.trip_fee.label;
    }

    // Apply vehicle modifiers from pricing_config_json
    let modifierTotal = 0;
    if (jobType && pricingConfig.variables && basePriceDollars !== null) {
      for (const variable of pricingConfig.variables) {
        if (variable.key === "vehicle_type" && Array.isArray(variable.modifiers)) {
          const modifier = variable.modifiers.find(
            // deno-lint-ignore no-explicit-any
            (m: any) => m.value?.toLowerCase() === jobType.toLowerCase()
          );
          if (modifier) {
            const adj = modifier.adjustment_type === "percent"
              ? basePriceDollars * (modifier.price_adjustment / 100)
              : modifier.price_adjustment;
            modifierTotal += adj;
            breakdownParts.vehicle_modifier = { type: jobType, adjustment: adj };
          }
        }
      }
    }

    // Apply price_modifiers from DB (after-hours, weekend surcharges — previously bookings-only)
    const appliedDbModifiers: Array<{ name: string; type: string; adjustment: number }> = [];
    const modifiers = modifiersResult.data || [];
    if (modifiers.length > 0 && basePriceDollars !== null) {
      const now = new Date();
      const dayOfWeek = now.toLocaleDateString("en-US", { weekday: "long" }).toLowerCase();
      const subtotalCents = Math.round((basePriceDollars + modifierTotal) * 100);

      for (const mod of modifiers) {
        // Check applies_to_services
        if (mod.applies_to_services?.length && matchedService?.id) {
          if (!mod.applies_to_services.includes(matchedService.id)) continue;
        }
        // Check active_days
        if (mod.active_days?.length) {
          if (!mod.active_days.includes(dayOfWeek)) continue;
        }

        let adjustment = 0;
        switch (mod.adjustment_type) {
          case "fixed":
            adjustment = Math.round(mod.adjustment_value * 100);
            break;
          case "percentage":
            adjustment = Math.round(subtotalCents * (mod.adjustment_value / 100));
            break;
          case "multiplier":
            adjustment = Math.round(subtotalCents * mod.adjustment_value) - subtotalCents;
            break;
        }
        if (adjustment !== 0) {
          appliedDbModifiers.push({
            name: mod.modifier_type || mod.name || "modifier",
            type: mod.adjustment_type,
            adjustment,
          });
        }
      }
    }

    const dbModifierCents = appliedDbModifiers.reduce((sum, m) => sum + m.adjustment, 0);

    if (basePriceDollars !== null) {
      const totalDollars = basePriceDollars + modifierTotal + tripFeeDollars;
      const totalCents = Math.round(totalDollars * 100) + dbModifierCents;
      const minCents = pricingConfig.min_price ? Math.round(pricingConfig.min_price * 100) : 0;
      const finalCents = Math.max(totalCents, minCents);

      breakdownParts.base_price_dollars = basePriceDollars;
      breakdownParts.modifier_total = modifierTotal;
      breakdownParts.db_modifiers = appliedDbModifiers;
      breakdownParts.final_price_cents = finalCents;

      return {
        price_cents: finalCents,
        price_breakdown: breakdownParts,
        distance_miles: distanceMiles,
        estimated_eta_minutes: etaMinutes,
      };
    }

    // pricing_config_json present but couldn't calculate — return with context
    breakdownParts.reason = "could_not_calculate";
    return {
      price_cents: null,
      price_breakdown: breakdownParts,
      distance_miles: distanceMiles,
      estimated_eta_minutes: etaMinutes,
    };
  }

  // ── FALLBACK: Use pricingResolution (pricing_rules_jsonb) for unmigrated tenants ──
  const { data: tenant } = await supabase
    .from("tenants")
    .select("pricing_rules_jsonb")
    .eq("id", tenantId)
    .single();

  const pricingRulesRaw = tenant?.pricing_rules_jsonb || [];
  const pricingRules = Array.isArray(pricingRulesRaw) ? pricingRulesRaw : [];

  const services = allServices.map(
    // deno-lint-ignore no-explicit-any
    (s: any) => ({
      id: s.id,
      name: s.name,
      price: s.price_amount,
      pricing_type: s.price_type,
    })
  );

  const extractedData: Record<string, unknown> = {
    miles: distanceMiles,
    estimated_miles: distanceMiles,
    urgency,
    vehicle_type: jobType,
  };

  const pricingResult: PricingResolutionResult = resolvePricing(
    jobType || "tow",
    extractedData,
    pricingRules,
    services,
    tenantId
  );

  let priceCents: number | null = null;

  if (pricingResult.success) {
    if (pricingResult.priceType === "exact" && pricingResult.price != null) {
      priceCents = Math.round(pricingResult.price * 100);
    } else if (pricingResult.priceType === "range" && pricingResult.priceRange) {
      priceCents = Math.round(((pricingResult.priceRange.min + pricingResult.priceRange.max) / 2) * 100);
    }
  }

  return {
    price_cents: priceCents,
    price_breakdown: {
      method: pricingResult.success ? "pricing_rules_fallback" : "none",
      price_type: pricingResult.priceType,
      reason: pricingResult.reason,
      distance_miles: distanceMiles,
      log_data: pricingResult.logData,
    },
    distance_miles: distanceMiles,
    estimated_eta_minutes: etaMinutes,
  };
}
