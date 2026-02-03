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
 * Typography carries the hierarchy - no decorative elements.
 */
export function PageHeader({ title, description, action, className, badge }: PageHeaderProps) {
  return (
    <div className={cn("mb-12", className)}>
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-5">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-lg md:text-xl font-medium tracking-tight text-foreground/90">{title}</h1>
            {badge}
          </div>
          {description && (
            <p className="text-muted-foreground/70 text-sm mt-3 leading-relaxed max-w-lg">
              {description}
            </p>
          )}
        </div>
        {action && <div className="flex-shrink-0 mt-1">{action}</div>}
      </div>
    </div>
  );
}
