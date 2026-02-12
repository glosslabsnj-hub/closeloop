import { useNavigate } from "react-router-dom";
import { useLeads } from "@/hooks/useLeads";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, ArrowRight, Phone, UserCheck, UserX } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { ROIPerformanceWidget } from "../ROIPerformanceWidget";
import { LeadRecoveryWidget } from "../LeadRecoveryWidget";

const statusStyles: Record<string, { bg: string; text: string }> = {
  new: { bg: "bg-blue-500/10", text: "text-blue-700 dark:text-blue-400" },
  contacted: { bg: "bg-amber-500/10", text: "text-amber-700 dark:text-amber-400" },
  qualified: { bg: "bg-purple-500/10", text: "text-purple-700 dark:text-purple-400" },
  booked: { bg: "bg-emerald-500/10", text: "text-emerald-700 dark:text-emerald-400" },
  won: { bg: "bg-success/10", text: "text-success" },
  lost: { bg: "bg-muted", text: "text-muted-foreground" },
};

export function CallbackDashboardLayout() {
  const navigate = useNavigate();
  const { leads, stats } = useLeads();

  // Hot leads = new + has phone
  const hotLeads = leads
    .filter((l) => l.status === "new" && l.phone)
    .slice(0, 5);

  const followUpCount = leads.filter(
    (l) => l.status === "contacted" || l.status === "qualified"
  ).length;

  return (
    <div className="space-y-6">
      {/* Lead Funnel Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <FunnelCard label="Hot Leads" value={hotLeads.length} icon={Users} color="text-blue-600" />
        <FunnelCard label="Follow-up" value={followUpCount} icon={Phone} color="text-amber-600" />
        <FunnelCard label="Won" value={stats.won} icon={UserCheck} color="text-emerald-600" />
        <FunnelCard label="Total" value={stats.total} icon={Users} color="text-muted-foreground" />
      </div>

      {/* Hot Leads List + Quick Action */}
      <div className="grid gap-6 lg:grid-cols-[1fr_auto]">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base font-semibold">Hot Leads</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs"
              onClick={() => navigate("/app/inbox?tab=leads")}
            >
              View All
              <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </CardHeader>
          <CardContent className="pt-0">
            {hotLeads.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">
                No hot leads right now. New calls will appear here.
              </p>
            ) : (
              <div className="space-y-2">
                {hotLeads.map((lead) => {
                  const styles = statusStyles[lead.status] || statusStyles.new;
                  return (
                    <div
                      key={lead.id}
                      className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => navigate("/app/inbox?tab=leads")}
                    >
                      <div className={cn("w-8 h-8 rounded-full flex items-center justify-center shrink-0", styles.bg, styles.text)}>
                        <Users className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{lead.full_name}</p>
                        <p className="text-xs text-muted-foreground">{lead.phone}</p>
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {formatDistanceToNow(new Date(lead.created_at), { addSuffix: true })}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Action */}
        <Card className="flex flex-col items-center justify-center p-6 min-w-[200px]">
          <Users className="h-8 w-8 text-primary mb-3" />
          <p className="text-sm font-medium mb-1">View All Leads</p>
          <p className="text-xs text-muted-foreground text-center mb-4">
            Manage and convert your leads
          </p>
          <Button size="sm" onClick={() => navigate("/app/inbox?tab=leads")}>
            Go to Leads
          </Button>
        </Card>
      </div>

      <ROIPerformanceWidget />
      <LeadRecoveryWidget />
    </div>
  );
}

function FunnelCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <Icon className={cn("h-4 w-4", color)} />
          <span className="text-xs font-medium text-muted-foreground">{label}</span>
        </div>
        <p className="text-2xl font-bold tracking-tight tabular-nums">{value}</p>
      </CardContent>
    </Card>
  );
}
