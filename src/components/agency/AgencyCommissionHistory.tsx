import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  const fmt = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return e ? `${fmt(s)} - ${fmt(e)}` : fmt(s);
}

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  paid: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  failed: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
};

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
          <p className="text-sm text-muted-foreground py-8 text-center">
            No commissions yet. Commissions are recorded when your managed clients pay their invoices.
          </p>
        </CardContent>
      </Card>
    );
  }

  const totalCents = commissions.reduce((sum, c) => sum + c.commission_cents, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Commission History</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
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
                  <TableCell className="text-sm">
                    {formatPeriod(c.period_start, c.period_end)}
                  </TableCell>
                  <TableCell className="text-sm font-medium">
                    {c.tenant_name}
                  </TableCell>
                  <TableCell className="text-sm text-right">
                    {formatCents(c.invoice_amount_cents)}
                  </TableCell>
                  <TableCell className="text-sm text-right">
                    {Math.round(c.commission_rate * 100)}%
                  </TableCell>
                  <TableCell className="text-sm text-right font-medium">
                    {formatCents(c.commission_cents)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={statusColors[c.status] || ""}>
                      {c.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
              {/* Totals row */}
              <TableRow className="bg-muted/50 font-semibold">
                <TableCell colSpan={4} className="text-sm text-right">
                  Total
                </TableCell>
                <TableCell className="text-sm text-right">
                  {formatCents(totalCents)}
                </TableCell>
                <TableCell />
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
