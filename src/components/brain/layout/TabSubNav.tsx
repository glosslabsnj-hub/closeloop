/**
 * TabSubNav - Horizontal pill sub-navigation within heavy Brain tabs
 *
 * Renders a row of pill buttons. Active pill is elevated with shadow;
 * inactive pills are subtle. Scrolls horizontally on mobile.
 */

import { cn } from "@/lib/utils";

interface TabSubNavProps {
  subSections: { id: string; label: string }[];
  activeId: string;
  onChange: (id: string) => void;
}

export function TabSubNav({ subSections, activeId, onChange }: TabSubNavProps) {
  if (subSections.length <= 1) return null;

  return (
    <div className="overflow-x-auto -mx-1 px-1 pb-1">
      <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-muted/20 w-fit">
        {subSections.map((sub) => {
          const isActive = sub.id === activeId;
          return (
            <button
              key={sub.id}
              type="button"
              onClick={() => onChange(sub.id)}
              className={cn(
                "rounded-xl px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-all",
                isActive
                  ? "bg-card shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
              )}
            >
              {sub.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
