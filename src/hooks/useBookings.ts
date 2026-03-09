import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useMemo } from "react";
import type { Database } from "@/integrations/supabase/types";

type Booking = Database["public"]["Tables"]["bookings"]["Row"];
type BookingInsert = Database["public"]["Tables"]["bookings"]["Insert"];
type Lead = Database["public"]["Tables"]["leads"]["Row"];
type Service = Database["public"]["Tables"]["services"]["Row"];

// Extended booking type with joined data
export interface BookingWithDetails extends Booking {
  lead?: Lead | null;
  service?: Service | null;
}

export function useBookings() {
  const { tenant } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const bookingsQuery = useQuery({
    queryKey: ["bookings", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return [];
      
      const { data, error } = await supabase
        .from("bookings")
        .select(`
          *,
          lead:leads(*),
          service:services(*)
        `)
        .eq("tenant_id", tenant.id)
        .order("start_at", { ascending: true });

      if (error) throw error;
      return data as BookingWithDetails[];
    },
    enabled: !!tenant?.id,
  });

  // Realtime subscription for instant booking updates
  useEffect(() => {
    if (!tenant?.id) return;

    const channel = supabase
      .channel(`bookings-realtime-${tenant.id}`)
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'bookings',
          filter: `tenant_id=eq.${tenant.id}`
        },
        () => {
          // Refetch bookings when any change occurs for this tenant
          queryClient.invalidateQueries({ queryKey: ["bookings", tenant.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenant?.id, queryClient]);

  const createBooking = useMutation({
    mutationFn: async (booking: Omit<BookingInsert, "tenant_id">) => {
      if (!tenant?.id) throw new Error("No tenant");
      
      const { data, error } = await supabase
        .from("bookings")
        .insert({ ...booking, tenant_id: tenant.id })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookings", tenant?.id] });
      toast({ title: "Booking confirmed", description: "Customer has been notified." });
    },
    onError: (error) => {
      toast({ title: "Something went wrong", description: "Try again?", variant: "destructive" });
    },
  });

  const updateBooking = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Booking> & { id: string }) => {
      const { data, error } = await supabase
        .from("bookings")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookings", tenant?.id] });
      toast({ title: "Booking updated", description: "Changes saved." });
    },
    onError: (error) => {
      toast({ title: "Something went wrong", description: "Try again?", variant: "destructive" });
    },
  });

  const completeBooking = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from("bookings")
        .update({ status: "completed" })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      // Fire booking.completed workflow trigger for automations (review requests, follow-ups)
      if (tenant?.id) {
        supabase.functions.invoke("trigger-workflow", {
          body: {
            tenant_id: tenant.id,
            trigger: "booking.completed",
            entity_type: "booking",
            entity_id: id,
          },
        }).catch(() => { /* best-effort automation trigger */ });
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookings", tenant?.id] });
      toast({ title: "Booking completed", description: "Service marked as finished." });
    },
    onError: (error) => {
      toast({ title: "Something went wrong", description: "Try again?", variant: "destructive" });
    },
  });

  const confirmBooking = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from("bookings")
        .update({ status: "confirmed" })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;

      // Update busy_blocks: convert temporary hold to permanent confirmed booking
      supabase
        .from("busy_blocks")
        .update({ block_type: "confirmed_booking", expires_at: null })
        .eq("booking_id", id)
        .then(({ error: bbErr }) => {
          // busy_blocks update is best-effort; booking is already confirmed
        })
        .catch(() => { /* best-effort busy_blocks update */ });

      // Call booking-handoff to notify customer (SMS, email) and create calendar event
      if (tenant?.id) {
        supabase.functions.invoke("booking-handoff", {
          body: { booking_id: id, tenant_id: tenant.id },
        }).then(({ error: handoffErr }) => {
          if (handoffErr) {
            toast({
              title: "Notification issue",
              description: "Booking confirmed but customer notification may not have sent. Consider contacting them directly.",
              variant: "default",
            });
          }
        }).catch(() => {
          toast({
            title: "Notification issue",
            description: "Booking confirmed but customer notification may not have sent.",
            variant: "default",
          });
        });
      }

      // Fire booking.confirmed workflow trigger for automations
      if (tenant?.id) {
        supabase.functions.invoke("trigger-workflow", {
          body: {
            tenant_id: tenant.id,
            trigger: "booking.confirmed",
            entity_type: "booking",
            entity_id: id,
          },
        }).catch(() => { /* best-effort automation trigger */ });
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookings", tenant?.id] });
      toast({ title: "Booking confirmed" });
    },
    onError: () => {
      toast({ title: "Something went wrong", description: "Try again?", variant: "destructive" });
    },
  });

  const rescheduleBooking = useMutation({
    mutationFn: async ({ id, start_at, end_at, notes }: { id: string; start_at: string; end_at?: string; notes?: string }) => {
      const updates: Record<string, unknown> = { start_at };
      if (end_at) updates.end_at = end_at;
      if (notes !== undefined) updates.notes = notes;
      const { data, error } = await supabase
        .from("bookings")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookings", tenant?.id] });
      toast({ title: "Booking rescheduled", description: "New time saved." });
    },
    onError: () => {
      toast({ title: "Something went wrong", description: "Try again?", variant: "destructive" });
    },
  });

  const noShowBooking = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from("bookings")
        .update({ status: "no_show" })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookings", tenant?.id] });
      toast({ title: "Marked as no-show" });
    },
    onError: () => {
      toast({ title: "Something went wrong", description: "Try again?", variant: "destructive" });
    },
  });

  const cancelBooking = useMutation({
    mutationFn: async (id: string) => {
      // Get booking details first to check for Square sync
      const { data: booking, error: fetchErr } = await supabase
        .from("bookings")
        .select("id, external_event_id, external_provider")
        .eq("id", id)
        .single();
      if (fetchErr) throw fetchErr;

      // Cancel in Flux
      const { data, error } = await supabase
        .from("bookings")
        .update({ status: "canceled" })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;

      // Deactivate linked busy_block
      await supabase
        .from("busy_blocks")
        .update({ is_active: false })
        .eq("booking_id", id);

      // Also deactivate by external_event_id for Square imports
      if (booking?.external_provider === "square" && booking?.external_event_id) {
        await supabase
          .from("busy_blocks")
          .update({ is_active: false })
          .eq("external_event_id", `square_${booking.external_event_id}`)
          .eq("is_active", true);

        // Cancel in Square via edge function
        try {
          await supabase.functions.invoke("sync-square-cancel", {
            body: {
              tenant_id: tenant?.id,
              booking_id: id,
              square_booking_id: booking.external_event_id,
            },
          });
        } catch (squareErr) {
          console.error("[useBookings] Square cancel sync failed:", squareErr);
          // Don't fail the whole operation if Square sync fails
        }
      }

      // Fire booking.cancelled workflow trigger for automations
      if (tenant?.id) {
        supabase.functions.invoke("trigger-workflow", {
          body: {
            tenant_id: tenant.id,
            trigger: "booking.cancelled",
            entity_type: "booking",
            entity_id: id,
          },
        }).catch(() => { /* best-effort automation trigger */ });
      }

      // Notify owner about the cancellation via booking-handoff
      if (tenant?.id) {
        supabase.functions.invoke("booking-handoff", {
          body: { booking_id: id, tenant_id: tenant.id, event: "cancelled" },
        }).catch(() => { /* best-effort owner notification */ });
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookings", tenant?.id] });
      toast({ title: "Booking cancelled", description: "Appointment cancelled and synced." });
    },
    onError: () => {
      toast({ title: "Failed to cancel booking", description: "Please try again.", variant: "destructive" });
    },
  });

  const deleteBooking = useMutation({
    mutationFn: async (id: string) => {
      // Get booking details first to check for Square sync
      const { data: booking } = await supabase
        .from("bookings")
        .select("id, external_event_id, external_provider")
        .eq("id", id)
        .single();

      // Deactivate linked busy_blocks
      await supabase.from("busy_blocks").update({ is_active: false }).eq("booking_id", id);

      if (booking?.external_provider === "square" && booking?.external_event_id) {
        await supabase
          .from("busy_blocks")
          .update({ is_active: false })
          .eq("external_event_id", `square_${booking.external_event_id}`)
          .eq("is_active", true);

        // Cancel in Square
        try {
          await supabase.functions.invoke("sync-square-cancel", {
            body: {
              tenant_id: tenant?.id,
              booking_id: id,
              square_booking_id: booking.external_event_id,
            },
          });
        } catch (squareErr) {
          console.error("[useBookings] Square cancel sync failed:", squareErr);
        }
      }

      const { error } = await supabase.from("bookings").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookings", tenant?.id] });
      toast({ title: "Booking deleted", description: "Appointment removed and synced." });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const stats = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000);
    const endOfWeek = new Date(startOfToday.getTime() + 7 * 24 * 60 * 60 * 1000);

    return {
      today: bookingsQuery.data?.filter((b) => {
        const start = new Date(b.start_at);
        return start >= startOfToday && start < endOfToday;
      }).length ?? 0,
      thisWeek: bookingsQuery.data?.filter((b) => {
        const start = new Date(b.start_at);
        return start >= startOfToday && start < endOfWeek;
      }).length ?? 0,
      pendingDeposits: bookingsQuery.data?.filter((b) => b.status === "pending_deposit").length ?? 0,
      completed: bookingsQuery.data?.filter((b) => b.status === "completed").length ?? 0,
    };
  }, [bookingsQuery.data]);

  return {
    bookings: bookingsQuery.data ?? [],
    isLoading: bookingsQuery.isLoading,
    error: bookingsQuery.error,
    stats,
    createBooking,
    updateBooking,
    confirmBooking,
    rescheduleBooking,
    completeBooking,
    noShowBooking,
    cancelBooking,
    deleteBooking,
    refetch: bookingsQuery.refetch,
  };
}
