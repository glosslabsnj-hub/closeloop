import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Filter } from "lucide-react";
import { GrowthRecommendationCard } from "./GrowthRecommendationCard";
import type { GrowthRecommendation, Difficulty } from "@/config/partnerRecommendations";
import type { StageDefinition } from "@/config/partnerStageDefinitions";

interface PartnerGrowthTabProps {
  recommendations: GrowthRecommendation[];
  stageDefinition: StageDefinition;
}

type DifficultyFilter = "all" | Difficulty;

export function PartnerGrowthTab({
  recommendations,
  stageDefinition,
}: PartnerGrowthTabProps) {
  const [filter, setFilter] = useState<DifficultyFilter>("all");

  const filtered = useMemo(
    () =>
      filter === "all"
        ? recommendations
        : recommendations.filter((r) => r.difficulty === filter),
    [recommendations, filter]
  );

  return (
    <div className="space-y-6">
      {/* Stage context banner */}
      <Card>
        <CardContent className="py-4">
          <p className="text-sm">
            Your business is{" "}
            <span className="font-semibold">{stageDefinition.label}</span>.{" "}
            {stageDefinition.description}
          </p>
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter className="h-4 w-4 text-muted-foreground" />
        {(
          [
            { value: "all", label: "All" },
            { value: "easy", label: "Easy" },
            { value: "medium", label: "Medium" },
            { value: "hard", label: "Hard" },
          ] as { value: DifficultyFilter; label: string }[]
        ).map((opt) => (
          <Button
            key={opt.value}
            variant={filter === opt.value ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setFilter(opt.value)}
          >
            {opt.label}
          </Button>
        ))}
      </div>

      {/* Recommendations */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-sm text-muted-foreground">
          {recommendations.length === 0
            ? "No recommendations right now. Your business is in great shape!"
            : "No recommendations match the selected filter."}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((rec) => (
            <GrowthRecommendationCard key={rec.id} recommendation={rec} />
          ))}
        </div>
      )}
    </div>
  );
}
