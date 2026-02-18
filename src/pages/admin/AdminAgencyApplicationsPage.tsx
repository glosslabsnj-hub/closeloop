import { useState } from "react";
import {
  useAgencyApplications,
  useApproveApplication,
  useUpdateApplicationStatus,
  type AgencyApplication,
} from "@/hooks/useAgencyApplications";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, Users } from "lucide-react";
import { format } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  new: "default",
  reviewing: "secondary",
  approved: "outline",
  rejected: "destructive",
};

const STATUS_FILTERS = ["all", "new", "reviewing", "approved", "rejected"] as const;

export default function AdminAgencyApplicationsPage() {
  const { user } = useAuth();
  const { data: applications, isLoading } = useAgencyApplications();
  const approveApp = useApproveApplication();
  const updateStatus = useUpdateApplicationStatus();
  const [selected, setSelected] = useState<AgencyApplication | null>(null);
  const [editStatus, setEditStatus] = useState<AgencyApplication["status"]>("new");
  const [editNotes, setEditNotes] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [confirmAction, setConfirmAction] = useState<{ type: "approve" | "reject"; app: AgencyApplication } | null>(null);

  const openDetail = (app: AgencyApplication) => {
    setSelected(app);
    setEditStatus(app.status);
    setEditNotes(app.admin_notes ?? "");
  };

  const handleSave = () => {
    if (!selected) return;

    if (editStatus === "approved" && selected.status !== "approved") {
      setConfirmAction({ type: "approve", app: selected });
      return;
    }

    if (editStatus === "rejected" && selected.status !== "rejected") {
      setConfirmAction({ type: "reject", app: selected });
      return;
    }

    // For other status changes (new -> reviewing, etc.)
    updateStatus.mutate(
      { id: selected.id, status: editStatus, admin_notes: editNotes },
      { onSuccess: () => setSelected(null) }
    );
  };

  const executeApprove = () => {
    if (!confirmAction) return;
    approveApp.mutate(
      { application_id: confirmAction.app.id, admin_notes: editNotes },
      {
        onSuccess: () => {
          setConfirmAction(null);
          setSelected(null);
        },
      }
    );
  };

  const executeReject = () => {
    if (!confirmAction) return;
    updateStatus.mutate(
      { id: confirmAction.app.id, status: "rejected", admin_notes: editNotes },
      {
        onSuccess: () => {
          setConfirmAction(null);
          setSelected(null);
        },
      }
    );
  };

  const counts = {
    all: applications?.length ?? 0,
    new: applications?.filter((a) => a.status === "new").length ?? 0,
    reviewing: applications?.filter((a) => a.status === "reviewing").length ?? 0,
    approved: applications?.filter((a) => a.status === "approved").length ?? 0,
    rejected: applications?.filter((a) => a.status === "rejected").length ?? 0,
  };

  const filteredApps = statusFilter === "all"
    ? applications
    : applications?.filter((a) => a.status === statusFilter);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="page-header">
        <h1 className="page-title flex items-center gap-2">
          <FileText className="h-6 w-6" />
          Agency Applications
        </h1>
        <p className="page-subtitle">Review and manage partner applications.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total", value: counts.all, color: "bg-blue-500/10 text-blue-500" },
          { label: "New", value: counts.new, color: "bg-amber-500/10 text-amber-500" },
          { label: "Reviewing", value: counts.reviewing, color: "bg-purple-500/10 text-purple-500" },
          { label: "Approved", value: counts.approved, color: "bg-green-500/10 text-green-500" },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${stat.color}`}>
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Applications</CardTitle>
            <Tabs value={statusFilter} onValueChange={setStatusFilter}>
              <TabsList className="h-8">
                {STATUS_FILTERS.map((f) => (
                  <TabsTrigger key={f} value={f} className="text-xs px-3 h-6 capitalize">
                    {f === "all" ? "All" : f} ({counts[f as keyof typeof counts] ?? 0})
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : !filteredApps?.length ? (
            <p className="text-center text-muted-foreground py-10">No applications found.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Expected Clients</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredApps.map((app) => (
                  <TableRow key={app.id}>
                    <TableCell className="font-medium">{app.full_name}</TableCell>
                    <TableCell>{app.company_name}</TableCell>
                    <TableCell className="text-muted-foreground">{app.email}</TableCell>
                    <TableCell>{app.expected_clients}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant[app.status] ?? "default"}>
                        {app.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(app.created_at), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => openDetail(app)}>
                        Review
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Application: {selected?.company_name}</DialogTitle>
          </DialogHeader>

          {selected && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Full Name</p>
                  <p className="font-medium">{selected.full_name}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Email</p>
                  <p className="font-medium">{selected.email}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Phone</p>
                  <p className="font-medium">{selected.phone ?? "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Website</p>
                  <p className="font-medium">{selected.company_website ?? "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Expected Clients</p>
                  <p className="font-medium">{selected.expected_clients}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Current Clients</p>
                  <p className="font-medium">{selected.current_client_count ?? "—"}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-muted-foreground">Services Offered</p>
                  <p className="font-medium">
                    {selected.services_offered?.length
                      ? selected.services_offered.join(", ")
                      : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Referral Source</p>
                  <p className="font-medium">{selected.referral_source ?? "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Applied</p>
                  <p className="font-medium">
                    {format(new Date(selected.created_at), "MMM d, yyyy h:mm a")}
                  </p>
                </div>
                {selected.message && (
                  <div className="col-span-2">
                    <p className="text-muted-foreground">Message</p>
                    <p className="font-medium whitespace-pre-wrap">{selected.message}</p>
                  </div>
                )}
                <div>
                  <p className="text-muted-foreground">Auth Account</p>
                  <p className="font-medium">{selected.user_id ? "Linked" : "Not linked"}</p>
                </div>
              </div>

              <hr />

              {/* Status update */}
              <div className="space-y-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Status</label>
                  <Select
                    value={editStatus}
                    onValueChange={(v) => setEditStatus(v as AgencyApplication["status"])}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">New</SelectItem>
                      <SelectItem value="reviewing">Reviewing</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Admin Notes</label>
                  <Textarea
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    rows={3}
                    placeholder="Internal notes..."
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={() => setSelected(null)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={updateStatus.isPending || approveApp.isPending}
                  >
                    {updateStatus.isPending || approveApp.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <AlertDialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction?.type === "approve" ? "Approve Application?" : "Reject Application?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.type === "approve"
                ? `This will create an agency account for "${confirmAction.app.company_name}" and grant them full dashboard access.`
                : `This will reject the application from "${confirmAction?.app.company_name}". They will be notified.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmAction?.type === "approve" ? executeApprove : executeReject}
              className={confirmAction?.type === "reject" ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}
            >
              {confirmAction?.type === "approve" ? "Approve" : "Reject"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
