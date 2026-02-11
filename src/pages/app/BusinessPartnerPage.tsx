import { useSearchParams } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { PageContainer } from "@/components/layout/PageContainer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useBusinessPartner } from "@/hooks/useBusinessPartner";
import { PartnerOverviewTab } from "@/components/partner/PartnerOverviewTab";
import { PartnerAuditTab } from "@/components/partner/PartnerAuditTab";
import { PartnerGrowthTab } from "@/components/partner/PartnerGrowthTab";
import { PartnerPerformanceTab } from "@/components/partner/PartnerPerformanceTab";

const STAGE_DESCRIPTIONS: Record<string, string> = {
  getting_started: "Let's get your AI assistant set up and ready for calls.",
  building: "Your AI is learning. Keep training it to handle more scenarios.",
  growing: "Calls are flowing. Time to optimize and grow.",
  scaling: "You're handling serious volume. Focus on quality.",
  established: "Peak performance. Fine-tune and expand.",
};

export default function BusinessPartnerPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "overview";
  const data = useBusinessPartner();

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
        description={STAGE_DESCRIPTIONS[data.stage] ?? "Your AI-powered business advisor"}
        icon={Sparkles}
      />
      <PageContainer maxWidth="xl">
        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="audit" className="flex items-center gap-1.5">
              Audit
              {data.criticalCount > 0 && (
                <Badge variant="destructive" className="text-[10px] px-1.5 py-0 min-w-[18px] h-[18px] flex items-center justify-center">
                  {data.criticalCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="growth">Growth</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
          </TabsList>

          <div className="mt-6">
            <TabsContent value="overview" className="mt-0">
              <PartnerOverviewTab data={data} />
            </TabsContent>

            <TabsContent value="audit" className="mt-0">
              <PartnerAuditTab
                findings={data.auditFindings}
                criticalCount={data.criticalCount}
                warningCount={data.warningCount}
                successCount={data.successCount}
              />
            </TabsContent>

            <TabsContent value="growth" className="mt-0">
              <PartnerGrowthTab
                recommendations={data.recommendations}
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
