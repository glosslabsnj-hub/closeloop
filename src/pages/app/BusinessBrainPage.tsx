import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTenantConfig } from "@/hooks/useTenantConfig";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  Brain, 
  Building2,
  Clock,
  FileText,
  HelpCircle,
  MessageSquare,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Sparkles,
  Check,
  X,
  ExternalLink,
  RefreshCw,
  UtensilsCrossed,
  Briefcase,
  Bell
} from "lucide-react";
import AIReadinessScore from "@/components/knowledge/AIReadinessScore";
import KnowledgeGapQueue from "@/components/knowledge/KnowledgeGapQueue";
import { KnowledgeUpdatesTab } from "@/components/knowledge/KnowledgeUpdatesTab";
import { KnowledgeUploadHub } from "@/components/knowledge/KnowledgeUploadHub";
import { KnowledgeConflictBanner } from "@/components/dashboard/KnowledgeConflictBanner";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useKnowledgeConflicts } from "@/hooks/useKnowledgeConflicts";
import { useKnowledgeSuggestions } from "@/hooks/useKnowledgeSuggestions";

export default function BusinessBrainPage() {
  const { tenant } = useAuth();
  const { businessMode } = useTenantConfig();
  const [showPreview, setShowPreview] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "overview";
  
  const { unresolvedCount: conflictsCount } = useKnowledgeConflicts();
  const { pendingCount: suggestionsCount } = useKnowledgeSuggestions();

  // Fetch knowledge stats
  const { data: knowledgeStats } = useQuery({
    queryKey: ["knowledge-stats", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return null;

      const [
        { count: servicesCount },
        { count: faqsCount },
        { count: policiesCount },
        { count: objectionsCount },
        { count: menuItemsCount },
        { count: gapsCount }
      ] = await Promise.all([
        supabase.from("services").select("*", { count: "exact", head: true }).eq("tenant_id", tenant.id),
        supabase.from("business_faqs").select("*", { count: "exact", head: true }).eq("tenant_id", tenant.id),
        supabase.from("ai_knowledge_base").select("*", { count: "exact", head: true }).eq("tenant_id", tenant.id).eq("type", "policy"),
        supabase.from("objection_responses").select("*", { count: "exact", head: true }).eq("tenant_id", tenant.id),
        supabase.from("menu_items").select("*", { count: "exact", head: true }).eq("tenant_id", tenant.id),
        supabase.from("knowledge_gaps").select("*", { count: "exact", head: true }).eq("tenant_id", tenant.id).eq("resolved", false)
      ]);

      return {
        services: servicesCount || 0,
        faqs: faqsCount || 0,
        policies: policiesCount || 0,
        objections: objectionsCount || 0,
        menuItems: menuItemsCount || 0,
        gaps: gapsCount || 0
      };
    },
    enabled: !!tenant?.id
  });

  const knowledgeSections = [
    {
      id: "identity",
      title: "Business Identity",
      description: "Name, tagline, hours, contact info",
      icon: Building2,
      href: "/app/settings",
      status: tenant?.name ? "complete" : "incomplete",
      always: true
    },
    {
      id: "hours",
      title: "Business Hours",
      description: "When you're open for business",
      icon: Clock,
      href: "/app/settings",
      status: "complete", // Assume set if they got this far
      always: true
    },
    {
      id: "services",
      title: "Services & Pricing",
      description: `${knowledgeStats?.services || 0} services configured`,
      icon: Briefcase,
      href: "/app/services",
      status: (knowledgeStats?.services || 0) > 0 ? "complete" : "incomplete",
      modes: ["service", "dispatch", "medical", "general"]
    },
    {
      id: "menu",
      title: "Menu Items",
      description: `${knowledgeStats?.menuItems || 0} items in menu`,
      icon: UtensilsCrossed,
      href: "/app/menu-center",
      status: (knowledgeStats?.menuItems || 0) > 0 ? "complete" : "incomplete",
      modes: ["food"]
    },
    {
      id: "faqs",
      title: "Frequently Asked Questions",
      description: `${knowledgeStats?.faqs || 0} FAQs configured`,
      icon: HelpCircle,
      href: "/app/ai-assistant",
      status: (knowledgeStats?.faqs || 0) >= 3 ? "complete" : "partial",
      always: true
    },
    {
      id: "policies",
      title: "Policies",
      description: `${knowledgeStats?.policies || 0} policies defined`,
      icon: FileText,
      href: "/app/ai-assistant",
      status: (knowledgeStats?.policies || 0) > 0 ? "complete" : "incomplete",
      always: true
    },
    {
      id: "objections",
      title: "Objection Handling",
      description: `${knowledgeStats?.objections || 0} responses ready`,
      icon: MessageSquare,
      href: "/app/ai-assistant",
      status: (knowledgeStats?.objections || 0) > 0 ? "complete" : "incomplete",
      always: true
    }
  ];

  const visibleSections = knowledgeSections.filter(section => 
    section.always || section.modes?.includes(businessMode)
  );

  const completedSections = visibleSections.filter(s => s.status === "complete").length;
  const totalSections = visibleSections.length;
  const completionPercent = Math.round((completedSections / totalSections) * 100);

  const setActiveTab = (tab: string) => {
    searchParams.set("tab", tab);
    if (tab !== "updates") {
      searchParams.delete("subtab");
    }
    setSearchParams(searchParams);
  };

  const updatesActionNeeded = conflictsCount > 0 || suggestionsCount > 0;

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="h-6 w-6" />
            Business Brain
          </h1>
          <p className="text-muted-foreground text-sm">
            Everything your AI knows about your business
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link to="/app/simulator">
              <Sparkles className="mr-2 h-4 w-4" />
              Test AI
            </Link>
          </Button>
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="updates" className="relative">
            Updates
            {updatesActionNeeded && (
              <Badge 
                variant={conflictsCount > 0 ? "destructive" : "secondary"} 
                className="ml-2 h-5 px-1.5"
              >
                {conflictsCount + suggestionsCount}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6 space-y-6">
          {/* Conflict Banner */}
          <KnowledgeConflictBanner />
          
          {/* AI Readiness Score */}
          <AIReadinessScore />
          
          {/* Upload Hub */}
          <KnowledgeUploadHub />

      {/* Quick Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Knowledge Completion */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Knowledge Completion</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Progress value={completionPercent} className="flex-1" />
              <span className="text-sm font-medium">{completionPercent}%</span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {completedSections} of {totalSections} sections complete
            </p>
          </CardContent>
        </Card>

        {/* Knowledge Gaps */}
        <Card className={knowledgeStats?.gaps ? "border-yellow-500/50" : ""}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              Knowledge Gaps
              {(knowledgeStats?.gaps || 0) > 0 && (
                <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600">
                  {knowledgeStats?.gaps} unresolved
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Questions your AI couldn't answer confidently
            </p>
            {(knowledgeStats?.gaps || 0) > 0 && (
              <Button variant="link" className="p-0 h-auto text-xs mt-1" asChild>
                <a href="#gaps">Review gaps →</a>
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant="outline" size="sm" className="w-full justify-start" asChild>
              <Link to="/app/ai-assistant">
                <HelpCircle className="mr-2 h-4 w-4" />
                Add FAQ
              </Link>
            </Button>
            <Button variant="outline" size="sm" className="w-full justify-start" asChild>
              <Link to={businessMode === "food" ? "/app/menu-center" : "/app/services"}>
                {businessMode === "food" ? (
                  <>
                    <UtensilsCrossed className="mr-2 h-4 w-4" />
                    Add Menu Item
                  </>
                ) : (
                  <>
                    <Briefcase className="mr-2 h-4 w-4" />
                    Add Service
                  </>
                )}
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Knowledge Sections */}
      <Card>
        <CardHeader>
          <CardTitle>What Your AI Knows</CardTitle>
          <CardDescription>
            Click any section to edit. More complete information = smarter AI responses.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {visibleSections.map((section) => {
            const Icon = section.icon;
            const isComplete = section.status === "complete";
            const isPartial = section.status === "partial";
            
            return (
              <Link key={section.id} to={section.href}>
                <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                      isComplete ? "bg-green-500/10" : isPartial ? "bg-yellow-500/10" : "bg-muted"
                    }`}>
                      <Icon className={`h-4 w-4 ${
                        isComplete ? "text-green-500" : isPartial ? "text-yellow-600" : "text-muted-foreground"
                      }`} />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{section.title}</p>
                      <p className="text-xs text-muted-foreground">{section.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isComplete ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : isPartial ? (
                      <AlertTriangle className="h-4 w-4 text-yellow-600" />
                    ) : (
                      <X className="h-4 w-4 text-muted-foreground" />
                    )}
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              </Link>
            );
          })}
        </CardContent>
      </Card>

      {/* Knowledge Gaps Queue */}
      <div id="gaps">
        <KnowledgeGapQueue />
      </div>

      {/* AI Context Preview */}
      <Collapsible open={showPreview} onOpenChange={setShowPreview}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm">AI Context Preview</CardTitle>
                  <CardDescription>See the compiled knowledge your AI receives</CardDescription>
                </div>
                <ChevronDown className={`h-4 w-4 transition-transform ${showPreview ? "rotate-180" : ""}`} />
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent>
              <div className="rounded-lg bg-muted p-4 font-mono text-xs overflow-auto max-h-96">
                <pre className="whitespace-pre-wrap">
                  {JSON.stringify({
                    business_name: tenant?.name,
                    business_mode: businessMode,
                    tagline: tenant?.tagline,
                    services_count: knowledgeStats?.services,
                    faqs_count: knowledgeStats?.faqs,
                    policies_count: knowledgeStats?.policies,
                    menu_items_count: knowledgeStats?.menuItems,
                    note: "Full context is built at call time with real-time data"
                  }, null, 2)}
                </pre>
              </div>
              <Button variant="outline" size="sm" className="mt-3" asChild>
                <Link to="/app/settings">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  View Full Context in Developer Tools
                </Link>
              </Button>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
        </TabsContent>

        <TabsContent value="updates" className="mt-6">
          <KnowledgeUpdatesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
