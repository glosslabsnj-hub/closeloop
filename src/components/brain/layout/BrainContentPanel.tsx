/**
 * BrainContentPanel - Right-side content area for the sidebar+content split
 *
 * Clean, minimal wrapper: header with status badge, then straight to the editor.
 * No bulky callout boxes — just the form.
 */

import { ChevronLeft } from "lucide-react";
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
  onMobileBack,
  children,
}: BrainContentPanelProps) {
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

        {/* Header: title + status text */}
        <h2 className="text-lg font-semibold tracking-tight">{activeItem.title}</h2>
        {status && (
          <p className="text-sm text-muted-foreground -mt-2">{status.statusText}</p>
        )}

        {/* Editor content — no callout boxes, straight to the form */}
        <div>{children}</div>
      </div>
    </div>
  );
}
