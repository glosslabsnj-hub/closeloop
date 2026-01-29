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
}

export function EmptyState({ icon: Icon, title, description, action, className, compact = false }: EmptyStateProps) {
  const ActionIcon = action?.icon || Plus;
  
  return (
    <div className={cn(
      "flex flex-col items-center justify-center text-center",
      compact ? "py-8 px-4" : "py-16 px-4",
      className
    )}>
      <div className={cn(
        "flex items-center justify-center rounded-2xl bg-muted",
        compact ? "h-12 w-12 mb-4" : "h-16 w-16 mb-6"
      )}>
        <Icon className={cn("text-muted-foreground", compact ? "h-6 w-6" : "h-8 w-8")} />
      </div>
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
