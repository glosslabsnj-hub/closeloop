import { useState } from "react";
import { format, formatDistanceToNow } from "date-fns";
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
import { Phone, Mail, Calendar, Clock, FileText, User, Link2, Car, ClipboardCheck } from "lucide-react";
import { type Customer, useCustomers } from "@/hooks/useCustomers";
import { useCustomerActivity } from "@/hooks/useCustomerActivity";
import { SharePortalLinkDialog } from "@/components/customers/SharePortalLinkDialog";
import { VehiclesTab } from "@/components/customers/VehiclesTab";
import { CustomerJobsTab } from "@/components/customers/CustomerJobsTab";
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

  const [notes, setNotes] = useState(customer?.notes || "");
  const [notesDirty, setNotesDirty] = useState(false);
  const [portalDialogOpen, setPortalDialogOpen] = useState(false);

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
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            Customer since {format(new Date(customer.created_at), "MMM d, yyyy")}
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
              Book
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

        {/* Tabs — 5 tabs: Vehicles, Jobs, Calls, Bookings, Notes */}
        <Tabs defaultValue="vehicles" className="mt-6">
          <TabsList className="w-full flex-wrap h-auto gap-1">
            <TabsTrigger value="vehicles" className="flex-1 min-w-0">
              <Car className="h-3.5 w-3.5 mr-1" />
              <span className="hidden sm:inline">Vehicles</span>
            </TabsTrigger>
            <TabsTrigger value="jobs" className="flex-1 min-w-0">
              <ClipboardCheck className="h-3.5 w-3.5 mr-1" />
              <span className="hidden sm:inline">Jobs</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="flex-1 min-w-0">
              <Phone className="h-3.5 w-3.5 mr-1" />
              <span className="hidden sm:inline">Calls</span>
            </TabsTrigger>
            <TabsTrigger value="bookings" className="flex-1 min-w-0">
              <Calendar className="h-3.5 w-3.5 mr-1" />
              <span className="hidden sm:inline">Bookings</span>
            </TabsTrigger>
            <TabsTrigger value="notes" className="flex-1 min-w-0">
              <FileText className="h-3.5 w-3.5 mr-1" />
              <span className="hidden sm:inline">Notes</span>
            </TabsTrigger>
          </TabsList>

          {/* Vehicles Tab */}
          <TabsContent value="vehicles" className="mt-4">
            <VehiclesTab customerId={customer.id} />
          </TabsContent>

          {/* Jobs Tab */}
          <TabsContent value="jobs" className="mt-4">
            <CustomerJobsTab customerId={customer.id} />
          </TabsContent>

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

          {/* Bookings Tab */}
          <TabsContent value="bookings" className="mt-4">
            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : bookings.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No bookings yet
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
              placeholder="Add notes about this customer..."
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
