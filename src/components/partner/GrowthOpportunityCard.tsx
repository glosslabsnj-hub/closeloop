import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { GrowthItem } from "@/types/partnerAnalysis";

interface GrowthOpportunityCardProps {
  item: GrowthItem;
}

const EFFORT_COLORS: Record<string, string> = {
  low: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  medium: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  high: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

export function GrowthOpportunityCard({ item }: GrowthOpportunityCardProps) {
  const navigate = useNavigate();

  return (
    <Card>
      <CardContent className="pt-4 pb-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <h4 className="font-medium text-sm">{item.title}</h4>
          <Badge
            variant="secondary"
            className={cn("text-[10px] shrink-0", EFFORT_COLORS[item.effort_level])}
          >
            {item.effort_level} effort
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">{item.explanation}</p>
        <p className="text-xs text-muted-foreground">
          <span className="font-medium">Expected impact:</span> {item.expected_impact}
        </p>
        {item.action_link && (
          <Button
            variant="ghost"
            size="sm"
            className="p-0 h-auto text-primary"
            onClick={() => navigate(item.action_link)}
          >
            Get started
            <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
