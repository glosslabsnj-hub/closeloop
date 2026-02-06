 import { useState, useMemo } from "react";
import { useModuleRequired } from "@/hooks/useModuleRequired";
import { useTerminology } from "@/hooks/useTerminology";
 import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
 import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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
 import { Calendar as CalendarIcon, Plus, Loader2, List, Search } from "lucide-react";
import { ScheduleCalendar } from "@/components/calendar/ScheduleCalendar";
import { CreateBookingDialog } from "@/components/calendar/CreateBookingDialog";
 import { useBookings } from "@/hooks/useBookings";
 import { BookingCard } from "@/components/bookings/BookingCard";
 import { EmptyState } from "@/components/ui/empty-state";
import type { ScheduleEvent } from "@/hooks/useScheduleData";

export default function BookingsPage() {
  const { isAllowed, isLoading: moduleLoading } = useModuleRequired(["booking"]);
   const { bookings, isLoading } = useBookings();
  const terms = useTerminology();
  
   const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
   const [statusFilter, setStatusFilter] = useState<string>("all");
   const [searchQuery, setSearchQuery] = useState("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
   // Filter bookings based on status and search
   const filteredBookings = useMemo(() => {
     return bookings.filter((booking) => {
       // Status filter
       if (statusFilter !== "all" && booking.status !== statusFilter) {
         return false;
       }
       
       // Search filter
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
 
  const [selectedSlot, setSelectedSlot] = useState<{ date: Date; hour: number } | null>(null);

  const handleSlotClick = (date: Date, hour: number) => {
    setSelectedSlot({ date, hour });
    setCreateDialogOpen(true);
  };

  const handleEventClick = (event: ScheduleEvent) => {
    // Open event details - to be implemented
  };

  if (moduleLoading || !isAllowed) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
     <PageContainer maxWidth="xl">
       <div className="space-y-6">
        <PageHeader
          icon={<CalendarIcon className="h-5 w-5" />}
          title={terms.bookingsPageTitle}
           description={terms.bookingsPageSubtitle}
          action={
             <Button className="gap-2" onClick={() => setCreateDialogOpen(true)}>
               <Plus className="h-4 w-4" />
               {terms.newBooking}
             </Button>
          }
        />

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
                 placeholder="Search customer..."
                 className="w-48 pl-10"
                 value={searchQuery}
                 onChange={(e) => setSearchQuery(e.target.value)}
               />
             </div>
           </div>
         </div>
 
         {/* Content */}
         {filteredBookings.length === 0 ? (
           <EmptyState
             icon={CalendarIcon}
             title="No bookings found"
             description={
               statusFilter !== "all" || searchQuery
                 ? "Try adjusting your filters to see more results."
                 : "When customers book appointments through your AI or you create them manually, they'll appear here."
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
         ) : viewMode === "list" ? (
           <div className="space-y-3">
             {filteredBookings.map((booking) => (
               <BookingCard
                 key={booking.id}
                 booking={booking}
                 onEdit={handleEditBooking}
                 onCancel={handleCancelBooking}
               />
             ))}
           </div>
         ) : (
           <Card>
             <CardContent className="p-4">
               <ScheduleCalendar
                 onEventClick={handleEventClick}
                 onSlotClick={handleSlotClick}
               />
             </CardContent>
           </Card>
         )}

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
       </div>
     </PageContainer>
  );
}
