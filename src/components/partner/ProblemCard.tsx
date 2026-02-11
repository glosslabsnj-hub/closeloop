import { useNavigate } from "react-router-dom";
import { AlertTriangle, AlertCircle, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ProblemItem } from "@/types/partnerAnalysis";

interface ProblemCardProps {
  problem: ProblemItem;
  severity: "critical" | "warning";
}

export function ProblemCard({ problem, severity }: ProblemCardProps) {
  const navigate = useNavigate();
  const isCritical = severity === "critical";

  return (
    <Card
      className={cn(
        "border-l-4",
        isCritical ? "border-l-red-500" : "border-l-yellow-500"
      )}
    >
      <CardContent className="pt-4 pb-4 space-y-2">
        <div className="flex items-start gap-2">
          {isCritical ? (
            <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
          ) : (
            <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5 shrink-0" />
          )}
          <div className="flex-1 space-y-1">
            <h4 className="font-medium text-sm">{problem.title}</h4>
            <p className="text-sm text-muted-foreground">{problem.explanation}</p>
            <p className="text-xs text-muted-foreground">
              <span className="font-medium">Impact:</span> {problem.impact}
            </p>
          </div>
        </div>
        {problem.fix_link && (
          <Button
            variant="outline"
            size="sm"
            className="ml-6"
            onClick={() => navigate(problem.fix_link)}
          >
            {problem.fix_action}
            <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
