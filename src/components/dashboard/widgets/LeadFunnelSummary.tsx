import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

const stages = [
  { key: "new", label: "New", color: "bg-blue-500" },
  { key: "contacted", label: "Contacted", color: "bg-amber-500" },
  { key: "booked", label: "Booked", color: "bg-emerald-500" },
  { key: "won", label: "Won", color: "bg-primary" },
] as const;

export function LeadFunnelSummary() {
  const { tenant } = useAuth();

  const { data: counts } = useQuery({
    queryKey: ["lead-funnel", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return null;

      const results = await Promise.all(
        stages.map(async (stage) => {
          const { count } = await supabase
            .from("customers")
            .select("*", { count: "exact", head: true })
            .eq("tenant_id", tenant.id)
            .eq("lead_status", stage.key);
          return { key: stage.key, count: count || 0 };
        })
      );

      return Object.fromEntries(results.map(r => [r.key, r.count])) as Record<string, number>;
    },
    enabled: !!tenant?.id,
  });

  const total = counts ? Object.values(counts).reduce((a, b) => a + b, 0) : 0;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Users className="h-4 w-4 text-primary" />
          <p className="text-sm font-medium">Lead Pipeline</p>
          <Badge variant="secondary" className="text-xs ml-auto">
            {total} leads
          </Badge>
        </div>
        <div className="flex items-center gap-1">
          {stages.map((stage, i) => {
            const count = counts?.[stage.key] ?? 0;
            const maxCount = counts ? Math.max(...Object.values(counts), 1) : 1;
            const widthPct = Math.max(15, (count / maxCount) * 100);
            return (
              <div key={stage.key} className="flex items-center gap-1 flex-1">
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] text-muted-foreground mb-1">{stage.label}</p>
                  <div
                    className={cn("h-8 rounded-md flex items-center justify-center transition-all", stage.color)}
                    style={{ width: `${widthPct}%`, minWidth: "40px" }}
                  >
                    <span className="text-xs font-bold text-white">{count}</span>
                  </div>
                </div>
                {i < stages.length - 1 && (
                  <ArrowRight className="h-3 w-3 text-muted-foreground/40 shrink-0" />
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
