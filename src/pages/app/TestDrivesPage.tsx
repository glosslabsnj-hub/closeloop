import { useState, useMemo } from "react";
import { useModuleRequired } from "@/hooks/useModuleRequired";
import { Card, CardContent } from "@/components/ui/card";
import ErrorBoundary from "@/components/ErrorBoundary";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
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
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { Car, Search, Loader2, Calendar, User, Clock, Plus } from "lucide-react";
import { useTestDrives } from "@/hooks/useTestDrives";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  confirmed: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  completed: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  cancelled: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  no_show: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400",
};

export default function TestDrivesPage() {
  const { isAllowed, isLoading: moduleLoading } = useModuleRequired(["test_drives"]);
  const { testDrives, isLoading, stats, createTestDrive, updateTestDrive } = useTestDrives();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [newDrive, setNewDrive] = useState({
    customerName: "",
    vehicleMake: "",
    vehicleModel: "",
    vehicleYear: "",
    scheduledDate: "",
    scheduledTime: "",
  });

  const filteredDrives = useMemo(() => {
    return testDrives.filter((drive) => {
      if (statusFilter !== "all" && drive.status !== statusFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const customerName = drive.customer?.full_name?.toLowerCase() || "";
        const vehicle = `${drive.vehicle_year || ""} ${drive.vehicle_make || ""} ${drive.vehicle_model || ""}`.toLowerCase();
        return customerName.includes(q) || vehicle.includes(q);
      }
      return true;
    });
  }, [testDrives, statusFilter, searchQuery]);

  if (moduleLoading || !isAllowed || isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <ErrorBoundary context="loading test drives">
    <PageContainer maxWidth="xl">
      <div className="space-y-6">
        <PageHeader
          icon={Car}
          title="Test Drives"
          description={`${stats.today} today, ${stats.thisWeek} this week, ${stats.pending} pending`}
          action={
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Test Drive
            </Button>
          }
        />

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by customer or vehicle..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
              <SelectItem value="no_show">No Show</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {testDrives.length === 0 ? (
          <EmptyState
            icon={Car}
            title="No test drives yet"
            description="When a caller asks to schedule a test drive, your AI will book it and it will appear here. You can also schedule one manually using the button above."
          />
        ) : filteredDrives.length === 0 ? (
          <EmptyState
            icon={Search}
            title="No matching test drives"
            description="Try adjusting your filters."
          />
        ) : (
          <div className="grid gap-3">
            {filteredDrives.map((drive) => {
              const vehicleParts: string[] = [];
              if (drive.vehicle_year) vehicleParts.push(drive.vehicle_year);
              if (drive.vehicle_make) vehicleParts.push(drive.vehicle_make);
              if (drive.vehicle_model) vehicleParts.push(drive.vehicle_model);
              if (drive.vehicle_trim) vehicleParts.push(drive.vehicle_trim);
              const vehicleDesc = vehicleParts.join(" ") || "Vehicle TBD";

              return (
                <Card key={drive.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-1.5">
                        <div className="flex items-center gap-2">
                          <Car className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{vehicleDesc}</span>
                          {drive.vehicle_type && (
                            <Badge variant="outline" className="text-[10px]">
                              {drive.vehicle_type}
                            </Badge>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <User className="h-3.5 w-3.5" />
                            {drive.customer?.full_name || "Unknown"}
                          </span>
                          {(drive.scheduled_date || drive.scheduled_at) && (
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3.5 w-3.5" />
                              {drive.scheduled_date || new Date(drive.scheduled_at!).toLocaleDateString()}
                            </span>
                          )}
                          {drive.scheduled_time && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5" />
                              {drive.scheduled_time}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {drive.trade_in_interest && <Badge variant="outline" className="text-[10px]">Trade-in</Badge>}
                          {drive.financing_interest && <Badge variant="outline" className="text-[10px]">Financing</Badge>}
                          {drive.sales_rep_requested && <span>Rep: {drive.sales_rep_requested}</span>}
                        </div>
                      </div>

                      <Select
                        value={drive.status}
                        onValueChange={(newStatus) =>
                          updateTestDrive.mutate({ id: drive.id, status: newStatus })
                        }
                      >
                        <SelectTrigger className={cn("h-7 w-[120px] text-xs border-0", statusColors[drive.status] || statusColors.pending)}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="confirmed">Confirmed</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                          <SelectItem value="no_show">No Show</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* New Test Drive Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schedule New Test Drive</DialogTitle>
            <DialogDescription>
              Enter the customer and vehicle details for the test drive.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Customer Name</Label>
              <Input
                placeholder="John Smith"
                value={newDrive.customerName}
                onChange={(e) => setNewDrive((d) => ({ ...d, customerName: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label>Year</Label>
                <Input
                  placeholder="2024"
                  value={newDrive.vehicleYear}
                  onChange={(e) => setNewDrive((d) => ({ ...d, vehicleYear: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Make</Label>
                <Input
                  placeholder="Toyota"
                  value={newDrive.vehicleMake}
                  onChange={(e) => setNewDrive((d) => ({ ...d, vehicleMake: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Model</Label>
                <Input
                  placeholder="Camry"
                  value={newDrive.vehicleModel}
                  onChange={(e) => setNewDrive((d) => ({ ...d, vehicleModel: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={newDrive.scheduledDate}
                  onChange={(e) => setNewDrive((d) => ({ ...d, scheduledDate: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Time</Label>
                <Input
                  type="time"
                  value={newDrive.scheduledTime}
                  onChange={(e) => setNewDrive((d) => ({ ...d, scheduledTime: e.target.value }))}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!newDrive.customerName || !newDrive.scheduledDate}
              onClick={async () => {
                await createTestDrive.mutateAsync({
                  customer_id: null,
                  session_id: null,
                  vehicle_stock_number: null,
                  vehicle_year: newDrive.vehicleYear || null,
                  vehicle_make: newDrive.vehicleMake || null,
                  vehicle_model: newDrive.vehicleModel || null,
                  vehicle_trim: null,
                  vehicle_vin: null,
                  vehicle_color: null,
                  vehicle_type: null,
                  scheduled_at: null,
                  scheduled_date: newDrive.scheduledDate || null,
                  scheduled_time: newDrive.scheduledTime || null,
                  duration_minutes: 30,
                  sales_rep_requested: null,
                  trade_in_interest: false,
                  trade_in_vehicle_info: null,
                  financing_interest: false,
                  budget_range: null,
                  status: "pending",
                  notes: `Customer: ${newDrive.customerName}`,
                });
                setCreateOpen(false);
                setNewDrive({
                  customerName: "",
                  vehicleMake: "",
                  vehicleModel: "",
                  vehicleYear: "",
                  scheduledDate: "",
                  scheduledTime: "",
                });
              }}
            >
              Schedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
    </ErrorBoundary>
  );
}
