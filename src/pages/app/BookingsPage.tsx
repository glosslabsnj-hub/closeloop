import { useState } from "react";
import { useBookings, BookingWithDetails } from "@/hooks/useBookings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar as CalendarIcon, Plus, Clock, User, DollarSign, CheckCircle2, Loader2 } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format, isSameDay } from "date-fns";

const statusColors: Record<string, string> = {
  pending_deposit: "bg-yellow-100 text-yellow-800",
  confirmed: "bg-green-100 text-green-800",
  completed: "bg-blue-100 text-blue-800",
  canceled: "bg-gray-100 text-gray-800",
  no_show: "bg-red-100 text-red-800",
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
  const { bookings, isLoading, stats } = useBookings();
  const [date, setDate] = useState<Date | undefined>(new Date());

  const selectedDayBookings = bookings.filter((b) =>
    date ? isSameDay(new Date(b.start_at), date) : false
  );

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
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Bookings</h1>
          <p className="text-muted-foreground">Manage your appointments and schedule</p>
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
                  <div className="text-center py-8 text-muted-foreground">
                    <CalendarIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No bookings for this day</p>
                    <Button variant="outline" className="mt-4">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Booking
                    </Button>
                  </div>
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
                  <div className="text-center py-8 text-muted-foreground">
                    <CalendarIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No upcoming bookings</p>
                    <p className="text-sm mt-1">
                      Book appointments or let the AI schedule for you
                    </p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
