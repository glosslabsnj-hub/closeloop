import * as React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { LucideIcon, Plus } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: LucideIcon;
  };
  className?: string;
  compact?: boolean;
  /** Optional SVG illustration component — renders instead of the icon square when provided */
  illustration?: React.ReactNode;
}

export function EmptyState({ icon: Icon, title, description, action, className, compact = false, illustration }: EmptyStateProps) {
  const ActionIcon = action?.icon || Plus;

  return (
    <div className={cn(
      "flex flex-col items-center justify-center text-center",
      compact ? "py-8 px-4" : "py-16 px-4",
      className
    )}>
      {illustration ? (
        <div className={cn("mb-6", compact && "mb-4")}>
          {illustration}
        </div>
      ) : (
        <div className={cn(
          "flex items-center justify-center rounded-2xl bg-muted/60 border border-border/30 glow-primary-subtle",
          compact ? "h-12 w-12 mb-4" : "h-16 w-16 mb-6"
        )}>
          <Icon className={cn("text-muted-foreground/70", compact ? "h-6 w-6" : "h-7 w-7")} />
        </div>
      )}
      <h3 className={cn("font-semibold mb-2", compact ? "text-base" : "text-lg")}>{title}</h3>
      <p className="text-muted-foreground max-w-sm mb-6 text-sm">{description}</p>
      {action && (
        <Button onClick={action.onClick} className="gap-2">
          <ActionIcon className="h-4 w-4" />
          {action.label}
        </Button>
      )}
    </div>
  );
}
