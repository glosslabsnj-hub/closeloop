import type { BusinessMode } from "@/hooks/useTenantConfig";

/**
 * Industry-aware revenue configuration
 * Single source of truth for how revenue is tracked per business mode
 */
export type HeroIconName = "Truck" | "Scissors" | "UtensilsCrossed" | "Stethoscope" | "Building";

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

  // Story-driven UI
  storyTemplate: string;
  callsLabel: string;
  heroIcon: HeroIconName;
  emptyStateSteps: [string, string, string];
  emptyStateEncouragement: string;
  celebratoryTone: boolean;

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
    storyTemplate: "Your AI {verb} {count} {entity} worth {value} this month",
    callsLabel: "Customer calls",
    heroIcon: "Scissors",
    emptyStateSteps: ["A customer calls", "AI books the appointment", "Revenue appears here"],
    emptyStateEncouragement: "The average Voxly service business sees their first AI-booked appointment within 48 hours",
    celebratoryTone: true,
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
    storyTemplate: "Your AI {verb} {count} {entity} worth {value} this month",
    callsLabel: "Roadside calls",
    heroIcon: "Truck",
    emptyStateSteps: ["A driver calls for help", "AI dispatches the job", "Revenue appears here"],
    emptyStateEncouragement: "The average Voxly dispatch business sees their first AI-dispatched job within 48 hours",
    celebratoryTone: true,
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
    storyTemplate: "Your AI {verb} {count} {entity} worth {value} this month",
    callsLabel: "Phone orders",
    heroIcon: "UtensilsCrossed",
    emptyStateSteps: ["A customer calls to order", "AI takes the order", "Revenue appears here"],
    emptyStateEncouragement: "The average Voxly restaurant sees their first AI-placed order within 48 hours",
    celebratoryTone: true,
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
    storyTemplate: "Your AI {verb} {count} {entity} worth {value} this month",
    callsLabel: "Patient calls",
    heroIcon: "Stethoscope",
    emptyStateSteps: ["A patient calls", "AI schedules the appointment", "Revenue appears here"],
    emptyStateEncouragement: "The average Voxly medical practice sees their first AI-scheduled appointment within 48 hours",
    celebratoryTone: false,
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
    storyTemplate: "Your AI {verb} {count} {entity} worth {value} this month",
    callsLabel: "Inbound calls",
    heroIcon: "Building",
    emptyStateSteps: ["A customer calls", "AI handles the request", "Revenue appears here"],
    emptyStateEncouragement: "The average Voxly business sees their first AI-booked entity within 48 hours",
    celebratoryTone: true,
    primaryMetrics: ["ai_revenue", "entities_created", "calls_handled", "conversion_rate"],
  },
  sales: {
    revenueTable: "bookings",
    valueSource: "services.price_amount",
    valueMultiplier: 100,
    completedStatus: "completed",
    cancelledStatuses: ["canceled", "no_show"],
    entityName: "Deals",
    entityNameSingular: "Deal",
    actionVerb: "close",
    actionVerbPast: "closed",
    emptyStateMessage: "Once your AI starts scheduling appointments and qualifying leads, you'll see your pipeline here.",
    emptyStateCta: "Make a test call to get started",
    successMessage: "Your AI closed {count} deals worth {value} this month.",
    storyTemplate: "Your AI {verb} {count} {entity} worth {value} this month",
    callsLabel: "Sales inquiries",
    heroIcon: "Building",
    emptyStateSteps: ["A prospect calls", "AI qualifies and schedules", "Revenue appears here"],
    emptyStateEncouragement: "The average Voxly sales business sees their first AI-scheduled appointment within 48 hours",
    celebratoryTone: true,
    primaryMetrics: ["ai_revenue", "entities_created", "calls_handled", "conversion_rate"],
  },
};

export function getIndustryRevenueConfig(mode: BusinessMode): IndustryRevenueConfig {
  return INDUSTRY_REVENUE_CONFIG[mode] || INDUSTRY_REVENUE_CONFIG.general;
}
