import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useGoldenPathRunner, type TestResult, type GoldenPathRun } from "@/hooks/useGoldenPathRunner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Play,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  ExternalLink,
  RefreshCw,
  Wrench,
  Phone,
  Webhook,
  FileJson,
  Calendar,
  Zap,
  Database,
  History,
  Briefcase,
  UtensilsCrossed,
  Truck,
  Stethoscope,
} from "lucide-react";

interface Tenant {
  id: string;
  name: string;
  business_mode: string;
  hipaa_mode: boolean;
}

const categoryIcons: Record<string, React.ReactNode> = {
  provisioning: <Phone className="h-4 w-4" />,
  telephony: <Phone className="h-4 w-4" />,
  webhook: <Webhook className="h-4 w-4" />,
  extraction: <FileJson className="h-4 w-4" />,
  entity: <Database className="h-4 w-4" />,
  calendar: <Calendar className="h-4 w-4" />,
  automation: <Zap className="h-4 w-4" />,
};

const modeIcons: Record<string, React.ReactNode> = {
  service: <Briefcase className="h-4 w-4" />,
  food: <UtensilsCrossed className="h-4 w-4" />,
  dispatch: <Truck className="h-4 w-4" />,
  medical: <Stethoscope className="h-4 w-4" />,
  general: <Phone className="h-4 w-4" />,
};

const categoryColors: Record<string, string> = {
  provisioning: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30",
  telephony: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/30",
  webhook: "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30",
  extraction: "bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-500/30",
  entity: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  calendar: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30",
  automation: "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30",
};

export function GoldenPathTestRunner() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState<string>("");
  const [loadingTenants, setLoadingTenants] = useState(true);
  const [pastRuns, setPastRuns] = useState<GoldenPathRun[]>([]);
  const { runTests, isRunning, currentRun } = useGoldenPathRunner();

  useEffect(() => {
    loadTenants();
  }, []);

  useEffect(() => {
    if (selectedTenantId) {
      loadPastRuns(selectedTenantId);
    }
  }, [selectedTenantId]);

  const loadTenants = async () => {
    setLoadingTenants(true);
    const { data } = await supabase
      .from("tenants")
      .select("id, name, business_mode, hipaa_mode")
      .order("name");
    setTenants(data || []);
    setLoadingTenants(false);
  };

  const loadPastRuns = async (tenantId: string) => {
    const { data } = await supabase
      .from("golden_path_runs")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .limit(10);
    
    // Map the results to GoldenPathRun type
    setPastRuns((data || []).map(run => ({
      id: run.id,
      tenant_id: run.tenant_id,
      started_at: run.started_at,
      finished_at: run.finished_at,
      overall_status: run.overall_status as "running" | "passed" | "partial" | "failed",
      results_json: (run.results_json as unknown as TestResult[]) || [],
      pass_count: run.pass_count || 0,
      fail_count: run.fail_count || 0,
      mode: run.mode,
    })));
  };

  const handleRunTests = async () => {
    if (!selectedTenantId) return;
    await runTests(selectedTenantId);
    loadPastRuns(selectedTenantId);
  };

  const selectedTenant = tenants.find(t => t.id === selectedTenantId);
  const displayRun = currentRun?.tenant_id === selectedTenantId ? currentRun : null;

  // Group results by category
  const groupedResults: Record<string, TestResult[]> = {};
  if (displayRun?.results_json) {
    for (const result of displayRun.results_json) {
      if (!groupedResults[result.category]) {
        groupedResults[result.category] = [];
      }
      groupedResults[result.category].push(result);
    }
  }

  const categoryOrder = ["provisioning", "telephony", "webhook", "extraction", "entity", "automation", "calendar"];

  return (
    <div className="space-y-6">
      {/* Tenant Selector */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Play className="h-5 w-5" />
            Golden Path Test Runner
          </CardTitle>
          <CardDescription>
            Select a tenant and run automated tests to validate core flows
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Select value={selectedTenantId} onValueChange={setSelectedTenantId}>
              <SelectTrigger className="w-[300px]">
                <SelectValue placeholder={loadingTenants ? "Loading..." : "Select a tenant"} />
              </SelectTrigger>
              <SelectContent>
                {tenants.map((tenant) => (
                  <SelectItem key={tenant.id} value={tenant.id}>
                    <div className="flex items-center gap-2">
                      {modeIcons[tenant.business_mode] || modeIcons.general}
                      <span>{tenant.name}</span>
                      <Badge variant="outline" className="ml-2 text-xs">
                        {tenant.business_mode}
                      </Badge>
                      {tenant.hipaa_mode && (
                        <Badge variant="secondary" className="text-xs">HIPAA</Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button 
              onClick={handleRunTests} 
              disabled={!selectedTenantId || isRunning}
              className="gap-2"
            >
              {isRunning ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Running...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  Run All Tests
                </>
              )}
            </Button>

            <Button 
              variant="outline" 
              size="icon"
              onClick={loadTenants}
              disabled={loadingTenants}
            >
              <RefreshCw className={`h-4 w-4 ${loadingTenants ? "animate-spin" : ""}`} />
            </Button>
          </div>

          {selectedTenant && (
            <div className="mt-4 p-3 bg-muted/50 rounded-lg flex items-center gap-4">
              <div className="flex items-center gap-2">
                {modeIcons[selectedTenant.business_mode] || modeIcons.general}
                <span className="font-medium">{selectedTenant.name}</span>
              </div>
              <Badge>{selectedTenant.business_mode}</Badge>
              {selectedTenant.hipaa_mode && <Badge variant="secondary">HIPAA</Badge>}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Test Results */}
      {displayRun && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                Test Results
                <Badge 
                  variant={
                    displayRun.overall_status === "passed" ? "default" :
                    displayRun.overall_status === "partial" ? "secondary" :
                    "destructive"
                  }
                  className={
                    displayRun.overall_status === "passed" ? "bg-green-600" :
                    displayRun.overall_status === "partial" ? "bg-yellow-600" :
                    undefined
                  }
                >
                  {displayRun.overall_status === "passed" ? "All Passed" :
                   displayRun.overall_status === "partial" ? "Partial" :
                   "Failed"}
                </Badge>
              </CardTitle>
              <div className="text-sm text-muted-foreground">
                <span className="text-primary font-medium">{displayRun.pass_count}</span>
                {" passed, "}
                <span className="text-destructive font-medium">{displayRun.fail_count}</span>
                {" failed"}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[500px] pr-4">
              <div className="space-y-6">
                {categoryOrder.map((category) => {
                  const results = groupedResults[category];
                  if (!results?.length) return null;

                  const passed = results.filter(r => r.passed).length;
                  const total = results.length;

                  return (
                    <div key={category}>
                      <div className="flex items-center gap-2 mb-3">
                        <Badge className={`${categoryColors[category]} border`} variant="outline">
                          {categoryIcons[category]}
                          <span className="ml-1.5 capitalize">{category}</span>
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {passed}/{total} passed
                        </span>
                      </div>
                      <div className="space-y-2">
                        {results.map((result) => (
                          <div
                            key={result.id}
                            className={`p-3 rounded-lg border transition-colors ${
                              result.passed
                                ? "bg-primary/5 border-primary/20"
                                : "bg-destructive/5 border-destructive/20"
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              {result.passed ? (
                                <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                              ) : (
                                <XCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="font-medium">{result.label}</p>
                                <p className="text-sm text-muted-foreground">{result.description}</p>
                                {result.details && (
                                  <p className="text-xs text-muted-foreground mt-1 font-mono bg-muted/50 px-2 py-1 rounded">
                                    {result.details}
                                  </p>
                                )}
                                {!result.passed && result.fixSuggestion && (
                                  <div className="mt-2 flex items-center gap-2">
                                    <AlertTriangle className="h-4 w-4 text-warning" />
                                    <span className="text-sm text-warning">{result.fixSuggestion}</span>
                                    {result.fixLink && (
                                      <Button variant="link" size="sm" className="h-auto p-0" asChild>
                                        <Link to={result.fixLink}>
                                          <Wrench className="h-3 w-3 mr-1" />
                                          Fix
                                          <ExternalLink className="h-3 w-3 ml-1" />
                                        </Link>
                                      </Button>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Past Runs History */}
      {selectedTenantId && pastRuns.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <History className="h-5 w-5" />
              Past Test Runs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
                {pastRuns.slice(0, 5).map((run) => (
                  <div
                    key={run.id}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <Badge 
                        variant={
                          run.overall_status === "passed" ? "default" :
                          run.overall_status === "partial" ? "secondary" :
                          "destructive"
                        }
                        className={
                          run.overall_status === "passed" ? "bg-primary" :
                          run.overall_status === "partial" ? "bg-secondary text-secondary-foreground" :
                          undefined
                        }
                    >
                      {run.overall_status}
                    </Badge>
                    <span className="text-sm">
                      {run.pass_count} passed, {run.fail_count} failed
                    </span>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {new Date(run.started_at).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Links */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Debug Pages</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link to="/debug/telephony">Telephony Debug</Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link to="/debug/ai-context">AI Context Inspector</Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link to="/debug/extraction">Extraction Debug</Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link to="/debug/availability">Availability Debug</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
