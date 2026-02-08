/**
 * EssentialGroup - Wrapper for must-complete sections
 * 
 * Groups essential sections with visual emphasis indicating
 * these are the primary items needed for AI to function well.
 */

import { ReactNode } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface EssentialGroupProps {
  /** Group title */
  title?: string;
  /** Optional description */
  description?: string;
  /** Child section cards */
  children: ReactNode;
  /** Additional class names */
  className?: string;
  /** Show the essential badge */
  showBadge?: boolean;
}

export function EssentialGroup({
  title = "Essential Setup",
  description,
  children,
  className,
  showBadge = true,
}: EssentialGroupProps) {
  return (
    <div className={cn("space-y-3", className)}>
      {/* Header */}
      {(title || showBadge) && (
        <div className="flex items-center justify-between gap-2 px-1">
          <div className="flex items-center gap-2">
            {showBadge && (
              <div className="flex items-center justify-center h-5 w-5 rounded-full bg-amber-100 dark:bg-amber-900/50">
                <Star className="h-3 w-3 text-amber-600 fill-amber-600" />
              </div>
            )}
            {title && (
              <h2 className="text-sm font-semibold text-foreground">
                {title}
              </h2>
            )}
          </div>
          {description && (
            <p className="text-xs text-muted-foreground">{description}</p>
          )}
        </div>
      )}

      {/* Section Cards */}
      <div className="space-y-3">
        {children}
      </div>
    </div>
  );
}
