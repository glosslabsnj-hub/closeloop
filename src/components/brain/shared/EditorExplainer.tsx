/**
 * EditorExplainer - Consistent "What is this?" explanation component
 * 
 * Provides standardized explanation boxes at the top of each Brain editor
 * to help business owners understand what they're configuring.
 */

import { Info, Lightbulb, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BusinessMode } from "@/hooks/useTenantConfig";

export interface EditorExplainerProps {
  /** Main explanation of what this section controls */
  whatItIs: string;
  /** How the AI uses this data (shown as bullet points) */
  howAIUsesIt?: string[];
  /** Optional mode-specific tip */
  tip?: string;
  /** Current business mode for styling */
  mode?: BusinessMode;
  /** Warning message if something needs attention */
  warning?: string;
  /** Additional class names */
  className?: string;
  /** Compact variant for nested sections */
  compact?: boolean;
}

const MODE_TIP_COLORS: Record<BusinessMode, string> = {
  service: "bg-blue-500/5 border-blue-500/20 text-blue-700 dark:text-blue-400",
  dispatch: "bg-amber-500/5 border-amber-500/20 text-amber-700 dark:text-amber-400",
  food: "bg-orange-500/5 border-orange-500/20 text-orange-700 dark:text-orange-400",
  medical: "bg-rose-500/5 border-rose-500/20 text-rose-700 dark:text-rose-400",
  general: "bg-slate-500/5 border-slate-500/20 text-slate-700 dark:text-slate-400",
};

export function EditorExplainer({
  whatItIs,
  howAIUsesIt,
  tip,
  mode = "general",
  warning,
  className,
  compact = false,
}: EditorExplainerProps) {
  return (
    <div className={cn("space-y-3", className)}>
      {/* Main explanation */}
      <div className={cn(
        "rounded-lg border bg-muted/30 p-4",
        compact && "p-3"
      )}>
        <div className="flex items-start gap-3">
          <Info className={cn(
            "shrink-0 mt-0.5 text-primary",
            compact ? "h-4 w-4" : "h-5 w-5"
          )} />
          <div className="space-y-2">
            <p className={cn(
              "font-medium",
              compact ? "text-sm" : "text-sm"
            )}>
              What is this?
            </p>
            <p className={cn(
              "text-muted-foreground",
              compact ? "text-xs" : "text-sm"
            )}>
              {whatItIs}
            </p>
            
            {howAIUsesIt && howAIUsesIt.length > 0 && (
              <div className="pt-2 space-y-1">
                <p className={cn(
                  "font-medium text-muted-foreground",
                  compact ? "text-xs" : "text-xs"
                )}>
                  How your AI uses this:
                </p>
                <ul className="space-y-0.5">
                  {howAIUsesIt.map((item, i) => (
                    <li key={i} className={cn(
                      "text-muted-foreground",
                      compact ? "text-xs" : "text-xs"
                    )}>
                      • {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Warning if present */}
      {warning && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
            <p className="text-sm text-destructive">{warning}</p>
          </div>
        </div>
      )}

      {/* Mode-specific tip */}
      {tip && (
        <div className={cn(
          "rounded-lg border p-3",
          MODE_TIP_COLORS[mode]
        )}>
          <div className="flex items-start gap-2">
            <Lightbulb className="h-4 w-4 shrink-0 mt-0.5" />
            <p className="text-xs">{tip}</p>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Compact inline help text for individual form fields
 */
export function FieldHelp({ 
  text, 
  className 
}: { 
  text: string; 
  className?: string; 
}) {
  return (
    <p className={cn("text-xs text-muted-foreground", className)}>
      {text}
    </p>
  );
}

/**
 * AI Usage indicator for form fields - shows how AI uses this specific field
 */
export function AIUsageHint({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  return (
    <div className={cn(
      "flex items-center gap-1.5 text-xs text-primary/80 mt-1",
      className
    )}>
      <div className="h-1.5 w-1.5 rounded-full bg-primary/60" />
      <span>AI uses this to: {text}</span>
    </div>
  );
}
