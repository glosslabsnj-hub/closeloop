import type { BusinessMode } from "@/types/database";
import type { BusinessStage } from "./partnerStageDefinitions";

export type Difficulty = "easy" | "medium" | "hard";

export interface RecommendationRule {
  id: string;
  title: string;
  description: string;
  expectedImpact: string;
  difficulty: Difficulty;
  estimatedTime: string;
  actionLink: string;
  actionLabel: string;
  modes: BusinessMode[] | "all";
  stages: BusinessStage[];
  condition: (ctx: RecommendationContext) => boolean;
  priority: number;
}

export interface RecommendationContext {
  businessMode: BusinessMode;
  stage: BusinessStage;
  brainEssentialPct: number;
  faqCount: number;
  objectionCount: number;
  knowledgeGapCount: number;
  totalCalls30d: number;
  conversionRate: number;
  hangupRate: number;
  escalationRate: number;
  hasCalendarSync: boolean;
  hasWebhook: boolean;
  hasRecoveryCampaigns: boolean;
  menuItemCount: number;
  serviceCount: number;
  hasDeliveryZones: boolean;
  hasEtaSettings: boolean;
  hasServiceArea: boolean;
  enabledModules: string[];
}

export interface GrowthRecommendation {
  id: string;
  title: string;
  description: string;
  expectedImpact: string;
  difficulty: Difficulty;
  estimatedTime: string;
  actionLink: string;
  actionLabel: string;
  priority: number;
}

export const RECOMMENDATION_RULES: RecommendationRule[] = [
  {
    id: "complete_brain",
    title: "Complete your Business Brain",
    description:
      "Your Business Brain is the foundation of your AI. Fill in missing sections to give your AI the context it needs.",
    expectedImpact: "Significantly improve AI accuracy and caller experience",
    difficulty: "easy",
    estimatedTime: "15-30 min",
    actionLink: "/app/business-brain",
    actionLabel: "Open Brain",
    modes: "all",
    stages: ["getting_started", "building"],
    condition: (ctx) => ctx.brainEssentialPct < 80,
    priority: 1,
  },
  {
    id: "make_test_call",
    title: "Make a test call",
    description:
      "Call your AI number to hear how it sounds. Test common scenarios and refine the experience.",
    expectedImpact: "Identify issues before real callers do",
    difficulty: "easy",
    estimatedTime: "5 min",
    actionLink: "/app/simulator",
    actionLabel: "Test Calls",
    modes: "all",
    stages: ["getting_started"],
    condition: (ctx) => ctx.totalCalls30d === 0,
    priority: 2,
  },
  {
    id: "add_faqs",
    title: "Add FAQs to cover knowledge gaps",
    description:
      "Your callers are asking questions your AI can't answer. Add FAQs to address these gaps.",
    expectedImpact: "Reduce hangups and escalations by answering common questions",
    difficulty: "easy",
    estimatedTime: "10-20 min",
    actionLink: "/app/business-brain?section=training",
    actionLabel: "Add FAQs",
    modes: "all",
    stages: ["getting_started", "building", "growing", "scaling", "established"],
    condition: (ctx) => ctx.knowledgeGapCount > 0 && ctx.faqCount < 10,
    priority: 3,
  },
  {
    id: "add_objections",
    title: "Add objection responses",
    description:
      "Callers are hesitating or pushing back. Train your AI with responses to common objections.",
    expectedImpact: "Convert more hesitant callers into bookings",
    difficulty: "easy",
    estimatedTime: "10-15 min",
    actionLink: "/app/business-brain?section=training",
    actionLabel: "Add Objections",
    modes: "all",
    stages: ["building", "growing", "scaling", "established"],
    condition: (ctx) => ctx.hangupRate > 25 || ctx.objectionCount < 3,
    priority: 4,
  },
  {
    id: "connect_calendar",
    title: "Connect your calendar",
    description:
      "Sync your calendar so your AI can check real-time availability and avoid double-booking.",
    expectedImpact: "Enable real-time availability checking for bookings",
    difficulty: "medium",
    estimatedTime: "5-10 min",
    actionLink: "/app/integrations",
    actionLabel: "Connect",
    modes: ["service", "medical"],
    stages: ["getting_started", "building", "growing"],
    condition: (ctx) => !ctx.hasCalendarSync,
    priority: 5,
  },
  {
    id: "setup_webhook",
    title: "Set up webhook handoff",
    description:
      "Connect a webhook to automatically send bookings and orders to your existing systems.",
    expectedImpact: "Automate data flow between CloseLoop and your tools",
    difficulty: "medium",
    estimatedTime: "15-30 min",
    actionLink: "/app/integrations",
    actionLabel: "Add Webhook",
    modes: "all",
    stages: ["growing", "scaling", "established"],
    condition: (ctx) => !ctx.hasWebhook,
    priority: 6,
  },
  {
    id: "enable_lead_recovery",
    title: "Enable lead recovery",
    description:
      "Automatically follow up with callers who didn't convert. Recover lost opportunities.",
    expectedImpact: "Recover 10-20% of unconverted leads",
    difficulty: "easy",
    estimatedTime: "5 min",
    actionLink: "/app/lead-recovery",
    actionLabel: "Enable Recovery",
    modes: "all",
    stages: ["growing", "scaling"],
    condition: (ctx) => ctx.conversionRate > 0 && !ctx.hasRecoveryCampaigns,
    priority: 7,
  },
  {
    id: "expand_menu",
    title: "Expand your menu",
    description:
      "Add more menu items so your AI can take a wider variety of orders.",
    expectedImpact: "Handle more order types and increase average order value",
    difficulty: "medium",
    estimatedTime: "20-40 min",
    actionLink: "/app/business-brain?section=services",
    actionLabel: "Add Items",
    modes: ["food"],
    stages: ["building", "growing", "scaling"],
    condition: (ctx) => ctx.menuItemCount < 15,
    priority: 8,
  },
  {
    id: "setup_delivery_zones",
    title: "Set up delivery zones",
    description:
      "Define your delivery coverage so your AI can verify addresses and provide accurate estimates.",
    expectedImpact: "Prevent orders outside your delivery range",
    difficulty: "medium",
    estimatedTime: "10-15 min",
    actionLink: "/app/business-brain?section=operations",
    actionLabel: "Set Zones",
    modes: ["food"],
    stages: ["getting_started", "building"],
    condition: (ctx) =>
      ctx.enabledModules.includes("food_orders") && !ctx.hasDeliveryZones,
    priority: 9,
  },
  {
    id: "finetune_eta",
    title: "Fine-tune ETA settings",
    description:
      "Calibrate your ETA estimates so callers get accurate arrival times.",
    expectedImpact: "Build trust with accurate time estimates",
    difficulty: "easy",
    estimatedTime: "5-10 min",
    actionLink: "/app/business-brain?section=operations",
    actionLabel: "Set ETA",
    modes: ["dispatch"],
    stages: ["growing", "scaling", "established"],
    condition: (ctx) => !ctx.hasEtaSettings,
    priority: 10,
  },
  {
    id: "define_service_area",
    title: "Define your service area",
    description:
      "Set your coverage zone so your AI can verify if callers are in your service area.",
    expectedImpact: "Avoid dispatching outside your range",
    difficulty: "easy",
    estimatedTime: "5-10 min",
    actionLink: "/app/business-brain?section=operations",
    actionLabel: "Set Area",
    modes: ["dispatch"],
    stages: ["getting_started", "building"],
    condition: (ctx) => !ctx.hasServiceArea,
    priority: 11,
  },
  {
    id: "review_transcripts",
    title: "Review recent call transcripts",
    description:
      "Listen to how your AI handles calls and identify areas for improvement.",
    expectedImpact: "Discover specific issues affecting conversion",
    difficulty: "easy",
    estimatedTime: "15-30 min",
    actionLink: "/app/inbox",
    actionLabel: "View Calls",
    modes: "all",
    stages: ["building", "growing"],
    condition: (ctx) => ctx.totalCalls30d >= 5 && ctx.conversionRate < 30,
    priority: 12,
  },
  {
    id: "add_more_services",
    title: "Expand your service catalog",
    description:
      "Add more services to help your AI discuss your full range of offerings.",
    expectedImpact: "Capture more booking types",
    difficulty: "easy",
    estimatedTime: "10-20 min",
    actionLink: "/app/business-brain?section=services",
    actionLabel: "Add Services",
    modes: ["service", "medical"],
    stages: ["building", "growing"],
    condition: (ctx) => ctx.serviceCount < 5,
    priority: 13,
  },
  {
    id: "reduce_escalation",
    title: "Reduce escalation rate",
    description:
      "Your AI is escalating too many calls. Add FAQs and objection responses to handle more scenarios.",
    expectedImpact: "Let your AI handle more calls without human intervention",
    difficulty: "medium",
    estimatedTime: "20-30 min",
    actionLink: "/app/business-brain?section=training",
    actionLabel: "Train AI",
    modes: "all",
    stages: ["growing", "scaling", "established"],
    condition: (ctx) => ctx.escalationRate > 20,
    priority: 14,
  },
  {
    id: "improve_greeting",
    title: "Optimize your AI greeting",
    description:
      "A strong greeting sets the tone. Review and refine how your AI introduces itself.",
    expectedImpact: "Better first impressions lead to longer, more productive calls",
    difficulty: "easy",
    estimatedTime: "5-10 min",
    actionLink: "/app/business-brain?section=ai-voice",
    actionLabel: "Edit Greeting",
    modes: "all",
    stages: ["building", "growing"],
    condition: (ctx) => ctx.hangupRate > 30,
    priority: 15,
  },
  {
    id: "address_knowledge_gaps",
    title: "Address frequent knowledge gaps",
    description:
      "Callers repeatedly ask questions your AI can't answer. Resolve the top gaps.",
    expectedImpact: "Each resolved gap reduces future escalations",
    difficulty: "medium",
    estimatedTime: "15-30 min",
    actionLink: "/app/business-brain/gaps",
    actionLabel: "Review Gaps",
    modes: "all",
    stages: ["growing", "scaling", "established"],
    condition: (ctx) => ctx.knowledgeGapCount >= 5,
    priority: 16,
  },
  {
    id: "optimize_pricing",
    title: "Review and optimize pricing",
    description:
      "Fine-tune your pricing configuration to help your AI give accurate quotes.",
    expectedImpact: "Accurate pricing reduces caller friction",
    difficulty: "medium",
    estimatedTime: "15-20 min",
    actionLink: "/app/business-brain?section=operations",
    actionLabel: "Review Pricing",
    modes: ["service", "dispatch"],
    stages: ["scaling", "established"],
    condition: (ctx) => ctx.conversionRate < 40,
    priority: 17,
  },
  {
    id: "increase_faq_coverage",
    title: "Increase FAQ coverage",
    description:
      "Your FAQ count is low relative to your call volume. Add more answers to improve AI performance.",
    expectedImpact: "Cover more caller questions without escalation",
    difficulty: "easy",
    estimatedTime: "15-30 min",
    actionLink: "/app/business-brain?section=training",
    actionLabel: "Add FAQs",
    modes: "all",
    stages: ["scaling", "established"],
    condition: (ctx) => ctx.faqCount < 15 && ctx.totalCalls30d > 50,
    priority: 18,
  },
];

export function getRecommendations(
  ctx: RecommendationContext
): GrowthRecommendation[] {
  return RECOMMENDATION_RULES.filter((rule) => {
    if (rule.modes !== "all" && !rule.modes.includes(ctx.businessMode)) {
      return false;
    }
    if (!rule.stages.includes(ctx.stage)) return false;
    return rule.condition(ctx);
  })
    .sort((a, b) => a.priority - b.priority)
    .map((rule) => ({
      id: rule.id,
      title: rule.title,
      description: rule.description,
      expectedImpact: rule.expectedImpact,
      difficulty: rule.difficulty,
      estimatedTime: rule.estimatedTime,
      actionLink: rule.actionLink,
      actionLabel: rule.actionLabel,
      priority: rule.priority,
    }));
}
