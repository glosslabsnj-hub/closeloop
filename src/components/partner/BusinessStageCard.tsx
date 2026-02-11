import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Rocket, TrendingUp, Zap, Building2, Flag } from "lucide-react";
import type { BusinessStage, StageDefinition } from "@/config/partnerStageDefinitions";

interface BusinessStageCardProps {
  stage: BusinessStage;
  stageDefinition: StageDefinition;
  className?: string;
}

const STAGE_ORDER: BusinessStage[] = [
  "getting_started",
  "building",
  "growing",
  "scaling",
  "established",
];

const STAGE_ICONS: Record<BusinessStage, React.ElementType> = {
  getting_started: Flag,
  building: Building2,
  growing: TrendingUp,
  scaling: Zap,
  established: Rocket,
};

const STAGE_COLORS: Record<BusinessStage, string> = {
  getting_started: "text-blue-500",
  building: "text-indigo-500",
  growing: "text-green-500",
  scaling: "text-orange-500",
  established: "text-purple-500",
};

export function BusinessStageCard({
  stage,
  stageDefinition,
  className,
}: BusinessStageCardProps) {
  const Icon = STAGE_ICONS[stage];
  const currentIdx = STAGE_ORDER.indexOf(stage);

  return (
    <Card className={className}>
      <CardContent className="pt-6 space-y-4">
        {/* Stage header */}
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "rounded-lg p-2 bg-muted/50",
              STAGE_COLORS[stage]
            )}
          >
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">{stageDefinition.label}</h3>
            <p className="text-sm text-muted-foreground">Business Stage</p>
          </div>
        </div>

        {/* Progress dots */}
        <div className="flex items-center gap-2">
          {STAGE_ORDER.map((s, idx) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={cn(
                  "w-3 h-3 rounded-full transition-colors",
                  idx <= currentIdx
                    ? "bg-primary"
                    : "bg-muted"
                )}
              />
              {idx < STAGE_ORDER.length - 1 && (
                <div
                  className={cn(
                    "h-0.5 w-6",
                    idx < currentIdx ? "bg-primary" : "bg-muted"
                  )}
                />
              )}
            </div>
          ))}
        </div>

        {/* Description */}
        <p className="text-sm text-muted-foreground">
          {stageDefinition.description}
        </p>

        {/* Focus areas */}
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Focus Areas
          </p>
          <ul className="space-y-1">
            {stageDefinition.focusAreas.map((area) => (
              <li key={area} className="text-sm flex items-start gap-2">
                <span className="text-primary mt-1 shrink-0">&#8226;</span>
                {area}
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
