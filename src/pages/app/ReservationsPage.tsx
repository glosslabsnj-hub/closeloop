import { useState, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useModuleRequired } from "@/hooks/useModuleRequired";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { FilterBar } from "@/components/patterns/FilterBar";
import { ContentLoadingState } from "@/components/patterns/ContentLoadingState";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Clock,
  Users,
  Calendar,
  Phone,
  Plus,
  CheckCircle2,
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
  const { isAllowed, isLoading: moduleLoading } = useModuleRequired(["reservations"]);

  const { tenant } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

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

  const filteredReservations = useMemo(() => {
    return (reservations || []).filter(r =>
      statusFilter === "all" || r.status === statusFilter
    );
  }, [reservations, statusFilter]);

  if (moduleLoading || !isAllowed || isLoading) {
    return (
      <PageContainer maxWidth="xl">
        <ContentLoadingState variant="table" count={6} columns={6} />
      </PageContainer>
    );
  }

  return (
    <PageContainer maxWidth="xl">
      <div className="space-y-6">
        <PageHeader
          icon={Clock}
          title="Reservations"
          description="Manage table reservations"
          action={
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="h-4 w-4" />
              New Reservation
            </Button>
          }
        />

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

        {/* Filters */}
        <FilterBar
          filters={[
            {
              key: "status",
              label: "Status",
              options: [
                { value: "all", label: "All" },
                { value: "pending", label: "Pending" },
                { value: "confirmed", label: "Confirmed" },
                { value: "seated", label: "Seated" },
                { value: "completed", label: "Completed" },
                { value: "cancelled", label: "Cancelled" },
                { value: "no_show", label: "No Show" },
              ],
              value: statusFilter,
              onChange: setStatusFilter,
            },
          ]}
        />

        {/* Reservations Table */}
        {filteredReservations.length === 0 ? (
          <EmptyState
            icon={Clock}
            title="No reservations found"
            description={
              statusFilter !== "all"
                ? "Try adjusting your filters to see more results."
                : "When customers make reservations through your AI or you create them manually, they'll appear here."
            }
            action={
              statusFilter === "all"
                ? { label: "New Reservation", onClick: () => setIsDialogOpen(true) }
                : undefined
            }
          />
        ) : (
          <Card>
            <CardContent className="p-0">
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
            </CardContent>
          </Card>
        )}
      </div>
    </PageContainer>
  );
}
