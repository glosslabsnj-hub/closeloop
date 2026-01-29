import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useAIContextSnapshots, runGoldenPathTests, type GoldenPathTestResult } from "@/hooks/useAIContextSnapshots";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";

export default function AIContextInspectorPage() {
  const { tenant, isSuperAdmin } = useAuth();
  const tenantId = tenant?.id ?? null;
  const { snapshots, loading, refetch } = useAIContextSnapshots(tenantId);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<GoldenPathTestResult[] | null>(null);

  // Only accessible to admins/super-admins in dev
  if (!tenantId && !isSuperAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">No tenant context available</p>
      </div>
    );
  }

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

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">AI Context Inspector</h1>
            <p className="text-muted-foreground">Debug what the AI sees during calls and SMS</p>
          </div>
          <Button onClick={refetch} variant="outline" size="sm" disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        <Tabs defaultValue="snapshots">
          <TabsList>
            <TabsTrigger value="snapshots">Context Snapshots</TabsTrigger>
            <TabsTrigger value="tests">Golden Path Tests</TabsTrigger>
          </TabsList>

          <TabsContent value="snapshots" className="mt-4">
            {snapshots.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  No context snapshots recorded yet. Make a test call or send an SMS to see data here.
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {snapshots.map((snapshot) => {
                  const isExpanded = expandedId === snapshot.id;
                  const missingSections = snapshot.missing_sections || [];
                  
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
                              Session: {snapshot.session_id.slice(0, 20)}...
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(snapshot.created_at), "MMM d, h:mm:ss a")}
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
                              Copy JSON
                            </Button>
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

                          <ScrollArea className="h-[400px] rounded-md border bg-muted/30 p-4">
                            <pre className="text-xs font-mono whitespace-pre-wrap">
                              {JSON.stringify(snapshot.context_json, null, 2)}
                            </pre>
                          </ScrollArea>
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
