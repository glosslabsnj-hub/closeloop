/**
 * CategoryCard - Collapsed summary card for a Business Brain category
 * 
 * Shows:
 * - Icon and title
 * - Completion status badge
 * - One-line summary preview
 * - Edit button to expand/navigate
 */

import { motion } from "framer-motion";
import { ChevronRight, Check, AlertCircle, Circle, LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { BusinessMode } from "@/hooks/useTenantConfig";
import { getModeTheme } from "../layout/ModeTheme";

export type CategoryStatus = "complete" | "incomplete" | "warning";

interface CategoryCardProps {
  id: string;
  title: string;
  icon: LucideIcon;
  status: CategoryStatus;
  summary: string;
  mode: BusinessMode;
  onEdit: (sectionId: string) => void;
  /** Section to navigate to when clicking edit */
  sectionId: string;
  /** Whether this category is essential (affects styling) */
  isEssential?: boolean;
}

const STATUS_CONFIG: Record<CategoryStatus, { 
  icon: typeof Check; 
  bgColor: string;
  iconColor: string;
}> = {
  complete: { 
    icon: Check, 
    bgColor: "bg-green-100 dark:bg-green-900/30",
    iconColor: "text-green-600 dark:text-green-400",
  },
  incomplete: { 
    icon: Circle, 
    bgColor: "bg-muted",
    iconColor: "text-muted-foreground",
  },
  warning: { 
    icon: AlertCircle, 
    bgColor: "bg-amber-100 dark:bg-amber-900/30",
    iconColor: "text-amber-600 dark:text-amber-400",
  },
};

export function CategoryCard({
  id,
  title,
  icon: Icon,
  status,
  summary,
  mode,
  onEdit,
  sectionId,
  isEssential = false,
}: CategoryCardProps) {
  const theme = getModeTheme(mode);
  const statusConfig = STATUS_CONFIG[status];
  const StatusIcon = statusConfig.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "group relative rounded-xl border bg-card p-4 transition-all duration-200",
        "hover:shadow-md hover:border-primary/30",
        status === "incomplete" && isEssential && "border-amber-200 dark:border-amber-800/50"
      )}
    >
      <div className="flex items-center gap-4">
        {/* Icon */}
        <div 
          className="flex h-12 w-12 items-center justify-center rounded-xl shrink-0"
          style={{ backgroundColor: `${theme.accent}15` }}
        >
          <Icon className="h-6 w-6" style={{ color: theme.accent }} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-base">{title}</h3>
            {/* Status badge */}
            <div className={cn(
              "flex h-5 w-5 items-center justify-center rounded-full shrink-0",
              statusConfig.bgColor
            )}>
              <StatusIcon className={cn("h-3 w-3", statusConfig.iconColor)} />
            </div>
          </div>
          <p className="text-sm text-muted-foreground truncate mt-0.5">
            {summary}
          </p>
        </div>

        {/* Edit button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onEdit(sectionId)}
          className="shrink-0 opacity-60 group-hover:opacity-100 transition-opacity"
        >
          Edit
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </motion.div>
  );
}

/**
 * CategoryCardSkeleton - Loading state for CategoryCard
 */
export function CategoryCardSkeleton() {
  return (
    <div className="rounded-xl border bg-card p-4 animate-pulse">
      <div className="flex items-center gap-4">
        <div className="h-12 w-12 rounded-xl bg-muted" />
        <div className="flex-1 space-y-2">
          <div className="h-5 w-32 bg-muted rounded" />
          <div className="h-4 w-48 bg-muted rounded" />
        </div>
        <div className="h-8 w-16 bg-muted rounded" />
      </div>
    </div>
  );
}
