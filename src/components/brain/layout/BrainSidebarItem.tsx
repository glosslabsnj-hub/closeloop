/**
 * BrainSidebarItem - Individual sidebar navigation item with status dot
 *
 * Follows the SettingsNavItem pattern from the Settings page.
 */

import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import type { SectionStatus } from "./SectionSummaryCard";

interface BrainSidebarItemProps {
  icon: LucideIcon;
  label: string;
  isActive: boolean;
  onClick: () => void;
  status?: SectionStatus;
  isEssential?: boolean;
}

const STATUS_DOT_COLORS: Record<SectionStatus, string> = {
  complete: "bg-green-500",
  incomplete: "bg-muted-foreground/30",
  optional: "bg-muted-foreground/20",
  warning: "bg-amber-500",
  error: "bg-red-500",
};

export function BrainSidebarItem({
  icon: Icon,
  label,
  isActive,
  onClick,
  status,
  isEssential,
}: BrainSidebarItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-left transition-colors text-sm",
        isActive
          ? "bg-accent text-foreground font-medium"
          : "text-muted-foreground hover:bg-accent hover:text-foreground"
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="flex-1 truncate text-[13px]">{label}</span>
      {status && (
        <span
          className={cn(
            "h-2 w-2 rounded-full shrink-0",
            STATUS_DOT_COLORS[status]
          )}
        />
      )}
    </button>
  );
}
