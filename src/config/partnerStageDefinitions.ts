import type { BusinessMode } from "@/types/database";

export type BusinessStage =
  | "established"
  | "scaling"
  | "growing"
  | "building"
  | "getting_started";

export interface StageDefinition {
  stage: BusinessStage;
  label: string;
  description: string;
  focusAreas: string[];
  order: number;
}

export interface StageContext {
  totalCalls30d: number;
  conversionRate: number;
  revenueCents: number;
  brainEssentialPct: number;
  businessMode: BusinessMode;
}

export const STAGE_DEFINITIONS: StageDefinition[] = [
  {
    stage: "established",
    label: "Established",
    description:
      "Your AI is running at peak performance with strong conversions and revenue.",
    focusAreas: [
      "Optimize pricing and upsells",
      "Expand service offerings",
      "Fine-tune AI responses",
    ],
    order: 4,
  },
  {
    stage: "scaling",
    label: "Scaling",
    description:
      "You're handling serious volume. Focus on maintaining quality as you grow.",
    focusAreas: [
      "Monitor conversion quality",
      "Address knowledge gaps",
      "Set up automation workflows",
    ],
    order: 3,
  },
  {
    stage: "growing",
    label: "Growing",
    description:
      "Calls are flowing and your AI is converting. Time to level up.",
    focusAreas: [
      "Improve conversion rate",
      "Complete Business Brain",
      "Add objection responses",
    ],
    order: 2,
  },
  {
    stage: "building",
    label: "Building",
    description:
      "You've started receiving calls. Keep training your AI to handle more scenarios.",
    focusAreas: [
      "Complete Business Brain setup",
      "Add FAQs and policies",
      "Review call transcripts",
    ],
    order: 1,
  },
  {
    stage: "getting_started",
    label: "Getting Started",
    description:
      "Welcome! Let's get your AI assistant set up and ready for calls.",
    focusAreas: [
      "Complete onboarding setup",
      "Configure your Business Brain",
      "Make a test call",
    ],
    order: 0,
  },
];

/**
 * Waterfall stage detection: first match wins (most advanced first).
 */
export function detectBusinessStage(ctx: StageContext): BusinessStage {
  if (
    ctx.totalCalls30d >= 200 &&
    ctx.conversionRate > 40 &&
    ctx.revenueCents > 500_000 &&
    ctx.brainEssentialPct > 90
  ) {
    return "established";
  }

  if (
    ctx.totalCalls30d >= 200 &&
    ctx.conversionRate > 25 &&
    ctx.revenueCents > 200_000
  ) {
    return "scaling";
  }

  if (
    ctx.totalCalls30d >= 50 &&
    ctx.brainEssentialPct > 80 &&
    ctx.conversionRate > 15
  ) {
    return "growing";
  }

  if (ctx.totalCalls30d >= 10 && ctx.brainEssentialPct > 50) {
    return "building";
  }

  return "getting_started";
}

export function getStageDefinition(stage: BusinessStage): StageDefinition {
  return STAGE_DEFINITIONS.find((s) => s.stage === stage)!;
}
