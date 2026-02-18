import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Download } from "lucide-react";
import { toast } from "sonner";
import type { AgencyCommission } from "@/hooks/useAgencyData";

interface AgencyCommissionHistoryProps {
  commissions: AgencyCommission[];
  isLoading: boolean;
}

function formatCents(cents: number): string {
  return `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatPeriod(start: string | null, end: string | null): string {
  if (!start) return "-";
  const s = new Date(start);
  const e = end ? new Date(end) : null;
  const now = new Date();
  const showYear = (d: Date) => d.getFullYear() !== now.getFullYear();
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      ...(showYear(d) ? { year: "numeric" } : {}),
    });
  return e ? `${fmt(s)} - ${fmt(e)}` : fmt(s);
}

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  paid: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  failed: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
};

function exportCSV(commissions: AgencyCommission[]) {
  const headers = ["Period Start", "Period End", "Client", "Invoice Amount", "Rate", "Commission", "Status", "Date"];
  const rows = commissions.map((c) => [
    c.period_start || "",
    c.period_end || "",
    c.tenant_name || "",
    (c.invoice_amount_cents / 100).toFixed(2),
    `${Math.round(c.commission_rate * 100)}%`,
    (c.commission_cents / 100).toFixed(2),
    c.status,
    c.created_at ? new Date(c.created_at).toISOString().split("T")[0] : "",
  ]);

  const csv = [headers.join(","), ...rows.map((r) => r.map((v) => `"${v}"`).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `commissions-${new Date().toISOString().split("T")[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  toast.success("Commission data exported");
}

export function AgencyCommissionHistory({ commissions, isLoading }: AgencyCommissionHistoryProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Commission History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-10 bg-muted animate-pulse rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (commissions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Commission History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="py-8 text-center space-y-2">
            <p className="text-sm text-muted-foreground">
              No commissions yet.
            </p>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              When your managed clients pay their subscription invoices, your commissions will appear here automatically.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const paidCents = commissions.filter((c) => c.status === "paid").reduce((sum, c) => sum + c.commission_cents, 0);
  const pendingCents = commissions.filter((c) => c.status === "pending").reduce((sum, c) => sum + c.commission_cents, 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <CardTitle className="text-lg">Commission History</CardTitle>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Paid: </span>
                <span className="font-semibold text-green-600">{formatCents(paidCents)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Pending: </span>
                <span className="font-semibold text-amber-600">{formatCents(pendingCents)}</span>
              </div>
            </div>
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => exportCSV(commissions)}>
              <Download className="h-3 w-3 mr-1.5" />
              Export
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Period</TableHead>
                <TableHead>Client</TableHead>
                <TableHead className="text-right">Invoice</TableHead>
                <TableHead className="text-right">Rate</TableHead>
                <TableHead className="text-right">Commission</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {commissions.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="text-sm whitespace-nowrap">
                    {formatPeriod(c.period_start, c.period_end)}
                  </TableCell>
                  <TableCell className="text-sm font-medium">
                    {c.tenant_name}
                  </TableCell>
                  <TableCell className="text-sm text-right tabular-nums">
                    {formatCents(c.invoice_amount_cents)}
                  </TableCell>
                  <TableCell className="text-sm text-right tabular-nums">
                    {Math.round(c.commission_rate * 100)}%
                  </TableCell>
                  <TableCell className="text-sm text-right font-medium tabular-nums">
                    {formatCents(c.commission_cents)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={statusColors[c.status] || ""}>
                      {c.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
