import { cn } from "@/lib/utils";

interface ReadinessRingProps {
  score: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
  showLabel?: boolean;
}

/**
 * ReadinessRing - Circular SVG progress ring for AI readiness score.
 * Animates from 0 to current score on mount.
 */
export function ReadinessRing({
  score,
  size = 120,
  strokeWidth = 8,
  className,
  showLabel = true,
}: ReadinessRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  // Color based on score
  const getColor = () => {
    if (score >= 85) return "text-emerald-500";
    if (score >= 60) return "text-amber-500";
    return "text-red-400";
  };

  const getStrokeColor = () => {
    if (score >= 85) return "stroke-emerald-500";
    if (score >= 60) return "stroke-amber-500";
    return "stroke-red-400";
  };

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      <svg width={size} height={size} className="-rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted/30"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={cn(getStrokeColor(), "transition-[stroke-dashoffset] duration-1000 ease-out")}
        />
      </svg>
      {showLabel && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={cn("text-2xl font-bold tabular-nums", getColor())}>
            {score}%
          </span>
          <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
            Ready
          </span>
        </div>
      )}
    </div>
  );
}
