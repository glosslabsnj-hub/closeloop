import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { RefreshAnalysisButton } from "./RefreshAnalysisButton";

interface ExecutiveSummaryBannerProps {
  headline: string;
  stageAssessment: string;
  grade: "A" | "B" | "C" | "D" | "F";
  gradeReasoning: string;
  generatedAt: string | null;
  isCached: boolean;
  onRefresh: () => void;
  isRefreshing: boolean;
  canRefresh: boolean;
  refreshCountToday: number;
  maxRefreshes: number;
}

const GRADE_COLORS: Record<string, string> = {
  A: "bg-green-500",
  B: "bg-blue-500",
  C: "bg-yellow-500",
  D: "bg-orange-500",
  F: "bg-red-500",
};

const GRADE_TEXT_COLORS: Record<string, string> = {
  A: "text-green-500",
  B: "text-blue-500",
  C: "text-yellow-500",
  D: "text-orange-500",
  F: "text-red-500",
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor(diff / (1000 * 60));

  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return "just now";
}

export function ExecutiveSummaryBanner({
  headline,
  stageAssessment,
  grade,
  gradeReasoning,
  generatedAt,
  isCached,
  onRefresh,
  isRefreshing,
  canRefresh,
  refreshCountToday,
  maxRefreshes,
}: ExecutiveSummaryBannerProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex flex-col md:flex-row md:items-start gap-4">
          {/* Grade ring */}
          <div className="flex-shrink-0">
            <div
              className={cn(
                "w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-bold",
                GRADE_COLORS[grade]
              )}
            >
              {grade}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 space-y-1.5">
            <h2 className="text-xl font-semibold">{headline}</h2>
            <p className="text-sm text-muted-foreground">{stageAssessment}</p>
            <p className="text-sm">
              <span className={cn("font-medium", GRADE_TEXT_COLORS[grade])}>
                Grade {grade}
              </span>
              {" — "}
              <span className="text-muted-foreground">{gradeReasoning}</span>
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
            <RefreshAnalysisButton
              onRefresh={onRefresh}
              isRefreshing={isRefreshing}
              canRefresh={canRefresh}
              refreshCountToday={refreshCountToday}
              maxRefreshes={maxRefreshes}
            />
            {generatedAt && (
              <span className="text-xs text-muted-foreground">
                {isCached ? `Updated ${timeAgo(generatedAt)}` : "Just generated"}
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
