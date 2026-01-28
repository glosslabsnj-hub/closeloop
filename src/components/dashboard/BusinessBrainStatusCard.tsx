import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Brain, AlertTriangle, FileText, Upload, ArrowRight } from "lucide-react";
import { useKnowledgeSuggestions } from "@/hooks/useKnowledgeSuggestions";
import { useKnowledgeConflicts } from "@/hooks/useKnowledgeConflicts";
import { useKnowledgeUploads } from "@/hooks/useKnowledgeUploads";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function BusinessBrainStatusCard() {
  const { tenant } = useAuth();
  const { pendingCount: suggestionsCount } = useKnowledgeSuggestions();
  const { unresolvedCount: conflictsCount } = useKnowledgeConflicts();
  const { processingCount } = useKnowledgeUploads();

  // Calculate readiness score (simplified version)
  const { data: readinessData } = useQuery({
    queryKey: ["ai-readiness-simple", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return { score: 0 };

      const [
        { count: servicesCount },
        { count: faqsCount },
        { count: menuItemsCount },
      ] = await Promise.all([
        supabase.from("services").select("*", { count: "exact", head: true }).eq("tenant_id", tenant.id),
        supabase.from("business_faqs").select("*", { count: "exact", head: true }).eq("tenant_id", tenant.id),
        supabase.from("menu_items").select("*", { count: "exact", head: true }).eq("tenant_id", tenant.id),
      ]);

      let score = 30; // Base score for having an account
      if (tenant.name) score += 15;
      if ((servicesCount || 0) > 0) score += 20;
      if ((faqsCount || 0) >= 3) score += 20;
      if ((menuItemsCount || 0) > 0) score += 15;

      return { score: Math.min(score, 100) };
    },
    enabled: !!tenant?.id,
  });

  const readinessScore = readinessData?.score || 0;
  const hasActionNeeded = conflictsCount > 0 || suggestionsCount > 0;

  return (
    <Card className={conflictsCount > 0 ? "border-destructive/50" : ""}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Brain className="h-4 w-4" />
            Business Brain Status
          </CardTitle>
          {hasActionNeeded && (
            <Badge variant={conflictsCount > 0 ? "destructive" : "secondary"}>
              Action needed
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Readiness Score */}
        <div>
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-muted-foreground">AI Readiness</span>
            <span className="font-medium">{readinessScore}%</span>
          </div>
          <Progress value={readinessScore} className="h-2" />
        </div>

        {/* Status Items */}
        <div className="space-y-2">
          {processingCount > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-muted-foreground">
                <Upload className="h-4 w-4 animate-pulse" />
                Processing uploads
              </span>
              <Badge variant="outline">{processingCount}</Badge>
            </div>
          )}

          {suggestionsCount > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-muted-foreground">
                <FileText className="h-4 w-4" />
                Pending suggestions
              </span>
              <Badge variant="secondary">{suggestionsCount}</Badge>
            </div>
          )}

          {conflictsCount > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-4 w-4" />
                Unresolved conflicts
              </span>
              <Badge variant="destructive">{conflictsCount}</Badge>
            </div>
          )}
        </div>

        {/* Action Button */}
        <Button
          variant={hasActionNeeded ? "default" : "outline"}
          size="sm"
          className="w-full"
          asChild
        >
          <Link to="/app/business-brain?tab=updates">
            {hasActionNeeded ? "Review Updates" : "View Business Brain"}
            <ArrowRight className="h-4 w-4 ml-2" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
