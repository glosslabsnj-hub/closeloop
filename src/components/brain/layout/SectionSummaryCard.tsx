/**
 * SectionSummaryCard - Status-focused section card for Business Brain
 *
 * Redesigned: Always shows "why" text, uses sparkle icon instead of jargon badges,
 * displays "AI Uses This To..." bullets, and supports step numbering.
 */

import { useState, useEffect, ReactNode, useCallback } from "react";
import { ChevronDown, ChevronRight, Check, AlertCircle, Circle, Sparkles, Lightbulb, LucideIcon, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { BusinessMode } from "@/hooks/useTenantConfig";
import type { FieldPriority } from "@/config/essentialFields";

export type SectionStatus = "complete" | "incomplete" | "warning" | "error";

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
  warning: { icon: AlertCircle, color: "text-amber-600 bg-amber-100 dark:bg-amber-900/30", label: "Needs attention" },
  error: { icon: AlertCircle, color: "text-red-600 bg-red-100 dark:bg-red-900/30", label: "Required" },
};

const MODE_ACCENT: Record<BusinessMode, string> = {
  service: "border-l-blue-500",
  dispatch: "border-l-amber-500",
  food: "border-l-orange-500",
  medical: "border-l-rose-500",
  general: "border-l-slate-500",
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
  const effectiveWhatText = whatText || (guidanceText && !whyText ? guidanceText : undefined);
  const effectiveTipText = tipText || guidanceTip;

  return (
    <div
      id={id}
      className={cn(
        "rounded-lg border bg-card transition-all duration-200 border-l-4",
        MODE_ACCENT[mode],
        isExpanded && "ring-1 ring-primary/20 shadow-sm",
        // Highlight incomplete required fields
        effectivePriority === "required" && !isExpanded && status === "incomplete" && "ring-1 ring-amber-300 dark:ring-amber-700/50",
        className
      )}
    >
      {/* Header - always visible */}
      <div className="flex items-center gap-3 p-4">
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
          <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-muted shrink-0">
            <Icon className="h-5 w-5 text-muted-foreground" />
          </div>

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
          "flex items-center justify-center h-7 w-7 rounded-full shrink-0",
          statusConfig.color
        )}>
          <StatusIcon className="h-4 w-4" />
        </div>

        {/* Expand Toggle */}
        <button
          type="button"
          onClick={toggleExpanded}
          className="shrink-0 text-muted-foreground hover:text-foreground transition-colors p-1"
          aria-label={isExpanded ? "Collapse section" : "Expand section"}
        >
          {isExpanded ? (
            <ChevronDown className="h-5 w-5" />
          ) : (
            <ChevronRight className="h-5 w-5" />
          )}
        </button>
      </div>

      {/* Content - shown when expanded */}
      {isExpanded && (
        <div className="px-4 pb-4 pt-0">
          <div className="border-t pt-4 space-y-4">
            {/* "AI Uses This To..." block */}
            {usedByAI && usedByAI.length > 0 && (
              <div className="rounded-lg bg-violet-50 dark:bg-violet-950/20 border border-violet-200 dark:border-violet-800/50 p-3">
                <div className="flex items-center gap-1.5 mb-2">
                  <Zap className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />
                  <span className="text-xs font-medium text-violet-700 dark:text-violet-300">Your AI uses this to...</span>
                </div>
                <ul className="space-y-1">
                  {usedByAI.map((item, i) => (
                    <li key={i} className="text-xs text-violet-900 dark:text-violet-200 flex items-start gap-1.5">
                      <span className="text-violet-400 dark:text-violet-500 mt-0.5 shrink-0">&#8226;</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Guidance callout — split what + tip (or fallback to legacy concatenated guidanceText) */}
            {status === "incomplete" && (effectiveWhatText || effectiveTipText) && (
              <div className="rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 p-3 space-y-1.5">
                {effectiveWhatText && (
                  <p className="text-sm text-blue-900 dark:text-blue-100">
                    {effectiveWhatText}
                  </p>
                )}
                {effectiveTipText && (
                  <p className="text-xs text-blue-700 dark:text-blue-300 flex items-start gap-1.5">
                    <Lightbulb className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                    {effectiveTipText}
                  </p>
                )}
              </div>
            )}
            {children}
          </div>
        </div>
      )}
    </div>
  );
}
