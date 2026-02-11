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
 * Compute dispatch job price using pricing_rules_jsonb distance tiers.
 * Optionally calls compute-distance-eta for real distance if addresses provided.
 * Non-blocking: returns null price if distance API fails.
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
  urgency: string
): Promise<DispatchPriceResult> {
  const defaultResult: DispatchPriceResult = {
    price_cents: null,
    price_breakdown: { method: "none", reason: "insufficient_data" },
    distance_miles: null,
    estimated_eta_minutes: null,
  };

  // Fetch tenant pricing rules and services
  const [tenantResult, servicesResult] = await Promise.all([
    supabase
      .from("tenants")
      .select("pricing_rules_jsonb")
      .eq("id", tenantId)
      .single(),
    supabase
      .from("services")
      .select("id, name, price_amount, price_type")
      .eq("tenant_id", tenantId)
      .eq("is_active", true),
  ]);

  const pricingRulesRaw = tenantResult.data?.pricing_rules_jsonb || [];

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

  // Use pricingResolution to resolve price
  const services = (servicesResult.data || []).map(
    // deno-lint-ignore no-explicit-any
    (s: any) => ({
      id: s.id,
      name: s.name,
      price: s.price_amount,
      pricing_type: s.price_type,
    })
  );

  const pricingRules = Array.isArray(pricingRulesRaw) ? pricingRulesRaw : [];

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
      // pricingResolution returns prices in dollars, convert to cents
      priceCents = Math.round(pricingResult.price * 100);
    } else if (pricingResult.priceType === "range" && pricingResult.priceRange) {
      // Use midpoint of range
      priceCents = Math.round(((pricingResult.priceRange.min + pricingResult.priceRange.max) / 2) * 100);
    }
  }

  return {
    price_cents: priceCents,
    price_breakdown: {
      method: pricingResult.success ? "pricing_rules" : "none",
      price_type: pricingResult.priceType,
      reason: pricingResult.reason,
      distance_miles: distanceMiles,
      log_data: pricingResult.logData,
    },
    distance_miles: distanceMiles,
    estimated_eta_minutes: etaMinutes,
  };
}
