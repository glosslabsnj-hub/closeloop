/**
 * BrainContentPanel - Right-side content area for the sidebar+content split
 *
 * Shows: mobile back button, item header with status badge,
 * "AI uses this to..." callout, guidance callout, and editor children.
 */

import { ChevronLeft, Zap, Lightbulb } from "lucide-react";
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
  if (!activeItem) return null;

  const Icon = activeItem.icon;
  const badge = status ? STATUS_BADGE[status.status] : null;

  return (
    <div className="flex-1 min-w-0">
      <div className="max-w-3xl px-2 md:px-6 py-4 space-y-5">
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
        <div className="flex items-center gap-3">
          <Icon className="h-5 w-5 text-muted-foreground shrink-0" />
          <h2 className="text-lg font-semibold tracking-tight flex-1">{activeItem.title}</h2>
          {badge && (
            <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full", badge.className)}>
              {badge.label}
            </span>
          )}
        </div>

        {/* Status text */}
        {status && (
          <p className="text-sm text-muted-foreground -mt-3">{status.statusText}</p>
        )}

        {/* "AI Uses This To..." callout */}
        {usedByAI && usedByAI.length > 0 && (
          <div className="rounded-xl bg-violet-50 dark:bg-violet-950/20 border border-violet-200 dark:border-violet-800/50 p-3">
            <div className="flex items-center gap-1.5 mb-2">
              <Zap className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />
              <span className="text-xs font-medium text-violet-700 dark:text-violet-300">
                Your AI uses this to...
              </span>
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

        {/* Guidance callout */}
        {status?.status === "incomplete" && guidance && (guidance.whatText || guidance.tipText) && (
          <div className="rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 p-3 space-y-1.5">
            {guidance.whatText && (
              <p className="text-sm text-blue-900 dark:text-blue-100">
                {guidance.whatText}
              </p>
            )}
            {guidance.tipText && (
              <p className="text-xs text-blue-700 dark:text-blue-300 flex items-start gap-1.5">
                <Lightbulb className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                {guidance.tipText}
              </p>
            )}
          </div>
        )}

        {/* Editor content */}
        <div>{children}</div>
      </div>
    </div>
  );
}
