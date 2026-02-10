import { useState, useMemo } from "react";
import { AnimatedList, AnimatedListItem } from "@/components/ui/animated";
import { useModuleRequired } from "@/hooks/useModuleRequired";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { FilterBar } from "@/components/patterns/FilterBar";
import { ContentLoadingState } from "@/components/patterns/ContentLoadingState";
import { Calendar as CalendarIcon, Plus } from "lucide-react";
import { ScheduleCalendar } from "@/components/calendar/ScheduleCalendar";
import { CreateBookingDialog } from "@/components/calendar/CreateBookingDialog";
import { useBookings } from "@/hooks/useBookings";
import { BookingCard } from "@/components/bookings/BookingCard";
import { EmptyState } from "@/components/ui/empty-state";
import type { ViewMode } from "@/components/patterns/FilterBar";
import type { ScheduleEvent } from "@/hooks/useScheduleData";

export default function BookingsPage() {
  const { isAllowed, isLoading: moduleLoading } = useModuleRequired(["booking"]);
  const { bookings, isLoading } = useBookings();

  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{ date: Date; hour: number } | null>(null);

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

  const handleEditBooking = (booking: typeof bookings[0]) => {
    // Edit booking functionality - to be implemented
  };

  const handleCancelBooking = (booking: typeof bookings[0]) => {
    // Cancel booking functionality - to be implemented
  };

  const handleSlotClick = (date: Date, hour: number) => {
    setSelectedSlot({ date, hour });
    setCreateDialogOpen(true);
  };

  const handleEventClick = (event: ScheduleEvent) => {
    // Open event details - to be implemented
  };

  if (moduleLoading || !isAllowed || isLoading) {
    return (
      <PageContainer maxWidth="xl">
        <ContentLoadingState variant="list" count={6} />
      </PageContainer>
    );
  }

  return (
    <PageContainer maxWidth="xl">
      <div className="space-y-6">
        <PageHeader
          icon={CalendarIcon}
          title="Schedule"
          description="Your calendar and upcoming appointments"
          action={
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="h-4 w-4" />
              New Booking
            </Button>
          }
        />

        {/* Filters */}
        <FilterBar
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="Search bookings..."
          filters={[
            {
              key: "status",
              label: "Status",
              options: [
                { value: "all", label: "All Statuses" },
                { value: "pending_deposit", label: "Pending" },
                { value: "confirmed", label: "Confirmed" },
                { value: "completed", label: "Completed" },
                { value: "canceled", label: "Cancelled" },
                { value: "no_show", label: "No Show" },
              ],
              value: statusFilter,
              onChange: setStatusFilter,
            },
          ]}
          viewModes={["list", "calendar"]}
          activeViewMode={viewMode}
          onViewModeChange={(mode) => setViewMode(mode as "list" | "calendar")}
        />

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
          <AnimatedList className="divide-y divide-border/30 rounded-lg border border-border/30">
            {filteredBookings.map((booking) => (
              <AnimatedListItem key={booking.id}>
                <BookingCard
                  booking={booking}
                  onEdit={handleEditBooking}
                  onCancel={handleCancelBooking}
                />
              </AnimatedListItem>
            ))}
          </AnimatedList>
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
      </div>
    </PageContainer>
  );
}
