/**
 * Business Brain Section Card
 * 
 * A professional collapsible card for each section within a category.
 * Features:
 * - Expandable accordion
 * - "Used by AI for" bullets
 * - Helper examples
 * - Preview sentences
 * - Completion indicator
 */

import { useState, ReactNode } from "react";
import { ChevronDown, ChevronUp, Lightbulb, Volume2, Eye, AlertTriangle, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import type { CardConfig } from "./businessBrainNavConfig";

export interface BusinessBrainSectionCardProps {
  config: CardConfig;
  children: ReactNode;
  /** Completion status */
  isComplete?: boolean;
  /** Has unsaved changes */
  hasChanges?: boolean;
  /** Example content to show */
  examples?: Array<{ label: string; value: string }>;
  /** Things to avoid */
  avoidList?: string[];
  /** Preview sentence the AI might say (read-only) */
  previewSentence?: string;
  /** Optional extra actions in header */
  headerActions?: ReactNode;
  /** Custom class name */
  className?: string;
  /** Anchor ID for deep linking */
  anchorId?: string;
}

export function BusinessBrainSectionCard({
  config,
  children,
  isComplete,
  hasChanges,
  examples,
  avoidList,
  previewSentence,
  headerActions,
  className,
  anchorId,
}: BusinessBrainSectionCardProps) {
  const [isExpanded, setIsExpanded] = useState(!config.defaultCollapsed);
  const [showHelpers, setShowHelpers] = useState(false);

  const priorityStyles = {
    default: "border-border",
    warning: "border-amber-500/30 bg-amber-500/5",
    error: "border-destructive/30 bg-destructive/5",
    success: "border-emerald-500/30 bg-emerald-500/5",
  };

  return (
    <Card
      id={anchorId || config.id}
      className={cn(
        priorityStyles[config.priority || "default"],
        "transition-all duration-200",
        className
      )}
    >
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer select-none py-4 px-5 hover:bg-muted/30 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <CardTitle className="text-base font-medium">{config.title}</CardTitle>
                    {isComplete !== undefined && (
                      <Badge 
                        variant={isComplete ? "secondary" : "outline"}
                        className={cn(
                          "text-xs",
                          isComplete 
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30" 
                            : "text-muted-foreground"
                        )}
                      >
                        {isComplete ? "Complete" : "Needs setup"}
                      </Badge>
                    )}
                    {hasChanges && (
                      <Badge variant="outline" className="text-xs border-amber-500/50 text-amber-500">
                        Unsaved
                      </Badge>
                    )}
                    {config.speechReadyFields && config.speechReadyFields.length > 0 && (
                      <SpeechReadyBadge />
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {config.purpose}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {headerActions}
                {isExpanded ? (
                  <ChevronUp className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0 pb-5 px-5 space-y-4">
            {/* Used by AI strip */}
            <div className="rounded-lg bg-primary/5 border border-primary/20 p-3">
              <div className="flex items-center gap-2 mb-2">
                <Lightbulb className="h-4 w-4 text-primary" />
                <span className="text-xs font-medium text-primary">How your AI uses this</span>
              </div>
              <ul className="text-xs text-muted-foreground space-y-1">
                {config.usedByAI.map((item, i) => (
                  <li key={i}>• {item}</li>
                ))}
              </ul>
            </div>

            {/* Main content */}
            <div className="pt-2">
              {children}
            </div>

            {/* Helpers section (collapsible) */}
            {(examples?.length || avoidList?.length || previewSentence) && (
              <div className="border-t pt-4 mt-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowHelpers(!showHelpers);
                  }}
                  className="gap-2 text-muted-foreground h-8 px-2"
                >
                  <Eye className="h-3.5 w-3.5" />
                  {showHelpers ? "Hide helpers" : "Show examples & tips"}
                  {showHelpers ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                </Button>

                {showHelpers && (
                  <div className="mt-3 space-y-3">
                    {/* Examples */}
                    {examples && examples.length > 0 && (
                      <div className="rounded-lg border bg-muted/30 p-3">
                        <p className="text-xs font-medium mb-2">Examples</p>
                        <div className="space-y-2">
                          {examples.map((ex, i) => (
                            <div key={i} className="text-xs">
                              <span className="text-muted-foreground">{ex.label}: </span>
                              <span className="italic">"{ex.value}"</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Avoid list */}
                    {avoidList && avoidList.length > 0 && (
                      <div className="rounded-lg bg-amber-500/5 border border-amber-500/20 p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                          <span className="text-xs font-medium text-amber-600 dark:text-amber-400">Avoid these</span>
                        </div>
                        <ul className="text-xs text-muted-foreground space-y-1">
                          {avoidList.map((item, i) => (
                            <li key={i}>• {item}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Preview sentence */}
                    {previewSentence && (
                      <div className="rounded-lg border bg-muted/30 p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <Volume2 className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-xs font-medium text-muted-foreground">What the AI might say</span>
                        </div>
                        <p className="text-xs italic">"{previewSentence}"</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

/**
 * Speech-ready badge component
 */
export function SpeechReadyBadge({ className }: { className?: string }) {
  return (
    <Badge 
      variant="outline" 
      className={cn(
        "text-[10px] gap-1 h-5 px-1.5 border-primary/30 text-primary",
        className
      )}
    >
      <Volume2 className="h-3 w-3" />
      Speech-ready
    </Badge>
  );
}

/**
 * Preview sentence component (read-only)
 */
export function PreviewSentence({ 
  sentence, 
  fallback,
  className 
}: { 
  sentence?: string | null; 
  fallback?: string;
  className?: string;
}) {
  return (
    <div className={cn("rounded-lg border bg-muted/30 p-3", className)}>
      <div className="flex items-center gap-2 mb-2">
        <Volume2 className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs font-medium text-muted-foreground">Preview: What the AI will say</span>
      </div>
      <p className="text-xs italic">
        {sentence ? `"${sentence}"` : (fallback || "Not configured yet")}
      </p>
    </div>
  );
}

/**
 * HIPAA warning helper
 */
export function HIPAAWarning({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-lg bg-amber-500/5 border border-amber-500/20 p-3 flex items-start gap-2", className)}>
      <Info className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
      <div>
        <p className="text-xs font-medium text-amber-600 dark:text-amber-400">HIPAA Mode Active</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Avoid storing or displaying PHI (Protected Health Information) in text fields.
        </p>
      </div>
    </div>
  );
}
