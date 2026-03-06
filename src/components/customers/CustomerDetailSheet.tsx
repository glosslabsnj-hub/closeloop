import { useState, useEffect } from "react";
import { format } from "date-fns";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Phone, Mail, Calendar, Clock, FileText, User, Link2, Car, ClipboardCheck, MapPin } from "lucide-react";
import { type Customer, useCustomers } from "@/hooks/useCustomers";
import { useCustomerActivity } from "@/hooks/useCustomerActivity";
import { SharePortalLinkDialog } from "@/components/customers/SharePortalLinkDialog";
import { VehiclesTab } from "@/components/customers/VehiclesTab";
import { CustomerJobsTab } from "@/components/customers/CustomerJobsTab";
import { useIndustryContext } from "@/hooks/useIndustryContext";
import { useCapabilities } from "@/hooks/useCapabilities";
import { toast } from "sonner";

interface CustomerDetailSheetProps {
  customer: Customer | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBookAppointment?: (customer: Customer) => void;
}

const outcomeColors: Record<string, string> = {
  booked: "bg-emerald-500/10 text-emerald-700",
  followup: "bg-amber-500/10 text-amber-700",
  lost: "bg-red-500/10 text-red-700",
  escalated: "bg-purple-500/10 text-purple-700",
};

const bookingStatusColors: Record<string, string> = {
  confirmed: "bg-emerald-500/10 text-emerald-700",
  completed: "bg-blue-500/10 text-blue-700",
  canceled: "bg-red-500/10 text-red-700",
  pending_deposit: "bg-amber-500/10 text-amber-700",
  no_show: "bg-red-500/10 text-red-700",
};

/* ─── Industry-aware helpers ─── */

function getCustomerLabel(mode: string): string {
  switch (mode) {
    case "medical": return "Patient";
    case "food": return "Guest";
    case "sales": return "Prospect";
    default: return "Customer";
  }
}

function getSinceLabel(mode: string): string {
  return `${getCustomerLabel(mode)} since`;
}

function getAddressLabel(mode: string, category: string | null): string {
  if (mode === "food") return "Delivery Address";
  if (mode === "medical") return "Patient Address";
  if (mode === "dispatch") return "Pickup Location";
  if (category === "home_services") return "Service Address";
  return "Address";
}

function getBookingsTabLabel(mode: string, appointmentLabel?: string): string {
  // Use industry-specific label when available (e.g. "Jobs" for plumber)
  if (appointmentLabel && appointmentLabel !== "appointment" && appointmentLabel !== "booking") {
    const cap = appointmentLabel.charAt(0).toUpperCase() + appointmentLabel.slice(1);
    return cap + "s";
  }
  switch (mode) {
    case "service": return "Bookings";
    case "medical": return "Visits";
    case "sales": return "Appointments";
    case "food": return "Reservations";
    case "dispatch": return "Dispatches";
    default: return "Bookings";
  }
}

function getHistoryTabLabel(mode: string, category: string | null): string {
  if (mode === "medical" || category === "beauty_wellness") return "Visit History";
  if (mode === "food") return "Order History";
  return "Service History";
}

function getBookActionLabel(mode: string, appointmentLabel?: string): string {
  // Use industry-specific label when available (e.g. "Book Job" for plumber)
  if (appointmentLabel && appointmentLabel !== "appointment" && appointmentLabel !== "booking") {
    const cap = appointmentLabel.charAt(0).toUpperCase() + appointmentLabel.slice(1);
    if (appointmentLabel === "order" || appointmentLabel === "reservation") return `Place ${cap}`;
    return `Book ${cap}`;
  }
  switch (mode) {
    case "medical": return "Schedule Visit";
    case "food": return "Place Order";
    case "sales": return "Schedule Meeting";
    case "dispatch": return "Create Job";
    default: return "Book Appointment";
  }
}

function showVehiclesTab(mode: string, category: string | null): boolean {
  return category === "auto_services" || mode === "dispatch" || mode === "sales";
}

export function CustomerDetailSheet({
  customer,
  open,
  onOpenChange,
  onBookAppointment,
}: CustomerDetailSheetProps) {
  const { updateCustomer } = useCustomers();
  const { callHistory, bookings, isLoading } = useCustomerActivity(
    customer?.id ?? null,
    customer?.phone_e164 ?? null,
  );
  const { mode, category, terminology } = useIndustryContext();
  const appointmentLabel = terminology.appointmentLabel;
  const caps = useCapabilities();

  const [notes, setNotes] = useState(customer?.notes || "");
  const [notesDirty, setNotesDirty] = useState(false);
  const [portalDialogOpen, setPortalDialogOpen] = useState(false);

  // Sync notes state when a different customer is opened
  useEffect(() => {
    setNotes(customer?.notes || "");
    setNotesDirty(false);
  }, [customer?.id]);

  const handleNotesChange = (value: string) => {
    setNotes(value);
    setNotesDirty(true);
  };

  const handleSaveNotes = async () => {
    if (!customer) return;
    try {
      await updateCustomer.mutateAsync({ id: customer.id, notes });
      setNotesDirty(false);
      toast.success("Notes saved");
    } catch {
      toast.error("Failed to save notes");
    }
  };

  if (!customer) return null;

  const hasVehicles = showVehiclesTab(mode, category);
  const hasJobs = caps.hasJobTracking;
  const customerLabel = getCustomerLabel(mode);
  const defaultTab = hasVehicles ? "vehicles" : "history";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-base">{customer.full_name}</p>
              <p className="text-sm font-normal text-muted-foreground">
                {customer.phone_e164}
              </p>
            </div>
          </SheetTitle>
        </SheetHeader>

        {/* Contact info */}
        <div className="mt-4 space-y-2">
          {customer.email && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Mail className="h-4 w-4" />
              {customer.email}
            </div>
          )}
          {customer.service_address && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span className="text-xs font-medium text-muted-foreground/70 mr-1">
                {getAddressLabel(mode, category)}:
              </span>
              {customer.service_address}
            </div>
          )}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            {getSinceLabel(mode)} {format(new Date(customer.created_at), "MMM d, yyyy")}
          </div>
          {customer.source && (
            <Badge variant="outline" className="text-xs">
              {customer.source}
            </Badge>
          )}
          {customer.tags && customer.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {customer.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 mt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(`tel:${customer.phone_e164}`, "_self")}
          >
            <Phone className="h-4 w-4 mr-1" />
            Call
          </Button>
          {onBookAppointment && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onBookAppointment(customer)}
            >
              <Calendar className="h-4 w-4 mr-1" />
              {getBookActionLabel(mode, appointmentLabel)}
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPortalDialogOpen(true)}
          >
            <Link2 className="h-4 w-4 mr-1" />
            Share Portal
          </Button>
        </div>

        {/* Tabs — industry-aware */}
        <Tabs defaultValue={defaultTab} className="mt-6">
          <TabsList className="w-full flex-wrap h-auto gap-1">
            {hasVehicles && (
              <TabsTrigger value="vehicles" className="flex-1 min-w-0">
                <Car className="h-3.5 w-3.5 mr-1" />
                <span className="hidden sm:inline">Vehicles</span>
              </TabsTrigger>
            )}
            {hasJobs && (
              <TabsTrigger value="jobs" className="flex-1 min-w-0">
                <ClipboardCheck className="h-3.5 w-3.5 mr-1" />
                <span className="hidden sm:inline">Jobs</span>
              </TabsTrigger>
            )}
            <TabsTrigger value="history" className="flex-1 min-w-0">
              <Phone className="h-3.5 w-3.5 mr-1" />
              <span className="hidden sm:inline">Calls</span>
            </TabsTrigger>
            <TabsTrigger value="bookings" className="flex-1 min-w-0">
              <Calendar className="h-3.5 w-3.5 mr-1" />
              <span className="hidden sm:inline">{getBookingsTabLabel(mode, appointmentLabel)}</span>
            </TabsTrigger>
            <TabsTrigger value="notes" className="flex-1 min-w-0">
              <FileText className="h-3.5 w-3.5 mr-1" />
              <span className="hidden sm:inline">Notes</span>
            </TabsTrigger>
          </TabsList>

          {/* Vehicles Tab */}
          {hasVehicles && (
            <TabsContent value="vehicles" className="mt-4">
              <VehiclesTab customerId={customer.id} />
            </TabsContent>
          )}

          {/* Jobs Tab */}
          {hasJobs && (
            <TabsContent value="jobs" className="mt-4">
              <CustomerJobsTab customerId={customer.id} />
            </TabsContent>
          )}

          {/* Calls Tab */}
          <TabsContent value="history" className="mt-4">
            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : callHistory.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No call history yet
              </p>
            ) : (
              <div className="space-y-3">
                {callHistory.map((call) => (
                  <div key={call.id} className="border rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">
                        {format(new Date(call.started_at), "MMM d, h:mm a")}
                      </span>
                      {call.outcome && (
                        <Badge className={outcomeColors[call.outcome] || "bg-muted"}>
                          {call.outcome}
                        </Badge>
                      )}
                    </div>
                    {call.summary && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {call.summary}
                      </p>
                    )}
                    {call.ended_at && call.started_at && (
                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {Math.round(
                          (new Date(call.ended_at).getTime() - new Date(call.started_at).getTime()) / 60000
                        )}{" "}
                        min
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Bookings/Appointments/Reservations Tab */}
          <TabsContent value="bookings" className="mt-4">
            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : bookings.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No {getBookingsTabLabel(mode, appointmentLabel).toLowerCase()} yet
              </p>
            ) : (
              <div className="space-y-3">
                {bookings.map((booking) => (
                  <div key={booking.id} className="border rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">
                        {format(new Date(booking.start_at), "MMM d, h:mm a")}
                      </span>
                      <Badge className={bookingStatusColors[booking.status] || "bg-muted"}>
                        {booking.status}
                      </Badge>
                    </div>
                    {booking.service?.name && (
                      <p className="text-sm text-muted-foreground">
                        {booking.service.name}
                      </p>
                    )}
                    {booking.notes && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {booking.notes}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Notes Tab */}
          <TabsContent value="notes" className="mt-4">
            <Textarea
              value={notes}
              onChange={(e) => handleNotesChange(e.target.value)}
              placeholder={`Add notes about this ${customerLabel.toLowerCase()}...`}
              rows={6}
            />
            {notesDirty && (
              <Button
                size="sm"
                className="mt-2"
                onClick={handleSaveNotes}
                disabled={updateCustomer.isPending}
              >
                {updateCustomer.isPending ? "Saving..." : "Save Notes"}
              </Button>
            )}
          </TabsContent>
        </Tabs>
      </SheetContent>

      {/* Portal link sharing dialog */}
      <SharePortalLinkDialog
        open={portalDialogOpen}
        onOpenChange={setPortalDialogOpen}
        customerId={customer.id}
        customerName={customer.full_name}
      />
    </Sheet>
  );
}
