/**
 * BrainQuickAction - Compact quick-access button for the dashboard hub
 */

import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface BrainQuickActionProps {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
}

export function BrainQuickAction({ icon: Icon, label, onClick }: BrainQuickActionProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-2 rounded-xl border bg-card p-4",
        "hover:bg-muted/50 hover:border-primary/30 transition-all",
        "text-center group",
      )}
    >
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 group-hover:bg-primary/15 transition-colors">
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <span className="text-xs font-medium">{label}</span>
    </button>
  );
}
