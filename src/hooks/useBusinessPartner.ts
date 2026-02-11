/**
 * Business Partner Hook
 *
 * Central hook that composes 8+ existing hooks into:
 * - Health score (0-100) with breakdown
 * - Business stage detection
 * - Audit findings
 * - Growth recommendations
 * - Performance pass-through data
 */

import { useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTenantConfig, type BusinessMode } from "@/hooks/useTenantConfig";
import { useCapabilities } from "@/hooks/useCapabilities";
import { useBrainCompletion, type CompletionStats } from "@/hooks/useBrainCompletion";
import {
  useConversionMetrics,
  useBusinessPatterns,
  useIntelligenceInsights,
  useLatestDigest,
  type ConversionMetrics,
  type BusinessPattern,
  type IntelligenceInsight,
  type IntelligenceDigest,
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
import {
  runAudit,
  type AuditContext,
  type AuditFinding,
} from "@/config/partnerAuditRules";
import {
  getRecommendations,
  type RecommendationContext,
  type GrowthRecommendation,
} from "@/config/partnerRecommendations";

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
  // Audit
  auditFindings: AuditFinding[];
  criticalCount: number;
  warningCount: number;
  successCount: number;
  // Growth
  recommendations: GrowthRecommendation[];
  // Performance (pass-through)
  conversionMetrics: ConversionMetrics | null;
  roiData: ROIDashboardData | null;
  patterns: BusinessPattern[];
  insights: IntelligenceInsight[];
  digest: IntelligenceDigest | null;
  brainCompletion: CompletionStats | null;
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
  const { tenant, assistantSettings } = useAuth();
  const { businessMode, enabledModules, hipaaMode } = useTenantConfig();
  const capabilities = useCapabilities();

  // Compose existing hooks
  const brainCompletion = useBrainCompletion();
  const conversionQuery = useConversionMetrics(30);
  const patternsQuery = useBusinessPatterns();
  const insightsQuery = useIntelligenceInsights();
  const digestQuery = useLatestDigest();
  const roiDashboard = useROIDashboard();
  const readiness = useAIReadinessV2();
  const gaps = useKnowledgeGaps();

  const conversionMetrics = conversionQuery.metrics ?? null;
  const patterns = patternsQuery.data ?? [];
  const insights = insightsQuery.data ?? [];
  const digest = digestQuery.data ?? null;
  const roiData = roiDashboard.data ?? null;

  const isLoading =
    conversionQuery.isLoading ||
    patternsQuery.isLoading ||
    insightsQuery.isLoading ||
    roiDashboard.isLoading ||
    readiness.loading ||
    gaps.loading;

  // Derive tenant-level flags from available data
  const tenantFlags = useMemo(() => {
    const hours = tenant?.hours_json;
    const hasHours =
      !!hours && typeof hours === "object" && Object.keys(hours).length > 0;
    const hasGreeting = !!(
      assistantSettings?.greeting_script &&
      assistantSettings.greeting_script.trim().length > 0
    );

    // Approximate checks from tenant config / capabilities
    const hasCancellationPolicy = !!(
      tenant?.context_fields_json &&
      typeof tenant.context_fields_json === "object" &&
      (tenant.context_fields_json as Record<string, unknown>)
        .cancellation_policy
    );
    const hasServiceArea = !!(
      tenant?.service_area_json &&
      typeof tenant.service_area_json === "object" &&
      Object.keys(tenant.service_area_json as object).length > 0
    );
    const hasEtaSettings = !!(
      tenant?.eta_policy_jsonb &&
      typeof tenant.eta_policy_jsonb === "object" &&
      Object.keys(tenant.eta_policy_jsonb as object).length > 0
    );
    const hasDistancePricing = !!(
      tenant?.pricing_rules_jsonb &&
      typeof tenant.pricing_rules_jsonb === "object" &&
      Object.keys(tenant.pricing_rules_jsonb as object).length > 0
    );
    const hasDepositPolicy = !!(assistantSettings?.deposit_required);

    return {
      hasHours,
      hasGreeting,
      hasCancellationPolicy,
      hasServiceArea,
      hasEtaSettings,
      hasDistancePricing,
      hasDepositPolicy,
    };
  }, [tenant, assistantSettings]);

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

  // Audit
  const auditFindings = useMemo(() => {
    const ctx: AuditContext = {
      businessMode,
      enabledModules,
      brainEssentialPct: brainCompletion?.essentialPercentage ?? 0,
      brainRequiredPct: brainCompletion?.requiredPercentage ?? 0,
      hasHours: tenantFlags.hasHours,
      hasGreeting: tenantFlags.hasGreeting,
      hasCancellationPolicy: tenantFlags.hasCancellationPolicy,
      faqCount: 0, // Will be approximate — brain completion tracks this
      serviceCount: 0,
      menuItemCount: 0,
      knowledgeGapCount: gaps.totalUnresolvedCount,
      totalCalls30d: conversionMetrics?.totalCalls ?? 0,
      conversionRate: conversionMetrics?.conversionRate ?? 0,
      hangupRate: conversionMetrics?.hangupRate ?? 0,
      escalationRate: conversionMetrics?.escalationRate ?? 0,
      roiMultiplier: roiData?.roiMultiplier ?? 0,
      revenueTrendPct: roiData?.trends?.revenue ?? 0,
      hasCalendarSync: capabilities.hasCalendarSync,
      hasWebhook: false, // Approximated — we don't have a direct check
      hasServiceArea: tenantFlags.hasServiceArea,
      hasEtaSettings: tenantFlags.hasEtaSettings,
      hasDistancePricing: tenantFlags.hasDistancePricing,
      hasDeliveryZones: false, // Approximate
      hasPrepTime: false, // Approximate
      hipaaMode,
      memoryEnabled: false, // Conservative default
      hasDepositPolicy: tenantFlags.hasDepositPolicy,
      canGoLive: readiness.canGoLive,
      p0FlagCount: readiness.p0Flags.length,
      readinessScore: readiness.score,
      hasUrgentSms: false, // Approximate
      hasProducts: capabilities.hasSalesInventory,
      hasFinancingInfo: false, // Approximate
      hasIntakeQuestions: capabilities.hasNewPatientForms,
      objectionCount: 0, // Approximate
    };
    return runAudit(ctx);
  }, [
    businessMode,
    enabledModules,
    brainCompletion,
    tenantFlags,
    gaps.totalUnresolvedCount,
    conversionMetrics,
    roiData,
    capabilities,
    hipaaMode,
    readiness,
  ]);

  const criticalCount = useMemo(
    () => auditFindings.filter((f) => f.severity === "critical").length,
    [auditFindings]
  );
  const warningCount = useMemo(
    () => auditFindings.filter((f) => f.severity === "warning").length,
    [auditFindings]
  );
  const successCount = useMemo(
    () => auditFindings.filter((f) => f.severity === "success").length,
    [auditFindings]
  );

  // Growth recommendations
  const recommendations = useMemo(() => {
    const ctx: RecommendationContext = {
      businessMode,
      stage,
      brainEssentialPct: brainCompletion?.essentialPercentage ?? 0,
      faqCount: 0,
      objectionCount: 0,
      knowledgeGapCount: gaps.totalUnresolvedCount,
      totalCalls30d: conversionMetrics?.totalCalls ?? 0,
      conversionRate: conversionMetrics?.conversionRate ?? 0,
      hangupRate: conversionMetrics?.hangupRate ?? 0,
      escalationRate: conversionMetrics?.escalationRate ?? 0,
      hasCalendarSync: capabilities.hasCalendarSync,
      hasWebhook: false,
      hasRecoveryCampaigns: false,
      menuItemCount: 0,
      serviceCount: 0,
      hasDeliveryZones: false,
      hasEtaSettings: tenantFlags.hasEtaSettings,
      hasServiceArea: tenantFlags.hasServiceArea,
      enabledModules,
    };
    return getRecommendations(ctx);
  }, [
    businessMode,
    stage,
    brainCompletion,
    gaps.totalUnresolvedCount,
    conversionMetrics,
    capabilities,
    tenantFlags,
    enabledModules,
  ]);

  return {
    healthScore,
    healthBreakdown,
    stage,
    stageDefinition,
    auditFindings,
    criticalCount,
    warningCount,
    successCount,
    recommendations,
    conversionMetrics,
    roiData,
    patterns,
    insights,
    digest,
    brainCompletion,
    isLoading,
    businessMode,
  };
}
