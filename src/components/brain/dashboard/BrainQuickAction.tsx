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
        "flex flex-col items-center gap-2 rounded-xl border-border/30 border bg-card/60 backdrop-blur-sm p-4",
        "card-interactive group-hover:scale-[1.02]",
        "text-center group",
      )}
    >
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 border border-primary/10 group-hover:bg-primary/15 group-hover:shadow-[0_0_16px_-4px_hsl(230_70%_62%/0.25)] transition-all">
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <span className="text-xs font-medium">{label}</span>
    </button>
  );
}
