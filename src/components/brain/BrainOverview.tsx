import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useAIReadinessV2, formatReadinessFlag } from "@/hooks/useAIReadinessV2";
import { useTenantConfig } from "@/hooks/useTenantConfig";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Mic, List, MessageSquare, Clock, FileText, Zap,
  CheckCircle2, AlertTriangle, XCircle, ChevronRight,
  Brain, Phone, MessageCircle, Lightbulb, ArrowRight,
  TrendingUp, Users, CalendarDays, Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, formatDistanceToNow } from "date-fns";

interface QuickAccessCard {
  id: string;
  icon: React.ElementType;
  title: string;
  description: string;
  section: string;
  stat?: string;
  statLabel?: string;
}

// AI Learning insight type
interface AIInsight {
  id: string;
  summary: string;
  memory_type: string;
  observation_count: number;
  created_at: string;
}

export function BrainOverview() {
  const navigate = useNavigate();
  const { tenant } = useAuth();
  const { businessMode } = useTenantConfig();
  const readiness = useAIReadinessV2();

  // Fetch quick stats for cards
  const { data: stats } = useQuery({
    queryKey: ["brain-overview-stats", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return null;
      
      const [services, faqs, policies] = await Promise.all([
        supabase.from("services").select("id", { count: "exact", head: true }).eq("tenant_id", tenant.id),
        supabase.from("business_faqs").select("id", { count: "exact", head: true }).eq("tenant_id", tenant.id),
        supabase.from("ai_knowledge_base").select("id", { count: "exact", head: true }).eq("tenant_id", tenant.id).eq("type", "policy"),
      ]);
      
      return {
        services: services.count || 0,
        faqs: faqs.count || 0,
        policies: policies.count || 0,
      };
    },
    enabled: !!tenant?.id,
  });

  // Fetch recent AI learnings/memories
  const { data: insights } = useQuery({
    queryKey: ["brain-insights", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return [];
      
      const { data } = await supabase
        .from("business_memory")
        .select("id, summary, memory_type, observation_count, created_at")
        .eq("tenant_id", tenant.id)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(5);
      
      return (data || []) as AIInsight[];
    },
    enabled: !!tenant?.id,
  });

  const quickAccessCards: QuickAccessCard[] = [
    {
      id: "voice",
      icon: Mic,
      title: "AI Voice & Personality",
      description: "Greeting, tone, voice",
      section: "ai-behavior",
    },
    {
      id: "services",
      icon: List,
      title: businessMode === "food" ? "Menu & Pricing" : "Services & Pricing",
      description: `${stats?.services || 0} items configured`,
      section: "services",
      stat: stats?.services?.toString(),
      statLabel: "configured",
    },
    {
      id: "faqs",
      icon: MessageSquare,
      title: "FAQs & Knowledge",
      description: `${stats?.faqs || 0} FAQs configured`,
      section: "knowledge",
      stat: stats?.faqs?.toString(),
      statLabel: "FAQs",
    },
    {
      id: "hours",
      icon: Clock,
      title: "Hours & Availability",
      description: "7 days set",
      section: "hours",
    },
    {
      id: "policies",
      icon: FileText,
      title: "Policies & Rules",
      description: `${stats?.policies || 0} policies`,
      section: "policies",
      stat: stats?.policies?.toString(),
      statLabel: "policies",
    },
    {
      id: "automations",
      icon: Zap,
      title: "Automations",
      description: "Coming soon",
      section: "policies",
    },
  ];

  const getScoreColor = (score: number) => {
    if (score >= 85) return "text-success";
    if (score >= 60) return "text-warning";
    return "text-destructive";
  };

  const getScoreLabel = (score: number) => {
    if (score >= 85) return "Excellent";
    if (score >= 70) return "Good";
    if (score >= 50) return "Needs Work";
    return "Getting Started";
  };

  const allFlags = [
    ...readiness.p0Flags.map(f => ({ flag: f, severity: "error" as const })),
    ...readiness.p1Flags.map(f => ({ flag: f, severity: "warning" as const })),
  ];

  return (
    <div className="space-y-6">
      {/* AI Health Score */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Brain className="h-5 w-5 text-primary" />
            AI Health Score
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {readiness.loading ? (
            <div className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-8 w-32" />
            </div>
          ) : (
            <>
              {/* Score bar */}
              <div className="space-y-2">
                <div className="flex items-end justify-between">
                  <div className="flex items-baseline gap-2">
                    <span className={cn("text-4xl font-bold", getScoreColor(readiness.score))}>
                      {readiness.score}%
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {getScoreLabel(readiness.score)}
                    </span>
                  </div>
                  {readiness.canGoLive && (
                    <Badge variant="success" className="gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      Ready to Go Live
                    </Badge>
                  )}
                </div>
                <Progress 
                  value={readiness.score} 
                  className="h-2"
                />
                <p className="text-sm text-muted-foreground">
                  {readiness.canGoLive
                    ? "Your AI is well-configured and ready for production calls."
                    : "Your AI is configured but could be improved."}
                </p>
              </div>

              {/* Checklist items */}
              {allFlags.length > 0 && (
                <div className="space-y-2 pt-2 border-t">
                  {allFlags.slice(0, 6).map(({ flag, severity }) => (
                    <div key={flag} className="flex items-center gap-2 text-sm">
                      {severity === "error" ? (
                        <XCircle className="h-4 w-4 text-destructive shrink-0" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 text-warning shrink-0" />
                      )}
                      <span className={cn(
                        severity === "error" ? "text-destructive" : "text-warning"
                      )}>
                        {formatReadinessFlag(flag)}
                      </span>
                    </div>
                  ))}
                  {allFlags.length > 6 && (
                    <p className="text-xs text-muted-foreground pl-6">
                      +{allFlags.length - 6} more items
                    </p>
                  )}
                </div>
              )}

              {/* Improve button */}
              {!readiness.canGoLive && (
                <Button 
                  className="w-full gap-2"
                  onClick={() => navigate("/app/readiness")}
                >
                  <Sparkles className="h-4 w-4" />
                  Improve AI Score
                  <ArrowRight className="h-4 w-4" />
                </Button>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Quick Access Grid */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground mb-3">
          QUICK ACCESS
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {quickAccessCards.map(card => (
            <Card
              key={card.id}
              interactive
              className="cursor-pointer group"
              onClick={() => navigate(`/app/business-brain?section=${card.section}`)}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <card.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{card.title}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {card.description}
                    </p>
                  </div>
                </div>
                <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Recent AI Learning */}
      {insights && insights.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Lightbulb className="h-5 w-5 text-warning" />
                Recent AI Learning
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1"
                onClick={() => navigate("/app/business-brain?section=ai-behavior#intelligence")}
              >
                View All
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Your AI learned {insights.length} new things recently
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {insights.map(insight => (
                <div
                  key={insight.id}
                  className="flex items-start gap-3 p-3 rounded-lg bg-muted/50"
                >
                  <Brain className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">"{insight.summary}"</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" size="sm">
                        {insight.memory_type}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {insight.observation_count} observations
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Test Your AI */}
      <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Phone className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold mb-1">Test Your AI</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Try a conversation with your AI to see how it responds to customer calls.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  className="gap-2"
                  onClick={() => navigate("/app/simulator")}
                >
                  <Phone className="h-4 w-4" />
                  Start Test Call
                </Button>
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={() => navigate("/app/simulator?mode=text")}
                >
                  <MessageCircle className="h-4 w-4" />
                  Text Simulation
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AI Stats Summary */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <TrendingUp className="h-5 w-5 text-success mx-auto mb-2" />
            <p className="text-2xl font-bold">{readiness.score}%</p>
            <p className="text-xs text-muted-foreground">AI Readiness</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Users className="h-5 w-5 text-info mx-auto mb-2" />
            <p className="text-2xl font-bold">{stats?.services || 0}</p>
            <p className="text-xs text-muted-foreground">Services</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <CalendarDays className="h-5 w-5 text-warning mx-auto mb-2" />
            <p className="text-2xl font-bold">{stats?.faqs || 0}</p>
            <p className="text-xs text-muted-foreground">FAQs</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
