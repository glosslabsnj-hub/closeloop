import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Loader2, CheckCircle2, DollarSign } from "lucide-react";
import { toast } from "sonner";

interface Commission {
  id: string;
  agency_id: string;
  tenant_id: string;
  stripe_invoice_id: string;
  invoice_amount_cents: number;
  commission_rate: number;
  commission_cents: number;
  status: string;
  period_start: string | null;
  period_end: string | null;
  created_at: string;
  paid_at: string | null;
  payout_method: string | null;
  payout_reference: string | null;
  // Joined
  agency_name?: string;
  tenant_name?: string;
}

function formatCents(cents: number) {
  return `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function useAdminCommissions() {
  return useQuery({
    queryKey: ["admin-commissions"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("agency_commissions")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const commissions: Commission[] = data || [];

      // Fetch agency names
      const agencyIds = [...new Set(commissions.map((c) => c.agency_id))];
      const agencyMap = new Map<string, string>();
      if (agencyIds.length > 0) {
        const { data: agencies } = await (supabase as any)
          .from("agency_accounts")
          .select("id, agency_name")
          .in("id", agencyIds);
        for (const a of agencies || []) {
          agencyMap.set(a.id, a.agency_name || "Unknown");
        }
      }

      // Fetch tenant names
      const tenantIds = [...new Set(commissions.map((c) => c.tenant_id))];
      const tenantMap = new Map<string, string>();
      if (tenantIds.length > 0) {
        const { data: tenants } = await supabase
          .from("tenants")
          .select("id, name")
          .in("id", tenantIds);
        for (const t of tenants || []) {
          tenantMap.set(t.id, (t as any).name || "Unknown");
        }
      }

      return commissions.map((c) => ({
        ...c,
        agency_name: agencyMap.get(c.agency_id) || "Unknown",
        tenant_name: tenantMap.get(c.tenant_id) || "Unknown",
      }));
    },
  });
}

export default function AdminCommissionPayoutsPage() {
  const queryClient = useQueryClient();
  const { data: commissions, isLoading } = useAdminCommissions();

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [payoutDialogOpen, setPayoutDialogOpen] = useState(false);
  const [payoutMethod, setPayoutMethod] = useState("paypal");
  const [payoutReference, setPayoutReference] = useState("");
  const [payoutNotes, setPayoutNotes] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "paid">("pending");

  const payoutMutation = useMutation({
    mutationFn: async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      const { data, error } = await supabase.functions.invoke("process-commission-payout", {
        body: {
          commission_ids: [...selectedIds],
          payout_method: payoutMethod,
          payout_reference: payoutReference || undefined,
          notes: payoutNotes || undefined,
        },
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });

      if (error) throw new Error(error.message || "Failed to process payout");
      return data;
    },
    onSuccess: (data) => {
      toast.success(`${data.paid_count} commission(s) marked as paid`);
      setSelectedIds(new Set());
      setPayoutDialogOpen(false);
      setPayoutReference("");
      setPayoutNotes("");
      queryClient.invalidateQueries({ queryKey: ["admin-commissions"] });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to process payout");
    },
  });

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const pendingCommissions = commissions?.filter((c) => c.status === "pending") || [];
  const filtered = (commissions || []).filter((c) =>
    statusFilter === "all" ? true : c.status === statusFilter
  );

  // Group pending by agency for summary
  const agencyPendingSummary = new Map<string, { name: string; total: number; count: number }>();
  for (const c of pendingCommissions) {
    const existing = agencyPendingSummary.get(c.agency_id) || { name: c.agency_name || "Unknown", total: 0, count: 0 };
    existing.total += c.commission_cents;
    existing.count += 1;
    agencyPendingSummary.set(c.agency_id, existing);
  }

  const totalPendingCents = pendingCommissions.reduce((s, c) => s + c.commission_cents, 0);

  return (
    <div className="container max-w-6xl py-8 px-4 sm:px-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Commission Payouts</h1>
        <p className="text-sm text-muted-foreground">Review and process agency commission payments.</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">Total Pending</p>
            <p className="text-2xl font-bold text-amber-600">{formatCents(totalPendingCents)}</p>
          </CardContent>
        </Card>
        {[...agencyPendingSummary.entries()].map(([agencyId, info]) => (
          <Card key={agencyId}>
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-muted-foreground">{info.name}</p>
              <p className="text-lg font-semibold">{formatCents(info.total)}</p>
              <p className="text-xs text-muted-foreground">{info.count} pending</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
            <SelectTrigger className="h-8 w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="all">All</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {selectedIds.size > 0 && (
          <Button size="sm" onClick={() => setPayoutDialogOpen(true)}>
            <DollarSign className="h-4 w-4 mr-1.5" />
            Mark {selectedIds.size} as Paid
          </Button>
        )}
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 bg-muted animate-pulse rounded" />
          ))}
        </div>
      ) : (
        <div className="rounded-lg border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {statusFilter === "pending" && <TableHead className="w-10" />}
                <TableHead>Agency</TableHead>
                <TableHead>Client</TableHead>
                <TableHead className="text-right">Invoice</TableHead>
                <TableHead className="text-right">Rate</TableHead>
                <TableHead className="text-right">Commission</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Payout</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={statusFilter === "pending" ? 9 : 8} className="text-center text-muted-foreground py-8">
                    No commissions found.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((c) => (
                  <TableRow key={c.id}>
                    {statusFilter === "pending" && (
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={selectedIds.has(c.id)}
                          onChange={() => toggleSelection(c.id)}
                          className="rounded border-muted-foreground"
                        />
                      </TableCell>
                    )}
                    <TableCell className="font-medium text-sm">{c.agency_name}</TableCell>
                    <TableCell className="text-sm">{c.tenant_name}</TableCell>
                    <TableCell className="text-right text-sm tabular-nums">{formatCents(c.invoice_amount_cents)}</TableCell>
                    <TableCell className="text-right text-sm tabular-nums">{Math.round(c.commission_rate * 100)}%</TableCell>
                    <TableCell className="text-right text-sm font-medium tabular-nums">{formatCents(c.commission_cents)}</TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={
                          c.status === "paid"
                            ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                            : c.status === "pending"
                              ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
                              : ""
                        }
                      >
                        {c.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {c.payout_method ? `${c.payout_method}${c.payout_reference ? ` #${c.payout_reference}` : ""}` : "-"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {c.paid_at
                        ? new Date(c.paid_at).toLocaleDateString()
                        : c.created_at
                          ? new Date(c.created_at).toLocaleDateString()
                          : "-"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Payout Dialog */}
      <Dialog open={payoutDialogOpen} onOpenChange={setPayoutDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Process Payout</DialogTitle>
            <DialogDescription>
              Mark {selectedIds.size} commission{selectedIds.size > 1 ? "s" : ""} as paid.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Payout Method</Label>
              <Select value={payoutMethod} onValueChange={setPayoutMethod}>
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
              <Label>Reference ID (optional)</Label>
              <Input
                value={payoutReference}
                onChange={(e) => setPayoutReference(e.target.value)}
                placeholder="e.g., PayPal transaction ID"
              />
            </div>
            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Textarea
                value={payoutNotes}
                onChange={(e) => setPayoutNotes(e.target.value)}
                placeholder="Internal notes about this payout..."
                rows={2}
              />
            </div>
            <Button
              className="w-full"
              onClick={() => payoutMutation.mutate()}
              disabled={payoutMutation.isPending}
            >
              {payoutMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <CheckCircle2 className="h-4 w-4 mr-2" />
              )}
              Confirm Payout
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
