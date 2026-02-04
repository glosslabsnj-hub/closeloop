/**
 * Collapsible Section Component for Business Brain
 * 
 * A reusable wrapper that provides a clean, professional
 * collapsible card for organizing content in the Business Brain.
 */

import { useState, ReactNode } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface CollapsibleSectionProps {
  /** Section title displayed in the header */
  title: string;
  /** Optional icon to display before the title */
  icon?: ReactNode;
  /** Optional description shown below the title */
  description?: string;
  /** Badge to show next to title (e.g., "Required", count) */
  badge?: ReactNode;
  /** The content to show when expanded */
  children: ReactNode;
  /** Whether the section starts collapsed (default: true) */
  defaultCollapsed?: boolean;
  /** Optional className for the outer card */
  className?: string;
  /** Whether this section has unsaved changes */
  hasChanges?: boolean;
  /** Priority indicator for styling */
  priority?: "default" | "warning" | "error" | "success";
}

export function CollapsibleSection({
  title,
  icon,
  description,
  badge,
  children,
  defaultCollapsed = true,
  className,
  hasChanges = false,
  priority = "default",
}: CollapsibleSectionProps) {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  const priorityStyles = {
    default: "border-border",
    warning: "border-amber-500/30 bg-amber-500/5",
    error: "border-destructive/30 bg-destructive/5",
    success: "border-emerald-500/30 bg-emerald-500/5",
  };

  return (
    <Card className={cn(priorityStyles[priority], className)}>
      <CardHeader
        className="cursor-pointer select-none py-4 px-5"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            {icon && (
              <div className="shrink-0 text-muted-foreground">
                {icon}
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <CardTitle className="text-base font-medium">{title}</CardTitle>
                {badge}
                {hasChanges && (
                  <Badge variant="outline" className="text-xs border-amber-500/50 text-amber-500">
                    Unsaved
                  </Badge>
                )}
              </div>
              {description && !isCollapsed && (
                <p className="text-sm text-muted-foreground mt-0.5">
                  {description}
                </p>
              )}
            </div>
          </div>
          <div className="shrink-0 text-muted-foreground">
            {isCollapsed ? (
              <ChevronDown className="h-5 w-5" />
            ) : (
              <ChevronUp className="h-5 w-5" />
            )}
          </div>
        </div>
      </CardHeader>

      {!isCollapsed && (
        <CardContent className="pt-0 pb-5 px-5">
          {children}
        </CardContent>
      )}
    </Card>
  );
}

/**
 * A simpler version without Card styling - just a collapsible div
 */
export interface CollapsibleDivProps {
  title: string;
  icon?: ReactNode;
  badge?: ReactNode;
  children: ReactNode;
  defaultCollapsed?: boolean;
  className?: string;
}

export function CollapsibleDiv({
  title,
  icon,
  badge,
  children,
  defaultCollapsed = true,
  className,
}: CollapsibleDivProps) {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  return (
    <div className={cn("rounded-lg border", className)}>
      <button
        type="button"
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-muted/50 transition-colors"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <div className="flex items-center gap-2">
          {icon && <span className="text-muted-foreground">{icon}</span>}
          <span className="font-medium text-sm">{title}</span>
          {badge}
        </div>
        {isCollapsed ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {!isCollapsed && (
        <div className="px-4 pb-4 border-t pt-4">
          {children}
        </div>
      )}
    </div>
  );
}
