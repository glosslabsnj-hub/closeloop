import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
  badge?: ReactNode;
}

/**
 * Standardized page header with title, optional description, and action button.
 * Creates consistent visual hierarchy across all pages.
 */
export function PageHeader({ title, description, action, className, badge }: PageHeaderProps) {
  return (
    <div className={cn("mb-6 md:mb-8", className)}>
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight truncate">{title}</h1>
            {badge}
          </div>
          {description && (
            <p className="text-muted-foreground text-sm md:text-base mt-1.5 leading-relaxed">
              {description}
            </p>
          )}
        </div>
        {action && <div className="flex-shrink-0">{action}</div>}
      </div>
    </div>
  );
}
