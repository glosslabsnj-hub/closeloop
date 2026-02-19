import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useModuleRequired } from "@/hooks/useModuleRequired";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { 
  Clock, 
  Users,
  Calendar,
  Phone,
  Mail,
  Plus,
  CheckCircle2,
  Loader2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

const statusColors: Record<string, string> = {
  pending: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-300",
  confirmed: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
  seated: "bg-green-500/10 text-green-700 dark:text-green-300",
  completed: "bg-muted text-muted-foreground",
  cancelled: "bg-destructive/10 text-destructive",
  no_show: "bg-destructive/10 text-destructive",
};

export default function ReservationsPage() {
  // P0-3: Route protection - redirect if reservations module not enabled
  const { isAllowed, isLoading: moduleLoading } = useModuleRequired(["reservations"]);
  
  const { tenant } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newRes, setNewRes] = useState({ customer_name: "", customer_phone: "", date: "", time: "", party_size: "2" });
  const [isCreating, setIsCreating] = useState(false);

  const { data: reservations, isLoading } = useQuery({
    queryKey: ["reservations", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return [];
      const { data, error } = await supabase
        .from("reservations")
        .select("*")
        .eq("tenant_id", tenant.id)
        .order("reservation_date", { ascending: true })
        .order("reservation_time", { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!tenant?.id,
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("reservations")
        .update({ status: status as any })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reservations"] });
      toast({ title: "Reservation updated" });
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "Error", description: error.message });
    },
  });

  const todayReservations = reservations?.filter(r => 
    r.reservation_date === format(new Date(), "yyyy-MM-dd")
  ) || [];

  const upcomingReservations = reservations?.filter(r => 
    r.reservation_date >= format(new Date(), "yyyy-MM-dd") &&
    r.status !== "completed" && r.status !== "cancelled" && r.status !== "no_show"
  ) || [];

  const filteredReservations = reservations?.filter(r =>
    statusFilter === "all" || r.status === statusFilter
  ) || [];

  const handleCreateReservation = async () => {
    if (!tenant?.id || !newRes.customer_name.trim() || !newRes.date || !newRes.time) return;
    setIsCreating(true);
    try {
      const { error } = await supabase.from("reservations").insert({
        tenant_id: tenant.id,
        customer_name: newRes.customer_name,
        customer_phone: newRes.customer_phone || null,
        reservation_date: newRes.date,
        reservation_time: newRes.time,
        party_size: parseInt(newRes.party_size) || 2,
        status: "pending" as any,
      });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["reservations"] });
      toast({ title: "Reservation created" });
      setIsDialogOpen(false);
      setNewRes({ customer_name: "", customer_phone: "", date: "", time: "", party_size: "2" });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
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
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Reservations</h1>
          <p className="text-muted-foreground">Manage table reservations</p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Reservation
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Today</span>
            </div>
            <p className="text-2xl font-bold mt-1">{todayReservations.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Total Guests Today</span>
            </div>
            <p className="text-2xl font-bold mt-1">
              {todayReservations.reduce((sum, r) => sum + (r.party_size || 0), 0)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Upcoming</span>
            </div>
            <p className="text-2xl font-bold mt-1">{upcomingReservations.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Confirmed</span>
            </div>
            <p className="text-2xl font-bold mt-1">
              {reservations?.filter(r => r.status === "confirmed").length || 0}
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
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="confirmed">Confirmed</SelectItem>
            <SelectItem value="seated">Seated</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
            <SelectItem value="no_show">No Show</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Reservations Table */}
      <Card>
        <CardContent className="p-0">
          {filteredReservations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <Clock className="h-10 w-10 mx-auto text-muted-foreground/40 mb-4" />
              <h3 className="text-base font-semibold mb-1">No reservations found</h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                {statusFilter !== "all"
                  ? "Try adjusting your filters to see more results."
                  : "When customers make reservations through your AI or you create them manually, they'll appear here."}
              </p>
            </div>
          ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date & Time</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Party Size</TableHead>
                <TableHead>Table Pref</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
                {filteredReservations.map((reservation) => (
                  <TableRow key={reservation.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">
                          {format(new Date(reservation.reservation_date), "MMM d, yyyy")}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {reservation.reservation_time}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{reservation.customer_name}</p>
                        {reservation.customer_phone && (
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {reservation.customer_phone}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        {reservation.party_size}
                      </div>
                    </TableCell>
                    <TableCell>
                      {reservation.table_preference || "-"}
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColors[reservation.status] || ""}>
                        {reservation.status.replace(/_/g, " ")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={reservation.status}
                        onValueChange={(status) => 
                          updateStatusMutation.mutate({ id: reservation.id, status })
                        }
                      >
                        <SelectTrigger className="w-[130px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="confirmed">Confirmed</SelectItem>
                          <SelectItem value="seated">Seated</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                          <SelectItem value="no_show">No Show</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
          )}
        </CardContent>
      </Card>

      {/* New Reservation Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Reservation</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="res-name">Customer Name</Label>
              <Input
                id="res-name"
                placeholder="Customer name"
                value={newRes.customer_name}
                onChange={(e) => setNewRes(prev => ({ ...prev, customer_name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="res-phone">Phone (optional)</Label>
              <Input
                id="res-phone"
                placeholder="(555) 123-4567"
                value={newRes.customer_phone}
                onChange={(e) => setNewRes(prev => ({ ...prev, customer_phone: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="res-date">Date</Label>
                <Input
                  id="res-date"
                  type="date"
                  value={newRes.date}
                  onChange={(e) => setNewRes(prev => ({ ...prev, date: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="res-time">Time</Label>
                <Input
                  id="res-time"
                  type="time"
                  value={newRes.time}
                  onChange={(e) => setNewRes(prev => ({ ...prev, time: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="res-party">Party Size</Label>
              <Input
                id="res-party"
                type="number"
                min="1"
                max="50"
                value={newRes.party_size}
                onChange={(e) => setNewRes(prev => ({ ...prev, party_size: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateReservation} disabled={isCreating || !newRes.customer_name.trim() || !newRes.date || !newRes.time}>
              {isCreating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Create Reservation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
