/**
 * BrainSidebarItem - Individual sidebar navigation item with text status labels
 *
 * Follows the SettingsNavItem pattern from the Settings page.
 * Shows description text and text-based status instead of colored dots.
 */

import { cn } from "@/lib/utils";
import { Sparkles } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { SectionStatus } from "./SectionSummaryCard";

interface BrainSidebarItemProps {
  icon: LucideIcon;
  label: string;
  description?: string;
  isActive: boolean;
  onClick: () => void;
  status?: SectionStatus;
  isEssential?: boolean;
}

const STATUS_TEXT: Record<SectionStatus, { label: string; className: string }> = {
  complete: {
    label: "Done",
    className: "text-green-600 dark:text-green-400",
  },
  incomplete: {
    label: "Set up",
    className: "text-muted-foreground",
  },
  optional: {
    label: "Optional",
    className: "text-muted-foreground/60",
  },
  warning: {
    label: "Attention",
    className: "text-amber-600 dark:text-amber-400",
  },
  error: {
    label: "Required",
    className: "text-red-600 dark:text-red-400",
  },
};

export function BrainSidebarItem({
  icon: Icon,
  label,
  description,
  isActive,
  onClick,
  status,
  isEssential,
}: BrainSidebarItemProps) {
  const statusInfo = status ? STATUS_TEXT[status] : null;
  const showSparkle = isEssential && status && status !== "complete";

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full flex items-start gap-2.5 px-3 py-2.5 rounded-md text-left transition-colors",
        isActive
          ? "bg-accent text-foreground font-medium"
          : "text-muted-foreground hover:bg-accent hover:text-foreground"
      )}
    >
      <Icon className="h-4 w-4 shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-sm truncate">{label}</span>
          {showSparkle && (
            <Sparkles className="h-3 w-3 text-primary shrink-0" />
          )}
        </div>
        {description && (
          <p className="text-xs text-muted-foreground/70 truncate mt-0.5">{description}</p>
        )}
      </div>
      {statusInfo && (
        <span className={cn("text-[11px] font-medium shrink-0 mt-0.5", statusInfo.className)}>
          {statusInfo.label}
        </span>
      )}
    </button>
  );
}
