import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
  badge?: ReactNode;
  /** Breadcrumb path before title */
  breadcrumb?: string;
  /** Icon to show before title */
  icon?: ReactNode;
  /** Compact variant with less spacing */
  compact?: boolean;
}

/**
 * Clean, minimal page header.
 * Linear/Notion-inspired design.
 */
export function PageHeader({
  title,
  description,
  action,
  className,
  badge,
  breadcrumb,
  icon,
  compact = false,
}: PageHeaderProps) {
  return (
    <header className={cn(
      "sticky top-0 z-20 bg-background/95 backdrop-blur-sm",
      compact ? "py-4 mb-4" : "py-6 mb-6",
      "-mx-6 md:-mx-8 lg:-mx-12 px-6 md:px-8 lg:px-12",
      "border-b border-white/[0.04]",
      className
    )}>
      {/* Breadcrumb */}
      {breadcrumb && (
        <p className="text-[11px] font-medium text-muted-foreground/50 uppercase tracking-wider mb-1">
          {breadcrumb}
        </p>
      )}

      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          {/* Title row */}
          <div className="flex items-center gap-2.5">
            {icon && (
              <div className="flex-shrink-0 text-muted-foreground">
                {icon}
              </div>
            )}
            <h1 className={cn(
              "font-semibold tracking-tight text-foreground truncate",
              compact ? "text-lg" : "text-xl"
            )}>
              {title}
            </h1>
            {badge && <div className="flex-shrink-0">{badge}</div>}
          </div>

          {/* Description */}
          {description && (
            <p className={cn(
              "text-muted-foreground/70 mt-1 truncate",
              compact ? "text-xs" : "text-sm"
            )}>
              {description}
            </p>
          )}
        </div>

        {/* Action */}
        {action && (
          <div className="flex-shrink-0">
            {action}
          </div>
        )}
      </div>
    </header>
  );
}
