import { cn } from "@/lib/utils";
import { type LucideIcon, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import React, { type ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
  badge?: ReactNode;
  /** Back navigation link */
  backHref?: string;
  /** Lucide icon component (preferred) or ReactNode (legacy) */
  icon?: LucideIcon | ReactNode;
}

export function PageHeader({
  title,
  description,
  action,
  className,
  badge,
  backHref,
  icon,
}: PageHeaderProps) {
  // Support both LucideIcon components and ReactNode (backward compat)
  const renderIcon = () => {
    if (!icon) return null;
    if (React.isValidElement(icon)) return icon;
    const Icon = icon as LucideIcon;
    return <Icon className="h-5 w-5" />;
  };

  return (
    <header
      className={cn(
        "relative pt-8 pb-6",
        className
      )}
    >
      <div className="flex items-end justify-between gap-4">
        <div className="flex-1 min-w-0">
          {/* Category label (description above title) */}
          {description && (
            <div className="flex items-center gap-2 mb-1">
              {icon && (
                <div className="flex-shrink-0 text-muted-foreground">
                  {renderIcon()}
                </div>
              )}
              <p className="text-micro text-muted-foreground truncate">
                {description}
              </p>
            </div>
          )}

          {/* Title row */}
          <div className="flex items-center gap-2.5">
            {backHref && (
              <Link
                to={backHref}
                className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors -ml-1 p-1 rounded-md hover:bg-muted/40"
              >
                <ArrowLeft className="h-5 w-5" />
              </Link>
            )}
            {!description && icon && (
              <div className="flex-shrink-0 text-muted-foreground">
                {renderIcon()}
              </div>
            )}
            <h1 className="text-2xl font-bold tracking-tight text-foreground truncate">
              {title}
            </h1>
            {badge && <div className="flex-shrink-0">{badge}</div>}
          </div>
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
