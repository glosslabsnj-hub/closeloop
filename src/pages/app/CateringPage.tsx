import { useState } from "react";
import ErrorBoundary from "@/components/ErrorBoundary";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useModuleRequired } from "@/hooks/useModuleRequired";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Cake,
  Users,
  Calendar,
  DollarSign,
  Phone,
  MapPin,
  Plus,
  Loader2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

const statusColors: Record<string, string> = {
  inquiry: "bg-muted text-muted-foreground",
  quoted: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
  confirmed: "bg-green-500/10 text-green-700 dark:text-green-300",
  completed: "bg-muted text-muted-foreground",
  cancelled: "bg-destructive/10 text-destructive",
};

export default function CateringPage() {
  // P0-3: Route protection - redirect if catering module not enabled
  const { isAllowed, isLoading: moduleLoading } = useModuleRequired(["catering"]);
  
  const { tenant } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newReq, setNewReq] = useState({ customer_name: "", customer_phone: "", event_type: "", event_date: "", guest_count: "", location: "", notes: "" });
  const [isCreating, setIsCreating] = useState(false);

  const { data: requests, isLoading } = useQuery({
    queryKey: ["catering-requests", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return [];
      const { data, error } = await supabase
        .from("catering_requests")
        .select("*")
        .eq("tenant_id", tenant.id)
        .order("event_date", { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!tenant?.id,
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("catering_requests")
        .update({ status })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["catering-requests"] });
      toast({ title: "Request updated" });
    },
    onError: () => {
      toast({ variant: "destructive", title: "Couldn't update request", description: "Please try again." });
    },
  });

  const filteredRequests = requests?.filter(r => 
    statusFilter === "all" || r.status === statusFilter
  ) || [];

  const upcomingEvents = requests?.filter(r => 
    r.event_date && new Date(r.event_date) >= new Date() && r.status === "confirmed"
  ) || [];

  const totalQuotedValue = requests
    ?.filter(r => r.status === "quoted" || r.status === "confirmed")
    .reduce((sum, r) => sum + (r.quote_amount_cents || 0), 0) || 0;

  const handleCreateRequest = async () => {
    if (!tenant?.id || !newReq.customer_name.trim()) return;
    setIsCreating(true);
    try {
      const { error } = await supabase.from("catering_requests").insert({
        tenant_id: tenant.id,
        customer_name: newReq.customer_name,
        customer_phone: newReq.customer_phone || null,
        event_type: newReq.event_type || null,
        event_date: newReq.event_date || null,
        guest_count: newReq.guest_count ? parseInt(newReq.guest_count) : null,
        location: newReq.location || null,
        notes: newReq.notes || null,
        status: "inquiry",
      });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["catering-requests"] });
      toast({ title: "Catering request created" });
      setIsDialogOpen(false);
      setNewReq({ customer_name: "", customer_phone: "", event_type: "", event_date: "", guest_count: "", location: "", notes: "" });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Couldn't create request", description: "Please try again." });
    } finally {
      setIsCreating(false);
    }
  };

  // Show loading while checking module access
  if (moduleLoading || !isAllowed) {
    return (
      <div className="p-6 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <ErrorBoundary context="loading catering requests">
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Catering Requests</h1>
          <p className="text-muted-foreground">Manage catering inquiries and events</p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Request
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Cake className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">New Inquiries</span>
            </div>
            <p className="text-2xl font-bold mt-1">
              {requests?.filter(r => r.status === "inquiry").length || 0}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Upcoming Events</span>
            </div>
            <p className="text-2xl font-bold mt-1">{upcomingEvents.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Total Guests</span>
            </div>
            <p className="text-2xl font-bold mt-1">
              {upcomingEvents.reduce((sum, r) => sum + (r.guest_count || 0), 0)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Pipeline Value</span>
            </div>
            <p className="text-2xl font-bold mt-1">
              ${(totalQuotedValue / 100).toLocaleString()}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-4">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Requests</SelectItem>
            <SelectItem value="inquiry">Inquiries</SelectItem>
            <SelectItem value="quoted">Quoted</SelectItem>
            <SelectItem value="confirmed">Confirmed</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Requests Table */}
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Event Date</TableHead>
                <TableHead>Guest</TableHead>
                <TableHead>Event Type</TableHead>
                <TableHead>Guests</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Quote</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRequests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-24">
                    <div className="flex flex-col items-center justify-center text-center">
                      <Cake className="h-8 w-8 text-muted-foreground/40 mb-2" />
                      <p className="text-sm font-medium">No catering requests yet</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {statusFilter !== "all"
                          ? "Try adjusting your filters."
                          : "When guests inquire about catering, their requests will appear here."}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredRequests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell>
                      {request.event_date 
                        ? format(new Date(request.event_date), "MMM d, yyyy")
                        : "TBD"
                      }
                      {request.event_time && (
                        <p className="text-sm text-muted-foreground">{request.event_time}</p>
                      )}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{request.customer_name}</p>
                        {request.customer_phone && (
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {request.customer_phone}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{request.event_type || "-"}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        {request.guest_count || "-"}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[150px] truncate">
                      {request.location || "-"}
                    </TableCell>
                    <TableCell>
                      {request.quote_amount_cents
                        ? `$${(request.quote_amount_cents / 100).toLocaleString()}`
                        : "-"
                      }
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColors[request.status] || ""}>
                        {request.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={request.status}
                        onValueChange={(status) => 
                          updateStatusMutation.mutate({ id: request.id, status })
                        }
                      >
                        <SelectTrigger className="w-[120px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="inquiry">Inquiry</SelectItem>
                          <SelectItem value="quoted">Quoted</SelectItem>
                          <SelectItem value="confirmed">Confirmed</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* New Catering Request Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Catering Request</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="cat-name">Guest Name</Label>
              <Input id="cat-name" placeholder="Guest name" value={newReq.customer_name} onChange={(e) => setNewReq(prev => ({ ...prev, customer_name: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cat-phone">Phone (optional)</Label>
              <Input id="cat-phone" placeholder="(555) 123-4567" value={newReq.customer_phone} onChange={(e) => setNewReq(prev => ({ ...prev, customer_phone: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cat-type">Event Type</Label>
                <Input id="cat-type" placeholder="Wedding, Corporate, etc." value={newReq.event_type} onChange={(e) => setNewReq(prev => ({ ...prev, event_type: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cat-date">Event Date</Label>
                <Input id="cat-date" type="date" value={newReq.event_date} onChange={(e) => setNewReq(prev => ({ ...prev, event_date: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cat-guests">Guest Count</Label>
                <Input id="cat-guests" type="number" min="1" placeholder="50" value={newReq.guest_count} onChange={(e) => setNewReq(prev => ({ ...prev, guest_count: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cat-location">Location</Label>
                <Input id="cat-location" placeholder="Venue or address" value={newReq.location} onChange={(e) => setNewReq(prev => ({ ...prev, location: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cat-notes">Notes</Label>
              <Textarea id="cat-notes" placeholder="Special requirements, dietary restrictions..." rows={3} value={newReq.notes} onChange={(e) => setNewReq(prev => ({ ...prev, notes: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateRequest} disabled={isCreating || !newReq.customer_name.trim()}>
              {isCreating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Create Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </ErrorBoundary>
  );
}
