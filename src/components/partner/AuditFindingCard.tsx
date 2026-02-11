import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { AlertCircle, AlertTriangle, CheckCircle2, ArrowRight } from "lucide-react";
import type { AuditFinding } from "@/config/partnerAuditRules";

interface AuditFindingCardProps {
  finding: AuditFinding;
}

const SEVERITY_CONFIG = {
  critical: {
    icon: AlertCircle,
    badgeClass: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    label: "Critical",
    borderClass: "border-l-red-500",
  },
  warning: {
    icon: AlertTriangle,
    badgeClass: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
    label: "Warning",
    borderClass: "border-l-yellow-500",
  },
  success: {
    icon: CheckCircle2,
    badgeClass: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    label: "Passing",
    borderClass: "border-l-green-500",
  },
};

export function AuditFindingCard({ finding }: AuditFindingCardProps) {
  const config = SEVERITY_CONFIG[finding.severity];
  const Icon = config.icon;

  return (
    <Card className={cn("border-l-4", config.borderClass)}>
      <CardContent className="py-4 flex items-start gap-3">
        <Icon
          className={cn(
            "h-5 w-5 shrink-0 mt-0.5",
            finding.severity === "critical" && "text-red-500",
            finding.severity === "warning" && "text-yellow-500",
            finding.severity === "success" && "text-green-500"
          )}
        />
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-medium text-sm">{finding.title}</h4>
            <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", config.badgeClass)}>
              {config.label}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">{finding.description}</p>
          {finding.severity !== "success" && (
            <p className="text-xs text-muted-foreground/70 italic">
              Impact: {finding.impact}
            </p>
          )}
        </div>
        {finding.severity !== "success" && (
          <Button variant="outline" size="sm" className="shrink-0" asChild>
            <Link to={finding.actionLink}>
              {finding.actionLabel}
              <ArrowRight className="h-3 w-3 ml-1" />
            </Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
