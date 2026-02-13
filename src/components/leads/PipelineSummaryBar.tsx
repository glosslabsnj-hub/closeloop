import { cn } from "@/lib/utils";

export type PipelineStage = "new" | "contacted" | "quoted" | "won" | "lost";

interface StageConfig {
  id: PipelineStage;
  label: string;
  dotColor: string;
}

const STAGES: StageConfig[] = [
  { id: "new", label: "New", dotColor: "bg-blue-400" },
  { id: "contacted", label: "Contacted", dotColor: "bg-amber-400" },
  { id: "quoted", label: "Quoted", dotColor: "bg-purple-400" },
  { id: "won", label: "Won", dotColor: "bg-emerald-400" },
  { id: "lost", label: "Lost", dotColor: "bg-red-400" },
];

interface PipelineSummaryBarProps {
  counts: Record<PipelineStage, number>;
  activeStage: PipelineStage | "all";
  onStageClick: (stage: PipelineStage | "all") => void;
}

export function PipelineSummaryBar({ counts, activeStage, onStageClick }: PipelineSummaryBarProps) {
  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <div className="flex items-center gap-1 p-1 rounded-lg bg-muted/40 border border-border/30">
      {/* All button */}
      <button
        onClick={() => onStageClick("all")}
        className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
          activeStage === "all"
            ? "bg-background shadow-sm text-foreground"
            : "text-muted-foreground hover:text-foreground hover:bg-background/50"
        )}
      >
        All
        <span className="text-xs font-mono bg-muted/60 px-1.5 py-0.5 rounded">
          {total}
        </span>
      </button>

      <div className="w-px h-5 bg-border/50" />

      {/* Stage buttons */}
      {STAGES.map((stage) => (
        <button
          key={stage.id}
          onClick={() => onStageClick(stage.id)}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
            activeStage === stage.id
              ? "bg-background shadow-sm text-foreground"
              : "text-muted-foreground hover:text-foreground hover:bg-background/50"
          )}
        >
          <div className={cn("w-2 h-2 rounded-full", stage.dotColor)} />
          {stage.label}
          {counts[stage.id] > 0 && (
            <span className="text-xs font-mono bg-muted/60 px-1.5 py-0.5 rounded">
              {counts[stage.id]}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
