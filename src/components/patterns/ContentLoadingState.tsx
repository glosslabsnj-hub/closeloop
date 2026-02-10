import { cn } from "@/lib/utils";
import { Skeleton, SkeletonCard, SkeletonTable, SkeletonList } from "@/components/ui/skeleton";

interface ContentLoadingStateProps {
  /** Layout variant to match with skeletons */
  variant: "list" | "grid" | "table" | "stats";
  /** Number of skeleton items to show */
  count?: number;
  /** Number of table columns (only for table variant) */
  columns?: number;
  className?: string;
}

export function ContentLoadingState({
  variant,
  count = 5,
  columns = 4,
  className,
}: ContentLoadingStateProps) {
  if (variant === "table") {
    return <SkeletonTable rows={count} columns={columns} className={className} />;
  }

  if (variant === "list") {
    return <SkeletonList items={count} />;
  }

  if (variant === "grid") {
    return (
      <div className={cn("grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3", className)}>
        {Array.from({ length: count }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  if (variant === "stats") {
    return (
      <div className={cn("grid gap-4 grid-cols-2 lg:grid-cols-4", className)}>
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="rounded-xl border p-5 space-y-3">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-3 w-24" />
          </div>
        ))}
      </div>
    );
  }

  return null;
}
