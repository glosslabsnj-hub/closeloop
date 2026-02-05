import type { BusinessMode } from "@/hooks/useTenantConfig";

/**
 * Industry-aware revenue configuration
 * Single source of truth for how revenue is tracked per business mode
 */
export interface IndustryRevenueConfig {
  // Database mapping
  revenueTable: "bookings" | "dispatch_jobs" | "food_orders";
  valueSource: string;
  valueMultiplier: number; // 1 if already cents, 100 if dollars

  // Status values
  completedStatus: string;
  cancelledStatuses: string[];

  // UI terminology
  entityName: string;
  entityNameSingular: string;
  actionVerb: string;
  actionVerbPast: string;

  // Empty state
  emptyStateMessage: string;
  emptyStateCta: string;
  successMessage: string;

  // Metrics
  primaryMetrics: ("ai_revenue" | "entities_created" | "calls_handled" | "conversion_rate")[];
}

export const INDUSTRY_REVENUE_CONFIG: Record<BusinessMode, IndustryRevenueConfig> = {
  service: {
    revenueTable: "bookings",
    valueSource: "services.price_amount",
    valueMultiplier: 100,
    completedStatus: "completed",
    cancelledStatuses: ["canceled", "no_show"],
    entityName: "Appointments",
    entityNameSingular: "Appointment",
    actionVerb: "book",
    actionVerbPast: "booked",
    emptyStateMessage: "Once your AI starts booking appointments, you'll see your ROI here.",
    emptyStateCta: "Make a test call to get started",
    successMessage: "Your AI booked {count} appointments worth {value} this month.",
    primaryMetrics: ["ai_revenue", "entities_created", "calls_handled", "conversion_rate"],
  },
  dispatch: {
    revenueTable: "dispatch_jobs",
    valueSource: "price_cents",
    valueMultiplier: 1,
    completedStatus: "completed",
    cancelledStatuses: ["cancelled"],
    entityName: "Jobs",
    entityNameSingular: "Job",
    actionVerb: "dispatch",
    actionVerbPast: "dispatched",
    emptyStateMessage: "Once your AI starts dispatching jobs, you'll see your ROI here.",
    emptyStateCta: "Make a test call to get started",
    successMessage: "Your AI dispatched {count} jobs worth {value} this month.",
    primaryMetrics: ["ai_revenue", "entities_created", "calls_handled", "conversion_rate"],
  },
  food: {
    revenueTable: "food_orders",
    valueSource: "total_cents",
    valueMultiplier: 1,
    completedStatus: "completed",
    cancelledStatuses: ["cancelled"],
    entityName: "Orders",
    entityNameSingular: "Order",
    actionVerb: "take",
    actionVerbPast: "placed",
    emptyStateMessage: "Once your AI starts taking orders, you'll see your ROI here.",
    emptyStateCta: "Make a test call to get started",
    successMessage: "Your AI placed {count} orders worth {value} this month.",
    primaryMetrics: ["ai_revenue", "entities_created", "calls_handled", "conversion_rate"],
  },
  medical: {
    revenueTable: "bookings",
    valueSource: "services.price_amount",
    valueMultiplier: 100,
    completedStatus: "completed",
    cancelledStatuses: ["canceled", "no_show"],
    entityName: "Appointments",
    entityNameSingular: "Appointment",
    actionVerb: "schedule",
    actionVerbPast: "scheduled",
    emptyStateMessage: "Once your AI starts scheduling appointments, you'll see your ROI here.",
    emptyStateCta: "Make a test call to get started",
    successMessage: "Your AI scheduled {count} appointments worth {value} this month.",
    primaryMetrics: ["ai_revenue", "entities_created", "calls_handled", "conversion_rate"],
  },
  general: {
    revenueTable: "bookings",
    valueSource: "services.price_amount",
    valueMultiplier: 100,
    completedStatus: "completed",
    cancelledStatuses: ["canceled", "no_show"],
    entityName: "Bookings",
    entityNameSingular: "Booking",
    actionVerb: "book",
    actionVerbPast: "booked",
    emptyStateMessage: "Once your AI starts creating bookings, you'll see your ROI here.",
    emptyStateCta: "Make a test call to get started",
    successMessage: "Your AI booked {count} worth {value} this month.",
    primaryMetrics: ["ai_revenue", "entities_created", "calls_handled", "conversion_rate"],
  },
};

export function getIndustryRevenueConfig(mode: BusinessMode): IndustryRevenueConfig {
  return INDUSTRY_REVENUE_CONFIG[mode] || INDUSTRY_REVENUE_CONFIG.general;
}
