import type { BusinessMode } from "@/types/database";

export type AuditSeverity = "critical" | "warning" | "success";

export type AuditCategory =
  | "setup"
  | "knowledge"
  | "performance"
  | "delivery"
  | "optimization";

export interface AuditRule {
  id: string;
  title: string;
  category: AuditCategory;
  modes: BusinessMode[] | "all";
  check: (ctx: AuditContext) => AuditSeverity | null;
  description: (ctx: AuditContext) => string;
  actionLink: string;
  actionLabel: string;
  impact: string;
}

export interface AuditContext {
  businessMode: BusinessMode;
  enabledModules: string[];
  brainEssentialPct: number;
  brainRequiredPct: number;
  hasHours: boolean;
  hasGreeting: boolean;
  hasCancellationPolicy: boolean;
  faqCount: number;
  serviceCount: number;
  menuItemCount: number;
  knowledgeGapCount: number;
  totalCalls30d: number;
  conversionRate: number;
  hangupRate: number;
  escalationRate: number;
  roiMultiplier: number;
  revenueTrendPct: number;
  hasCalendarSync: boolean;
  hasWebhook: boolean;
  hasServiceArea: boolean;
  hasEtaSettings: boolean;
  hasDistancePricing: boolean;
  hasDeliveryZones: boolean;
  hasPrepTime: boolean;
  hipaaMode: boolean;
  memoryEnabled: boolean;
  hasDepositPolicy: boolean;
  canGoLive: boolean;
  p0FlagCount: number;
  readinessScore: number;
  hasUrgentSms: boolean;
  hasProducts: boolean;
  hasFinancingInfo: boolean;
  hasIntakeQuestions: boolean;
  objectionCount: number;
}

export interface AuditFinding {
  ruleId: string;
  title: string;
  category: AuditCategory;
  severity: AuditSeverity;
  description: string;
  actionLink: string;
  actionLabel: string;
  impact: string;
}

const ALL_MODES: "all" = "all";

export const AUDIT_RULES: AuditRule[] = [
  // ── Setup ──
  {
    id: "brain_incomplete",
    title: "Business Brain incomplete",
    category: "setup",
    modes: ALL_MODES,
    check: (ctx) => {
      if (ctx.brainEssentialPct < 50) return "critical";
      if (ctx.brainEssentialPct < 80) return "warning";
      return "success";
    },
    description: (ctx) =>
      ctx.brainEssentialPct < 50
        ? `Your Business Brain is only ${Math.round(ctx.brainEssentialPct)}% complete. Your AI is missing critical context.`
        : ctx.brainEssentialPct < 80
          ? `Your Business Brain is ${Math.round(ctx.brainEssentialPct)}% complete. A few more fields will improve AI accuracy.`
          : `Business Brain is ${Math.round(ctx.brainEssentialPct)}% complete. Great job!`,
    actionLink: "/app/business-brain",
    actionLabel: "Complete Brain",
    impact: "AI cannot answer basic questions without complete business context",
  },
  {
    id: "no_hours",
    title: "Business hours not configured",
    category: "setup",
    modes: ALL_MODES,
    check: (ctx) => (ctx.hasHours ? "success" : "critical"),
    description: () =>
      "Your AI doesn't know when you're open. Callers may get incorrect availability info.",
    actionLink: "/app/business-brain?section=business",
    actionLabel: "Set Hours",
    impact: "AI will give wrong availability information",
  },
  {
    id: "no_greeting",
    title: "Custom greeting not set",
    category: "setup",
    modes: ALL_MODES,
    check: (ctx) => (ctx.hasGreeting ? "success" : "warning"),
    description: () =>
      "A custom greeting helps set caller expectations and builds trust from the first second.",
    actionLink: "/app/business-brain?section=ai-voice",
    actionLabel: "Set Greeting",
    impact: "First impressions affect conversion rates",
  },
  {
    id: "not_go_live_ready",
    title: "Not ready to go live",
    category: "setup",
    modes: ALL_MODES,
    check: (ctx) => {
      if (ctx.canGoLive) return "success";
      if (ctx.p0FlagCount > 0) return "critical";
      return "warning";
    },
    description: (ctx) =>
      ctx.canGoLive
        ? "Your AI is ready to go live!"
        : `${ctx.p0FlagCount} critical issue${ctx.p0FlagCount !== 1 ? "s" : ""} preventing go-live.`,
    actionLink: "/app/go-live",
    actionLabel: "Go Live Checklist",
    impact: "Must resolve before AI can handle real calls",
  },

  // ── Knowledge ──
  {
    id: "no_faqs",
    title: "FAQ coverage",
    category: "knowledge",
    modes: ALL_MODES,
    check: (ctx) => {
      if (ctx.faqCount === 0) return "critical";
      if (ctx.faqCount < 5) return "warning";
      return "success";
    },
    description: (ctx) =>
      ctx.faqCount === 0
        ? "No FAQs configured. Your AI can't answer common questions."
        : ctx.faqCount < 5
          ? `Only ${ctx.faqCount} FAQ${ctx.faqCount !== 1 ? "s" : ""} configured. Add more to reduce escalations.`
          : `${ctx.faqCount} FAQs configured. Good coverage!`,
    actionLink: "/app/business-brain?section=training",
    actionLabel: "Add FAQs",
    impact: "Unanswered questions lead to hangups and escalations",
  },
  {
    id: "knowledge_gaps_high",
    title: "Knowledge gaps detected",
    category: "knowledge",
    modes: ALL_MODES,
    check: (ctx) => {
      if (ctx.knowledgeGapCount >= 10) return "critical";
      if (ctx.knowledgeGapCount >= 5) return "warning";
      if (ctx.knowledgeGapCount > 0) return "warning";
      return "success";
    },
    description: (ctx) =>
      ctx.knowledgeGapCount === 0
        ? "No unresolved knowledge gaps. Your AI has great coverage!"
        : `${ctx.knowledgeGapCount} unresolved knowledge gap${ctx.knowledgeGapCount !== 1 ? "s" : ""}. Callers asked questions your AI couldn't answer.`,
    actionLink: "/app/business-brain/gaps",
    actionLabel: "Review Gaps",
    impact: "Each gap represents a missed opportunity to help a caller",
  },
  {
    id: "no_cancellation_policy",
    title: "Cancellation policy missing",
    category: "knowledge",
    modes: ALL_MODES,
    check: (ctx) => (ctx.hasCancellationPolicy ? "success" : "warning"),
    description: () =>
      "No cancellation policy configured. Your AI can't inform callers about cancellation terms.",
    actionLink: "/app/business-brain?section=operations",
    actionLabel: "Add Policy",
    impact: "Callers may not book without knowing cancellation terms",
  },
  {
    id: "few_objections",
    title: "Objection responses",
    category: "knowledge",
    modes: ALL_MODES,
    check: (ctx) => {
      if (ctx.objectionCount === 0) return "warning";
      if (ctx.objectionCount < 3) return "warning";
      return "success";
    },
    description: (ctx) =>
      ctx.objectionCount === 0
        ? "No objection responses configured. Your AI can't overcome caller hesitations."
        : ctx.objectionCount < 3
          ? `Only ${ctx.objectionCount} objection response${ctx.objectionCount !== 1 ? "s" : ""}. Add more to improve conversion.`
          : `${ctx.objectionCount} objection responses configured.`,
    actionLink: "/app/business-brain?section=training",
    actionLabel: "Add Objections",
    impact: "Handling objections directly increases booking conversion",
  },

  // ── Performance ──
  {
    id: "high_hangup_rate",
    title: "Hangup rate",
    category: "performance",
    modes: ALL_MODES,
    check: (ctx) => {
      if (ctx.totalCalls30d < 5) return null;
      if (ctx.hangupRate > 50) return "critical";
      if (ctx.hangupRate > 30) return "warning";
      return "success";
    },
    description: (ctx) =>
      ctx.hangupRate > 30
        ? `${Math.round(ctx.hangupRate)}% of callers are hanging up. Review your greeting and FAQ coverage.`
        : `Hangup rate is ${Math.round(ctx.hangupRate)}%. Looking good!`,
    actionLink: "/app/business-brain?section=ai-voice",
    actionLabel: "Improve Scripts",
    impact: "Every hangup is a potential lost customer",
  },
  {
    id: "low_conversion",
    title: "Conversion rate",
    category: "performance",
    modes: ALL_MODES,
    check: (ctx) => {
      if (ctx.totalCalls30d < 5) return null;
      if (ctx.conversionRate < 10) return "critical";
      if (ctx.conversionRate < 20) return "warning";
      return "success";
    },
    description: (ctx) =>
      ctx.conversionRate < 20
        ? `Conversion rate is ${Math.round(ctx.conversionRate)}%. Review your AI setup to convert more callers.`
        : `Conversion rate is ${Math.round(ctx.conversionRate)}%. Strong performance!`,
    actionLink: "/app/business-brain?section=training",
    actionLabel: "Improve AI",
    impact: "Higher conversion directly increases revenue",
  },
  {
    id: "high_escalation",
    title: "Escalation rate",
    category: "performance",
    modes: ALL_MODES,
    check: (ctx) => {
      if (ctx.totalCalls30d < 5) return null;
      if (ctx.escalationRate > 25) return "warning";
      return "success";
    },
    description: (ctx) =>
      ctx.escalationRate > 25
        ? `${Math.round(ctx.escalationRate)}% of calls are escalated. Add more FAQs and objection responses.`
        : `Escalation rate is ${Math.round(ctx.escalationRate)}%. Your AI is handling calls well.`,
    actionLink: "/app/business-brain?section=training",
    actionLabel: "Train AI",
    impact: "High escalation means your AI needs more training",
  },

  // ── Delivery / Optimization ──
  {
    id: "negative_roi",
    title: "Return on investment",
    category: "optimization",
    modes: ALL_MODES,
    check: (ctx) => {
      if (ctx.totalCalls30d < 5) return null;
      if (ctx.roiMultiplier < 1.0) return "warning";
      return "success";
    },
    description: (ctx) =>
      ctx.roiMultiplier < 1.0
        ? `ROI multiplier is ${ctx.roiMultiplier.toFixed(1)}x. Improve conversion to get more value from your subscription.`
        : `ROI multiplier is ${ctx.roiMultiplier.toFixed(1)}x. Your AI is paying for itself!`,
    actionLink: "/app/reports/roi",
    actionLabel: "View ROI",
    impact: "Your AI should generate more revenue than it costs",
  },
  {
    id: "revenue_declining",
    title: "Revenue trend",
    category: "optimization",
    modes: ALL_MODES,
    check: (ctx) => {
      if (ctx.totalCalls30d < 10) return null;
      if (ctx.revenueTrendPct < -20) return "warning";
      return "success";
    },
    description: (ctx) =>
      ctx.revenueTrendPct < -20
        ? `Revenue is down ${Math.abs(Math.round(ctx.revenueTrendPct))}% from last month. Review call quality and conversion.`
        : `Revenue trend is ${ctx.revenueTrendPct >= 0 ? "+" : ""}${Math.round(ctx.revenueTrendPct)}%. On track!`,
    actionLink: "/app/reports/roi",
    actionLabel: "View Trends",
    impact: "Declining revenue may indicate a problem in AI performance",
  },
  {
    id: "no_webhook",
    title: "Webhook delivery",
    category: "delivery",
    modes: ALL_MODES,
    check: (ctx) => (ctx.hasWebhook ? "success" : "warning"),
    description: () =>
      "No webhook configured for handoff delivery. Set up a webhook to receive booking/order data in your systems.",
    actionLink: "/app/integrations",
    actionLabel: "Add Webhook",
    impact: "Without a webhook, bookings only exist in CloseLoop",
  },

  // ── Service mode ──
  {
    id: "no_calendar",
    title: "Calendar sync",
    category: "setup",
    modes: ["service", "medical"],
    check: (ctx) => (ctx.hasCalendarSync ? "success" : "warning"),
    description: () =>
      "No calendar connected. Your AI can't check real-time availability.",
    actionLink: "/app/integrations",
    actionLabel: "Connect Calendar",
    impact: "AI may double-book or suggest unavailable times",
  },
  {
    id: "few_services",
    title: "Service catalog",
    category: "knowledge",
    modes: ["service", "medical", "sales"],
    check: (ctx) => {
      if (ctx.serviceCount === 0) return "critical";
      if (ctx.serviceCount < 3) return "warning";
      return "success";
    },
    description: (ctx) =>
      ctx.serviceCount === 0
        ? "No services configured. Your AI can't discuss what you offer."
        : ctx.serviceCount < 3
          ? `Only ${ctx.serviceCount} service${ctx.serviceCount !== 1 ? "s" : ""} configured. Add more for better AI coverage.`
          : `${ctx.serviceCount} services configured.`,
    actionLink: "/app/business-brain?section=services",
    actionLabel: "Add Services",
    impact: "AI needs to know your services to book appointments",
  },
  {
    id: "no_deposit_policy",
    title: "Deposit policy",
    category: "knowledge",
    modes: ["service"],
    check: (ctx) => (ctx.hasDepositPolicy ? "success" : "warning"),
    description: () =>
      "No deposit policy configured. Consider adding one to reduce no-shows.",
    actionLink: "/app/business-brain?section=operations",
    actionLabel: "Set Deposit",
    impact: "Deposits reduce no-show rates",
  },

  // ── Dispatch mode ──
  {
    id: "no_service_area",
    title: "Service area coverage",
    category: "setup",
    modes: ["dispatch"],
    check: (ctx) => (ctx.hasServiceArea ? "success" : "critical"),
    description: () =>
      "No service area configured. Your AI can't verify if a caller is in your coverage zone.",
    actionLink: "/app/business-brain?section=operations",
    actionLabel: "Set Coverage",
    impact: "AI may accept jobs outside your service area",
  },
  {
    id: "no_eta_settings",
    title: "ETA settings",
    category: "knowledge",
    modes: ["dispatch"],
    check: (ctx) => (ctx.hasEtaSettings ? "success" : "warning"),
    description: () =>
      "ETA settings not configured. Your AI can't give callers estimated arrival times.",
    actionLink: "/app/business-brain?section=operations",
    actionLabel: "Set ETA",
    impact: "Callers expect ETA estimates for dispatch services",
  },
  {
    id: "no_distance_pricing",
    title: "Distance pricing",
    category: "knowledge",
    modes: ["dispatch"],
    check: (ctx) => (ctx.hasDistancePricing ? "success" : "warning"),
    description: () =>
      "Distance-based pricing not configured. Your AI can't quote prices based on distance.",
    actionLink: "/app/business-brain?section=operations",
    actionLabel: "Set Pricing",
    impact: "Without pricing rules, AI can only say 'call for a quote'",
  },
  {
    id: "no_urgent_sms",
    title: "Urgent dispatch alerts",
    category: "delivery",
    modes: ["dispatch"],
    check: (ctx) => (ctx.hasUrgentSms ? "success" : "warning"),
    description: () =>
      "No urgent SMS alerts configured. High-priority dispatch jobs won't trigger immediate notifications.",
    actionLink: "/app/integrations",
    actionLabel: "Set Up Alerts",
    impact: "Urgent jobs need immediate attention",
  },

  // ── Food mode ──
  {
    id: "few_menu_items",
    title: "Menu completeness",
    category: "knowledge",
    modes: ["food"],
    check: (ctx) => {
      if (ctx.menuItemCount === 0) return "critical";
      if (ctx.menuItemCount < 10) return "warning";
      return "success";
    },
    description: (ctx) =>
      ctx.menuItemCount === 0
        ? "No menu items configured. Your AI can't take food orders."
        : ctx.menuItemCount < 10
          ? `Only ${ctx.menuItemCount} menu items. Add more for a complete ordering experience.`
          : `${ctx.menuItemCount} menu items configured.`,
    actionLink: "/app/business-brain?section=services",
    actionLabel: "Add Menu Items",
    impact: "AI needs menu items to process food orders",
  },
  {
    id: "no_delivery_zones",
    title: "Delivery zones",
    category: "setup",
    modes: ["food"],
    check: (ctx) => {
      if (!ctx.enabledModules.includes("food_orders")) return null;
      return ctx.hasDeliveryZones ? "success" : "critical";
    },
    description: () =>
      "Delivery enabled but no zones configured. Your AI can't verify delivery addresses.",
    actionLink: "/app/business-brain?section=operations",
    actionLabel: "Set Zones",
    impact: "Without zones, AI may accept orders outside delivery range",
  },
  {
    id: "no_prep_time",
    title: "Prep time estimates",
    category: "knowledge",
    modes: ["food"],
    check: (ctx) => (ctx.hasPrepTime ? "success" : "warning"),
    description: () =>
      "Prep time not configured. Your AI can't give callers accurate wait time estimates.",
    actionLink: "/app/business-brain?section=operations",
    actionLabel: "Set Prep Time",
    impact: "Callers want to know how long their order will take",
  },

  // ── Medical mode ──
  {
    id: "hipaa_not_configured",
    title: "HIPAA compliance",
    category: "setup",
    modes: ["medical"],
    check: (ctx) => (ctx.hipaaMode ? "success" : "critical"),
    description: () =>
      "HIPAA mode not enabled for medical practice. This is required for compliance.",
    actionLink: "/app/settings",
    actionLabel: "Enable HIPAA",
    impact: "Medical practices must operate in HIPAA-compliant mode",
  },
  {
    id: "no_intake_questions",
    title: "Intake questions",
    category: "knowledge",
    modes: ["medical"],
    check: (ctx) => (ctx.hasIntakeQuestions ? "success" : "critical"),
    description: () =>
      "No medical intake questions configured. Your AI can't collect patient information.",
    actionLink: "/app/business-brain?section=operations",
    actionLabel: "Add Intake",
    impact: "AI needs intake questions to properly triage patients",
  },
  {
    id: "memory_in_hipaa",
    title: "Memory in medical mode",
    category: "setup",
    modes: ["medical"],
    check: (ctx) => {
      if (!ctx.hipaaMode) return null;
      return ctx.memoryEnabled ? "critical" : "success";
    },
    description: () =>
      "Customer memory is enabled in HIPAA mode. This may store PHI. Disable memory for compliance.",
    actionLink: "/app/settings",
    actionLabel: "Disable Memory",
    impact: "Storing customer memory in medical mode may violate HIPAA",
  },

  // ── Sales mode ──
  {
    id: "no_products",
    title: "Product catalog",
    category: "knowledge",
    modes: ["sales"],
    check: (ctx) => (ctx.hasProducts ? "success" : "critical"),
    description: () =>
      "No products listed. Your AI can't discuss your inventory or offerings.",
    actionLink: "/app/business-brain?section=services",
    actionLabel: "Add Products",
    impact: "AI needs product knowledge to assist buyers",
  },
  {
    id: "no_financing_info",
    title: "Financing information",
    category: "knowledge",
    modes: ["sales"],
    check: (ctx) => (ctx.hasFinancingInfo ? "success" : "warning"),
    description: () =>
      "No financing information configured. Your AI can't discuss payment options.",
    actionLink: "/app/business-brain?section=operations",
    actionLabel: "Add Financing",
    impact: "Many buyers ask about financing and payment plans",
  },
];

export const AUDIT_CATEGORY_LABELS: Record<AuditCategory, string> = {
  setup: "Setup & Configuration",
  knowledge: "Knowledge & Training",
  performance: "Call Performance",
  delivery: "Delivery & Handoff",
  optimization: "Revenue & Optimization",
};

export const AUDIT_CATEGORY_ORDER: AuditCategory[] = [
  "setup",
  "knowledge",
  "performance",
  "delivery",
  "optimization",
];

export function runAudit(ctx: AuditContext): AuditFinding[] {
  const findings: AuditFinding[] = [];

  for (const rule of AUDIT_RULES) {
    if (rule.modes !== "all" && !rule.modes.includes(ctx.businessMode)) {
      continue;
    }

    const severity = rule.check(ctx);
    if (severity === null) continue;

    findings.push({
      ruleId: rule.id,
      title: rule.title,
      category: rule.category,
      severity,
      description: rule.description(ctx),
      actionLink: rule.actionLink,
      actionLabel: rule.actionLabel,
      impact: rule.impact,
    });
  }

  return findings;
}
