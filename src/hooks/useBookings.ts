import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";
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
      .channel('bookings-realtime')
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

  const deleteBooking = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("bookings").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookings", tenant?.id] });
      toast({ title: "Booking cancelled", description: "Appointment removed." });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfToday = new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000);
  const endOfWeek = new Date(startOfToday.getTime() + 7 * 24 * 60 * 60 * 1000);

  const stats = {
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

  return {
    bookings: bookingsQuery.data ?? [],
    isLoading: bookingsQuery.isLoading,
    error: bookingsQuery.error,
    stats,
    createBooking,
    updateBooking,
    deleteBooking,
    refetch: bookingsQuery.refetch,
  };
}
