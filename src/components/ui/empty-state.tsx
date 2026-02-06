import * as React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { LucideIcon, Plus, ExternalLink } from "lucide-react";

interface EmptyStateAction {
  label: string;
  onClick: () => void;
  icon?: LucideIcon;
  variant?: "default" | "outline" | "ghost";
}

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: EmptyStateAction;
  secondaryAction?: EmptyStateAction;
  className?: string;
  compact?: boolean;
  /** Render icon with emoji-like background */
  emojiStyle?: boolean;
}

export function EmptyState({ 
  icon: Icon, 
  title, 
  description, 
  action, 
  secondaryAction,
  className, 
  compact = false,
  emojiStyle = false,
}: EmptyStateProps) {
  const ActionIcon = action?.icon || Plus;
  const SecondaryActionIcon = secondaryAction?.icon || ExternalLink;
  
  return (
    <div className={cn(
      "flex flex-col items-center justify-center text-center",
      compact ? "py-8 px-4" : "py-16 px-6",
      className
    )}>
      <div className={cn(
        "flex items-center justify-center rounded-2xl",
        emojiStyle ? "bg-primary/10" : "bg-muted",
        compact ? "h-12 w-12 mb-4" : "h-16 w-16 mb-6"
      )}>
        <Icon className={cn(
          emojiStyle ? "text-primary" : "text-muted-foreground", 
          compact ? "h-6 w-6" : "h-8 w-8"
        )} />
      </div>
      <h3 className={cn("font-semibold mb-2", compact ? "text-base" : "text-lg")}>{title}</h3>
      <p className="text-muted-foreground max-w-sm mb-6 text-sm leading-relaxed">{description}</p>
      
      {(action || secondaryAction) && (
        <div className="flex flex-wrap items-center justify-center gap-3">
          {action && (
            <Button 
              onClick={action.onClick} 
              className="gap-2"
              variant={action.variant || "default"}
            >
              <ActionIcon className="h-4 w-4" />
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button 
              onClick={secondaryAction.onClick} 
              variant={secondaryAction.variant || "outline"}
              className="gap-2"
            >
              <SecondaryActionIcon className="h-4 w-4" />
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
