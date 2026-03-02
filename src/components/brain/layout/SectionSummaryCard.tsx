/**
 * SectionSummaryCard - Status-focused section card for Business Brain
 *
 * Redesigned: Borderless rounded-2xl, clean expand/collapse, inline icons,
 * no icon boxes, no mode accent borders. Elevated shadow when expanded.
 */

import { useState, useEffect, ReactNode, useCallback } from "react";
import { ChevronDown, ChevronRight, Check, AlertCircle, Circle, Sparkles, LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { BusinessMode } from "@/hooks/useTenantConfig";
import type { FieldPriority } from "@/config/essentialFields";

export type SectionStatus = "complete" | "incomplete" | "warning" | "error" | "optional";

interface SectionSummaryCardProps {
  id: string;
  title: string;
  icon: LucideIcon;
  status: SectionStatus;
  statusText: string;
  isEssential?: boolean;
  /** AI impact priority from essentialFields registry */
  aiPriority?: FieldPriority;
  /** Tooltip explaining AI impact if not configured */
  aiImpactText?: string;
  mode?: BusinessMode;
  onEdit?: () => void;
  children: ReactNode;
  className?: string;
  defaultExpanded?: boolean;
  /** Controlled expansion state - when provided, overrides internal state */
  expanded?: boolean;
  /** Callback when expansion state changes */
  onExpandedChange?: (expanded: boolean) => void;
  /** Guidance text shown at the top of expanded content when section is incomplete */
  guidanceText?: string;
  /** Helpful tip shown below guidance text */
  guidanceTip?: string;
  /** Always-visible "why" explanation below title (from brainGuidance.why) */
  whyText?: string;
  /** "What this does" text shown in expanded header (from brainGuidance.what) */
  whatText?: string;
  /** Mode-specific tip shown in expanded callout (from brainGuidance.tips[mode]) */
  tipText?: string;
  /** How AI uses this data — shown as bullets in expanded header */
  usedByAI?: string[];
  /** Step number injected by EssentialGroup */
  stepNumber?: number;
}

const STATUS_CONFIG: Record<SectionStatus, { icon: typeof Check; color: string; label: string }> = {
  complete: { icon: Check, color: "text-green-600 bg-green-100 dark:bg-green-900/30", label: "Done" },
  incomplete: { icon: Circle, color: "text-muted-foreground bg-muted", label: "Set up" },
  optional: { icon: Circle, color: "text-muted-foreground/50 bg-muted/50", label: "Optional" },
  warning: { icon: AlertCircle, color: "text-amber-600 bg-amber-100 dark:bg-amber-900/30", label: "Needs attention" },
  error: { icon: AlertCircle, color: "text-red-600 bg-red-100 dark:bg-red-900/30", label: "Required" },
};

export function SectionSummaryCard({
  id,
  title,
  icon: Icon,
  status,
  statusText,
  isEssential = false,
  aiPriority,
  aiImpactText,
  mode = "general",
  onEdit,
  children,
  className,
  defaultExpanded = false,
  expanded: controlledExpanded,
  onExpandedChange,
  guidanceText,
  guidanceTip,
  whyText,
  whatText,
  tipText,
  usedByAI,
  stepNumber,
}: SectionSummaryCardProps) {
  const [internalExpanded, setInternalExpanded] = useState(defaultExpanded);

  // Use controlled state if provided, otherwise use internal state
  const isExpanded = controlledExpanded !== undefined ? controlledExpanded : internalExpanded;

  const statusConfig = STATUS_CONFIG[status];
  const StatusIcon = statusConfig.icon;

  // Derive AI priority from isEssential if not explicitly provided
  const effectivePriority: FieldPriority | undefined = aiPriority ?? (isEssential ? "required" : undefined);

  const isComplete = status === "complete";

  const toggleExpanded = useCallback(() => {
    const newValue = !isExpanded;
    if (onExpandedChange) {
      onExpandedChange(newValue);
    } else {
      setInternalExpanded(newValue);
    }
  }, [isExpanded, onExpandedChange]);

  // Sync with URL hash for deep linking
  useEffect(() => {
    const hash = window.location.hash.replace("#", "");
    if (hash === id && !isExpanded) {
      if (onExpandedChange) {
        onExpandedChange(true);
      } else {
        setInternalExpanded(true);
      }
      setTimeout(() => {
        const element = document.getElementById(id);
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 100);
    }
  }, [id, isExpanded, onExpandedChange]);

  // Determine effective guidance: new props take priority over legacy concatenated props
  const _effectiveWhatText = whatText || (guidanceText && !whyText ? guidanceText : undefined);
  const _effectiveTipText = tipText || guidanceTip;

  return (
    <div
      id={id}
      className={cn(
        "rounded-2xl bg-card transition-all duration-200 shadow-sm",
        isExpanded && "shadow-md",
        className
      )}
    >
      {/* Header - always visible */}
      <div className="flex items-center gap-2 sm:gap-3 p-3 sm:p-4">
        {/* Step number badge (from EssentialGroup) */}
        {stepNumber !== undefined && (
          <div className={cn(
            "flex items-center justify-center h-6 w-6 rounded-full text-xs font-semibold shrink-0",
            isComplete
              ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
              : "bg-primary/10 text-primary"
          )}>
            {isComplete ? (
              <Check className="h-3.5 w-3.5" />
            ) : (
              stepNumber
            )}
          </div>
        )}

        <button
          type="button"
          onClick={toggleExpanded}
          className="flex-1 flex items-center gap-3 text-left hover:bg-muted/30 -m-2 p-2 rounded-lg transition-colors"
        >
          <Icon className="h-4 w-4 text-muted-foreground shrink-0" />

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-medium text-sm">{title}</h3>

              {/* Sparkle icon tooltip — replaces jargon "Required for AI" badge */}
              {effectivePriority === "required" && status === "incomplete" && (
                <TooltipProvider delayDuration={200}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="cursor-help">
                        <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs">
                      <p className="text-xs">
                        {aiImpactText || "Your AI needs this to work properly"}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
            <p className="text-xs text-muted-foreground truncate mt-0.5">
              {statusText}
            </p>
            {/* Why text — always visible below status, not just when expanded */}
            {whyText && (
              <p className="text-xs text-muted-foreground/80 mt-1 line-clamp-2">
                {whyText}
              </p>
            )}
          </div>
        </button>

        {/* Status Badge */}
        <div className={cn(
          "flex items-center justify-center h-6 w-6 rounded-full shrink-0",
          statusConfig.color
        )}>
          <StatusIcon className="h-3.5 w-3.5" />
        </div>

        {/* Expand indicator via chevron on the clickable header area */}
        <span className="shrink-0 text-muted-foreground">
          {isExpanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </span>
      </div>

      {/* Content - shown when expanded */}
      {isExpanded && (
        <div className="px-4 pb-4 pt-0">
          <div className="mt-4 space-y-4">
            {children}
          </div>
        </div>
      )}
    </div>
  );
}
