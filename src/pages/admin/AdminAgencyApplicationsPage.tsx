import { useState } from "react";
import {
  useAgencyApplications,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, Users } from "lucide-react";
import { format } from "date-fns";

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  new: "default",
  reviewing: "secondary",
  approved: "outline",
  rejected: "destructive",
};

export default function AdminAgencyApplicationsPage() {
  const { data: applications, isLoading } = useAgencyApplications();
  const updateStatus = useUpdateApplicationStatus();
  const [selected, setSelected] = useState<AgencyApplication | null>(null);
  const [editStatus, setEditStatus] = useState<AgencyApplication["status"]>("new");
  const [editNotes, setEditNotes] = useState("");

  const openDetail = (app: AgencyApplication) => {
    setSelected(app);
    setEditStatus(app.status);
    setEditNotes(app.admin_notes ?? "");
  };

  const handleSave = () => {
    if (!selected) return;
    updateStatus.mutate(
      { id: selected.id, status: editStatus, admin_notes: editNotes },
      { onSuccess: () => setSelected(null) }
    );
  };

  const counts = {
    total: applications?.length ?? 0,
    new: applications?.filter((a) => a.status === "new").length ?? 0,
    reviewing: applications?.filter((a) => a.status === "reviewing").length ?? 0,
    approved: applications?.filter((a) => a.status === "approved").length ?? 0,
  };

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
          { label: "Total", value: counts.total, color: "bg-blue-500/10 text-blue-500" },
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
          <CardTitle>All Applications</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : !applications?.length ? (
            <p className="text-center text-muted-foreground py-10">No applications yet.</p>
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
                {applications.map((app) => (
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
                  <Button onClick={handleSave} disabled={updateStatus.isPending}>
                    {updateStatus.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
