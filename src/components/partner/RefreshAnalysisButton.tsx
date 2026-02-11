import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface RefreshAnalysisButtonProps {
  onRefresh: () => void;
  isRefreshing: boolean;
  canRefresh: boolean;
  refreshCountToday: number;
  maxRefreshes: number;
}

export function RefreshAnalysisButton({
  onRefresh,
  isRefreshing,
  canRefresh,
  refreshCountToday,
  maxRefreshes,
}: RefreshAnalysisButtonProps) {
  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={onRefresh}
        disabled={!canRefresh || isRefreshing}
      >
        <RefreshCw
          className={cn("h-3.5 w-3.5 mr-1.5", isRefreshing && "animate-spin")}
        />
        {isRefreshing ? "Analyzing..." : "Refresh Analysis"}
      </Button>
      {!canRefresh && (
        <span className="text-xs text-muted-foreground">
          {refreshCountToday}/{maxRefreshes} used today
        </span>
      )}
    </div>
  );
}
