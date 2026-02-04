import { useState } from "react";
import { useModuleRequired } from "@/hooks/useModuleRequired";
import { useTerminology } from "@/hooks/useTerminology";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { Calendar as CalendarIcon, Plus, Clock, DollarSign, CheckCircle2, Loader2, List, MousePointerClick } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ScheduleCalendar } from "@/components/calendar/ScheduleCalendar";
import { CreateBookingDialog } from "@/components/calendar/CreateBookingDialog";
import { useBookings, BookingWithDetails } from "@/hooks/useBookings";
import type { ScheduleEvent } from "@/hooks/useScheduleData";

const statusColors: Record<string, string> = {
  pending_deposit: "bg-warning/10 text-warning",
  confirmed: "bg-success/10 text-success",
  completed: "bg-primary/10 text-primary",
  canceled: "bg-muted text-muted-foreground",
  no_show: "bg-destructive/10 text-destructive",
};

const statusLabels: Record<string, string> = {
  pending_deposit: "Awaiting Deposit",
  confirmed: "Confirmed",
  completed: "Completed",
  canceled: "Canceled",
  no_show: "No Show",
};

function BookingListItem({ booking }: { booking: BookingWithDetails }) {
  const startDate = new Date(booking.start_at);
  const endDate = new Date(booking.end_at);
  const durationMinutes = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60));
  const hours = Math.floor(durationMinutes / 60);
  const minutes = durationMinutes % 60;
  const durationLabel = hours > 0 ? `${hours}h${minutes > 0 ? ` ${minutes}m` : ""}` : `${minutes}m`;

  return (
    <div className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors">
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
          <Clock className="h-6 w-6 text-primary" />
        </div>
        <div>
          <p className="font-medium">{booking.lead?.full_name || "Unknown Customer"}</p>
          <p className="text-sm text-muted-foreground">
            {booking.service?.name || "Service"} • {format(startDate, "MMM d")} at {format(startDate, "h:mm a")}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <Badge className={cn(statusColors[booking.status])}>
              {statusLabels[booking.status]}
            </Badge>
            {booking.deposit_paid && booking.deposit_required && (
              <Badge variant="outline" className="text-success">
                <DollarSign className="h-3 w-3 mr-1" />
                Deposit paid
              </Badge>
            )}
          </div>
        </div>
      </div>
      <div className="text-right">
        <p className="font-bold">
          {booking.service?.price_amount ? `$${booking.service.price_amount}` : "—"}
        </p>
        <p className="text-xs text-muted-foreground">{durationLabel}</p>
      </div>
    </div>
  );
}

export default function BookingsPage() {
  const { isAllowed, isLoading: moduleLoading } = useModuleRequired(["booking"]);
  const { bookings, isLoading, stats } = useBookings();
  const terms = useTerminology();
  
  const [viewMode, setViewMode] = useState<"calendar" | "list">("calendar");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{ date: Date; hour: number } | null>(null);

  const handleSlotClick = (date: Date, hour: number) => {
    setSelectedSlot({ date, hour });
    setCreateDialogOpen(true);
  };

  const handleEventClick = (event: ScheduleEvent) => {
    // TODO: Open edit dialog for bookings
    console.log("Event clicked:", event);
  };

  if (moduleLoading || !isAllowed) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const upcomingBookings = bookings.filter(
    (b) => new Date(b.start_at) >= new Date() && b.status !== "completed" && b.status !== "canceled"
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <TooltipProvider>
      <PageContainer maxWidth="xl">
        <PageHeader
          icon={<CalendarIcon className="h-5 w-5" />}
          title={terms.bookingsPageTitle}
          description={`${terms.bookingsPageSubtitle}. Click any time slot to create a ${terms.booking}.`}
          action={
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={viewMode === "calendar" ? "secondary" : "ghost"}
                      size="sm"
                      onClick={() => setViewMode("calendar")}
                    >
                      <CalendarIcon className="h-4 w-4 mr-1" />
                      Calendar
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>View your schedule as a weekly or daily calendar</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={viewMode === "list" ? "secondary" : "ghost"}
                      size="sm"
                      onClick={() => setViewMode("list")}
                    >
                      <List className="h-4 w-4 mr-1" />
                      List
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>View upcoming bookings as a simple list</TooltipContent>
                </Tooltip>
              </div>
              <Button className="gap-2" onClick={() => setCreateDialogOpen(true)}>
                <Plus className="h-4 w-4" />
                {terms.newBooking}
              </Button>
            </div>
          }
        />

        {/* Stats */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Tooltip>
            <TooltipTrigger asChild>
              <Card className="cursor-help">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <CalendarIcon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.today}</p>
                    <p className="text-xs text-muted-foreground">Today</p>
                  </div>
                </CardContent>
              </Card>
            </TooltipTrigger>
            <TooltipContent>Number of appointments scheduled for today</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Card className="cursor-help">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Clock className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.thisWeek}</p>
                    <p className="text-xs text-muted-foreground">This Week</p>
                  </div>
                </CardContent>
              </Card>
            </TooltipTrigger>
            <TooltipContent>Total appointments scheduled for the current week</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Card className="cursor-help">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/10">
                    <DollarSign className="h-5 w-5 text-warning" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.pendingDeposits}</p>
                    <p className="text-xs text-muted-foreground">Pending Deposits</p>
                  </div>
                </CardContent>
              </Card>
            </TooltipTrigger>
            <TooltipContent>Bookings waiting for customer deposit payment</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Card className="cursor-help">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10">
                    <CheckCircle2 className="h-5 w-5 text-success" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.completed}</p>
                    <p className="text-xs text-muted-foreground">Completed</p>
                  </div>
                </CardContent>
              </Card>
            </TooltipTrigger>
            <TooltipContent>Total appointments completed this month</TooltipContent>
          </Tooltip>
        </section>

        {/* Main Content */}
        <section className="space-y-6">
        {viewMode === "calendar" ? (
          <Card>
            <CardContent className="p-4">
              {/* Calendar Tip Banner */}
              <div className="flex items-center gap-2 p-3 mb-4 rounded-lg bg-muted/50 text-sm text-muted-foreground">
                <MousePointerClick className="h-4 w-4 shrink-0" />
                <span><strong>Tip:</strong> Click any empty time slot to quickly create a booking</span>
              </div>
              
              <ScheduleCalendar
                onEventClick={handleEventClick}
                onSlotClick={handleSlotClick}
              />
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Upcoming Bookings</CardTitle>
            </CardHeader>
            <CardContent>
              {upcomingBookings.length > 0 ? (
                <div className="space-y-4">
                  {upcomingBookings.map((booking) => (
                    <BookingListItem key={booking.id} booking={booking} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <CalendarIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="font-medium text-lg mb-2">No upcoming bookings</p>
                  <p className="text-sm max-w-md mx-auto mb-6">
                    When customers book through your AI receptionist or you create appointments manually, they'll appear here.
                  </p>
                  <Button onClick={() => setCreateDialogOpen(true)} variant="outline">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First Booking
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        </section>

        {/* Create Booking Dialog */}
        <CreateBookingDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
          initialDate={selectedSlot?.date}
          initialHour={selectedSlot?.hour}
          onSuccess={() => {
            setSelectedSlot(null);
          }}
        />
      </PageContainer>
    </TooltipProvider>
  );
}
