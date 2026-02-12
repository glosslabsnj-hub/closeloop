import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { PageContainer } from "@/components/layout/PageContainer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useBusinessPartner } from "@/hooks/useBusinessPartner";
import { usePartnerAnalysis } from "@/hooks/usePartnerAnalysis";
import { useBusinessAwareness } from "@/hooks/useBusinessAwareness";
import { PartnerAnalysisTab } from "@/components/partner/PartnerAnalysisTab";
import { PartnerActionPlanTab } from "@/components/partner/PartnerActionPlanTab";
import { PartnerPerformanceTab } from "@/components/partner/PartnerPerformanceTab";

const STAGE_DESCRIPTIONS_STATIC: Record<string, string> = {
  getting_started: "Let's get your AI assistant set up and ready for calls.",
  building: "Your AI is learning. Keep training it to handle more scenarios.",
  growing: "Calls are flowing. Time to optimize and grow.",
  scaling: "You're handling serious volume. Focus on quality.",
  established: "Peak performance. Fine-tune and expand.",
};

function buildStageDescription(
  stage: string,
  businessName: string,
  serviceCount: number,
  faqCount: number,
  gapCount: number,
  recentCallCount: number,
  conversionRate: number,
): string {
  // Fall back to static if no business name
  if (!businessName) return STAGE_DESCRIPTIONS_STATIC[stage] ?? "Your AI-powered business advisor";

  switch (stage) {
    case "getting_started":
      return `Let's get ${businessName} answering calls.${serviceCount > 0 ? "" : " Start by adding your services."}${faqCount === 0 ? " Add FAQs so your AI can answer common questions." : ""}`;
    case "building":
      return `${businessName} is learning.${gapCount > 0 ? ` Your AI couldn't answer ${gapCount} question${gapCount === 1 ? "" : "s"} — add those answers.` : " Keep training it."}`;
    case "growing": {
      const convPct = Math.round(conversionRate * 100);
      return `${businessName} handled ${recentCallCount} calls recently.${convPct < 30 ? " Conversion is below average — let's fix that." : " Looking good!"}`;
    }
    case "scaling":
      return `${businessName} is handling serious volume. Focus on quality and consistency.`;
    case "established":
      return `${businessName} is at peak performance. Fine-tune and expand.`;
    default:
      return STAGE_DESCRIPTIONS_STATIC[stage] ?? "Your AI-powered business advisor";
  }
}

export default function BusinessPartnerPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "analysis";
  const data = useBusinessPartner();
  const partnerAnalysis = usePartnerAnalysis();
  const awareness = useBusinessAwareness();

  const stageDescription = useMemo(
    () => buildStageDescription(
      data.stage,
      awareness.businessName,
      awareness.serviceCount,
      awareness.faqCount,
      awareness.gapCount,
      awareness.recentCallCount,
      awareness.conversionRate,
    ),
    [data.stage, awareness.businessName, awareness.serviceCount, awareness.faqCount, awareness.gapCount, awareness.recentCallCount, awareness.conversionRate],
  );

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value }, { replace: true });
  };

  if (data.isLoading) {
    return (
      <>
        <PageHeader
          title="Business Partner"
          description="Your AI-powered business advisor"
          icon={Sparkles}
        />
        <PageContainer maxWidth="xl">
          <div className="space-y-6">
            <Skeleton className="h-10 w-80" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Skeleton className="h-[350px]" />
              <Skeleton className="h-[350px]" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Skeleton className="h-[100px]" />
              <Skeleton className="h-[100px]" />
              <Skeleton className="h-[100px]" />
            </div>
          </div>
        </PageContainer>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Business Partner"
        description={stageDescription}
        icon={Sparkles}
      />
      <PageContainer maxWidth="xl">
        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList>
            <TabsTrigger value="analysis">Analysis</TabsTrigger>
            <TabsTrigger value="action-plan">Action Plan</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
          </TabsList>

          <div className="mt-6">
            <TabsContent value="analysis" className="mt-0">
              <PartnerAnalysisTab
                analysis={partnerAnalysis.analysis}
                isLoading={partnerAnalysis.isLoading}
                isRefreshing={partnerAnalysis.isRefreshing}
                generatedAt={partnerAnalysis.generatedAt}
                isCached={partnerAnalysis.isCached}
                onRefresh={partnerAnalysis.refresh}
                canRefresh={partnerAnalysis.canRefresh}
                refreshCountToday={partnerAnalysis.refreshCountToday}
                maxRefreshes={partnerAnalysis.maxRefreshes}
                healthScore={data.healthScore}
                healthBreakdown={data.healthBreakdown}
                stage={data.stage}
                stageDefinition={data.stageDefinition}
              />
            </TabsContent>

            <TabsContent value="action-plan" className="mt-0">
              <PartnerActionPlanTab
                analysis={partnerAnalysis.analysis}
                isLoading={partnerAnalysis.isLoading}
                stageDefinition={data.stageDefinition}
              />
            </TabsContent>

            <TabsContent value="performance" className="mt-0">
              <PartnerPerformanceTab roiData={data.roiData} />
            </TabsContent>
          </div>
        </Tabs>
      </PageContainer>
    </>
  );
}
