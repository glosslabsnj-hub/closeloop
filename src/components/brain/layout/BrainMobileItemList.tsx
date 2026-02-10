/**
 * BrainMobileItemList - Mobile list view (iOS Settings style)
 *
 * Shown on mobile when no ?item= is selected. Tap an item → full-width editor with back button.
 * Hidden on desktop (>= md breakpoint).
 */

import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SectionGroup } from "@/config/brainSectionRegistry";
import type { ItemStatusInfo } from "@/hooks/useBrainItemStatuses";
import type { SectionStatus } from "./SectionSummaryCard";

interface BrainMobileItemListProps {
  groups: SectionGroup[];
  onItemSelect: (itemId: string) => void;
  statuses: Record<string, ItemStatusInfo>;
}

const STATUS_DOT_COLORS: Record<SectionStatus, string> = {
  complete: "bg-green-500",
  incomplete: "bg-muted-foreground/30",
  warning: "bg-amber-500",
  error: "bg-red-500",
};

export function BrainMobileItemList({
  groups,
  onItemSelect,
  statuses,
}: BrainMobileItemListProps) {
  return (
    <div className="md:hidden space-y-4">
      {groups.map((group) => (
        <div key={group.groupKey}>
          <div className="text-[11px] font-semibold px-4 py-1.5 uppercase tracking-wider text-muted-foreground/60">
            {group.groupLabel}
          </div>
          <div className="space-y-1">
            {group.items.map((item) => {
              const Icon = item.icon;
              const statusInfo = statuses[item.id];
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onItemSelect(item.id)}
                  className="w-full flex items-center gap-3 px-4 py-3.5 bg-card rounded-xl hover:bg-muted/30 transition-colors"
                >
                  <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 text-left min-w-0">
                    <div className="text-sm font-medium truncate">{item.title}</div>
                    {statusInfo && (
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {statusInfo.statusText}
                      </p>
                    )}
                  </div>
                  {statusInfo && (
                    <span
                      className={cn(
                        "h-2 w-2 rounded-full shrink-0",
                        STATUS_DOT_COLORS[statusInfo.status]
                      )}
                    />
                  )}
                  <ChevronRight className="h-4 w-4 text-muted-foreground/50 shrink-0" />
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
