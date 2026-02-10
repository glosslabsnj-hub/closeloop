/**
 * EssentialGroup - Wrapper for must-complete sections
 *
 * Redesigned: Micro-label uppercase header, subtler connecting rail,
 * more breathing room between cards.
 */

import { ReactNode, Children, isValidElement, cloneElement, ReactElement } from "react";
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
          <div className="flex items-center gap-3 flex-1">
            {title && (
              <h2 className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
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
          {/* Vertical connecting line — subtler */}
          <div className="absolute left-[27px] top-4 bottom-4 w-px bg-border/40 z-0" />
          {/* Cards with spacing */}
          <div className="relative z-10 space-y-4">
            {numberedChildren}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {children}
        </div>
      )}
    </div>
  );
}
