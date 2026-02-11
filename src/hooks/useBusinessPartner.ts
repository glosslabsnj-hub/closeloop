/**
 * Business Partner Hook
 *
 * Central hook that composes existing hooks into:
 * - Health score (0-100) with breakdown
 * - Business stage detection
 * - Performance pass-through data
 *
 * Audit findings and growth recommendations are now handled by the
 * AI-powered partner-analysis edge function (see usePartnerAnalysis).
 */

import { useMemo } from "react";
import { useTenantConfig, type BusinessMode } from "@/hooks/useTenantConfig";
import { useBrainCompletion, type CompletionStats } from "@/hooks/useBrainCompletion";
import {
  useConversionMetrics,
  type ConversionMetrics,
} from "@/hooks/useIntelligence";
import { useROIDashboard, type ROIDashboardData } from "@/hooks/useROIDashboard";
import { useAIReadinessV2 } from "@/hooks/useAIReadinessV2";
import { useKnowledgeGaps } from "@/hooks/useKnowledgeGaps";
import {
  detectBusinessStage,
  getStageDefinition,
  type BusinessStage,
  type StageDefinition,
} from "@/config/partnerStageDefinitions";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface HealthBreakdown {
  brainCompletion: number; // 0-25
  aiPerformance: number; // 0-25
  revenueTrend: number; // 0-20
  setupCompleteness: number; // 0-15
  knowledgeCoverage: number; // 0-15
}

export interface BusinessPartnerData {
  // Health
  healthScore: number;
  healthBreakdown: HealthBreakdown;
  // Stage
  stage: BusinessStage;
  stageDefinition: StageDefinition;
  // Performance (pass-through)
  roiData: ROIDashboardData | null;
  // Meta
  isLoading: boolean;
  businessMode: BusinessMode;
}

// ─── Health Score Calculation ────────────────────────────────────────────────

function computeHealthBreakdown(
  brain: CompletionStats | null,
  metrics: ConversionMetrics | null,
  roi: ROIDashboardData | null,
  readiness: { canGoLive: boolean; p0Flags: string[]; score: number },
  gapCount: number
): HealthBreakdown {
  // Brain completion (25 points)
  const brainPct = brain?.essentialPercentage ?? 0;
  const brainCompletion = (brainPct / 100) * 25;

  // AI performance (25 points)
  let aiPerformance = 0;
  if (metrics && metrics.totalCalls > 0) {
    aiPerformance += 10; // Base points for having calls
    if (metrics.conversionRate > 30) aiPerformance += 5;
    if (metrics.conversionRate > 50) aiPerformance += 5;
    if (metrics.escalationRate < 15) aiPerformance += 5;
    if (metrics.hangupRate > 40) aiPerformance -= 5;
  }
  aiPerformance = Math.max(0, Math.min(25, aiPerformance));

  // Revenue trend (20 points)
  let revenueTrend = 0;
  if (roi?.hasData) {
    revenueTrend += 10;
    if (roi.trends.revenue > 0) revenueTrend += 5;
    if (roi.roiMultiplier > 1.0) revenueTrend += 5;
  }
  revenueTrend = Math.min(20, revenueTrend);

  // Setup completeness (15 points)
  let setupCompleteness = 0;
  if (readiness.canGoLive) setupCompleteness += 5;
  if (readiness.p0Flags.length === 0) setupCompleteness += 5;
  if (readiness.score >= 85) setupCompleteness += 5;
  setupCompleteness = Math.min(15, setupCompleteness);

  // Knowledge coverage (15 points)
  let knowledgeCoverage = 0;
  if (gapCount < 3) knowledgeCoverage += 10;
  else if (gapCount < 5) knowledgeCoverage += 5;
  if (brain?.isFullyConfigured) knowledgeCoverage += 5;
  // Penalty for high-frequency gaps (capped at -6)
  const gapPenalty = Math.min(6, Math.max(0, gapCount - 2) * 2);
  knowledgeCoverage = Math.max(0, Math.min(15, knowledgeCoverage - gapPenalty));

  return {
    brainCompletion: Math.round(brainCompletion * 10) / 10,
    aiPerformance: Math.round(aiPerformance * 10) / 10,
    revenueTrend: Math.round(revenueTrend * 10) / 10,
    setupCompleteness: Math.round(setupCompleteness * 10) / 10,
    knowledgeCoverage: Math.round(knowledgeCoverage * 10) / 10,
  };
}

// ─── Hook ───────────────────────────────────────────────────────────────────

export function useBusinessPartner(): BusinessPartnerData {
  const { businessMode } = useTenantConfig();

  // Compose existing hooks
  const brainCompletion = useBrainCompletion();
  const conversionQuery = useConversionMetrics(30);
  const roiDashboard = useROIDashboard();
  const readiness = useAIReadinessV2();
  const gaps = useKnowledgeGaps();

  const conversionMetrics = conversionQuery.metrics ?? null;
  const roiData = roiDashboard.data ?? null;

  const isLoading =
    conversionQuery.isLoading ||
    roiDashboard.isLoading ||
    readiness.loading ||
    gaps.loading;

  // Health score
  const healthBreakdown = useMemo(
    () =>
      computeHealthBreakdown(
        brainCompletion,
        conversionMetrics,
        roiData,
        {
          canGoLive: readiness.canGoLive,
          p0Flags: readiness.p0Flags,
          score: readiness.score,
        },
        gaps.totalUnresolvedCount
      ),
    [brainCompletion, conversionMetrics, roiData, readiness, gaps.totalUnresolvedCount]
  );

  const healthScore = useMemo(
    () =>
      Math.round(
        healthBreakdown.brainCompletion +
          healthBreakdown.aiPerformance +
          healthBreakdown.revenueTrend +
          healthBreakdown.setupCompleteness +
          healthBreakdown.knowledgeCoverage
      ),
    [healthBreakdown]
  );

  // Stage detection
  const stage = useMemo(
    () =>
      detectBusinessStage({
        totalCalls30d: conversionMetrics?.totalCalls ?? 0,
        conversionRate: conversionMetrics?.conversionRate ?? 0,
        revenueCents: roiData?.aiRevenueCents ?? 0,
        brainEssentialPct: brainCompletion?.essentialPercentage ?? 0,
        businessMode,
      }),
    [conversionMetrics, roiData, brainCompletion, businessMode]
  );

  const stageDefinition = useMemo(() => getStageDefinition(stage), [stage]);

  return {
    healthScore,
    healthBreakdown,
    stage,
    stageDefinition,
    roiData,
    isLoading,
    businessMode,
  };
}
