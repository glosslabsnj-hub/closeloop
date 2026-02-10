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

  return useMemo(() => {
    const s: Record<string, ItemStatusInfo> = {};

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
      status: "incomplete",
      statusText: "Pre-built setups for common business types",
    };

    // ── Services tab ──
    s["food-service-types"] = {
      status: "complete", // visible only when food mode active
      statusText: (() => {
        if (foodAcceptsDelivery && foodAcceptsCatering) return "Delivery & Catering enabled";
        if (foodAcceptsDelivery) return "Delivery enabled";
        if (foodAcceptsCatering) return "Catering enabled";
        return "Dine-in & Pickup only";
      })(),
    };
    s["pricing-rules"] = {
      status: "incomplete",
      statusText: summaries.pricingRules,
    };
    s["catalog"] = {
      status: summaries.catalog !== "No services added yet" ? "complete" : "incomplete",
      statusText: summaries.catalog,
    };
    s["price-modifiers"] = {
      status: "incomplete",
      statusText: "Size, urgency, and after-hours rate adjustments",
    };
    s["service-packages"] = {
      status: "incomplete",
      statusText: "Discounted bundles and membership plans",
    };
    s["dispatch-pricing"] = {
      status: "incomplete",
      statusText: "Equipment, storage, release, and emergency fees",
    };
    s["distance-basis"] = {
      status: "incomplete",
      statusText: "How mileage affects your quotes",
    };
    s["food-settings-svc"] = {
      status: "incomplete",
      statusText: "Delivery, pickup, and catering configuration",
    };
    s["menu-sizes"] = {
      status: "incomplete",
      statusText: "S/M/L or Personal/Family size variants",
    };
    s["daily-specials"] = {
      status: "incomplete",
      statusText: "Happy hour, daily specials, limited-time offers",
    };
    s["medical-pricing"] = {
      status: "incomplete",
      statusText: "Insurance, consultation fees, and payment options",
    };
    s["additional-services"] = {
      status: "incomplete",
      statusText: "Secondary services beyond your core business",
    };

    // ── Operations tab ──
    s["coverage"] = {
      status: "incomplete",
      statusText: summaries.coverage,
    };
    s["travel-times"] = {
      status: "incomplete",
      statusText: summaries.travelTimes,
    };
    s["service-coverage"] = {
      status: "incomplete",
      statusText: "Same-day service, travel buffers, and duration settings",
    };
    s["dispatch-zones"] = {
      status: "incomplete",
      statusText: "Distance zones, highway coverage, and ETA rules",
    };
    s["delivery-zones"] = {
      status: "incomplete",
      statusText: "Delivery areas, fees by zone, and peak hour adjustments",
    };
    s["catering-coverage"] = {
      status: "incomplete",
      statusText: "Catering service areas and lead time requirements",
    };
    s["medical-coverage"] = {
      status: "incomplete",
      statusText: "Telehealth, home visits, and appointment scheduling",
    };
    s["response-times"] = {
      status: "incomplete",
      statusText: "Callback targets and priority zones",
    };
    s["workload"] = {
      status: "incomplete",
      statusText: summaries.workload,
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
      status: "incomplete",
      statusText: "Additional policies for specific scenarios",
    };
    s["booking-delivery"] = {
      status: summaries.bookingDelivery !== "Not set up yet" && summaries.bookingDelivery !== "No delivery method set" ? "complete" : "incomplete",
      statusText: summaries.bookingDelivery,
    };
    s["food-settings-ops"] = {
      status: "incomplete",
      statusText: summaries.foodSettings,
    };
    s["dispatch-settings"] = {
      status: summaries.dispatchSettings !== "Not set up yet" && summaries.dispatchSettings !== "No notifications set" ? "complete" : "incomplete",
      statusText: summaries.dispatchSettings,
    };
    s["distance-pricing"] = {
      status: "incomplete",
      statusText: "Configure default distance pricing method",
    };
    s["ivr-routing"] = {
      status: "incomplete",
      statusText: "Configure towing vs impound call routing",
    };
    s["impound-lot"] = {
      status: "incomplete",
      statusText: "Lot location, hours, and directions",
    };
    s["impound-fees"] = {
      status: "incomplete",
      statusText: "Tow fees, storage, and payment methods",
    };
    s["impound-release"] = {
      status: "incomplete",
      statusText: "Documents needed to release vehicles",
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
      status: "error",
      statusText: `${reviewCount} item${reviewCount === 1 ? "" : "s"} need${reviewCount === 1 ? "s" : ""} review`,
    };
    s["faqs"] = {
      status: summaries.faqs !== "No questions added yet — your AI says 'I'm not sure' to unknowns" ? "complete" : "incomplete",
      statusText: summaries.faqs,
    };
    s["objections"] = {
      status: summaries.objections !== "No responses set — your AI uses generic replies to pushback" ? "complete" : "incomplete",
      statusText: summaries.objections,
    };
    s["menu-knowledge"] = { status: "incomplete", statusText: "Detailed descriptions, allergens, and pairings" };
    s["catering-knowledge"] = { status: "incomplete", statusText: "Event-specific requirements and pricing" };
    s["vehicle-knowledge"] = { status: "incomplete", statusText: "Equipment and procedures by vehicle type" };
    s["roadside-knowledge"] = { status: "incomplete", statusText: "Safety scripts and escalation triggers" };
    s["symptom-triage"] = { status: "incomplete", statusText: "HIPAA-safe responses and escalation rules" };
    s["insurance-knowledge"] = { status: "incomplete", statusText: "Carrier-specific scripts and coverage" };
    s["product-knowledge"] = { status: "incomplete", statusText: "Products you use and their benefits" };
    s["aftercare"] = { status: "incomplete", statusText: "Post-service care instructions" };
    s["competitors"] = { status: "incomplete", statusText: "How to respond when competitors are mentioned" };
    s["seasonal"] = { status: "incomplete", statusText: "Holiday and event-specific info" };
    s["custom"] = {
      status: summaries.custom !== "Nothing extra added yet" ? "complete" : "incomplete",
      statusText: summaries.custom,
    };
    s["documents"] = {
      status: "incomplete",
      statusText: summaries.documents,
    };

    return s;
  }, [tenant, summaries, reviewCount, foodAcceptsDelivery, foodAcceptsCatering]);
}
