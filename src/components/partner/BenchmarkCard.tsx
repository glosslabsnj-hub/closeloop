import { cn } from "@/lib/utils";
import type { BenchmarkItem } from "@/types/partnerAnalysis";

interface BenchmarkCardProps {
  benchmark: BenchmarkItem;
}

const ASSESSMENT_COLORS: Record<string, { bar: string; text: string }> = {
  above: { bar: "bg-green-500", text: "text-green-600" },
  on_track: { bar: "bg-blue-500", text: "text-blue-600" },
  below: { bar: "bg-red-500", text: "text-red-600" },
};

const ASSESSMENT_LABELS: Record<string, string> = {
  above: "Above average",
  on_track: "On track",
  below: "Below average",
};

export function BenchmarkCard({ benchmark }: BenchmarkCardProps) {
  const colors = ASSESSMENT_COLORS[benchmark.assessment] ?? ASSESSMENT_COLORS.on_track;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{benchmark.metric}</span>
        <span className={cn("font-medium", colors.text)}>
          {ASSESSMENT_LABELS[benchmark.assessment]}
        </span>
      </div>
      <div className="flex items-center gap-3 text-xs">
        <span className="font-medium tabular-nums w-16">{benchmark.your_value}</span>
        <div className="flex-1 h-2 rounded-full bg-muted/40 overflow-hidden">
          <div
            className={cn("h-full rounded-full transition-all", colors.bar)}
            style={{
              width: benchmark.assessment === "above" ? "85%" :
                     benchmark.assessment === "on_track" ? "55%" : "25%",
            }}
          />
        </div>
        <span className="text-muted-foreground tabular-nums w-20 text-right">
          {benchmark.typical_range}
        </span>
      </div>
    </div>
  );
}
