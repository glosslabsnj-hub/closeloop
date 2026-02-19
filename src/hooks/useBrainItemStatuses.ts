/**
 * useBrainItemStatuses
 *
 * Consolidates the scattered status logic from BusinessBrainPage into one hook.
 * Maps each sidebar item ID to a status + statusText pair.
 *
 * Uses existing hooks: useBrainSummaries, useAuth, useBrainReviewCount.
 * Zero new DB queries — purely derives from existing data.
 */

import { useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useBrainSummaries } from "./useBrainSummaries";
import { useBrainReviewCount } from "@/components/brain/BrainReviewQueue";
import { useFoodOrderSettings } from "./useFoodOrderSettings";
import { useBusinessCapabilities } from "./useBusinessCapabilities";
import type { SectionStatus } from "@/components/brain/layout/SectionSummaryCard";

export interface ItemStatusInfo {
  status: SectionStatus;
  statusText: string;
}

export function useBrainItemStatuses(): Record<string, ItemStatusInfo> {
  const { tenant } = useAuth();
  const summaries = useBrainSummaries();
  const reviewCount = useBrainReviewCount();
  const { acceptsDelivery: foodAcceptsDelivery, acceptsCatering: foodAcceptsCatering } = useFoodOrderSettings();
  const capabilities = useBusinessCapabilities();

  return useMemo(() => {
    const s: Record<string, ItemStatusInfo> = {};

    // Helper: check if tenant has service_area_json data
    const hasServiceArea = (() => {
      const sa = (tenant as Record<string, unknown> | null)?.service_area_json as Record<string, unknown> | null;
      return !!sa && Object.keys(sa).length > 0;
    })();
    const hasEtaPolicy = !!(tenant as Record<string, unknown> | null)?.eta_policy_jsonb;
    const hasBusynessRules = !!(tenant as Record<string, unknown> | null)?.busyness_rules_jsonb;

    // ── Business tab ──
    s["business-info"] = {
      status: tenant?.name ? "complete" : "incomplete",
      statusText: summaries.businessInfo,
    };
    s["business-hours"] = {
      status: summaries.hours !== "No hours set yet" ? "complete" : "incomplete",
      statusText: summaries.hours,
    };
    s["calendar-sync"] = {
      status: summaries.calendar.includes("connected") ? "complete" : "incomplete",
      statusText: summaries.calendar,
    };
    s["templates"] = {
      status: "optional",
      statusText: "Pre-built setups for common business types",
    };

    // ── Services tab ──
    s["food-service-types"] = {
      status: "complete",
      statusText: (() => {
        if (foodAcceptsDelivery && foodAcceptsCatering) return "Delivery & Catering enabled";
        if (foodAcceptsDelivery) return "Delivery enabled";
        if (foodAcceptsCatering) return "Catering enabled";
        return "Dine-in & Pickup only";
      })(),
    };
    s["pricing-rules"] = {
      status: "optional",
      statusText: summaries.pricingRules,
    };
    s["catalog"] = {
      status: summaries.catalog !== "No services added yet" ? "complete" : "incomplete",
      statusText: summaries.catalog,
    };
    s["price-modifiers"] = {
      status: capabilities.hasPriceModifiers ? "complete" : "incomplete",
      statusText: capabilities.hasPriceModifiers ? "Rate adjustments configured" : "Size, urgency, and after-hours rate adjustments",
    };
    s["service-packages"] = {
      status: capabilities.hasServicePackages ? "complete" : "incomplete",
      statusText: capabilities.hasServicePackages ? "Packages configured" : "Discounted bundles and membership plans",
    };
    s["dispatch-pricing"] = {
      status: capabilities.hasPriceModifiers ? "complete" : "incomplete",
      statusText: capabilities.hasPriceModifiers ? "Dispatch fees configured" : "Equipment, storage, release, and emergency fees",
    };
    s["distance-basis"] = {
      status: "optional",
      statusText: "How mileage affects your quotes",
    };
    s["food-settings-svc"] = {
      status: capabilities.hasPrepTimeConfigured ? "complete" : "incomplete",
      statusText: capabilities.hasPrepTimeConfigured ? "Food settings configured" : "Delivery, pickup, and catering configuration",
    };
    s["menu-sizes"] = {
      status: "optional",
      statusText: "S/M/L or Personal/Family size variants",
    };
    s["daily-specials"] = {
      status: "optional",
      statusText: "Happy hour, daily specials, limited-time offers",
    };
    s["medical-pricing"] = {
      status: capabilities.hasInsuranceKnowledge ? "complete" : "incomplete",
      statusText: capabilities.hasInsuranceKnowledge ? "Insurance info configured" : "Insurance, consultation fees, and payment options",
    };
    s["additional-services"] = {
      status: "optional",
      statusText: "Secondary services beyond your core business",
    };

    // ── Operations tab ──
    s["coverage"] = {
      status: hasServiceArea ? "complete" : "incomplete",
      statusText: hasServiceArea ? summaries.coverage : "Define where you can serve customers",
    };
    s["travel-times"] = {
      status: hasBusynessRules || hasEtaPolicy ? "complete" : "incomplete",
      statusText: hasBusynessRules || hasEtaPolicy ? "Travel estimates configured" : summaries.travelTimes,
    };
    s["service-coverage"] = {
      status: hasServiceArea ? "complete" : "incomplete",
      statusText: hasServiceArea ? "Service area configured" : "Same-day service, travel buffers, and duration settings",
    };
    s["dispatch-zones"] = {
      status: hasServiceArea && hasEtaPolicy ? "complete" : "incomplete",
      statusText: hasServiceArea && hasEtaPolicy ? "Dispatch zones configured" : "Distance zones, highway coverage, and ETA rules",
    };
    s["delivery-zones"] = {
      status: hasServiceArea ? "complete" : "incomplete",
      statusText: hasServiceArea ? "Delivery zones configured" : "Delivery areas, fees by zone, and peak hour adjustments",
    };
    s["catering-coverage"] = {
      status: capabilities.hasCateringKnowledge ? "complete" : "incomplete",
      statusText: capabilities.hasCateringKnowledge ? "Catering coverage configured" : "Catering service areas and lead time requirements",
    };
    s["medical-coverage"] = {
      status: "optional",
      statusText: "Telehealth, home visits, and appointment scheduling",
    };
    s["response-times"] = {
      status: hasBusynessRules || hasEtaPolicy ? "complete" : "incomplete",
      statusText: hasBusynessRules || hasEtaPolicy ? "Response times configured" : "Callback targets and priority zones",
    };
    s["workload"] = {
      status: hasBusynessRules ? "complete" : "incomplete",
      statusText: hasBusynessRules ? "Workload rules configured" : summaries.workload,
    };
    s["policies"] = {
      status: summaries.policies !== "No policies set yet" ? "complete" : "incomplete",
      statusText: summaries.policies,
    };
    s["never-promise"] = {
      status: summaries.guardrails !== "No limits set yet" ? "complete" : "incomplete",
      statusText: summaries.guardrails,
    };
    s["required-questions"] = {
      status: summaries.requiredQuestions !== "Not set up yet" && summaries.requiredQuestions !== "No required fields set" ? "complete" : "incomplete",
      statusText: summaries.requiredQuestions,
    };
    s["custom-policies"] = {
      status: "optional",
      statusText: "Additional policies for specific scenarios",
    };
    s["booking-delivery"] = {
      status: summaries.bookingDelivery !== "Not set up yet" && summaries.bookingDelivery !== "No delivery method set" ? "complete" : "incomplete",
      statusText: summaries.bookingDelivery,
    };
    s["food-settings-ops"] = {
      status: capabilities.hasPrepTimeConfigured ? "complete" : "incomplete",
      statusText: capabilities.hasPrepTimeConfigured ? "Food order settings configured" : summaries.foodSettings,
    };
    s["dispatch-settings"] = {
      status: summaries.dispatchSettings !== "Not set up yet" && summaries.dispatchSettings !== "No notifications set" ? "complete" : "incomplete",
      statusText: summaries.dispatchSettings,
    };
    s["distance-pricing"] = {
      status: "optional",
      statusText: "Configure default distance pricing method",
    };
    s["ivr-routing"] = {
      status: "optional",
      statusText: "Configure towing vs impound call routing",
    };
    s["impound-lot"] = {
      status: capabilities.dispatch.hasImpoundLot ? "complete" : "incomplete",
      statusText: capabilities.dispatch.hasImpoundLot ? "Impound lot configured" : "Lot location, hours, and directions",
    };
    s["impound-fees"] = {
      status: capabilities.dispatch.hasImpoundLot && capabilities.hasPriceModifiers ? "complete" : "incomplete",
      statusText: capabilities.dispatch.hasImpoundLot && capabilities.hasPriceModifiers ? "Impound fees configured" : "Tow fees, storage, and payment methods",
    };
    s["impound-release"] = {
      status: capabilities.dispatch.hasImpoundLot ? "complete" : "incomplete",
      statusText: capabilities.dispatch.hasImpoundLot ? "Release process configured" : "Documents needed to release vehicles",
    };
    s["hipaa"] = {
      status: "warning",
      statusText: summaries.hipaa,
    };

    // ── AI Voice tab ──
    s["scripts"] = {
      status: summaries.scripts !== "Using the default — customize to match your style" ? "complete" : "incomplete",
      statusText: summaries.scripts,
    };
    s["guidelines"] = {
      status: summaries.guidelines !== "No special instructions yet" ? "complete" : "incomplete",
      statusText: summaries.guidelines,
    };

    // ── Training tab ──
    s["review"] = {
      status: reviewCount > 0 ? "error" : "complete",
      statusText: reviewCount > 0
        ? `${reviewCount} item${reviewCount === 1 ? "" : "s"} need${reviewCount === 1 ? "s" : ""} review`
        : "All reviewed",
    };
    s["faqs"] = {
      status: summaries.faqs !== "No questions added yet — your AI says 'I'm not sure' to unknowns" ? "complete" : "incomplete",
      statusText: summaries.faqs,
    };
    s["objections"] = {
      status: summaries.objections !== "No responses set — your AI uses generic replies to pushback" ? "complete" : "incomplete",
      statusText: summaries.objections,
    };
    s["menu-knowledge"] = {
      status: capabilities.hasMenuItems ? "complete" : "incomplete",
      statusText: capabilities.hasMenuItems ? "Menu details configured" : "Detailed descriptions, allergens, and pairings",
    };
    s["catering-knowledge"] = {
      status: capabilities.hasCateringKnowledge ? "complete" : "incomplete",
      statusText: capabilities.hasCateringKnowledge ? "Catering knowledge configured" : "Event-specific requirements and pricing",
    };
    s["vehicle-knowledge"] = {
      status: capabilities.hasVehicleKnowledge ? "complete" : "incomplete",
      statusText: capabilities.hasVehicleKnowledge ? "Vehicle knowledge configured" : "Equipment and procedures by vehicle type",
    };
    s["roadside-knowledge"] = {
      status: capabilities.hasRoadsideKnowledge ? "complete" : "incomplete",
      statusText: capabilities.hasRoadsideKnowledge ? "Roadside knowledge configured" : "Safety scripts and escalation triggers",
    };
    s["symptom-triage"] = {
      status: capabilities.hasSymptomTriage ? "complete" : "incomplete",
      statusText: capabilities.hasSymptomTriage ? "Symptom triage configured" : "HIPAA-safe responses and escalation rules",
    };
    s["insurance-knowledge"] = {
      status: capabilities.hasInsuranceKnowledge ? "complete" : "incomplete",
      statusText: capabilities.hasInsuranceKnowledge ? "Insurance knowledge configured" : "Carrier-specific scripts and coverage",
    };
    s["product-knowledge"] = {
      status: capabilities.hasProductKnowledge ? "complete" : "incomplete",
      statusText: capabilities.hasProductKnowledge ? "Product knowledge configured" : "Products you use and their benefits",
    };
    s["aftercare"] = {
      status: capabilities.hasAftercare ? "complete" : "incomplete",
      statusText: capabilities.hasAftercare ? "Aftercare instructions configured" : "Post-service care instructions",
    };
    s["competitors"] = { status: "optional", statusText: "How to respond when competitors are mentioned" };
    s["seasonal"] = { status: "optional", statusText: "Holiday and event-specific info" };
    s["custom"] = {
      status: summaries.custom !== "Nothing extra added yet" ? "complete" : "incomplete",
      statusText: summaries.custom,
    };
    s["documents"] = {
      status: "optional",
      statusText: summaries.documents,
    };

    return s;
  }, [tenant, summaries, reviewCount, foodAcceptsDelivery, foodAcceptsCatering, capabilities]);
}
