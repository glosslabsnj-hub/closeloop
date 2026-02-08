/**
 * AdvancedGroup - Collapsible wrapper for optional/advanced sections
 * 
 * Groups advanced settings that most users won't need to modify,
 * keeping them out of the way while still accessible.
 */

import { useState, ReactNode } from "react";
import { ChevronDown, ChevronRight, Settings2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface AdvancedGroupProps {
  /** Group title */
  title?: string;
  /** Optional description shown when collapsed */
  collapsedDescription?: string;
  /** Child section cards */
  children: ReactNode;
  /** Default collapsed state */
  defaultCollapsed?: boolean;
  /** Additional class names */
  className?: string;
  /** Number of items in this group (for badge) */
  itemCount?: number;
}

export function AdvancedGroup({
  title = "Advanced Settings",
  collapsedDescription = "Optional configurations for fine-tuning",
  children,
  defaultCollapsed = true,
  className,
  itemCount,
}: AdvancedGroupProps) {
  const [isOpen, setIsOpen] = useState(!defaultCollapsed);

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={setIsOpen}
      className={cn("space-y-3", className)}
    >
      {/* Trigger Header */}
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className={cn(
            "w-full flex items-center gap-3 px-4 py-3 rounded-lg border transition-all",
            "bg-muted/30 hover:bg-muted/50",
            isOpen && "bg-muted/50"
          )}
        >
          {/* Icon */}
          <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-muted shrink-0">
            <Settings2 className="h-4 w-4 text-muted-foreground" />
          </div>

          {/* Title & Description */}
          <div className="flex-1 text-left">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{title}</span>
              {itemCount !== undefined && itemCount > 0 && (
                <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                  {itemCount}
                </span>
              )}
            </div>
            {!isOpen && collapsedDescription && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {collapsedDescription}
              </p>
            )}
          </div>

          {/* Chevron */}
          <div className="shrink-0 text-muted-foreground">
            {isOpen ? (
              <ChevronDown className="h-5 w-5" />
            ) : (
              <ChevronRight className="h-5 w-5" />
            )}
          </div>
        </button>
      </CollapsibleTrigger>

      {/* Content */}
      <CollapsibleContent className="space-y-3">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
}
