import { cn } from "@/lib/utils";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { type ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
  badge?: ReactNode;
  backHref?: string;
  /** @deprecated Icons removed for minimalistic design — prop kept for backward compat */
  icon?: unknown;
}

export function PageHeader({
  title,
  description,
  action,
  className,
  badge,
  backHref,
}: PageHeaderProps) {
  return (
    <header className={cn("relative pt-6 pb-4", className)}>
      <div className="flex items-end justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2.5">
            {backHref && (
              <Link
                to={backHref}
                className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors -ml-1 p-1 rounded-md hover:bg-muted/40"
              >
                <ArrowLeft className="h-5 w-5" />
              </Link>
            )}
            <h2 className="text-xl font-semibold tracking-tight text-foreground truncate">
              {title}
            </h2>
            {badge && <div className="flex-shrink-0">{badge}</div>}
          </div>
          {description && (
            <p className="text-sm text-muted-foreground mt-1">
              {description}
            </p>
          )}
        </div>
        {action && (
          <div className="flex-shrink-0">
            {action}
          </div>
        )}
      </div>
    </header>
  );
}
