import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowRight, Clock } from "lucide-react";
import type { GrowthRecommendation, Difficulty } from "@/config/partnerRecommendations";

interface GrowthRecommendationCardProps {
  recommendation: GrowthRecommendation;
}

const DIFFICULTY_CONFIG: Record<
  Difficulty,
  { label: string; className: string }
> = {
  easy: {
    label: "Easy",
    className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  },
  medium: {
    label: "Medium",
    className: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  },
  hard: {
    label: "Hard",
    className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  },
};

export function GrowthRecommendationCard({
  recommendation,
}: GrowthRecommendationCardProps) {
  const diff = DIFFICULTY_CONFIG[recommendation.difficulty];

  return (
    <Card>
      <CardContent className="py-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1 min-w-0">
            <h4 className="font-medium text-sm">{recommendation.title}</h4>
            <p className="text-sm text-muted-foreground">
              {recommendation.description}
            </p>
          </div>
          <Button variant="outline" size="sm" className="shrink-0" asChild>
            <Link to={recommendation.actionLink}>
              {recommendation.actionLabel}
              <ArrowRight className="h-3 w-3 ml-1" />
            </Link>
          </Button>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", diff.className)}>
            {diff.label}
          </Badge>
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {recommendation.estimatedTime}
          </span>
          <span className="text-xs text-muted-foreground">
            {recommendation.expectedImpact}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
