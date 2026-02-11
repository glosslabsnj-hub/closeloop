import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertCircle, AlertTriangle, CheckCircle2, Filter } from "lucide-react";
import { AuditFindingCard } from "./AuditFindingCard";
import {
  AUDIT_CATEGORY_LABELS,
  AUDIT_CATEGORY_ORDER,
  type AuditFinding,
  type AuditSeverity,
} from "@/config/partnerAuditRules";

interface PartnerAuditTabProps {
  findings: AuditFinding[];
  criticalCount: number;
  warningCount: number;
  successCount: number;
}

type FilterValue = "all" | AuditSeverity;

export function PartnerAuditTab({
  findings,
  criticalCount,
  warningCount,
  successCount,
}: PartnerAuditTabProps) {
  const [filter, setFilter] = useState<FilterValue>("all");

  const filteredFindings = useMemo(
    () =>
      filter === "all"
        ? findings
        : findings.filter((f) => f.severity === filter),
    [findings, filter]
  );

  const grouped = useMemo(() => {
    const map = new Map<string, AuditFinding[]>();
    for (const cat of AUDIT_CATEGORY_ORDER) {
      const items = filteredFindings.filter((f) => f.category === cat);
      if (items.length > 0) map.set(cat, items);
    }
    return map;
  }, [filteredFindings]);

  return (
    <div className="space-y-6">
      {/* Summary bar */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-1.5 text-sm">
          <AlertCircle className="h-4 w-4 text-red-500" />
          <span className="font-medium">{criticalCount}</span>
          <span className="text-muted-foreground">critical</span>
        </div>
        <div className="flex items-center gap-1.5 text-sm">
          <AlertTriangle className="h-4 w-4 text-yellow-500" />
          <span className="font-medium">{warningCount}</span>
          <span className="text-muted-foreground">warnings</span>
        </div>
        <div className="flex items-center gap-1.5 text-sm">
          <CheckCircle2 className="h-4 w-4 text-green-500" />
          <span className="font-medium">{successCount}</span>
          <span className="text-muted-foreground">passing</span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter className="h-4 w-4 text-muted-foreground" />
        {(
          [
            { value: "all", label: "All" },
            { value: "critical", label: "Critical" },
            { value: "warning", label: "Warnings" },
            { value: "success", label: "Passing" },
          ] as { value: FilterValue; label: string }[]
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

      {/* Grouped findings */}
      {grouped.size === 0 ? (
        <div className="text-center py-12 text-sm text-muted-foreground">
          No findings match the selected filter.
        </div>
      ) : (
        Array.from(grouped.entries()).map(([category, items]) => (
          <div key={category} className="space-y-3">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-sm">
                {AUDIT_CATEGORY_LABELS[category as keyof typeof AUDIT_CATEGORY_LABELS]}
              </h3>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                {items.length}
              </Badge>
            </div>
            <div className="space-y-2">
              {items.map((finding) => (
                <AuditFindingCard key={finding.ruleId} finding={finding} />
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
