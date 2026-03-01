/**
 * BrainSectionSidebar - Desktop sidebar for Brain section detail views
 *
 * Follows the SettingsSidebar pattern: sticky, grouped items with micro-label headers.
 * Hidden on mobile (< md breakpoint).
 *
 * Groups containing only "advanced" priority items are collapsed by default
 * with a "Show advanced" toggle.
 *
 * Enhanced: group headers show done counts, items show descriptions.
 */

import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { BrainSidebarItem } from "./BrainSidebarItem";
import { BRAIN_CATEGORIES } from "@/components/brain/layout/businessBrainNavConfig";
import { SECTION_GUIDANCE } from "@/config/brainGuidance";
import type { SectionGroup } from "@/config/brainSectionRegistry";
import type { ItemStatusInfo } from "@/hooks/useBrainItemStatuses";

interface BrainSectionSidebarProps {
  groups: SectionGroup[];
  activeItemId: string | null;
  onItemChange: (itemId: string) => void;
  statuses: Record<string, ItemStatusInfo>;
}

/** Check if all items in a group are "advanced" priority */
function isAdvancedGroup(group: SectionGroup): boolean {
  return group.items.length > 0 && group.items.every(item => item.setupPriority === "advanced");
}

/** Build a description lookup from existing static configs */
function buildDescriptionMap(): Map<string, string> {
  const map = new Map<string, string>();

  // First: pull from CardConfig.purpose in BRAIN_CATEGORIES
  for (const cat of BRAIN_CATEGORIES) {
    for (const card of cat.cards) {
      if (card.purpose) {
        map.set(card.id, card.purpose);
      }
    }
  }

  // Second: fill gaps from SECTION_GUIDANCE.what
  for (const [id, guidance] of Object.entries(SECTION_GUIDANCE)) {
    if (!map.has(id) && guidance.what) {
      map.set(id, guidance.what);
    }
  }

  return map;
}

export function BrainSectionSidebar({
  groups,
  activeItemId,
  onItemChange,
  statuses,
}: BrainSectionSidebarProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Build description lookup once
  const descriptionMap = useMemo(() => buildDescriptionMap(), []);

  // Split groups into main and advanced
  const mainGroups = groups.filter(g => !isAdvancedGroup(g));
  const advancedGroups = groups.filter(g => isAdvancedGroup(g));
  const hasAdvanced = advancedGroups.length > 0;

  // If the active item is in an advanced group, auto-expand
  const activeInAdvanced = hasAdvanced && advancedGroups.some(g =>
    g.items.some(item => item.id === activeItemId)
  );
  const effectiveShowAdvanced = showAdvanced || activeInAdvanced;

  const renderGroup = (group: SectionGroup) => {
    // Compute done count for this group
    const doneCount = group.items.filter(item => {
      const s = statuses[item.id];
      return s?.status === "complete";
    }).length;
    const totalCount = group.items.length;

    return (
      <div key={group.groupKey}>
        <div className="text-[11px] font-semibold uppercase tracking-wider px-3 py-1.5 text-muted-foreground/80 flex items-center justify-between">
          <span>{group.groupLabel}</span>
          <span className="text-[10px] tabular-nums text-muted-foreground/50 font-medium normal-case tracking-normal">
            {doneCount} of {totalCount}
          </span>
        </div>
        <div className="space-y-0.5">
          {group.items.map((item) => {
            const statusInfo = statuses[item.id];
            return (
              <BrainSidebarItem
                key={item.id}
                icon={item.icon}
                label={item.title}
                description={descriptionMap.get(item.id)}
                isActive={activeItemId === item.id}
                onClick={() => onItemChange(item.id)}
                status={statusInfo?.status}
                isEssential={item.isEssential}
              />
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <aside className="w-72 shrink-0 border-r border-border/10 hidden md:block bg-card/30">
      <nav className="sticky top-4 max-h-[calc(100vh-6rem)] overflow-y-auto py-4 px-2 space-y-6">
        {mainGroups.map(renderGroup)}

        {hasAdvanced && (
          <>
            <button
              type="button"
              onClick={() => setShowAdvanced(!effectiveShowAdvanced)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60 hover:text-muted-foreground transition-colors w-full"
            >
              {effectiveShowAdvanced ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
              Advanced ({advancedGroups.reduce((n, g) => n + g.items.length, 0)}) — fine-tune edge cases
            </button>
            {effectiveShowAdvanced && advancedGroups.map(renderGroup)}
          </>
        )}
      </nav>
    </aside>
  );
}
