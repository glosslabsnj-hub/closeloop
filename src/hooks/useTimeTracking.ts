import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface TimeEntry {
  id: string;
  tenant_id: string;
  user_id: string;
  job_id: string | null;
  booking_id: string | null;
  clock_in: string;
  clock_out: string | null;
  duration_minutes: number | null;
  entry_type: "work" | "break" | "travel" | "admin";
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface TimeEntryWithUser extends TimeEntry {
  user?: {
    id: string;
    email: string;
    full_name?: string;
  } | null;
}

export interface ClockInInput {
  jobId?: string;
  bookingId?: string;
  entryType?: TimeEntry["entry_type"];
  notes?: string;
}

export interface ClockOutInput {
  entryId: string;
  notes?: string;
}

export interface CreateTimeEntryInput {
  userId?: string;
  jobId?: string;
  bookingId?: string;
  clockIn: string;
  clockOut?: string;
  entryType?: TimeEntry["entry_type"];
  notes?: string;
}

function calculateDurationMinutes(clockIn: string, clockOut: string): number {
  const start = new Date(clockIn).getTime();
  const end = new Date(clockOut).getTime();
  return Math.round((end - start) / (1000 * 60));
}

export function useTimeTracking() {
  const { tenant, user } = useAuth();
  const tenantId = tenant?.id ?? null;
  const userId = user?.id ?? null;
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all time entries for the tenant
  const {
    data: entries = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["time_entries", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];

      try {
        const { data, error } = await supabase
          .from("time_entries")
          .select("*")
          .eq("tenant_id", tenantId)
          .order("clock_in", { ascending: false })
          .limit(500);

        if (error) {
          console.error("Failed to fetch time entries:", error);
          return [];
        }
        return (data || []) as TimeEntry[];
      } catch (err) {
        console.error("Failed to fetch time entries:", err);
        return [];
      }
    },
    enabled: !!tenantId,
    retry: false,
    staleTime: 30 * 1000,
  });

  // Get active clock-in for current user
  const activeEntry = entries.find(
    (e) => e.user_id === userId && e.clock_out === null
  );

  // Clock in
  const clockIn = useMutation({
    mutationFn: async (input: ClockInInput) => {
      if (!tenantId || !userId) throw new Error("Not authenticated");

      // Check if already clocked in
      const { data: existing } = await supabase
        .from("time_entries")
        .select("id")
        .eq("tenant_id", tenantId)
        .eq("user_id", userId)
        .is("clock_out", null)
        .single();

      if (existing) {
        throw new Error("Already clocked in. Please clock out first.");
      }

      const { data, error } = await supabase
        .from("time_entries")
        .insert({
          tenant_id: tenantId,
          user_id: userId,
          job_id: input.jobId || null,
          booking_id: input.bookingId || null,
          clock_in: new Date().toISOString(),
          entry_type: input.entryType || "work",
          notes: input.notes || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["time_entries", tenantId] });
      toast({ title: "Clocked in", description: "Time tracking started." });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Clock out
  const clockOut = useMutation({
    mutationFn: async (input: ClockOutInput) => {
      if (!tenantId) throw new Error("Not authenticated");

      // Get the entry to calculate duration
      const { data: entry } = await supabase
        .from("time_entries")
        .select("clock_in")
        .eq("id", input.entryId)
        .single();

      if (!entry) throw new Error("Time entry not found");

      const clockOutTime = new Date().toISOString();
      const durationMinutes = calculateDurationMinutes(entry.clock_in, clockOutTime);

      const { data, error } = await supabase
        .from("time_entries")
        .update({
          clock_out: clockOutTime,
          duration_minutes: durationMinutes,
          notes: input.notes || null,
        })
        .eq("id", input.entryId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["time_entries", tenantId] });
      const hours = Math.floor((data.duration_minutes || 0) / 60);
      const mins = (data.duration_minutes || 0) % 60;
      toast({
        title: "Clocked out",
        description: `Duration: ${hours}h ${mins}m`,
      });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Create manual time entry
  const createEntry = useMutation({
    mutationFn: async (input: CreateTimeEntryInput) => {
      if (!tenantId) throw new Error("Not authenticated");

      const durationMinutes = input.clockOut
        ? calculateDurationMinutes(input.clockIn, input.clockOut)
        : null;

      const { data, error } = await supabase
        .from("time_entries")
        .insert({
          tenant_id: tenantId,
          user_id: input.userId || userId,
          job_id: input.jobId || null,
          booking_id: input.bookingId || null,
          clock_in: input.clockIn,
          clock_out: input.clockOut || null,
          duration_minutes: durationMinutes,
          entry_type: input.entryType || "work",
          notes: input.notes || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["time_entries", tenantId] });
      toast({ title: "Time entry created" });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Delete time entry
  const deleteEntry = useMutation({
    mutationFn: async (entryId: string) => {
      const { error } = await supabase
        .from("time_entries")
        .delete()
        .eq("id", entryId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["time_entries", tenantId] });
      toast({ title: "Time entry deleted" });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Calculate stats
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const weekStart = new Date(today);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());

  const todayEntries = entries.filter((e) => new Date(e.clock_in) >= today);
  const weekEntries = entries.filter((e) => new Date(e.clock_in) >= weekStart);

  const stats = {
    todayMinutes: todayEntries.reduce((sum, e) => sum + (e.duration_minutes || 0), 0),
    weekMinutes: weekEntries.reduce((sum, e) => sum + (e.duration_minutes || 0), 0),
    todayEntries: todayEntries.length,
    weekEntries: weekEntries.length,
    isClockedIn: !!activeEntry,
    activeEntry,
  };

  return {
    entries,
    isLoading,
    error,
    stats,
    refetch,
    clockIn,
    clockOut,
    createEntry,
    deleteEntry,
  };
}

export function useTimeEntriesForJob(jobId: string | undefined) {
  const { tenant } = useAuth();
  const tenantId = tenant?.id ?? null;

  return useQuery({
    queryKey: ["time_entries", "job", jobId],
    queryFn: async () => {
      if (!jobId || !tenantId) return [];

      const { data, error } = await supabase
        .from("time_entries")
        .select("*")
        .eq("job_id", jobId)
        .order("clock_in", { ascending: true });

      if (error) throw error;
      return (data || []) as TimeEntry[];
    },
    enabled: !!jobId && !!tenantId,
  });
}
