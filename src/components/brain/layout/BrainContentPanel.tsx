/**
 * BrainContentPanel - Right-side content area for the sidebar+content split
 *
 * Renders guidance context, AI usage info, and status badge from already-passed props.
 */

import { useState } from "react";
import { ChevronLeft, ChevronDown, ChevronRight, Lightbulb, Sparkles, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { BrainSectionItem } from "@/config/brainSectionRegistry";
import type { ItemStatusInfo } from "@/hooks/useBrainItemStatuses";
import type { SectionStatus } from "./SectionSummaryCard";

interface BrainContentPanelProps {
  activeItem: BrainSectionItem | null;
  status?: ItemStatusInfo;
  usedByAI?: string[];
  guidance?: { whyText?: string; whatText?: string; tipText?: string };
  onMobileBack: () => void;
  children: React.ReactNode;
}

const STATUS_BADGE: Record<SectionStatus, { label: string; className: string }> = {
  complete: {
    label: "Done",
    className: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300",
  },
  incomplete: {
    label: "Set up",
    className: "bg-muted text-muted-foreground",
  },
  optional: {
    label: "Optional",
    className: "bg-muted/50 text-muted-foreground/70",
  },
  warning: {
    label: "Needs attention",
    className: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300",
  },
  error: {
    label: "Required",
    className: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300",
  },
};

export function BrainContentPanel({
  activeItem,
  status,
  usedByAI,
  guidance,
  onMobileBack,
  children,
}: BrainContentPanelProps) {
  const [aiUsageOpen, setAiUsageOpen] = useState(false);

  if (!activeItem) return null;

  const Icon = activeItem.icon;
  const badge = status ? STATUS_BADGE[status.status] : null;

  return (
    <div className="flex-1 min-w-0">
      <div className="max-w-3xl px-2 md:px-6 py-4 space-y-4">
        {/* Mobile back button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onMobileBack}
          className="md:hidden gap-1.5 -ml-2 mb-1"
        >
          <ChevronLeft className="h-4 w-4" />
          Back
        </Button>

        {/* Header: icon + title + status badge */}
        <div className="flex items-start gap-2.5">
          <Icon className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-semibold tracking-tight">{activeItem.title}</h2>
              {badge && (
                <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full", badge.className)}>
                  {badge.label}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Guidance: what this setting does */}
        {guidance?.whatText && (
          <p className="text-sm text-muted-foreground -mt-1">{guidance.whatText}</p>
        )}

        {/* Why this matters */}
        {guidance?.whyText && (
          <div className="flex items-start gap-2 rounded-lg border border-primary/10 bg-primary/5 px-3 py-2.5">
            <Info className="h-4 w-4 text-primary mt-0.5 shrink-0" />
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Why this matters: </span>
              {guidance.whyText}
            </p>
          </div>
        )}

        {/* Tip callout */}
        {guidance?.tipText && (
          <div className="flex items-start gap-2 rounded-lg border border-border/30 bg-muted/30 px-3 py-2.5">
            <Lightbulb className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
            <p className="text-sm text-muted-foreground">{guidance.tipText}</p>
          </div>
        )}

        {/* Collapsible AI usage section */}
        {usedByAI && usedByAI.length > 0 && (
          <div className="rounded-lg border border-border/20 bg-card/50">
            <button
              type="button"
              onClick={() => setAiUsageOpen(!aiUsageOpen)}
              className="flex items-center gap-2 w-full px-3 py-2 text-left hover:bg-muted/30 transition-colors rounded-lg"
            >
              <Sparkles className="h-3.5 w-3.5 text-primary shrink-0" />
              <span className="text-sm font-medium text-muted-foreground flex-1">Your AI uses this to...</span>
              {aiUsageOpen ? (
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground/60" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60" />
              )}
            </button>
            {aiUsageOpen && (
              <ul className="px-3 pb-2.5 space-y-1.5">
                {usedByAI.map((bullet, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <span className="text-primary mt-1.5 shrink-0">•</span>
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Editor content */}
        <div>{children}</div>
      </div>
    </div>
  );
}
