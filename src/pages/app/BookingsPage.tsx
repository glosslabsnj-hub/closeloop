import { useState } from "react";
import { useBookings, BookingWithDetails } from "@/hooks/useBookings";
import { useModuleRequired } from "@/hooks/useModuleRequired";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/ui/empty-state";
import { Calendar as CalendarIcon, Plus, Clock, User, DollarSign, CheckCircle2, Loader2 } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format, isSameDay } from "date-fns";

const statusColors: Record<string, string> = {
  pending_deposit: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  confirmed: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  completed: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
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

function BookingCard({ booking }: { booking: BookingWithDetails }) {
  const startDate = new Date(booking.start_at);
  const endDate = new Date(booking.end_at);
  const durationMinutes = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60));
  const hours = Math.floor(durationMinutes / 60);
  const minutes = durationMinutes % 60;
  const durationLabel = hours > 0 ? `${hours}h${minutes > 0 ? ` ${minutes}m` : ""}` : `${minutes}m`;

  return (
    <div className="flex items-center justify-between p-4 rounded-lg border">
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
          <Clock className="h-6 w-6 text-primary" />
        </div>
        <div>
          <p className="font-medium">{booking.lead?.full_name || "Unknown Customer"}</p>
          <p className="text-sm text-muted-foreground">
            {booking.service?.name || "Service"} • {format(startDate, "h:mm a")}
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
  // P0-3: Route protection - redirect if booking module not enabled
  const { isAllowed, isLoading: moduleLoading } = useModuleRequired(["booking"]);
  
  const { bookings, isLoading, stats } = useBookings();
  const [date, setDate] = useState<Date | undefined>(new Date());

  const selectedDayBookings = bookings.filter((b) =>
    date ? isSameDay(new Date(b.start_at), date) : false
  );

  // Show loading while checking module access
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
    <div className="p-4 md:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="page-header mb-0">
          <h1 className="page-title">Bookings</h1>
          <p className="page-subtitle">Manage your appointments and schedule</p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          New Booking
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
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
        <Card>
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
        <Card>
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
        <Card>
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
      </div>

      {/* Main Content */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Calendar</CardTitle>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={date}
              onSelect={setDate}
              className="rounded-md border"
            />
          </CardContent>
        </Card>

        {/* Bookings List */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">
              {date ? format(date, "EEEE, MMMM d") : "Upcoming Bookings"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="selected" className="w-full">
              <TabsList className="mb-4">
                <TabsTrigger value="selected">Selected Day</TabsTrigger>
                <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
              </TabsList>

              <TabsContent value="selected">
                {selectedDayBookings.length > 0 ? (
                  <div className="space-y-4">
                    {selectedDayBookings.map((booking) => (
                      <BookingCard key={booking.id} booking={booking} />
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    icon={CalendarIcon}
                    title="No bookings for this day"
                    description="Select a different date or add a new booking."
                    action={{
                      label: "Add Booking",
                      onClick: () => {},
                    }}
                    compact
                  />
                )}
              </TabsContent>

              <TabsContent value="upcoming">
                {upcomingBookings.length > 0 ? (
                  <div className="space-y-4">
                    {upcomingBookings.map((booking) => (
                      <div
                        key={booking.id}
                        className="flex items-center justify-between p-4 rounded-lg border"
                      >
                        <div className="flex items-center gap-4">
                          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                            <User className="h-6 w-6 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{booking.lead?.full_name || "Unknown"}</p>
                            <p className="text-sm text-muted-foreground">
                              {booking.service?.name || "Service"} •{" "}
                              {format(new Date(booking.start_at), "MMM d")} at{" "}
                              {format(new Date(booking.start_at), "h:mm a")}
                            </p>
                            <Badge className={cn("mt-1", statusColors[booking.status])}>
                              {statusLabels[booking.status]}
                            </Badge>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">
                            {booking.service?.price_amount
                              ? `$${booking.service.price_amount}`
                              : "—"}
                          </p>
                          {!booking.deposit_paid && booking.deposit_required && (
                            <Button size="sm" variant="outline" className="mt-2">
                              Request Deposit
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    icon={CalendarIcon}
                    title="No upcoming bookings"
                    description="Book appointments or let the AI schedule for you."
                    compact
                  />
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
