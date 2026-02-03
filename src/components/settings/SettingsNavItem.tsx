import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface SettingsNavItemProps {
  icon: LucideIcon;
  label: string;
  description?: string;
  isActive: boolean;
  onClick: () => void;
  badge?: string;
  status?: "complete" | "attention" | "none";
}

export function SettingsNavItem({
  icon: Icon,
  label,
  isActive,
  onClick,
  badge,
  status = "none",
}: SettingsNavItemProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors text-sm",
        isActive
          ? "bg-primary/15 text-primary font-medium border border-primary/20"
          : "text-foreground/70 hover:bg-muted hover:text-foreground"
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="flex-1 truncate">{label}</span>
      {status === "attention" && (
        <span className="h-2 w-2 rounded-full bg-warning" />
      )}
      {status === "complete" && (
        <span className="h-2 w-2 rounded-full bg-accent" />
      )}
      {badge && (
        <span className="text-xs bg-muted px-1.5 py-0.5 rounded">{badge}</span>
      )}
    </button>
  );
}
