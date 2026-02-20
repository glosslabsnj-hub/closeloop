/**
 * BrainMobileItemList - Mobile list view (iOS Settings style)
 *
 * Shown on mobile when no ?item= is selected. Tap an item → full-width editor with back button.
 * Hidden on desktop (>= md breakpoint).
 *
 * Enhanced: text status badges, descriptions, sparkle indicators, group done counts.
 */

import { useMemo } from "react";
import { ChevronRight, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { BRAIN_CATEGORIES } from "@/components/brain/layout/businessBrainNavConfig";
import { SECTION_GUIDANCE } from "@/config/brainGuidance";
import type { SectionGroup } from "@/config/brainSectionRegistry";
import type { ItemStatusInfo } from "@/hooks/useBrainItemStatuses";
import type { SectionStatus } from "./SectionSummaryCard";

interface BrainMobileItemListProps {
  groups: SectionGroup[];
  onItemSelect: (itemId: string) => void;
  statuses: Record<string, ItemStatusInfo>;
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
    label: "Attention",
    className: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300",
  },
  error: {
    label: "Required",
    className: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300",
  },
};

/** Build a description lookup from existing static configs */
function buildDescriptionMap(): Map<string, string> {
  const map = new Map<string, string>();
  for (const cat of BRAIN_CATEGORIES) {
    for (const card of cat.cards) {
      if (card.purpose) map.set(card.id, card.purpose);
    }
  }
  for (const [id, guidance] of Object.entries(SECTION_GUIDANCE)) {
    if (!map.has(id) && guidance.what) map.set(id, guidance.what);
  }
  return map;
}

export function BrainMobileItemList({
  groups,
  onItemSelect,
  statuses,
}: BrainMobileItemListProps) {
  const descriptionMap = useMemo(() => buildDescriptionMap(), []);

  return (
    <div className="md:hidden space-y-4">
      {groups.map((group) => {
        const doneCount = group.items.filter(item => {
          const s = statuses[item.id];
          return s?.status === "complete";
        }).length;

        return (
          <div key={group.groupKey}>
            <div className="flex items-center justify-between px-4 py-1.5">
              <span className="text-xs font-medium text-muted-foreground">
                {group.groupLabel}
              </span>
              <span className="text-[10px] tabular-nums text-muted-foreground/60">
                {doneCount} of {group.items.length}
              </span>
            </div>
            <div className="space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon;
                const statusInfo = statuses[item.id];
                const badge = statusInfo ? STATUS_BADGE[statusInfo.status] : null;
                const description = descriptionMap.get(item.id);
                const showSparkle = item.isEssential && statusInfo?.status && statusInfo.status !== "complete";

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onItemSelect(item.id)}
                    className="w-full flex items-center gap-3 px-4 py-3.5 bg-card rounded-xl hover:bg-muted/30 transition-colors"
                  >
                    <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="flex-1 text-left min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-medium truncate">{item.title}</span>
                        {showSparkle && (
                          <Sparkles className="h-3 w-3 text-primary shrink-0" />
                        )}
                      </div>
                      {description && (
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {description}
                        </p>
                      )}
                    </div>
                    {badge && (
                      <span className={cn(
                        "text-[10px] font-medium px-1.5 py-0.5 rounded-full shrink-0",
                        badge.className
                      )}>
                        {badge.label}
                      </span>
                    )}
                    <ChevronRight className="h-4 w-4 text-muted-foreground/50 shrink-0" />
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
