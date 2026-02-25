import { useState } from "react";
import { useAdminSetupRequests } from "@/hooks/useSetupRequests";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Headset,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  Eye,
  MessageSquare,
} from "lucide-react";
import { format } from "date-fns";

export default function AdminSetupRequestsPage() {
  const { requests, isLoading, updateRequest } = useAdminSetupRequests();
  const [selectedRequest, setSelectedRequest] = useState<string | null>(null);
  const [adminNotes, setAdminNotes] = useState("");

  const _getStatusBadge = (status: string) => {
    switch (status) {
      case "new":
        return <Badge variant="default">New</Badge>;
      case "in_progress":
        return <Badge variant="warning">In Progress</Badge>;
      case "completed":
        return <Badge variant="success">Completed</Badge>;
      case "cancelled":
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="muted">{status}</Badge>;
    }
  };

  const handleStatusChange = async (id: string, status: string) => {
    await updateRequest.mutateAsync({
      id,
      updates: {
        status: status as any,
        ...(status === "completed" ? { completed_at: new Date().toISOString() } : {}),
      },
    });
  };

  const handleSaveNotes = async () => {
    if (!selectedRequest) return;
    await updateRequest.mutateAsync({
      id: selectedRequest,
      updates: { admin_notes: adminNotes },
    });
    setSelectedRequest(null);
    setAdminNotes("");
  };

  const selectedRequestData = requests.find((r) => r.id === selectedRequest);

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="page-header">
        <h1 className="page-title flex items-center gap-2">
          <Headset className="h-6 w-6 text-primary" />
          Setup Requests
        </h1>
        <p className="page-subtitle">
          Manage "Done For You" integration setup requests from tenants
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Clock className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {requests.filter((r) => r.status === "new").length}
                </p>
                <p className="text-sm text-muted-foreground">New</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <Loader2 className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {requests.filter((r) => r.status === "in_progress").length}
                </p>
                <p className="text-sm text-muted-foreground">In Progress</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {requests.filter((r) => r.status === "completed").length}
                </p>
                <p className="text-sm text-muted-foreground">Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted">
                <XCircle className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {requests.filter((r) => r.status === "cancelled").length}
                </p>
                <p className="text-sm text-muted-foreground">Cancelled</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Requests Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Requests</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : requests.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No setup requests yet
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tenant</TableHead>
                    <TableHead>Target System</TableHead>
                    <TableHead>Sync Types</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">
                            {request.tenant?.name || "Unknown"}
                          </p>
                          <p className="text-xs text-muted-foreground capitalize">
                            {request.tenant?.business_mode || "general"}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {request.target_system === "other"
                          ? request.target_system_other
                          : request.target_system}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {request.sync_type.map((type) => (
                            <Badge key={type} variant="secondary" className="text-xs">
                              {type.replace("_", " ")}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {request.contact_email && (
                            <p>{request.contact_email}</p>
                          )}
                          {request.contact_phone && (
                            <p className="text-muted-foreground">
                              {request.contact_phone}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={request.status}
                          onValueChange={(value) =>
                            handleStatusChange(request.id, value)
                          }
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="new">New</SelectItem>
                            <SelectItem value="in_progress">In Progress</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(request.created_at), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setSelectedRequest(request.id);
                              setAdminNotes(request.admin_notes || "");
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog
        open={!!selectedRequest}
        onOpenChange={(open) => !open && setSelectedRequest(null)}
      >
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Request Details</DialogTitle>
            <DialogDescription>
              Review and manage this setup request
            </DialogDescription>
          </DialogHeader>

          {selectedRequestData && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Tenant</p>
                  <p>{selectedRequestData.tenant?.name || "Unknown"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Business Mode</p>
                  <p className="capitalize">{selectedRequestData.tenant?.business_mode || "general"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Target System</p>
                  <p>
                    {selectedRequestData.target_system === "other"
                      ? selectedRequestData.target_system_other
                      : selectedRequestData.target_system}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Sync Types</p>
                  <p>{selectedRequestData.sync_type.join(", ")}</p>
                </div>
              </div>

              {selectedRequestData.notes && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Customer Notes</p>
                  <p className="text-sm bg-muted p-2 rounded mt-1">
                    {selectedRequestData.notes}
                  </p>
                </div>
              )}

              {selectedRequestData.credentials_notes && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Credentials Info</p>
                  <p className="text-sm bg-muted p-2 rounded mt-1">
                    {selectedRequestData.credentials_notes}
                  </p>
                </div>
              )}

              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">
                  Admin Notes
                </p>
                <Textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Add internal notes about this request..."
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedRequest(null)}>
              Close
            </Button>
            <Button onClick={handleSaveNotes} disabled={updateRequest.isPending}>
              {updateRequest.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <MessageSquare className="h-4 w-4 mr-2" />
              )}
              Save Notes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
