/**
 * SectionSummaryCard - Status-focused section card for Business Brain
 * 
 * Shows section status at a glance without requiring expansion.
 * Now includes AI Impact badges (Required/Recommended) from essentialFields registry.
 */

import { useState, useEffect, ReactNode, useCallback } from "react";
import { ChevronDown, ChevronRight, Check, AlertCircle, Circle, Sparkles, LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
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

const AI_PRIORITY_BADGE: Record<FieldPriority, { label: string; variant: "default" | "secondary" | "outline"; className: string; tooltip: string }> = {
  required: { 
    label: "Required for AI", 
    variant: "default", 
    className: "bg-amber-500 hover:bg-amber-600 text-white border-0 text-[10px] px-1.5 py-0",
    tooltip: "AI will not work properly without this"
  },
  recommended: { 
    label: "Recommended", 
    variant: "secondary", 
    className: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-0 text-[10px] px-1.5 py-0",
    tooltip: "AI works better with this configured"
  },
  optional: { 
    label: "Optional", 
    variant: "outline", 
    className: "text-muted-foreground border-muted text-[10px] px-1.5 py-0",
    tooltip: "Nice to have but not essential"
  },
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
}: SectionSummaryCardProps) {
  const [internalExpanded, setInternalExpanded] = useState(defaultExpanded);
  
  // Use controlled state if provided, otherwise use internal state
  const isExpanded = controlledExpanded !== undefined ? controlledExpanded : internalExpanded;
  
  const statusConfig = STATUS_CONFIG[status];
  const StatusIcon = statusConfig.icon;

  // Derive AI priority from isEssential if not explicitly provided
  const effectivePriority: FieldPriority | undefined = aiPriority ?? (isEssential ? "required" : undefined);
  const priorityConfig = effectivePriority ? AI_PRIORITY_BADGE[effectivePriority] : null;

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
              
              {/* AI Priority Badge with Tooltip */}
              {priorityConfig && status === "incomplete" && (
                <TooltipProvider delayDuration={200}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge 
                        variant={priorityConfig.variant} 
                        className={cn("cursor-help", priorityConfig.className)}
                      >
                        <Sparkles className="h-2.5 w-2.5 mr-0.5" />
                        {priorityConfig.label}
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs">
                      <p className="text-xs">
                        {aiImpactText || priorityConfig.tooltip}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
            <p className="text-xs text-muted-foreground truncate mt-0.5">
              {statusText}
            </p>
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
          <div className="border-t pt-4">
            {children}
          </div>
        </div>
      )}
    </div>
  );
}
