import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useMemo } from "react";

interface TestDrive {
  id: string;
  tenant_id: string;
  customer_id: string | null;
  session_id: string | null;
  booking_id: string | null;
  vehicle_stock_number: string | null;
  vehicle_year: string | null;
  vehicle_make: string | null;
  vehicle_model: string | null;
  vehicle_trim: string | null;
  vehicle_vin: string | null;
  vehicle_color: string | null;
  vehicle_type: string | null;
  vehicle_description: string | null;
  scheduled_at: string | null;
  scheduled_date: string | null;
  scheduled_time: string | null;
  duration_minutes: number;
  sales_rep_requested: string | null;
  salesperson: string | null;
  trade_in_interest: boolean;
  trade_in_vehicle_info: string | null;
  financing_interest: boolean;
  budget_range: string | null;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  customer?: {
    full_name: string | null;
    phone_e164: string | null;
    email: string | null;
  } | null;
}

type TestDriveInsert = Omit<TestDrive, "id" | "created_at" | "updated_at" | "customer">;

export function useTestDrives() {
  const { tenant } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const drivesQuery = useQuery({
    queryKey: ["test-drives", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return [];

      const { data, error } = await (supabase as any)
        .from("test_drives")
        .select("*, customer:customers(full_name, phone_e164, email)")
        .eq("tenant_id", tenant.id)
        .order("scheduled_date", { ascending: true });

      if (error) throw error;
      return data as TestDrive[];
    },
    enabled: !!tenant?.id,
  });

  // Realtime subscription
  useEffect(() => {
    if (!tenant?.id) return;

    const channel = supabase
      .channel(`test-drives-realtime-${tenant.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "test_drives",
          filter: `tenant_id=eq.${tenant.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["test-drives", tenant.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenant?.id, queryClient]);

  const createTestDrive = useMutation({
    mutationFn: async (drive: Omit<TestDriveInsert, "tenant_id">) => {
      if (!tenant?.id) throw new Error("No tenant");

      const { data, error } = await (supabase as any)
        .from("test_drives")
        .insert({ ...drive, tenant_id: tenant.id })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["test-drives", tenant?.id] });
      toast({ title: "Test drive scheduled", description: "Customer has been notified." });
    },
    onError: () => {
      toast({ title: "Something went wrong", description: "Try again?", variant: "destructive" });
    },
  });

  const updateTestDrive = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<TestDrive> & { id: string }) => {
      const { data, error } = await (supabase as any)
        .from("test_drives")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      // Trigger post-service automation when test drive is completed and has a linked booking
      if (updates.status === "completed" && tenant?.id && data?.booking_id) {
        supabase.functions.invoke("post-service-automation", {
          body: {
            booking_id: data.booking_id,
            tenant_id: tenant.id,
            completed_by: "staff",
          },
        }).catch(() => { /* best-effort */ });
      }

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["test-drives", tenant?.id] });
      const isCompletion = variables.status === "completed";
      toast({
        title: isCompletion ? "Test drive complete!" : "Test drive updated",
        description: isCompletion ? "Follow-up messages are being sent." : "Changes saved.",
      });
    },
    onError: () => {
      toast({ title: "Something went wrong", description: "Try again?", variant: "destructive" });
    },
  });

  const deleteTestDrive = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("test_drives").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["test-drives", tenant?.id] });
      toast({ title: "Test drive cancelled", description: "Appointment removed." });
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
    const drives = drivesQuery.data ?? [];

    return {
      today: drives.filter((d) => {
        if (!d.scheduled_date) return false;
        const date = new Date(d.scheduled_date);
        return date >= startOfToday && date < endOfToday;
      }).length,
      thisWeek: drives.filter((d) => {
        if (!d.scheduled_date) return false;
        const date = new Date(d.scheduled_date);
        return date >= startOfToday && date < endOfWeek;
      }).length,
      pending: drives.filter((d) => d.status === "pending").length,
      completed: drives.filter((d) => d.status === "completed").length,
    };
  }, [drivesQuery.data]);

  return {
    testDrives: drivesQuery.data ?? [],
    isLoading: drivesQuery.isLoading,
    error: drivesQuery.error,
    stats,
    createTestDrive,
    updateTestDrive,
    deleteTestDrive,
    refetch: drivesQuery.refetch,
  };
}
