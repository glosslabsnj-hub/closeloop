/**
 * BrainSectionSidebar - Desktop sidebar for Brain section detail views
 *
 * Follows the SettingsSidebar pattern: sticky, grouped items with micro-label headers.
 * Hidden on mobile (< md breakpoint).
 */

import { BrainSidebarItem } from "./BrainSidebarItem";
import type { SectionGroup } from "@/config/brainSectionRegistry";
import type { ItemStatusInfo } from "@/hooks/useBrainItemStatuses";

interface BrainSectionSidebarProps {
  groups: SectionGroup[];
  activeItemId: string | null;
  onItemChange: (itemId: string) => void;
  statuses: Record<string, ItemStatusInfo>;
}

export function BrainSectionSidebar({
  groups,
  activeItemId,
  onItemChange,
  statuses,
}: BrainSectionSidebarProps) {
  return (
    <aside className="w-56 shrink-0 border-r border-border/10 hidden md:block">
      <nav className="sticky top-4 max-h-[calc(100vh-6rem)] overflow-y-auto py-4 px-2 space-y-5">
        {groups.map((group) => (
          <div key={group.groupKey}>
            <div className="text-[11px] font-semibold px-3 py-1.5 uppercase tracking-wider text-muted-foreground/60">
              {group.groupLabel}
            </div>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const statusInfo = statuses[item.id];
                return (
                  <BrainSidebarItem
                    key={item.id}
                    icon={item.icon}
                    label={item.title}
                    isActive={activeItemId === item.id}
                    onClick={() => onItemChange(item.id)}
                    status={statusInfo?.status}
                    isEssential={item.isEssential}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}
