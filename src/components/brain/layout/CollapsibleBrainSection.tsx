/**
 * CollapsibleBrainSection - Compact accordion-style section for Business Brain
 * 
 * Shows a collapsed preview by default with:
 * - Icon + Title
 * - 1-line preview of content
 * - Expand/collapse on click
 */

import { useState, ReactNode } from "react";
import { ChevronDown, ChevronRight, LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface CollapsibleBrainSectionProps {
  id: string;
  title: string;
  icon: LucideIcon;
  preview: string;
  children: ReactNode;
  defaultExpanded?: boolean;
  className?: string;
}

export function CollapsibleBrainSection({
  id,
  title,
  icon: Icon,
  preview,
  children,
  defaultExpanded = false,
  className,
}: CollapsibleBrainSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div
      id={id}
      className={cn(
        "rounded-lg border bg-card transition-all duration-200",
        isExpanded && "ring-1 ring-primary/20",
        className
      )}
    >
      {/* Header - always visible */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-muted/50 transition-colors rounded-lg"
      >
        <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-muted shrink-0">
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-sm">{title}</h3>
          {!isExpanded && (
            <p className="text-xs text-muted-foreground truncate mt-0.5">
              {preview}
            </p>
          )}
        </div>
        
        <div className="shrink-0 text-muted-foreground">
          {isExpanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </div>
      </button>

      {/* Content - shown when expanded */}
      {isExpanded && (
        <div className="px-4 pb-4 pt-0">
          <div className="border-t pt-4">
            {children}
          </div>
        </div>
      )}
    </div>
  );
}
