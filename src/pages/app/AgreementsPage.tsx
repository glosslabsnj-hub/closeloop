import { useState } from "react";
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
  FileCheck,
  Plus,
  Search,
  MoreHorizontal,
  Trash2,
  Loader2,
  DollarSign,
  Calendar,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  RefreshCw,
  Edit,
  Ban,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, formatDistanceToNow } from "date-fns";
import { useServiceAgreements, ServiceAgreementWithCustomer } from "@/hooks/useServiceAgreements";
import { AgreementBuilder } from "@/components/agreements/AgreementBuilder";

const statusConfig: Record<string, { label: string; color: string; icon: typeof CheckCircle2 }> = {
  active: { label: "Active", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400", icon: CheckCircle2 },
  pending: { label: "Pending", color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400", icon: Clock },
  pending_renewal: { label: "Renewal Due", color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400", icon: RefreshCw },
  expired: { label: "Expired", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400", icon: AlertCircle },
  cancelled: { label: "Cancelled", color: "bg-muted text-muted-foreground", icon: XCircle },
};

const frequencyLabels: Record<string, string> = {
  monthly: "/mo",
  quarterly: "/qtr",
  annually: "/yr",
};

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

function AgreementListItem({
  agreement,
  onEdit,
  onCancel,
  onDelete,
}: {
  agreement: ServiceAgreementWithCustomer;
  onEdit: () => void;
  onCancel: () => void;
  onDelete: () => void;
}) {
  const status = statusConfig[agreement.status] || statusConfig.active;
  const StatusIcon = status.icon;

  return (
    <div className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors">
      <div className="flex items-center gap-4 flex-1 min-w-0">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 flex-shrink-0">
          <FileCheck className="h-6 w-6 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="font-medium truncate">{agreement.plan_name}</p>
            <Badge className={cn("flex-shrink-0", status.color)}>
              <StatusIcon className="h-3 w-3 mr-1" />
              {status.label}
            </Badge>
            {agreement.priority_service && (
              <Badge variant="outline" className="flex-shrink-0">
                Priority
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground truncate">
            {agreement.customer?.full_name || "No customer"} • {agreement.agreement_number}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Started {format(new Date(agreement.start_date), "MMM d, yyyy")}
            {agreement.renewal_date && (
              <> • Renews {formatDistanceToNow(new Date(agreement.renewal_date), { addSuffix: true })}</>
            )}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="text-right">
          <p className="font-bold text-lg">
            {formatCurrency(agreement.price_cents)}
            <span className="text-sm font-normal text-muted-foreground">
              {frequencyLabels[agreement.billing_frequency] || "/mo"}
            </span>
          </p>
          <p className="text-xs text-muted-foreground">
            {agreement.visits_used}/{agreement.visits_per_year} visits used
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onEdit}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </DropdownMenuItem>
            {agreement.status === "active" && (
              <DropdownMenuItem onClick={onCancel}>
                <Ban className="h-4 w-4 mr-2" />
                Cancel Agreement
              </DropdownMenuItem>
            )}
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

export default function AgreementsPage() {
  const { agreements, isLoading, stats, cancelAgreement, deleteAgreement } = useServiceAgreements();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [editingAgreement, setEditingAgreement] = useState<ServiceAgreementWithCustomer | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [agreementToDelete, setAgreementToDelete] = useState<string | null>(null);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [agreementToCancel, setAgreementToCancel] = useState<string | null>(null);

  // Filter agreements
  const filteredAgreements = agreements.filter((agreement) => {
    const matchesSearch =
      !searchQuery ||
      agreement.agreement_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      agreement.plan_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      agreement.customer?.full_name?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = !statusFilter || agreement.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const handleCreateNew = () => {
    setEditingAgreement(null);
    setBuilderOpen(true);
  };

  const handleEdit = (agreement: ServiceAgreementWithCustomer) => {
    setEditingAgreement(agreement);
    setBuilderOpen(true);
  };

  const handleCancel = (agreementId: string) => {
    setAgreementToCancel(agreementId);
    setCancelDialogOpen(true);
  };

  const confirmCancel = async () => {
    if (agreementToCancel) {
      await cancelAgreement.mutateAsync(agreementToCancel);
      setCancelDialogOpen(false);
      setAgreementToCancel(null);
    }
  };

  const handleDelete = (agreementId: string) => {
    setAgreementToDelete(agreementId);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (agreementToDelete) {
      await deleteAgreement.mutateAsync(agreementToDelete);
      setDeleteDialogOpen(false);
      setAgreementToDelete(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      <PageContainer maxWidth="xl">
        <PageHeader
          icon={<FileCheck className="h-5 w-5" />}
          title="Service Agreements"
          description="Manage recurring maintenance plans and membership programs"
          action={
            <Button onClick={handleCreateNew}>
              <Plus className="h-4 w-4 mr-2" />
              New Agreement
            </Button>
          }
        />

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Agreements</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.active}</div>
              <p className="text-xs text-muted-foreground">
                {stats.total} total agreements
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Monthly Recurring</CardTitle>
              <DollarSign className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats.monthlyRecurringRevenue)}</div>
              <p className="text-xs text-muted-foreground">
                MRR from active agreements
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Upcoming Renewals</CardTitle>
              <Calendar className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.upcomingRenewals}</div>
              <p className="text-xs text-muted-foreground">
                Renewing in next 30 days
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Expired/Cancelled</CardTitle>
              <XCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.expired + stats.cancelled}</div>
              <p className="text-xs text-muted-foreground">
                {stats.pendingRenewal} pending renewal
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4 mb-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search agreements..."
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
              variant={statusFilter === "active" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setStatusFilter("active")}
            >
              Active
            </Button>
            <Button
              variant={statusFilter === "pending_renewal" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setStatusFilter("pending_renewal")}
            >
              Renewal Due
            </Button>
            <Button
              variant={statusFilter === "expired" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setStatusFilter("expired")}
            >
              Expired
            </Button>
          </div>
        </div>

        {/* Agreements List */}
        <Card>
          <CardContent className="p-0">
            {filteredAgreements.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <FileCheck className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-medium">No service agreements yet</h3>
                <p className="text-muted-foreground mb-4">
                  Create maintenance plans to generate recurring revenue and keep customers engaged.
                </p>
                <Button onClick={handleCreateNew}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Agreement
                </Button>
              </div>
            ) : (
              <div className="divide-y">
                {filteredAgreements.map((agreement) => (
                  <AgreementListItem
                    key={agreement.id}
                    agreement={agreement}
                    onEdit={() => handleEdit(agreement)}
                    onCancel={() => handleCancel(agreement.id)}
                    onDelete={() => handleDelete(agreement.id)}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </PageContainer>

      {/* Agreement Builder Dialog */}
      <Dialog open={builderOpen} onOpenChange={setBuilderOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingAgreement ? "Edit Agreement" : "Create Service Agreement"}
            </DialogTitle>
            <DialogDescription>
              Set up a recurring maintenance plan or membership for your customer.
            </DialogDescription>
          </DialogHeader>
          <AgreementBuilder
            agreement={editingAgreement}
            onSave={() => setBuilderOpen(false)}
            onCancel={() => setBuilderOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Cancel Confirmation Dialog */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Agreement</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel this service agreement? The customer will no longer receive scheduled services.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelDialogOpen(false)}>
              Keep Agreement
            </Button>
            <Button variant="destructive" onClick={confirmCancel}>
              Cancel Agreement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Agreement</DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently delete this agreement? This action cannot be undone.
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
    </>
  );
}
