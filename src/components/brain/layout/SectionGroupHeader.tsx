/**
 * SectionGroupHeader - Visual separator for grouping related sections
 * 
 * Used in Business Brain to organize sections into logical groups
 * without adding navigation complexity.
 */

import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface SectionGroupHeaderProps {
  label: string;
  icon?: LucideIcon;
  className?: string;
}

export function SectionGroupHeader({ label, icon: Icon, className }: SectionGroupHeaderProps) {
  return (
    <div className={cn("pt-6 pb-2 first:pt-0", className)}>
      <div className="flex items-center gap-2 border-t pt-4 first:border-t-0 first:pt-0">
        {Icon && (
          <Icon className="h-4 w-4 text-muted-foreground" />
        )}
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
      </div>
    </div>
  );
}
