import { useState, useMemo } from "react";
import { AnimatedList, AnimatedListItem } from "@/components/ui/animated";
import { useModuleRequired } from "@/hooks/useModuleRequired";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { Calendar as CalendarIcon, Plus, Loader2, List, Search, AlertTriangle, CheckCircle2 } from "lucide-react";
import { ScheduleCalendar } from "@/components/calendar/ScheduleCalendar";
import { CreateBookingDialog } from "@/components/calendar/CreateBookingDialog";
import { EditBookingDialog } from "@/components/bookings/EditBookingDialog";
import { CancelBookingDialog } from "@/components/bookings/CancelBookingDialog";
import { useBookings, type BookingWithDetails } from "@/hooks/useBookings";
import { useIndustryContext } from "@/hooks/useIndustryContext";
import { BookingCard } from "@/components/bookings/BookingCard";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import type { ScheduleEvent } from "@/hooks/useScheduleData";
import { format, isToday, isTomorrow, isThisWeek, isAfter } from "date-fns";
import { cn } from "@/lib/utils";

function groupBookingsByDate(bookings: BookingWithDetails[]) {
  const today: BookingWithDetails[] = [];
  const tomorrow: BookingWithDetails[] = [];
  const thisWeek: BookingWithDetails[] = [];
  const later: BookingWithDetails[] = [];
  const past: BookingWithDetails[] = [];

  const now = new Date();

  for (const b of bookings) {
    const start = new Date(b.start_at);
    if (isToday(start)) today.push(b);
    else if (isTomorrow(start)) tomorrow.push(b);
    else if (isThisWeek(start) && isAfter(start, now)) thisWeek.push(b);
    else if (isAfter(start, now)) later.push(b);
    else past.push(b);
  }

  return { today, tomorrow, thisWeek, later, past };
}

export default function BookingsPage() {
  const { isAllowed, isLoading: moduleLoading } = useModuleRequired(["booking"]);
  const { bookings, isLoading, updateBooking, completeBooking } = useBookings();
  const { terms } = useIndustryContext();

  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{ date: Date; hour: number } | null>(null);

  const [selectedBooking, setSelectedBooking] = useState<BookingWithDetails | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);

  // Pending bookings needing approval
  const pendingBookings = useMemo(
    () => bookings.filter((b) => b.status === "pending_deposit" || b.status === ("pending" as any)),
    [bookings]
  );

  const filteredBookings = useMemo(() => {
    return bookings.filter((booking) => {
      if (statusFilter !== "all" && booking.status !== statusFilter) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const customerName = booking.lead?.full_name?.toLowerCase() || "";
        const serviceName = booking.service?.name?.toLowerCase() || "";
        return customerName.includes(query) || serviceName.includes(query);
      }
      return true;
    });
  }, [bookings, statusFilter, searchQuery]);

  const grouped = useMemo(() => groupBookingsByDate(filteredBookings), [filteredBookings]);

  const handleEditBooking = (booking: BookingWithDetails) => {
    setSelectedBooking(booking);
    setEditDialogOpen(true);
  };

  const handleCancelBooking = (booking: BookingWithDetails) => {
    setSelectedBooking(booking);
    setCancelDialogOpen(true);
  };

  const handleApproveBooking = (booking: BookingWithDetails) => {
    updateBooking.mutate({ id: booking.id, status: "confirmed" });
  };

  const handleCompleteBooking = (booking: BookingWithDetails) => {
    completeBooking.mutate(booking.id);
  };

  const handleSlotClick = (date: Date, hour: number) => {
    setSelectedSlot({ date, hour });
    setCreateDialogOpen(true);
  };

  const handleEventClick = (event: ScheduleEvent) => {
    const booking = bookings.find((b) => b.id === event.id);
    if (booking) {
      setSelectedBooking(booking);
      setEditDialogOpen(true);
    }
  };

  if (moduleLoading || !isAllowed || isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const renderDateGroup = (label: string, items: BookingWithDetails[]) => {
    if (items.length === 0) return null;
    return (
      <div key={label} className="space-y-1">
        <div className="flex items-center gap-2 px-1 py-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</h3>
          <Badge variant="secondary" size="sm">{items.length}</Badge>
        </div>
        <div className="divide-y divide-border/20 rounded-xl bg-card shadow-sm">
          {items.map((booking) => (
            <BookingCard
              key={booking.id}
              booking={booking}
              onEdit={handleEditBooking}
              onCancel={handleCancelBooking}
              onApprove={handleApproveBooking}
              onComplete={handleCompleteBooking}
            />
          ))}
        </div>
      </div>
    );
  };

  return (
    <PageContainer maxWidth="xl">
      <div className="space-y-6">
        <PageHeader
          icon={CalendarIcon}
          title={terms.bookingsPageTitle || "Schedule"}
          description={terms.bookingsPageSubtitle || "Your calendar and upcoming appointments"}
          action={
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="h-4 w-4" />
              {terms.newBooking || "New Booking"}
            </Button>
          }
        />

        {/* Pending Approval Banner */}
        {pendingBookings.length > 0 && (
          <Card className="border-warning/30 bg-warning/5">
            <CardContent className="py-3 px-4">
              <div className="flex items-center gap-3 mb-2">
                <AlertTriangle className="h-4 w-4 text-warning shrink-0" />
                <span className="text-sm font-semibold">
                  {pendingBookings.length} {pendingBookings.length === 1 ? terms.pendingBooking : terms.pendingBookings} awaiting approval
                </span>
              </div>
              <div className="space-y-2 ml-7">
                {pendingBookings.slice(0, 5).map((b) => (
                  <div key={b.id} className="flex items-center justify-between gap-4">
                    <div className="text-sm">
                      <span className="font-medium">{b.lead?.full_name || "Unknown"}</span>
                      <span className="text-muted-foreground"> — {b.service?.name || "Service"}</span>
                      <span className="text-muted-foreground"> · {format(new Date(b.start_at), "EEE, MMM d 'at' h:mm a")}</span>
                    </div>
                    <Button
                      variant="default"
                      size="sm"
                      className="h-7 text-xs gap-1 shrink-0"
                      onClick={() => handleApproveBooking(b)}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Approve
                    </Button>
                  </div>
                ))}
                {pendingBookings.length > 5 && (
                  <p className="text-xs text-muted-foreground">+ {pendingBookings.length - 5} more</p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* View toggle + filters */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "list" | "calendar")}>
            <TabsList>
              <TabsTrigger value="list">
                <List className="w-4 h-4 mr-2" /> List
              </TabsTrigger>
              <TabsTrigger value="calendar">
                <CalendarIcon className="w-4 h-4 mr-2" /> Calendar
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex items-center gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending_deposit">Pending</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="canceled">Cancelled</SelectItem>
                <SelectItem value="no_show">No Show</SelectItem>
              </SelectContent>
            </Select>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search..."
                className="w-44 pl-9 h-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Content */}
        {viewMode === "calendar" ? (
          <Card>
            <CardContent className="p-4">
              <ScheduleCalendar
                onEventClick={handleEventClick}
                onSlotClick={handleSlotClick}
              />
            </CardContent>
          </Card>
        ) : filteredBookings.length === 0 ? (
          <EmptyState
            icon={CalendarIcon}
            title="No bookings yet"
            description={
              statusFilter !== "all" || searchQuery
                ? "Try adjusting your filters to see more results."
                : "When customers book through your AI or you create them manually, they'll show up here."
            }
            action={
              statusFilter === "all" && !searchQuery
                ? {
                    label: "Create Booking",
                    onClick: () => setCreateDialogOpen(true),
                  }
                : undefined
            }
          />
        ) : (
          <div className="space-y-6">
            {renderDateGroup("Today", grouped.today)}
            {renderDateGroup("Tomorrow", grouped.tomorrow)}
            {renderDateGroup("This Week", grouped.thisWeek)}
            {renderDateGroup("Later", grouped.later)}
            {renderDateGroup("Past", grouped.past)}
          </div>
        )}

        <CreateBookingDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
          initialDate={selectedSlot?.date}
          initialHour={selectedSlot?.hour}
          onSuccess={() => {
            setSelectedSlot(null);
          }}
        />

        <EditBookingDialog
          booking={selectedBooking}
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
        />

        <CancelBookingDialog
          booking={selectedBooking}
          open={cancelDialogOpen}
          onOpenChange={setCancelDialogOpen}
        />
      </div>
    </PageContainer>
  );
}
