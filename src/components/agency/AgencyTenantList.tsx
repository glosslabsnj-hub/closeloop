import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ExternalLink, MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { AgencyTenant, AgencyMetrics } from "@/hooks/useAgencyData";

interface AgencyTenantListProps {
  tenants: AgencyTenant[];
  metrics: AgencyMetrics | null | undefined;
  isLoading: boolean;
}

export function AgencyTenantList({ tenants, metrics, isLoading }: AgencyTenantListProps) {
  const metricsMap = new Map(
    (metrics?.per_tenant || []).map((m) => [m.tenant_id, m])
  );

  const statusColors: Record<string, string> = {
    active: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    suspended: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    archived: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400",
  };

  const modeLabels: Record<string, string> = {
    service: "Service",
    dispatch: "Dispatch",
    food: "Food",
    medical: "Medical",
    general: "General",
    sales: "Sales",
  };

  if (tenants.length === 0 && !isLoading) {
    return (
      <div className="rounded-lg border p-8 text-center">
        <p className="text-sm text-muted-foreground">No clients yet. Create your first client below.</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Business</TableHead>
            <TableHead>Mode</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Calls (30d)</TableHead>
            <TableHead className="text-right">Revenue (30d)</TableHead>
            <TableHead className="text-right">Conv. Rate</TableHead>
            <TableHead className="w-[50px]" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {tenants.map((tenant) => {
            const m = metricsMap.get(tenant.tenant_id);
            return (
              <TableRow key={tenant.id}>
                <TableCell className="font-medium">
                  {tenant.tenant_name || "Unknown"}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-xs">
                    {modeLabels[tenant.business_mode || "general"] || tenant.business_mode}
                  </Badge>
                </TableCell>
                <TableCell>
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[tenant.status] || statusColors.active}`}>
                    {tenant.status}
                  </span>
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {m?.calls_30d?.toLocaleString() ?? "-"}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {m?.revenue_30d_cents != null ? `$${(m.revenue_30d_cents / 100).toLocaleString()}` : "-"}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {m?.conversion_rate != null ? `${Math.round(m.conversion_rate * 100)}%` : "-"}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <a href={`/app/dashboard?tenant=${tenant.tenant_id}`} className="flex items-center gap-2">
                          <ExternalLink className="h-3.5 w-3.5" />
                          View Dashboard
                        </a>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
