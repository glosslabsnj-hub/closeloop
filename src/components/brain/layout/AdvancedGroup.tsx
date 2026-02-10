/**
 * AdvancedGroup - Collapsible wrapper for optional/advanced sections
 *
 * Redesigned: Borderless trigger, no gradient, inline icon, cleaner styling.
 */

import { useState, ReactNode } from "react";
import { ChevronDown, ChevronRight, Settings2, Check } from "lucide-react";
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
  /** Number of completed items in this group */
  completedCount?: number;
  /** Total items (alternative to itemCount, used for "X/Y done" display) */
  totalCount?: number;
}

export function AdvancedGroup({
  title = "Advanced Settings",
  collapsedDescription = "Optional configurations for fine-tuning",
  children,
  defaultCollapsed = true,
  className,
  itemCount,
  completedCount,
  totalCount,
}: AdvancedGroupProps) {
  const [isOpen, setIsOpen] = useState(!defaultCollapsed);

  // Determine what count to show
  const effectiveTotal = totalCount ?? itemCount;
  const hasCompletionInfo = completedCount !== undefined && effectiveTotal !== undefined && effectiveTotal > 0;

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
            "w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all",
            "bg-muted/20 hover:bg-muted/40",
            isOpen && "bg-muted/30"
          )}
        >
          {/* Inline icon */}
          <Settings2 className="h-4 w-4 text-muted-foreground shrink-0" />

          {/* Title & Description */}
          <div className="flex-1 text-left">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{title}</span>
              {/* Completion count */}
              {hasCompletionInfo && (
                <span className={cn(
                  "text-xs px-1.5 py-0.5 rounded inline-flex items-center gap-1",
                  completedCount! > 0
                    ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                    : "text-muted-foreground bg-muted"
                )}>
                  {completedCount! > 0 && <Check className="h-3 w-3" />}
                  {completedCount}/{effectiveTotal} done
                </span>
              )}
              {/* Legacy item count (when no completedCount) */}
              {!hasCompletionInfo && itemCount !== undefined && itemCount > 0 && (
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
