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
    <div className={cn("mb-10", className)}>
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-5">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl md:text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
            {badge}
          </div>
          {description && (
            <p className="text-muted-foreground text-sm mt-2.5 leading-relaxed max-w-xl">
              {description}
            </p>
          )}
        </div>
        {action && <div className="flex-shrink-0 mt-1">{action}</div>}
      </div>
    </div>
  );
}
