import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { 
  Brain, Search, MessageSquare, ChevronDown, 
  Loader2, AlertTriangle, CheckCircle2, Info
} from "lucide-react";

interface KnowledgeSnippet {
  source_type: string;
  id: string;
  title: string;
  content: string;
  relevance_score: number;
}

interface ResponsePlan {
  intent: string;
  confidence: string;
  required_info_to_collect: string[];
  facts_to_use: Array<{ source: string; content: string }>;
  policy_constraints: string[];
  guardrails_applied: string[];
  next_action: string;
  draft_reply: string;
  sources_used: Array<{ type: string; id: string }>;
  knowledge_gap_detected: boolean;
  gap_description?: string;
}

export default function AIBrainDebugger() {
  const { tenant } = useAuth();
  const { toast } = useToast();
  
  const [testMessage, setTestMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [brain, setBrain] = useState<any>(null);
  const [snippets, setSnippets] = useState<KnowledgeSnippet[]>([]);
  const [plan, setPlan] = useState<ResponsePlan | null>(null);
  const [brainOpen, setBrainOpen] = useState(false);
  const [snippetsOpen, setSnippetsOpen] = useState(true);

  const loadBrain = async () => {
    if (!tenant?.id) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('build-business-brain', {
        body: { tenantId: tenant.id },
      });

      if (error) throw error;
      setBrain(data.brain);
      toast({ title: "Business brain loaded!" });
    } catch (error: any) {
      toast({ 
        variant: "destructive", 
        title: "Failed to load brain",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const testQuery = async () => {
    if (!tenant?.id || !testMessage.trim()) return;

    setLoading(true);
    try {
      // Call the response planner which internally calls brain and retrieval
      const { data, error } = await supabase.functions.invoke('ai-plan-response', {
        body: { 
          tenantId: tenant.id, 
          userMessage: testMessage,
          channel: 'call',
        },
      });

      if (error) throw error;

      setPlan(data.plan);
      
      // Also fetch snippets directly for display
      const { data: knowledgeData } = await supabase.functions.invoke('retrieve-knowledge', {
        body: { 
          tenantId: tenant.id, 
          queryText: testMessage,
          intent: data.plan.intent,
          topK: 8,
        },
      });
      
      if (knowledgeData) {
        setSnippets(knowledgeData.snippets || []);
      }

      // Load brain if not already loaded
      if (!brain) {
        const { data: brainData } = await supabase.functions.invoke('build-business-brain', {
          body: { tenantId: tenant.id },
        });
        if (brainData) setBrain(brainData.brain);
      }

    } catch (error: any) {
      toast({ 
        variant: "destructive", 
        title: "Query failed",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const confidenceColor = (confidence: string) => {
    switch (confidence) {
      case 'high': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      default: return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" />
          AI Brain Debugger
        </CardTitle>
        <CardDescription>
          Test how your AI processes questions using real business data
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Test Input */}
        <div className="space-y-2">
          <Textarea
            value={testMessage}
            onChange={(e) => setTestMessage(e.target.value)}
            placeholder="Enter a customer question to test, e.g. 'How much do you charge for a detail?'"
            rows={3}
          />
          <div className="flex gap-2">
            <Button onClick={testQuery} disabled={loading || !testMessage.trim()} className="gap-2">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              Test Query
            </Button>
            <Button variant="outline" onClick={loadBrain} disabled={loading}>
              Load Brain Only
            </Button>
          </div>
        </div>

        {/* Results */}
        {plan && (
          <Tabs defaultValue="response" className="w-full">
            <TabsList className="w-full justify-start">
              <TabsTrigger value="response" className="gap-1">
                <MessageSquare className="h-4 w-4" />
                Response
              </TabsTrigger>
              <TabsTrigger value="snippets" className="gap-1">
                <Search className="h-4 w-4" />
                Retrieved ({snippets.length})
              </TabsTrigger>
              <TabsTrigger value="brain" className="gap-1">
                <Brain className="h-4 w-4" />
                Brain
              </TabsTrigger>
            </TabsList>

            {/* Response Plan Tab */}
            <TabsContent value="response" className="space-y-4 mt-4">
              {/* Intent & Confidence */}
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">Intent: {plan.intent}</Badge>
                <Badge className={confidenceColor(plan.confidence)}>
                  Confidence: {plan.confidence}
                </Badge>
                <Badge variant="outline">Action: {plan.next_action}</Badge>
              </div>

              {/* Knowledge Gap Warning */}
              {plan.knowledge_gap_detected && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-yellow-800 dark:text-yellow-200">Knowledge Gap Detected</p>
                    <p className="text-sm text-yellow-700 dark:text-yellow-300">{plan.gap_description}</p>
                  </div>
                </div>
              )}

              {/* Draft Reply */}
              <div className="space-y-2">
                <p className="text-sm font-medium">AI Response:</p>
                <div className="p-4 rounded-lg bg-primary/5 border">
                  <p className="text-sm">{plan.draft_reply}</p>
                </div>
              </div>

              {/* Facts Used */}
              {plan.facts_to_use.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Facts Used:</p>
                  <div className="space-y-1">
                    {plan.facts_to_use.map((fact, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm">
                        <Badge variant="secondary" className="shrink-0">{fact.source}</Badge>
                        <span className="text-muted-foreground line-clamp-2">{fact.content}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Policy Constraints */}
              {plan.policy_constraints.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Policies Applied:</p>
                  <ul className="text-sm text-muted-foreground list-disc list-inside">
                    {plan.policy_constraints.map((p, i) => (
                      <li key={i}>{p}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Required Info */}
              {plan.required_info_to_collect.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Should Collect:</p>
                  <div className="flex flex-wrap gap-1">
                    {plan.required_info_to_collect.map((info, i) => (
                      <Badge key={i} variant="outline">{info}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Sources */}
              <div className="space-y-2">
                <p className="text-sm font-medium">Sources Used:</p>
                <div className="flex flex-wrap gap-1">
                  {plan.sources_used.map((s, i) => (
                    <Badge key={i} variant="secondary">{s.type}: {s.id.slice(0, 8)}</Badge>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* Retrieved Snippets Tab */}
            <TabsContent value="snippets" className="mt-4">
              <ScrollArea className="h-[400px]">
                <div className="space-y-3">
                  {snippets.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">
                      No relevant snippets found for this query.
                    </p>
                  ) : (
                    snippets.map((snippet, i) => (
                      <div key={i} className="border rounded-lg p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{snippet.source_type}</Badge>
                            <span className="font-medium text-sm">{snippet.title}</span>
                          </div>
                          <Badge className={
                            snippet.relevance_score > 0.6 ? 'bg-green-100 text-green-800' :
                            snippet.relevance_score > 0.3 ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }>
                            {(snippet.relevance_score * 100).toFixed(0)}%
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{snippet.content}</p>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            {/* Brain Tab */}
            <TabsContent value="brain" className="mt-4">
              {brain ? (
                <ScrollArea className="h-[400px]">
                  <pre className="text-xs bg-muted p-4 rounded-lg overflow-x-auto">
                    {JSON.stringify(brain, null, 2)}
                  </pre>
                </ScrollArea>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Brain className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Click "Load Brain Only" or run a test query to see the full business brain.</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}

        {/* Initial State */}
        {!plan && !loading && (
          <div className="text-center py-8 text-muted-foreground">
            <Info className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Enter a customer question above to see how your AI processes it.</p>
            <p className="text-sm mt-1">Shows: business brain, retrieved knowledge, response plan, and final reply.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
