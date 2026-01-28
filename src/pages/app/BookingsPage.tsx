import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar as CalendarIcon, Plus, Clock, User, DollarSign, CheckCircle2 } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

const demoBookings = [
  {
    id: "1",
    customer: "John Davis",
    service: "Full Detail",
    date: new Date(),
    time: "2:00 PM",
    duration: "3 hours",
    status: "confirmed",
    deposit: 50,
    depositPaid: true,
    total: 200,
  },
  {
    id: "2",
    customer: "Sarah Miller",
    service: "Ceramic Coating",
    date: new Date(Date.now() + 86400000),
    time: "10:00 AM",
    duration: "8 hours",
    status: "pending_deposit",
    deposit: 200,
    depositPaid: false,
    total: 800,
  },
  {
    id: "3",
    customer: "Mike Thompson",
    service: "Basic Wash",
    date: new Date(Date.now() + 86400000 * 2),
    time: "3:00 PM",
    duration: "1 hour",
    status: "confirmed",
    deposit: 0,
    depositPaid: true,
    total: 50,
  },
  {
    id: "4",
    customer: "Lisa Kim",
    service: "Full Detail",
    date: new Date(Date.now() - 86400000),
    time: "11:00 AM",
    duration: "3 hours",
    status: "completed",
    deposit: 50,
    depositPaid: true,
    total: 200,
  },
];

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

export default function BookingsPage() {
  const { tenant } = useAuth();
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [view, setView] = useState<"list" | "calendar">("list");

  const todayBookings = demoBookings.filter(
    (b) => format(b.date, "yyyy-MM-dd") === format(date || new Date(), "yyyy-MM-dd")
  );

  const upcomingBookings = demoBookings.filter(
    (b) => b.date >= new Date() && b.status !== "completed"
  );

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
        {[
          { label: "Today", value: 3, icon: CalendarIcon },
          { label: "This Week", value: 12, icon: Clock },
          { label: "Pending Deposits", value: 2, icon: DollarSign },
          { label: "Completed", value: 89, icon: CheckCircle2 },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <stat.icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
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
                {todayBookings.length > 0 ? (
                  <div className="space-y-4">
                    {todayBookings.map((booking) => (
                      <div
                        key={booking.id}
                        className="flex items-center justify-between p-4 rounded-lg border"
                      >
                        <div className="flex items-center gap-4">
                          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                            <Clock className="h-6 w-6 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{booking.customer}</p>
                            <p className="text-sm text-muted-foreground">
                              {booking.service} • {booking.time}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge className={cn(statusColors[booking.status])}>
                                {statusLabels[booking.status]}
                              </Badge>
                              {booking.depositPaid && (
                                <Badge variant="outline" className="text-success">
                                  <DollarSign className="h-3 w-3 mr-1" />
                                  ${booking.deposit} paid
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">${booking.total}</p>
                          <p className="text-xs text-muted-foreground">{booking.duration}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <CalendarIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No bookings for this day</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="upcoming">
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
                          <p className="font-medium">{booking.customer}</p>
                          <p className="text-sm text-muted-foreground">
                            {booking.service} • {format(booking.date, "MMM d")} at {booking.time}
                          </p>
                          <Badge className={cn("mt-1", statusColors[booking.status])}>
                            {statusLabels[booking.status]}
                          </Badge>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">${booking.total}</p>
                        {!booking.depositPaid && booking.deposit > 0 && (
                          <Button size="sm" variant="outline" className="mt-2">
                            Request Deposit
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
