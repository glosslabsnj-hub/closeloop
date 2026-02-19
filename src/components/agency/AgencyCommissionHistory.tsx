import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Download, Settings2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { AgencyCommission } from "@/hooks/useAgencyData";
import { useUpdatePayoutConfig } from "@/hooks/useAgencyData";

interface AgencyCommissionHistoryProps {
  commissions: AgencyCommission[];
  isLoading: boolean;
  agencyId?: string;
  payoutConfig?: Record<string, unknown>;
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

function PayoutSettingsDialog({
  open,
  onOpenChange,
  agencyId,
  currentConfig,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  agencyId: string;
  currentConfig: Record<string, unknown>;
}) {
  const [method, setMethod] = useState((currentConfig.method as string) || "paypal");
  const [detail, setDetail] = useState((currentConfig.detail as string) || "");
  const updateConfig = useUpdatePayoutConfig(agencyId);

  const handleSave = () => {
    updateConfig.mutate({ method, detail }, {
      onSuccess: () => {
        toast.success("Payout settings saved");
        onOpenChange(false);
      },
      onError: () => toast.error("Failed to save payout settings"),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Payout Settings</DialogTitle>
          <DialogDescription>
            Set your preferred payout method so we know where to send your commissions.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Preferred Method</Label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="paypal">PayPal</SelectItem>
                <SelectItem value="zelle">Zelle</SelectItem>
                <SelectItem value="wire">Wire Transfer</SelectItem>
                <SelectItem value="check">Check</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>
              {method === "paypal" ? "PayPal Email" : method === "zelle" ? "Zelle Phone/Email" : method === "wire" ? "Bank Details" : "Mailing Address"}
            </Label>
            <Input
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
              placeholder={method === "paypal" ? "email@example.com" : method === "zelle" ? "phone or email" : "Enter details"}
            />
          </div>
          <Button className="w-full" onClick={handleSave} disabled={updateConfig.isPending}>
            {updateConfig.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Save Settings
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function AgencyCommissionHistory({ commissions, isLoading, agencyId, payoutConfig }: AgencyCommissionHistoryProps) {
  const [payoutSettingsOpen, setPayoutSettingsOpen] = useState(false);
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
            {agencyId && (
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setPayoutSettingsOpen(true)}>
                <Settings2 className="h-3 w-3 mr-1.5" />
                Payout Settings
              </Button>
            )}
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

        {agencyId && (
          <PayoutSettingsDialog
            open={payoutSettingsOpen}
            onOpenChange={setPayoutSettingsOpen}
            agencyId={agencyId}
            currentConfig={(payoutConfig as Record<string, unknown>) || {}}
          />
        )}
      </CardContent>
    </Card>
  );
}
