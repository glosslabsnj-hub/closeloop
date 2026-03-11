import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import ErrorBoundary from "@/components/ErrorBoundary";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import {
  FileText,
  Plus,
  Search,
  MoreHorizontal,
  Send,
  Eye,
  Trash2,
  Copy,
  Download,
  Loader2,
  DollarSign,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, formatDistanceToNow } from "date-fns";
import { useEstimates, EstimateWithCustomer } from "@/hooks/useEstimates";
import { EstimateBuilder } from "@/components/estimates/EstimateBuilder";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useModuleRequired } from "@/hooks/useModuleRequired";
import { ModuleUnavailablePage } from "@/components/shared/ModuleUnavailablePage";
import { Label } from "@/components/ui/label";

const statusConfig: Record<string, { label: string; color: string; icon: typeof CheckCircle2 }> = {
  draft: { label: "Draft", color: "bg-muted text-muted-foreground", icon: FileText },
  sent: { label: "Sent", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400", icon: Send },
  viewed: { label: "Viewed", color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400", icon: Eye },
  accepted: { label: "Accepted", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400", icon: CheckCircle2 },
  declined: { label: "Declined", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400", icon: XCircle },
  expired: { label: "Expired", color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400", icon: AlertCircle },
  converted: { label: "Converted", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400", icon: CheckCircle2 },
};

function formatCurrency(cents: number | null): string {
  if (cents === null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

function EstimateListItem({
  estimate,
  onEdit,
  onSend,
  onDuplicate,
  onDelete,
  onDownloadPdf,
}: {
  estimate: EstimateWithCustomer;
  onEdit: () => void;
  onSend: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onDownloadPdf: () => void;
}) {
  const status = statusConfig[estimate.status] || statusConfig.draft;
  const StatusIcon = status.icon;

  return (
    <div className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors">
      <div className="flex items-center gap-4 flex-1 min-w-0">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 flex-shrink-0">
          <FileText className="h-6 w-6 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="font-medium truncate">
              {estimate.title || estimate.estimate_number}
            </p>
            <Badge className={cn("flex-shrink-0", status.color)}>
              <StatusIcon className="h-3 w-3 mr-1" />
              {status.label}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground truncate">
            {estimate.customer?.full_name || "No customer"} •{" "}
            {estimate.estimate_number}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Created {formatDistanceToNow(new Date(estimate.created_at), { addSuffix: true })}
            {estimate.valid_until && (
              <> • Valid until {format(new Date(estimate.valid_until), "MMM d, yyyy")}</>
            )}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="text-right">
          <p className="font-bold text-lg">{formatCurrency(estimate.total_cents)}</p>
          {estimate.line_items && (
            <p className="text-xs text-muted-foreground">
              {estimate.line_items.length} item{estimate.line_items.length !== 1 ? "s" : ""}
            </p>
          )}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onEdit}>
              <FileText className="h-4 w-4 mr-2" />
              Edit
            </DropdownMenuItem>
            {estimate.status === "draft" && (
              <DropdownMenuItem onClick={onSend}>
                <Send className="h-4 w-4 mr-2" />
                Send to Customer
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={onDuplicate}>
              <Copy className="h-4 w-4 mr-2" />
              Duplicate
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onDownloadPdf}>
              <Download className="h-4 w-4 mr-2" />
              Download PDF
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onDelete} className="text-destructive">
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

export default function EstimatesPage() {
  const { isAllowed, isLoading: moduleLoading } = useModuleRequired(["estimates", "phone_quotes"]);
  const { estimates, isLoading, stats, createEstimate, sendEstimate, deleteEstimate } = useEstimates();
  const { toast } = useToast();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [editingEstimate, setEditingEstimate] = useState<EstimateWithCustomer | null>(null);
  const [prefillCustomerId, setPrefillCustomerId] = useState<string | undefined>(undefined);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [estimateToDelete, setEstimateToDelete] = useState<string | null>(null);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [emailDialogEstimate, setEmailDialogEstimate] = useState<EstimateWithCustomer | null>(null);
  const [emailInput, setEmailInput] = useState("");
  const [emailSending, setEmailSending] = useState(false);

  // Auto-open builder when navigated from Leads with "Send Quote"
  useEffect(() => {
    const state = location.state as { openBuilder?: boolean; customerId?: string } | null;
    if (state?.openBuilder) {
      setEditingEstimate(null);
      setPrefillCustomerId(state.customerId);
      setBuilderOpen(true);
      // Clear the state so it doesn't re-trigger on re-renders
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  // Filter estimates
  const filteredEstimates = estimates.filter((estimate) => {
    const matchesSearch =
      !searchQuery ||
      estimate.estimate_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      estimate.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      estimate.customer?.full_name?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = !statusFilter || estimate.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const handleCreateNew = () => {
    setEditingEstimate(null);
    setPrefillCustomerId(undefined);
    setBuilderOpen(true);
  };

  const handleEdit = (estimate: EstimateWithCustomer) => {
    setEditingEstimate(estimate);
    setBuilderOpen(true);
  };

  const handleSend = async (estimate: EstimateWithCustomer) => {
    if (!estimate.customer?.email) {
      // Open email dialog to collect the recipient email
      setEmailDialogEstimate(estimate);
      setEmailInput("");
      setEmailDialogOpen(true);
      return;
    }
    await sendEstimate.mutateAsync({
      estimateId: estimate.id,
      email: estimate.customer.email,
    });
  };

  const handleEmailDialogSend = async () => {
    if (!emailDialogEstimate || !emailInput) return;
    setEmailSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("estimate-send-email", {
        body: {
          estimate_id: emailDialogEstimate.id,
          email: emailInput,
        },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Failed to send");
      toast({ title: "Estimate sent", description: `Email sent to ${emailInput}` });
      setEmailDialogOpen(false);
      setEmailDialogEstimate(null);
      setEmailInput("");
    } catch (err) {
      toast({ title: "Error sending estimate", description: err instanceof Error ? err.message : "Unknown error", variant: "destructive" });
    } finally {
      setEmailSending(false);
    }
  };

  const handleDuplicate = async (estimate: EstimateWithCustomer) => {
    await createEstimate.mutateAsync({
      customer_id: estimate.customer_id || undefined,
      title: `${estimate.title || estimate.estimate_number} (Copy)`,
      line_items: estimate.line_items || [],
      tax_rate_percent: estimate.tax_rate_percent || undefined,
      valid_until: estimate.valid_until || undefined,
      internal_notes: estimate.internal_notes || undefined,
      customer_notes: estimate.customer_notes || undefined,
      terms_and_conditions: estimate.terms_and_conditions || undefined,
    });
  };

  const handleDelete = (estimateId: string) => {
    setEstimateToDelete(estimateId);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (estimateToDelete) {
      await deleteEstimate.mutateAsync(estimateToDelete);
      setDeleteDialogOpen(false);
      setEstimateToDelete(null);
    }
  };

  const handleDownloadPdf = async (estimate: EstimateWithCustomer) => {
    try {
      toast({ title: "Generating PDF..." });
      const { data, error } = await supabase.functions.invoke("estimate-generate-pdf", {
        body: { estimate_id: estimate.id },
      });
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
      } else if (data?.pdf_base64) {
        const link = document.createElement("a");
        link.href = `data:application/pdf;base64,${data.pdf_base64}`;
        link.download = `${estimate.estimate_number}.pdf`;
        link.click();
      } else {
        toast({ title: "PDF generated", description: "Check your downloads." });
      }
    } catch (err: any) {
      toast({ variant: "destructive", title: "PDF generation failed", description: "Please try again." });
    }
  };

  if (moduleLoading) {
    return (
      <div className="p-6 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
    );
  }
  if (!isAllowed) {
    return (
      <ModuleUnavailablePage
        title="Estimates Not Available"
        description="The Estimates Not Available page requires Estimates to be enabled for your account."
        moduleName="Estimates"
      />
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <ErrorBoundary context="loading your estimates">
      <PageContainer maxWidth="xl">
        <PageHeader
          icon={<FileText className="h-5 w-5" />}
          title="Estimates & Proposals"
          description="Create professional quotes with Good-Better-Best pricing options"
          action={
            <Button onClick={handleCreateNew}>
              <Plus className="h-4 w-4 mr-2" />
              New Estimate
            </Button>
          }
        />

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Estimates</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">
                {stats.draft} drafts, {stats.sent} sent
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Awaiting Response</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.sent + stats.viewed}</div>
              <p className="text-xs text-muted-foreground">
                {stats.viewed} viewed by customer
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Accepted</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.accepted}</div>
              <p className="text-xs text-muted-foreground">
                {stats.declined} declined
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Value Won</CardTitle>
              <DollarSign className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats.totalValue)}</div>
              <p className="text-xs text-muted-foreground">From accepted estimates</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4 mb-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search estimates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={statusFilter === null ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setStatusFilter(null)}
            >
              All
            </Button>
            <Button
              variant={statusFilter === "draft" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setStatusFilter("draft")}
            >
              Drafts
            </Button>
            <Button
              variant={statusFilter === "sent" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setStatusFilter("sent")}
            >
              Sent
            </Button>
            <Button
              variant={statusFilter === "accepted" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setStatusFilter("accepted")}
            >
              Accepted
            </Button>
          </div>
        </div>

        {/* Estimates List */}
        <Card>
          <CardContent className="p-0">
            {filteredEstimates.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
                {searchQuery || statusFilter ? (
                  <>
                    <h3 className="text-lg font-medium">No estimates match</h3>
                    <p className="text-muted-foreground mb-4">
                      Try clearing your search or filter to see all estimates.
                    </p>
                    <Button variant="outline" onClick={() => { setSearchQuery(""); setStatusFilter(null); }}>
                      Clear filters
                    </Button>
                  </>
                ) : (
                  <>
                    <h3 className="text-lg font-medium">No estimates yet</h3>
                    <p className="text-muted-foreground mb-4">
                      Create your first estimate to start sending professional quotes to customers.
                    </p>
                    <Button onClick={handleCreateNew}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Estimate
                    </Button>
                  </>
                )}
              </div>
            ) : (
              <div className="divide-y">
                {filteredEstimates.map((estimate) => (
                  <EstimateListItem
                    key={estimate.id}
                    estimate={estimate}
                    onEdit={() => handleEdit(estimate)}
                    onSend={() => handleSend(estimate)}
                    onDuplicate={() => handleDuplicate(estimate)}
                    onDelete={() => handleDelete(estimate.id)}
                    onDownloadPdf={() => handleDownloadPdf(estimate)}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </PageContainer>

      {/* Estimate Builder Dialog */}
      <Dialog open={builderOpen} onOpenChange={setBuilderOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingEstimate ? "Edit Estimate" : "Create New Estimate"}
            </DialogTitle>
            <DialogDescription>
              Build a professional estimate with line items and optional Good-Better-Best pricing.
            </DialogDescription>
          </DialogHeader>
          <EstimateBuilder
            estimate={editingEstimate}
            initialCustomerId={prefillCustomerId}
            onSave={() => { setBuilderOpen(false); setPrefillCustomerId(undefined); }}
            onCancel={() => { setBuilderOpen(false); setPrefillCustomerId(undefined); }}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Estimate</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this estimate? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Email Share Dialog */}
      <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share Estimate via Email</DialogTitle>
            <DialogDescription>
              Enter the recipient's email address to send this estimate.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="share-email">Email Address</Label>
              <Input
                id="share-email"
                type="email"
                placeholder="customer@example.com"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && emailInput) handleEmailDialogSend();
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEmailDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEmailDialogSend} disabled={!emailInput || emailSending}>
              {emailSending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <Send className="h-4 w-4 mr-2" />
              Send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ErrorBoundary>
  );
}
