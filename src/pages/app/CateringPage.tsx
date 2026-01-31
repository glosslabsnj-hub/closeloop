import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useModuleRequired } from "@/hooks/useModuleRequired";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "Error", description: error.message });
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
          <h1 className="text-2xl font-bold">Catering Requests</h1>
          <p className="text-muted-foreground">Manage catering inquiries and events</p>
        </div>
        <Button>
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
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Event Date</TableHead>
                <TableHead>Customer</TableHead>
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
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No catering requests found
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
    </div>
  );
}
