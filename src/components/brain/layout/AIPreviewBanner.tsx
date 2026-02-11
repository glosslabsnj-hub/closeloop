/**
 * AIPreviewBanner - Real-time preview of what AI will say
 * 
 * Features:
 * - Updates as user types
 * - Shows actual phrasing AI will use
 * - Mode-aware examples
 * - Collapsible if user finds it distracting
 */

import { useState } from "react";
import { Sparkles, ChevronDown, ChevronUp, Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { BusinessMode } from "@/hooks/useTenantConfig";

const MODE_ACCENT: Record<BusinessMode, { bg: string; border: string; icon: string }> = {
  service: { 
    bg: "bg-blue-50 dark:bg-blue-950/30", 
    border: "border-blue-200 dark:border-blue-900/50",
    icon: "text-blue-600"
  },
  dispatch: { 
    bg: "bg-amber-50 dark:bg-amber-950/30", 
    border: "border-amber-200 dark:border-amber-900/50",
    icon: "text-amber-600"
  },
  food: { 
    bg: "bg-orange-50 dark:bg-orange-950/30", 
    border: "border-orange-200 dark:border-orange-900/50",
    icon: "text-orange-600"
  },
  medical: { 
    bg: "bg-rose-50 dark:bg-rose-950/30", 
    border: "border-rose-200 dark:border-rose-900/50",
    icon: "text-rose-600"
  },
  general: { 
    bg: "bg-slate-50 dark:bg-slate-950/30", 
    border: "border-slate-200 dark:border-slate-800",
    icon: "text-slate-600"
  },
  sales: { 
    bg: "bg-indigo-50 dark:bg-indigo-950/30", 
    border: "border-indigo-200 dark:border-indigo-900/50",
    icon: "text-indigo-600"
  },
};

interface AIPreviewBannerProps {
  /** The AI script/response preview */
  preview: string;
  /** Optional subtitle or context */
  subtitle?: string;
  /** Current business mode for styling */
  mode?: BusinessMode;
  /** Loading state while generating preview */
  isLoading?: boolean;
  /** Allow collapsing */
  collapsible?: boolean;
  /** Default collapsed state */
  defaultCollapsed?: boolean;
  /** Additional class names */
  className?: string;
}

export function AIPreviewBanner({
  preview,
  subtitle,
  mode = "general",
  isLoading = false,
  collapsible = true,
  defaultCollapsed = false,
  className,
}: AIPreviewBannerProps) {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
  const accent = MODE_ACCENT[mode];

  if (isCollapsed) {
    return (
      <button
        type="button"
        onClick={() => setIsCollapsed(false)}
        className={cn(
          "w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg border text-left transition-colors",
          accent.bg,
          accent.border,
          "hover:opacity-90",
          className
        )}
      >
        <div className="flex items-center gap-2">
          <Sparkles className={cn("h-4 w-4", accent.icon)} />
          <span className="text-xs font-medium text-muted-foreground">
            Show AI preview
          </span>
        </div>
        <ChevronDown className="h-4 w-4 text-muted-foreground" />
      </button>
    );
  }

  return (
    <div
      className={cn(
        "rounded-lg border p-4",
        accent.bg,
        accent.border,
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <div className={cn(
            "flex items-center justify-center h-6 w-6 rounded-full",
            "bg-white dark:bg-background shadow-sm"
          )}>
            <Sparkles className={cn("h-3.5 w-3.5", accent.icon)} />
          </div>
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            What your AI will say
          </span>
        </div>
        
        {collapsible && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setIsCollapsed(true)}
            className="h-6 px-2 text-muted-foreground hover:text-foreground"
          >
            <ChevronUp className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Subtitle */}
      {subtitle && (
        <p className="text-xs text-muted-foreground mb-2">{subtitle}</p>
      )}

      {/* Preview Content */}
      <div className="relative">
        {isLoading ? (
          <div className="flex items-center gap-2 py-2">
            <div className="h-2 w-2 rounded-full bg-muted-foreground/30 animate-pulse" />
            <div className="h-2 w-2 rounded-full bg-muted-foreground/30 animate-pulse delay-75" />
            <div className="h-2 w-2 rounded-full bg-muted-foreground/30 animate-pulse delay-150" />
          </div>
        ) : (
          <div className="flex items-start gap-2">
            <Volume2 className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <p className="text-sm text-foreground italic leading-relaxed">
              "{preview}"
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Compact inline variant for smaller spaces
 */
interface AIPreviewInlineProps {
  preview: string;
  mode?: BusinessMode;
  className?: string;
}

export function AIPreviewInline({
  preview,
  mode = "general",
  className,
}: AIPreviewInlineProps) {
  const accent = MODE_ACCENT[mode];

  return (
    <div
      className={cn(
        "flex items-start gap-2 rounded-md px-3 py-2 text-xs",
        accent.bg,
        className
      )}
    >
      <Sparkles className={cn("h-3 w-3 mt-0.5 shrink-0", accent.icon)} />
      <p className="text-muted-foreground italic">"{preview}"</p>
    </div>
  );
}
