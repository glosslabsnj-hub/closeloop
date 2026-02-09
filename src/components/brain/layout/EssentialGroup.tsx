/**
 * EssentialGroup - Wrapper for must-complete sections
 *
 * Redesigned: Numbered step badges on each child card with a vertical
 * connecting line (progress rail). Green checkmark replaces number when
 * step is complete. Group header shows title + description.
 */

import { ReactNode, Children, isValidElement, cloneElement, ReactElement } from "react";
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
  /** Whether to inject step numbers into children (default true) */
  numbered?: boolean;
}

export function EssentialGroup({
  title = "Essential Setup",
  description,
  children,
  className,
  showBadge = true,
  numbered = true,
}: EssentialGroupProps) {
  // Inject stepNumber prop into each child SectionSummaryCard
  const numberedChildren = numbered
    ? Children.map(children, (child, index) => {
        if (isValidElement(child)) {
          return cloneElement(child as ReactElement<{ stepNumber?: number }>, {
            stepNumber: index + 1,
          });
        }
        return child;
      })
    : children;

  return (
    <div className={cn("space-y-0", className)}>
      {/* Header */}
      {(title || showBadge) && (
        <div className="flex items-center gap-2 px-1 mb-3">
          {showBadge && (
            <div className="flex items-center justify-center h-5 w-5 rounded-full bg-amber-100 dark:bg-amber-900/50">
              <Star className="h-3 w-3 text-amber-600 fill-amber-600" />
            </div>
          )}
          <div className="flex items-center gap-3 flex-1">
            {title && (
              <h2 className="text-sm font-semibold text-foreground">
                {title}
              </h2>
            )}
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
          </div>
        </div>
      )}

      {/* Section Cards with progress rail */}
      {numbered ? (
        <div className="relative">
          {/* Vertical connecting line */}
          <div className="absolute left-[27px] top-4 bottom-4 w-px bg-border z-0" />
          {/* Cards with spacing */}
          <div className="relative z-10 space-y-3">
            {numberedChildren}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {children}
        </div>
      )}
    </div>
  );
}
