import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useAIContextSnapshots, runGoldenPathTests, type GoldenPathTestResult } from "@/hooks/useAIContextSnapshots";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { 
  RefreshCw, 
  Copy, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  Phone,
  MessageSquare,
  Monitor,
  Clock,
  ChevronDown,
  ChevronUp,
  Zap,
  List,
  TrendingUp,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";

type ChannelFilter = "all" | "voice" | "sms" | "browser_test";

export default function AIContextInspectorPage() {
  const { tenant, isSuperAdmin } = useAuth();
  const tenantId = tenant?.id ?? null;
  const { snapshots, loading, refetch } = useAIContextSnapshots(tenantId);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<GoldenPathTestResult[] | null>(null);
  const [channelFilter, setChannelFilter] = useState<ChannelFilter>("all");
  const [generatingContext, setGeneratingContext] = useState(false);

  // Only accessible to admins/super-admins in dev
  if (!tenantId && !isSuperAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">No tenant context available</p>
      </div>
    );
  }

  // Filter snapshots by channel
  const filteredSnapshots = channelFilter === "all" 
    ? snapshots 
    : snapshots.filter(s => s.channel === channelFilter);

  // Calculate summary metrics
  const metrics = {
    total: snapshots.length,
    voice: snapshots.filter(s => s.channel === "voice").length,
    sms: snapshots.filter(s => s.channel === "sms").length,
    browserTest: snapshots.filter(s => s.channel === "browser_test").length,
    complete: snapshots.filter(s => !s.missing_sections || s.missing_sections.length === 0).length,
    withGaps: snapshots.filter(s => s.missing_sections && s.missing_sections.length > 0).length,
  };

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case "voice": return <Phone className="h-4 w-4" />;
      case "sms": return <MessageSquare className="h-4 w-4" />;
      case "browser_test": return <Monitor className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const getChannelColor = (channel: string) => {
    switch (channel) {
      case "voice": return "bg-primary/10 text-primary";
      case "sms": return "bg-accent/50 text-accent-foreground";
      case "browser_test": return "bg-secondary text-secondary-foreground";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const handleCopyContext = (context: Record<string, unknown>) => {
    navigator.clipboard.writeText(JSON.stringify(context, null, 2));
    toast({ title: "Copied to clipboard" });
  };

  const handleRunTests = (context: Record<string, unknown>) => {
    const results = runGoldenPathTests(context);
    setTestResults(results);
    
    const passCount = results.filter(r => r.passed).length;
    const failCount = results.filter(r => !r.passed).length;
    
    toast({
      title: `Golden Path: ${passCount}/${results.length} passed`,
      description: failCount > 0 ? `${failCount} tests need attention` : "All tests passed!",
      variant: failCount > 0 ? "destructive" : "default",
    });
  };

  const handleGenerateTestContext = async () => {
    if (!tenantId) {
      toast({ title: "No tenant selected", variant: "destructive" });
      return;
    }
    
    setGeneratingContext(true);
    try {
      // Call the get-business-context edge function directly to generate a test snapshot
      const { data, error } = await supabase.functions.invoke("get-business-context", {
        body: { tenantId },
      });
      
      if (error) {
        throw new Error(error.message);
      }
      
      toast({ 
        title: "Context generated successfully", 
        description: "Refresh to see the new snapshot" 
      });
      
      // Refetch snapshots to show the new one
      setTimeout(() => refetch(), 500);
    } catch (err) {
      console.error("Failed to generate test context:", err);
      toast({ 
        title: "Failed to generate context", 
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive" 
      });
    } finally {
      setGeneratingContext(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">AI Context Inspector</h1>
            <p className="text-muted-foreground">Debug what the AI sees during calls and SMS</p>
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={handleGenerateTestContext} 
              variant="outline" 
              size="sm" 
              disabled={generatingContext || !tenantId}
            >
              <Zap className={`h-4 w-4 mr-2 ${generatingContext ? "animate-pulse" : ""}`} />
              {generatingContext ? "Generating..." : "Generate Test Context"}
            </Button>
            <Button onClick={refetch} variant="outline" size="sm" disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Summary Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          <Card className="p-3">
            <div className="flex items-center gap-2">
              <List className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">{metrics.total}</p>
                <p className="text-xs text-muted-foreground">Total Snapshots</p>
              </div>
            </div>
          </Card>
          <Card className="p-3">
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-primary" />
              <div>
                <p className="text-2xl font-bold">{metrics.voice}</p>
                <p className="text-xs text-muted-foreground">Voice Calls</p>
              </div>
            </div>
          </Card>
          <Card className="p-3">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-accent-foreground" />
              <div>
                <p className="text-2xl font-bold">{metrics.sms}</p>
                <p className="text-xs text-muted-foreground">SMS</p>
              </div>
            </div>
          </Card>
          <Card className="p-3">
            <div className="flex items-center gap-2">
              <Monitor className="h-4 w-4 text-secondary-foreground" />
              <div>
                <p className="text-2xl font-bold">{metrics.browserTest}</p>
                <p className="text-xs text-muted-foreground">Browser Tests</p>
              </div>
            </div>
          </Card>
          <Card className="p-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              <div>
                <p className="text-2xl font-bold">{metrics.complete}</p>
                <p className="text-xs text-muted-foreground">Complete</p>
              </div>
            </div>
          </Card>
          <Card className="p-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <div>
                <p className="text-2xl font-bold">{metrics.withGaps}</p>
                <p className="text-xs text-muted-foreground">With Gaps</p>
              </div>
            </div>
          </Card>
        </div>

        <Tabs defaultValue="snapshots">
          <TabsList>
            <TabsTrigger value="snapshots">Context Snapshots</TabsTrigger>
            <TabsTrigger value="tests">Golden Path Tests</TabsTrigger>
          </TabsList>

          <TabsContent value="snapshots" className="mt-4 space-y-4">
            {/* Channel Filter */}
            <div className="flex gap-2">
              <Button 
                variant={channelFilter === "all" ? "default" : "outline"} 
                size="sm"
                onClick={() => setChannelFilter("all")}
              >
                All ({metrics.total})
              </Button>
              <Button 
                variant={channelFilter === "voice" ? "default" : "outline"} 
                size="sm"
                onClick={() => setChannelFilter("voice")}
              >
                <Phone className="h-3 w-3 mr-1" />
                Voice ({metrics.voice})
              </Button>
              <Button 
                variant={channelFilter === "sms" ? "default" : "outline"} 
                size="sm"
                onClick={() => setChannelFilter("sms")}
              >
                <MessageSquare className="h-3 w-3 mr-1" />
                SMS ({metrics.sms})
              </Button>
              <Button 
                variant={channelFilter === "browser_test" ? "default" : "outline"} 
                size="sm"
                onClick={() => setChannelFilter("browser_test")}
              >
                <Monitor className="h-3 w-3 mr-1" />
                Browser ({metrics.browserTest})
              </Button>
            </div>

            {filteredSnapshots.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  {channelFilter === "all" 
                    ? "No context snapshots recorded yet. Make a test call or send an SMS to see data here."
                    : `No ${channelFilter.replace("_", " ")} snapshots found.`
                  }
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {filteredSnapshots.map((snapshot) => {
                  const isExpanded = expandedId === snapshot.id;
                  const missingSections = snapshot.missing_sections || [];
                  const contextJson = snapshot.context_json as Record<string, unknown>;
                  
                  // Extract key info from context for display
                  const contextTenant = contextJson?.tenant as Record<string, unknown> | undefined;
                  const contextOfferings = contextJson?.offerings as Record<string, unknown> | undefined;
                  const businessName = contextTenant?.business_name as string || "Unknown";
                  const businessMode = contextTenant?.business_mode as string || "general";
                  const servicesCount = Array.isArray(contextOfferings?.services) ? (contextOfferings.services as unknown[]).length : 0;
                  const menuCount = Array.isArray(contextOfferings?.menu) ? (contextOfferings.menu as unknown[]).length : 0;
                  
                  return (
                    <Card key={snapshot.id} className="overflow-hidden">
                      <div 
                        className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => setExpandedId(isExpanded ? null : snapshot.id)}
                      >
                        <div className="flex items-center gap-4">
                          <Badge className={getChannelColor(snapshot.channel)}>
                            {getChannelIcon(snapshot.channel)}
                            <span className="ml-1.5 capitalize">{snapshot.channel.replace("_", " ")}</span>
                          </Badge>
                          
                          <div>
                            <p className="font-medium text-sm">
                              {businessName} <span className="text-muted-foreground">({businessMode})</span>
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(snapshot.created_at), "MMM d, h:mm:ss a")}
                              {servicesCount > 0 && ` • ${servicesCount} services`}
                              {menuCount > 0 && ` • ${menuCount} menu items`}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          {missingSections.length > 0 ? (
                            <Badge variant="outline" className="border-destructive/50 text-destructive">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              {missingSections.length} gaps
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="border-primary/50 text-primary">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Complete
                            </Badge>
                          )}
                          
                          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </div>
                      </div>

                      {isExpanded && (
                        <CardContent className="border-t pt-4 space-y-4">
                          {missingSections.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              <span className="text-sm text-muted-foreground">Missing:</span>
                              {missingSections.map((section) => (
                                <Badge key={section} variant="secondary">
                                  {section}
                                </Badge>
                              ))}
                            </div>
                          )}

                          {/* Quick Summary of What AI Can See */}
                          <div className="grid grid-cols-2 md:grid-cols-6 gap-2 text-sm">
                            <div className="p-2 rounded bg-muted/50">
                              <span className="text-muted-foreground">Services:</span>
                              <span className="ml-1 font-medium">{servicesCount}</span>
                            </div>
                            <div className="p-2 rounded bg-muted/50">
                              <span className="text-muted-foreground">Menu:</span>
                              <span className="ml-1 font-medium">{menuCount}</span>
                            </div>
                            <div className="p-2 rounded bg-muted/50">
                              <span className="text-muted-foreground">Menu Summary:</span>
                              <span className="ml-1 font-medium">
                                {typeof contextOfferings?.menu_summary === "string" 
                                  ? `${(contextOfferings.menu_summary as string).length} chars` 
                                  : "0 chars"}
                              </span>
                            </div>
                            <div className="p-2 rounded bg-muted/50">
                              <span className="text-muted-foreground">FAQs:</span>
                              <span className="ml-1 font-medium">
                                {Array.isArray((contextJson?.knowledge as Record<string, unknown>)?.faqs) 
                                  ? ((contextJson?.knowledge as Record<string, unknown>)?.faqs as unknown[]).length 
                                  : 0}
                              </span>
                            </div>
                            <div className="p-2 rounded bg-muted/50">
                              <span className="text-muted-foreground">Hours Today:</span>
                              <span className="ml-1 font-medium text-xs">
                                {String(contextTenant?.hours_today || "Not set").slice(0, 20)}
                              </span>
                            </div>
                            <div className="p-2 rounded bg-muted/50">
                              <span className="text-muted-foreground">Mode:</span>
                              <span className="ml-1 font-medium capitalize">{businessMode}</span>
                            </div>
                          </div>
                          
                          {/* Debug Flags (context_has_*) */}
                          <div className="flex flex-wrap gap-2">
                            <Badge variant={contextTenant?.hours_today ? "default" : "secondary"}>
                              {contextTenant?.hours_today ? <CheckCircle2 className="h-3 w-3 mr-1" /> : <XCircle className="h-3 w-3 mr-1" />}
                              context_has_hours: {contextTenant?.hours_today ? "true" : "false"}
                            </Badge>
                            <Badge variant={menuCount > 0 ? "default" : "secondary"}>
                              {menuCount > 0 ? <CheckCircle2 className="h-3 w-3 mr-1" /> : <XCircle className="h-3 w-3 mr-1" />}
                              context_has_menu: {menuCount > 0 ? "true" : "false"}
                            </Badge>
                            <Badge variant={servicesCount > 0 ? "default" : "secondary"}>
                              {servicesCount > 0 ? <CheckCircle2 className="h-3 w-3 mr-1" /> : <XCircle className="h-3 w-3 mr-1" />}
                              context_has_services: {servicesCount > 0 ? "true" : "false"}
                            </Badge>
                            {/* Show menu_summary length badge for food mode */}
                            {businessMode === "food" && (
                              <Badge variant={typeof contextOfferings?.menu_summary === "string" && (contextOfferings.menu_summary as string).length > 0 ? "default" : "destructive"}>
                                menu_summary: {typeof contextOfferings?.menu_summary === "string" ? `${(contextOfferings.menu_summary as string).length}/1500 chars` : "0 chars"}
                              </Badge>
                            )}
                          </div>
                          
                          {/* Missing Sections Warning */}
                          {missingSections.length > 0 && (
                            <div className="p-2 rounded border border-destructive/30 bg-destructive/5">
                              <span className="text-sm font-medium text-destructive">Missing Sections: </span>
                              <span className="text-sm">{missingSections.join(", ")}</span>
                            </div>
                          )}

                          {/* Dynamic Variables (what was sent to ElevenLabs) */}
                          {snapshot.dynamic_variables_json && Object.keys(snapshot.dynamic_variables_json).length > 0 && (
                            <div className="space-y-2">
                              <h4 className="text-sm font-medium flex items-center gap-2">
                                <Zap className="h-4 w-4 text-primary" />
                                Dynamic Variables Sent to AI
                              </h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                                {Object.entries(snapshot.dynamic_variables_json).map(([key, value]) => {
                                  const isLong = typeof value === "string" && value.length > 100;
                                  const displayValue = isLong ? value.slice(0, 100) + "..." : value;
                                  const hasValue = value && value !== "" && value !== "false";
                                  
                                  return (
                                    <div 
                                      key={key} 
                                      className={`p-2 rounded border ${hasValue ? "bg-primary/5 border-primary/20" : "bg-muted/50 border-muted"}`}
                                    >
                                      <span className="font-mono text-muted-foreground">{key}:</span>
                                      <span className={`ml-1 ${hasValue ? "text-foreground" : "text-muted-foreground"}`}>
                                        {displayValue || "(empty)"}
                                      </span>
                                      {isLong && (
                                        <Badge variant="outline" className="ml-1 text-xs">
                                          {value.length} chars
                                        </Badge>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          <div className="flex gap-2">
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopyContext(snapshot.context_json);
                              }}
                            >
                              <Copy className="h-4 w-4 mr-2" />
                              Copy Context JSON
                            </Button>
                            {snapshot.dynamic_variables_json && (
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCopyContext(snapshot.dynamic_variables_json as Record<string, unknown>);
                                }}
                              >
                                <Copy className="h-4 w-4 mr-2" />
                                Copy Dynamic Vars
                              </Button>
                            )}
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRunTests(snapshot.context_json);
                              }}
                            >
                              <CheckCircle2 className="h-4 w-4 mr-2" />
                              Run Tests
                            </Button>
                          </div>

                          <Tabs defaultValue="context" className="w-full">
                            <TabsList className="grid w-full grid-cols-2">
                              <TabsTrigger value="context">context_json</TabsTrigger>
                              <TabsTrigger value="dynamic_vars">dynamic_variables_json</TabsTrigger>
                            </TabsList>
                            <TabsContent value="context">
                              <ScrollArea className="h-[400px] rounded-md border bg-muted/30 p-4">
                                <pre className="text-xs font-mono whitespace-pre-wrap">
                                  {JSON.stringify(snapshot.context_json, null, 2)}
                                </pre>
                              </ScrollArea>
                            </TabsContent>
                            <TabsContent value="dynamic_vars">
                              <ScrollArea className="h-[400px] rounded-md border bg-muted/30 p-4">
                                <pre className="text-xs font-mono whitespace-pre-wrap">
                                  {snapshot.dynamic_variables_json 
                                    ? JSON.stringify(snapshot.dynamic_variables_json, null, 2)
                                    : "(No dynamic variables recorded for this snapshot)"
                                  }
                                </pre>
                              </ScrollArea>
                            </TabsContent>
                          </Tabs>
                        </CardContent>
                      )}
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="tests" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Golden Path Validation</CardTitle>
                <CardDescription>
                  Run tests against the most recent context to validate data completeness
                </CardDescription>
              </CardHeader>
              <CardContent>
                {snapshots.length > 0 ? (
                  <div className="space-y-4">
                    <Button
                      onClick={() => handleRunTests(snapshots[0].context_json)}
                      className="w-full"
                    >
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Run Golden Path Tests on Latest Context
                    </Button>

                    {testResults && (
                      <div className="space-y-3 mt-4">
                        <div className="flex gap-4 text-sm">
                          <span className="text-primary">
                            ✓ {testResults.filter(r => r.passed).length} passed
                          </span>
                          <span className="text-destructive">
                            ✗ {testResults.filter(r => !r.passed).length} failed
                          </span>
                        </div>

                        {testResults.map((result, idx) => (
                          <div 
                            key={idx}
                            className={`flex items-start gap-3 p-3 rounded-lg border ${
                              result.passed 
                                ? "bg-primary/5 border-primary/20" 
                                : "bg-destructive/5 border-destructive/20"
                            }`}
                          >
                            {result.passed ? (
                              <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                            ) : (
                              <XCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                            )}
                            <div>
                              <p className="font-medium text-sm">
                                [{result.mode}] {result.testName}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {result.details}
                              </p>
                              {result.missingKeys.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {result.missingKeys.map((key) => (
                                    <Badge key={key} variant="outline" className="text-xs">
                                      {key}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">
                    No context snapshots available. Make a test call or send an SMS first.
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
