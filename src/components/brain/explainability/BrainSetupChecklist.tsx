/**
 * Business Brain - Setup Checklist
 * 
 * Collapsible checklist at the top of Business Brain that mirrors
 * AI readiness and provides quick "Fix" buttons to scroll to sections.
 */

import { useState, useMemo, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { CheckCircle2, Circle, ChevronDown, ChevronUp, AlertTriangle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useAIReadinessV2 } from "@/hooks/useAIReadinessV2";
import { getIssueDetails } from "@/lib/readiness/issueMapping";
import { cn } from "@/lib/utils";

interface BrainSetupChecklistProps {
  className?: string;
  /** Callback to change the active section in BusinessBrainPage */
  onNavigateToSection?: (section: string) => void;
}

export function BrainSetupChecklist({ className, onNavigateToSection }: BrainSetupChecklistProps) {
  const [isOpen, setIsOpen] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  const { score, p0Flags, p1Flags, canGoLive, loading } = useAIReadinessV2();

  // Combine and dedupe issues
  const allIssues = useMemo(() => {
    const issues: Array<{
      code: string;
      label: string;
      isPriority: boolean;
      section: string;
      fixLink: string;
    }> = [];

    // P0 issues (blockers)
    p0Flags.forEach(code => {
      const details = getIssueDetails(code);
      const section = extractSection(details.fixLink);
      issues.push({
        code,
        label: details.title,
        isPriority: true,
        section,
        fixLink: details.fixLink,
      });
    });

    // P1 issues (recommended)
    p1Flags.forEach(code => {
      const details = getIssueDetails(code);
      const section = extractSection(details.fixLink);
      issues.push({
        code,
        label: details.title,
        isPriority: false,
        section,
        fixLink: details.fixLink,
      });
    });

    return issues;
  }, [p0Flags, p1Flags]);

  const handleFix = useCallback((issue: typeof allIssues[0]) => {
    const isBusinessBrainLink = issue.fixLink.startsWith("/app/business-brain");
    const isOnBusinessBrainPage = location.pathname === "/app/business-brain";
    
    if (isBusinessBrainLink && isOnBusinessBrainPage && onNavigateToSection) {
      // We're already on Business Brain, just change the section via callback
      onNavigateToSection(issue.section);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      // Navigate to the fix link
      navigate(issue.fixLink);
    }
  }, [location.pathname, navigate, onNavigateToSection]);

  if (loading) {
    return null;
  }

  // If everything is complete, show a success state
  if (canGoLive && allIssues.length === 0) {
    return (
      <div className={cn(
        "rounded-lg border bg-emerald-500/10 border-emerald-500/30 p-4",
        className
      )}>
        <div className="flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 text-emerald-500" />
          <div>
            <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
              Your AI is ready to go live!
            </p>
            <p className="text-xs text-muted-foreground">
              All required information is configured. Your AI score is {score}/100.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const priorityCount = allIssues.filter(i => i.isPriority).length;
  const totalCount = allIssues.length;

  return (
    <div className={cn(
      "rounded-lg border bg-card overflow-hidden",
      priorityCount > 0 ? "border-amber-500/50" : "border-border",
      className
    )}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <button className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-3">
              {priorityCount > 0 ? (
                <AlertTriangle className="h-5 w-5 text-amber-500" />
              ) : (
                <Circle className="h-5 w-5 text-muted-foreground" />
              )}
              <div className="text-left">
                <h3 className="text-sm font-medium">
                  {priorityCount > 0
                    ? `${priorityCount} item${priorityCount > 1 ? "s" : ""} blocking go-live`
                    : `${totalCount} recommended improvement${totalCount > 1 ? "s" : ""}`}
                </h3>
                <p className="text-xs text-muted-foreground">
                  AI Readiness Score: {score}/100
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Progress value={score} className="w-20 h-2" />
              {isOpen ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="border-t px-4 py-3 space-y-2">
            {allIssues.map((issue) => (
              <div
                key={issue.code}
                className="flex items-center justify-between py-2 px-3 rounded-md bg-muted/30"
              >
                <div className="flex items-center gap-3">
                  <Circle className={cn(
                    "h-4 w-4",
                    issue.isPriority ? "text-amber-500" : "text-muted-foreground"
                  )} />
                  <span className="text-sm">{issue.label}</span>
                  {issue.isPriority && (
                    <Badge variant="outline" className="text-xs border-amber-500/50 text-amber-600 dark:text-amber-400">
                      Required
                    </Badge>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleFix(issue)}
                  className="gap-1 text-primary hover:text-primary"
                >
                  Fix
                  <ArrowRight className="h-3 w-3" />
                </Button>
              </div>
            ))}

            <p className="text-xs text-muted-foreground pt-2 border-t mt-3">
              Complete all required items to achieve an AI readiness score of 85+ and go live.
            </p>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

/**
 * Extract section from fix link URL
 */
function extractSection(fixLink: string): string {
  const url = new URL(fixLink, "http://localhost");
  return url.searchParams.get("section") || "profile";
}
