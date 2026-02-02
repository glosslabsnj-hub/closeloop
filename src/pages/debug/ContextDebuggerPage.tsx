import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLatestContextSnapshot, useLatestDynamicVariables } from "@/hooks/useLatestContextSnapshot";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { JsonViewer } from "@/components/debug/JsonViewer";
import { PreviewCard, PreviewSource } from "@/components/debug/PreviewCard";
import { ContextWarningsPanel } from "@/components/debug/ContextWarningsPanel";
import { ServiceAreaPreview } from "@/components/debug/ServiceAreaPreview";
import {
  RefreshCw,
  Zap,
  Database,
  Eye,
  AlertTriangle,
  Clock,
  MapPin,
  DollarSign,
  FileText,
  Timer,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";

export default function ContextDebuggerPage() {
  const { tenant, isSuperAdmin } = useAuth();
  const tenantId = tenant?.id ?? null;

  const {
    data: snapshot,
    isLoading: snapshotLoading,
    refetch: refetchSnapshot,
  } = useLatestContextSnapshot(tenantId);

  const {
    data: dynamicVars,
    isLoading: varsLoading,
    refetch: refetchVars,
  } = useLatestDynamicVariables(tenantId);

  const [generating, setGenerating] = useState(false);

  // Auth guard
  if (!tenantId && !isSuperAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Card className="w-96">
          <CardContent className="pt-6 text-center">
            <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <p className="text-lg font-medium">Access Denied</p>
            <p className="text-sm text-muted-foreground mt-2">
              You must be logged in as a business owner to access this page.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleRefresh = () => {
    refetchSnapshot();
    refetchVars();
  };

  const handleGenerateSnapshot = async () => {
    if (!tenantId) return;
    setGenerating(true);
    try {
      const { error } = await supabase.functions.invoke("get-business-context", {
        body: { tenantId },
      });
      if (error) throw error;
      toast({ title: "Context snapshot generated" });
      setTimeout(handleRefresh, 500);
    } catch (err) {
      console.error("Failed to generate context:", err);
      toast({
        title: "Failed to generate context",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  // Extract preview values - prioritize dynamic variables, then snapshot
  const getPreviewValue = (
    varKey: string,
    snapshotPath?: string[]
  ): { value: string | null; source: PreviewSource } => {
    // First check dynamic variables
    if (dynamicVars?.variables && dynamicVars.variables[varKey]) {
      return { value: dynamicVars.variables[varKey], source: "variables" };
    }

    // Fall back to snapshot context
    if (snapshot?.context_json && snapshotPath) {
      let val: unknown = snapshot.context_json;
      for (const key of snapshotPath) {
        if (val && typeof val === "object") {
          val = (val as Record<string, unknown>)[key];
        } else {
          val = undefined;
          break;
        }
      }
      if (typeof val === "string" && val.trim()) {
        return { value: val, source: "snapshot" };
      }
    }

    return { value: null, source: "missing" };
  };

  // Get preview values for the 5 key summaries
  const locationSummary = getPreviewValue("address", ["tenant", "address"]);
  const serviceAreaSummary = getPreviewValue("service_area_description", ["tenant", "service_area"]);
  const servicesPricing = getPreviewValue("services_pricing", ["offerings", "services_pricing"]);
  const policiesSummary = getPreviewValue("policies_summary", ["policies"]);
  const etaRulesSummary = getPreviewValue("eta_rules_summary");

  // Build warnings list
  const buildWarnings = () => {
    const tenant_ctx = snapshot?.context_json?.tenant as Record<string, unknown> | undefined;
    const vars = dynamicVars?.variables;

    return [
      {
        id: "business_name",
        label: "Business Name",
        isMissing: !(vars?.business_name || tenant_ctx?.business_name),
        deepLink: "/app/business-brain",
        deepLinkLabel: "Edit Profile",
      },
      {
        id: "address",
        label: "Business Address",
        isMissing: !(vars?.address || tenant_ctx?.address),
        deepLink: "/app/business-brain",
        deepLinkLabel: "Add Address",
      },
      {
        id: "service_area",
        label: "Service Area",
        isMissing: !(vars?.service_area_description || tenant_ctx?.service_area),
        deepLink: "/app/business-brain",
        deepLinkLabel: "Configure",
      },
      {
        id: "services_pricing",
        label: "Services & Pricing",
        isMissing: !(vars?.services_pricing),
        deepLink: "/app/business-brain",
        deepLinkLabel: "Add Services",
      },
      {
        id: "policies",
        label: "Business Policies",
        isMissing: !(vars?.policies_summary),
        deepLink: "/app/business-brain",
        deepLinkLabel: "Add Policies",
      },
      {
        id: "dynamic_vars",
        label: "Dynamic Variables Payload",
        isMissing: !dynamicVars,
        deepLink: "/app/simulator",
        deepLinkLabel: "Run Test Call",
      },
    ];
  };

  const isLoading = snapshotLoading || varsLoading;

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Context Debugger</h1>
            <p className="text-muted-foreground">
              See exactly what the AI sees and what gets sent to the voice agent.
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleGenerateSnapshot}
              variant="outline"
              size="sm"
              disabled={generating || !tenantId}
            >
              <Zap className={`h-4 w-4 mr-2 ${generating ? "animate-pulse" : ""}`} />
              {generating ? "Generating..." : "Generate Snapshot"}
            </Button>
            <Button onClick={handleRefresh} variant="outline" size="sm" disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Main Content - Two column on desktop */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Left Column: Raw Data */}
          <div className="space-y-6">
            {/* Section 1: Latest AI Context Snapshot */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Latest AI Context Snapshot
                </CardTitle>
                <CardDescription>
                  Full business context assembled for AI conversations
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {snapshot ? (
                  <>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-4 w-4" />
                        {format(new Date(snapshot.created_at), "MMM d, h:mm:ss a")}
                      </div>
                      <Badge variant="outline">{snapshot.channel}</Badge>
                      {snapshot.missing_sections.length > 0 && (
                        <Badge variant="destructive" className="gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          {snapshot.missing_sections.length} gaps
                        </Badge>
                      )}
                    </div>
                    <JsonViewer
                      data={snapshot.context_json}
                      title="context_json"
                      maxHeight="350px"
                      showDownload
                      downloadFilename={`context-${snapshot.id}.json`}
                    />
                  </>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Database className="h-10 w-10 mx-auto mb-3 opacity-50" />
                    <p>No snapshots yet.</p>
                    <Button
                      variant="link"
                      onClick={handleGenerateSnapshot}
                      disabled={generating}
                      className="mt-2"
                    >
                      Generate snapshot
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Section 2: Latest Variables Sent to ElevenLabs */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Latest Variables Sent to ElevenLabs
                </CardTitle>
                <CardDescription>
                  The exact payload sent during voice sessions
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {dynamicVars ? (
                  <>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      {format(new Date(dynamicVars.timestamp), "MMM d, h:mm:ss a")}
                      <Badge variant="secondary" className="text-xs">
                        {Object.keys(dynamicVars.variables).length} variables
                      </Badge>
                    </div>
                    <JsonViewer
                      data={dynamicVars.variables}
                      title="dynamic_variables_json"
                      maxHeight="350px"
                      showDownload
                      downloadFilename="dynamic-variables.json"
                    />
                  </>
                ) : (
                  <div className="text-center py-8">
                    <AlertTriangle className="h-10 w-10 mx-auto mb-3 text-destructive" />
                    <p className="text-muted-foreground">
                      No recent variables payload found.
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Run a Test Call to generate one.
                    </p>
                    <Button variant="link" asChild className="mt-2">
                      <a href="/app/simulator">Go to Simulator</a>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Previews & Warnings */}
          <div className="space-y-6">
            {/* Section 3: AI Preview Blocks */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  AI Preview Blocks
                </CardTitle>
                <CardDescription>
                  Key summaries the AI uses to answer questions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="summaries" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="summaries">Summaries</TabsTrigger>
                    <TabsTrigger value="service-area">Service Area</TabsTrigger>
                  </TabsList>

                  <TabsContent value="summaries" className="mt-4 space-y-4">
                    <PreviewCard
                      title="Location Summary"
                      value={locationSummary.value}
                      source={locationSummary.source}
                      icon={<MapPin className="h-4 w-4" />}
                    />

                    <PreviewCard
                      title="Service Area Summary"
                      value={serviceAreaSummary.value}
                      source={serviceAreaSummary.source}
                      icon={<MapPin className="h-4 w-4" />}
                    />

                    <PreviewCard
                      title="Services & Pricing"
                      value={servicesPricing.value}
                      source={servicesPricing.source}
                      icon={<DollarSign className="h-4 w-4" />}
                    />

                    <PreviewCard
                      title="Policies Summary"
                      value={policiesSummary.value}
                      source={policiesSummary.source}
                      icon={<FileText className="h-4 w-4" />}
                    />

                    <PreviewCard
                      title="ETA Rules Summary"
                      value={etaRulesSummary.value}
                      source={etaRulesSummary.source}
                      icon={<Timer className="h-4 w-4" />}
                    />
                  </TabsContent>

                  <TabsContent value="service-area" className="mt-4">
                    <ServiceAreaPreview />
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            {/* Section 4: Warnings Panel */}
            <ContextWarningsPanel warnings={buildWarnings()} />
          </div>
        </div>
      </div>
    </div>
  );
}
