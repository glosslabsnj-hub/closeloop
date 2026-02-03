import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
  badge?: ReactNode;
  /** Use editorial style with decorative line */
  editorial?: boolean;
}

/**
 * Executive workspace page header.
 * Editorial variant creates a signature "moment" with decorative underline.
 */
export function PageHeader({ 
  title, 
  description, 
  action, 
  className, 
  badge,
  editorial = false,
}: PageHeaderProps) {
  if (editorial) {
    return (
      <div className={cn("editorial-header relative", className)}>
        {/* Aurora accent line - cyan to violet gradient */}
        <div 
          className="absolute -left-4 top-0 bottom-0 w-0.5 rounded-full hidden md:block"
          style={{ 
            background: 'linear-gradient(to bottom, hsl(var(--accent-signature)), hsl(var(--accent-violet) / 0.5), transparent)',
            boxShadow: '0 0 20px hsl(var(--accent-signature) / 0.3)'
          }}
        />
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="editorial-title">{title}</h1>
              {badge}
            </div>
            {description && (
              <p className="editorial-subtitle">{description}</p>
            )}
          </div>
          {action && <div className="flex-shrink-0">{action}</div>}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("mb-14", className)}>
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-5">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl md:text-2xl font-bold tracking-tight">
              <span className="bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
                {title}
              </span>
            </h1>
            {badge}
          </div>
          {description && (
            <p className="text-muted-foreground text-sm mt-3 leading-relaxed max-w-lg">
              {description}
            </p>
          )}
        </div>
        {action && <div className="flex-shrink-0 mt-0.5">{action}</div>}
      </div>
    </div>
  );
}
