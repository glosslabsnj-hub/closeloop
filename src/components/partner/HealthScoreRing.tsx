import { cn } from "@/lib/utils";
import type { HealthBreakdown } from "@/hooks/useBusinessPartner";

interface HealthScoreRingProps {
  score: number;
  breakdown: HealthBreakdown;
  className?: string;
}

const BREAKDOWN_ITEMS: { key: keyof HealthBreakdown; label: string; max: number }[] = [
  { key: "brainCompletion", label: "Brain Completion", max: 25 },
  { key: "aiPerformance", label: "AI Performance", max: 25 },
  { key: "revenueTrend", label: "Revenue Trend", max: 20 },
  { key: "setupCompleteness", label: "Setup", max: 15 },
  { key: "knowledgeCoverage", label: "Knowledge", max: 15 },
];

function scoreColor(score: number): string {
  if (score < 40) return "text-red-500";
  if (score < 70) return "text-yellow-500";
  return "text-green-500";
}

function strokeColor(score: number): string {
  if (score < 40) return "#ef4444";
  if (score < 70) return "#eab308";
  return "#22c55e";
}

function barBg(score: number, max: number): string {
  const pct = max > 0 ? score / max : 0;
  if (pct < 0.4) return "bg-red-500";
  if (pct < 0.7) return "bg-yellow-500";
  return "bg-green-500";
}

export function HealthScoreRing({ score, breakdown, className }: HealthScoreRingProps) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(100, Math.max(0, score));
  const dashOffset = circumference - (progress / 100) * circumference;

  return (
    <div className={cn("flex flex-col items-center gap-6", className)}>
      {/* Ring */}
      <div className="relative w-36 h-36">
        <svg className="w-36 h-36 -rotate-90" viewBox="0 0 120 120">
          <circle
            cx="60"
            cy="60"
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            className="text-muted/30"
          />
          <circle
            cx="60"
            cy="60"
            r={radius}
            fill="none"
            stroke={strokeColor(score)}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            style={{ transition: "stroke-dashoffset 0.8s ease-out" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={cn("text-3xl font-bold", scoreColor(score))}>
            {score}
          </span>
          <span className="text-xs text-muted-foreground">/ 100</span>
        </div>
      </div>

      {/* Breakdown bars */}
      <div className="w-full space-y-2">
        {BREAKDOWN_ITEMS.map(({ key, label, max }) => {
          const value = breakdown[key];
          const pct = max > 0 ? (value / max) * 100 : 0;
          return (
            <div key={key} className="space-y-0.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{label}</span>
                <span className="font-medium tabular-nums">
                  {Math.round(value)}/{max}
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-muted/40">
                <div
                  className={cn("h-full rounded-full transition-all duration-500", barBg(value, max))}
                  style={{ width: `${Math.min(100, pct)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
