import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Brain, ChevronDown, RefreshCw, Bug, Eye, EyeOff } from "lucide-react";

interface IntelligenceDebugProps {
  isAdmin?: boolean;
}

export function IntelligenceDebugPanel({ isAdmin = false }: IntelligenceDebugProps) {
  const { tenant } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [showPanel, setShowPanel] = useState(false);

  const { data: intentRules, refetch: refetchRules } = useQuery({
    queryKey: ["debug-intent-rules", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return [];
      const { data } = await supabase
        .from("business_intent_rules")
        .select("id, name, rule_type, priority, is_enabled")
        .eq("tenant_id", tenant.id)
        .eq("is_enabled", true)
        .eq("is_suggested", false)
        .order("priority", { ascending: false })
        .limit(10);
      return data || [];
    },
    enabled: !!tenant?.id && showPanel,
  });

  const { data: memoryHints, refetch: refetchMemory } = useQuery({
    queryKey: ["debug-memory-hints", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return [];
      const { data } = await supabase
        .from("business_memory")
        .select("id, memory_type, summary, confidence_score, observation_count")
        .eq("tenant_id", tenant.id)
        .eq("is_active", true)
        .gte("confidence_score", 0.65)
        .order("confidence_score", { ascending: false })
        .limit(5);
      return data || [];
    },
    enabled: !!tenant?.id && showPanel,
  });

  const { data: recentObservations, refetch: refetchObs } = useQuery({
    queryKey: ["debug-observations", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return [];
      const { data } = await supabase
        .from("business_memory")
        .select("id, memory_type, summary, created_at, observation_count")
        .eq("tenant_id", tenant.id)
        .order("created_at", { ascending: false })
        .limit(10);
      return data || [];
    },
    enabled: !!tenant?.id && showPanel,
  });

  if (!isAdmin) return null;

  const handleRefresh = () => {
    refetchRules();
    refetchMemory();
    refetchObs();
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {!showPanel ? (
        <Button
          size="sm"
          variant="outline"
          onClick={() => setShowPanel(true)}
          className="gap-2 bg-background shadow-lg"
        >
          <Bug className="h-4 w-4" />
          <Eye className="h-4 w-4" />
        </Button>
      ) : (
        <Card className="w-96 max-h-[500px] overflow-auto shadow-xl border-primary/20">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Brain className="h-4 w-4" />
              Intelligence Debug
            </CardTitle>
            <div className="flex gap-1">
              <Button size="icon" variant="ghost" onClick={handleRefresh} className="h-6 w-6">
                <RefreshCw className="h-3 w-3" />
              </Button>
              <Button size="icon" variant="ghost" onClick={() => setShowPanel(false)} className="h-6 w-6">
                <EyeOff className="h-3 w-3" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            {/* Intent Rules */}
            <Collapsible open={isOpen} onOpenChange={setIsOpen}>
              <CollapsibleTrigger className="flex items-center gap-2 w-full text-left font-medium">
                <ChevronDown className={`h-3 w-3 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                Intent Rules ({intentRules?.length || 0})
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-1 space-y-1">
                {intentRules?.map(rule => (
                  <div key={rule.id} className="flex items-center justify-between p-1 bg-muted rounded text-xs">
                    <span className="truncate flex-1">{rule.name}</span>
                    <Badge variant="outline" className="text-[10px] ml-1">{rule.rule_type}</Badge>
                  </div>
                ))}
                {(!intentRules || intentRules.length === 0) && (
                  <p className="text-muted-foreground">No active rules</p>
                )}
              </CollapsibleContent>
            </Collapsible>

            {/* Memory Hints */}
            <div>
              <p className="font-medium mb-1">Memory Hints ({memoryHints?.length || 0})</p>
              {memoryHints?.map(hint => (
                <div key={hint.id} className="p-1 bg-muted rounded mb-1">
                  <div className="flex items-center gap-1">
                    <Badge variant="secondary" className="text-[10px]">{hint.memory_type}</Badge>
                    <span className="text-muted-foreground">{(hint.confidence_score * 100).toFixed(0)}%</span>
                  </div>
                  <p className="truncate text-muted-foreground">{hint.summary}</p>
                </div>
              ))}
              {(!memoryHints || memoryHints.length === 0) && (
                <p className="text-muted-foreground">No memory hints (need 3+ observations)</p>
              )}
            </div>

            {/* Recent Observations */}
            <div>
              <p className="font-medium mb-1">Last 10 Observations</p>
              <div className="max-h-32 overflow-auto space-y-1">
                {recentObservations?.map(obs => (
                  <div key={obs.id} className="text-[10px] text-muted-foreground p-1 bg-muted/50 rounded">
                    <span className="font-mono">[{obs.observation_count}x]</span> {obs.summary?.substring(0, 50)}...
                  </div>
                ))}
                {(!recentObservations || recentObservations.length === 0) && (
                  <p className="text-muted-foreground">No observations yet</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
