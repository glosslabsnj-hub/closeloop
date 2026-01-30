import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfWeek, endOfWeek, format } from "date-fns";

export interface ScheduleEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  type: "booking" | "busy_block" | "hold";
  status?: string;
  customerName?: string;
  serviceName?: string;
  isExternal?: boolean;
  location?: string;
  description?: string;
  metadata?: Record<string, unknown>;
}

export function useScheduleData(weekStart: Date) {
  const startDate = startOfWeek(weekStart, { weekStartsOn: 0 });
  const endDate = endOfWeek(weekStart, { weekStartsOn: 0 });

  const startISO = format(startDate, "yyyy-MM-dd'T'00:00:00");
  const endISO = format(endDate, "yyyy-MM-dd'T'23:59:59");

  const { data: bookings, isLoading: bookingsLoading, refetch: refetchBookings } = useQuery({
    queryKey: ["schedule-bookings", startISO, endISO],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select(`
          id,
          start_at,
          end_at,
          status,
          notes,
          lead:leads(full_name),
          service:services(name)
        `)
        .gte("start_at", startISO)
        .lte("start_at", endISO)
        .neq("status", "canceled");

      if (error) throw error;
      return data || [];
    },
  });

  const { data: busyBlocks, isLoading: busyLoading, refetch: refetchBusyBlocks } = useQuery({
    queryKey: ["schedule-busy-blocks", startISO, endISO],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("busy_blocks")
        .select("*")
        .gte("start_at", startISO)
        .lte("start_at", endISO)
        .eq("is_active", true);

      if (error) throw error;
      return data || [];
    },
  });

  const events: ScheduleEvent[] = [];

  // Map bookings to events
  if (bookings) {
    for (const booking of bookings) {
      events.push({
        id: booking.id,
        title: booking.service?.name || "Appointment",
        start: new Date(booking.start_at),
        end: new Date(booking.end_at),
        type: "booking",
        status: booking.status,
        customerName: booking.lead?.full_name || "Unknown",
        serviceName: booking.service?.name,
      });
    }
  }

  // Map busy blocks to events
  if (busyBlocks) {
    for (const block of busyBlocks) {
      const isHold = block.block_type === "hold";
      const metadata = block.metadata_json as Record<string, unknown> | null;
      const isExternalBusy = block.block_type === "external_busy";
      
      events.push({
        id: block.id,
        title: isHold ? "Hold" : (metadata?.summary as string) || "Busy",
        start: new Date(block.start_at),
        end: new Date(block.end_at),
        type: isHold ? "hold" : "busy_block",
        isExternal: isExternalBusy,
        location: metadata?.location as string | undefined,
        description: metadata?.description as string | undefined,
        metadata: metadata || undefined,
      });
    }
  }

  const refetch = () => {
    refetchBookings();
    refetchBusyBlocks();
  };

  return {
    events,
    isLoading: bookingsLoading || busyLoading,
    refetch,
  };
}
