/**
 * Business Brain Section Card - SIMPLIFIED
 * 
 * A clean, minimal collapsible card for section content.
 * Reduces visual noise while keeping essential information.
 */

import { useState, ReactNode } from "react";
import { ChevronDown, Volume2 } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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

  return (
    <Card
      id={anchorId || config.id}
      className={cn(
        "transition-all duration-200",
        className
      )}
    >
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer select-none py-4 px-5 hover:bg-muted/30 transition-colors">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-base">{config.title}</h3>
                  {config.speechReadyFields && config.speechReadyFields.length > 0 && (
                    <SpeechReadyBadge />
                  )}
                  {hasChanges && (
                    <Badge variant="outline" className="text-xs border-amber-500/50 text-amber-600 dark:text-amber-400">
                      Unsaved
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {config.purpose}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {headerActions}
                <ChevronDown 
                  className={cn(
                    "h-5 w-5 text-muted-foreground transition-transform duration-200",
                    isExpanded && "rotate-180"
                  )} 
                />
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0 pb-5 px-5">
            {/* Main content */}
            {children}
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
      Spoken
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
        <span className="text-xs font-medium text-muted-foreground">What the AI says</span>
      </div>
      <p className="text-sm italic text-foreground">
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
    <div className={cn("rounded-lg bg-amber-500/10 border border-amber-500/20 p-3 flex items-start gap-2", className)}>
      <span className="text-amber-500 text-sm">⚠️</span>
      <div>
        <p className="text-sm font-medium text-amber-600 dark:text-amber-400">HIPAA Mode</p>
        <p className="text-xs text-muted-foreground">Avoid storing PHI in text fields.</p>
      </div>
    </div>
  );
}
