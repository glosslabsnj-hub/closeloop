import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface CalendarConnection {
  id: string;
  tenant_id: string;
  provider: "google" | "microsoft" | "calendly" | "square" | "ics" | "manual";
  status: "pending" | "connected" | "error" | "disconnected";
  display_name: string | null;
  auth_type: "oauth" | "api_key" | "ics_url" | "manual";
  config_json: Record<string, unknown>;
  scopes_json: string[];
  last_sync_at: string | null;
  sync_error: string | null;
  created_at: string;
  updated_at: string;
}

export interface BusyBlock {
  id: string;
  tenant_id: string;
  source_connection_id: string | null;
  start_at: string;
  end_at: string;
  block_type: "external_busy" | "manual_busy" | "hold" | "confirmed_booking";
  external_event_id: string | null;
  booking_id: string | null;
  expires_at: string | null;
  is_active: boolean;
  metadata_json: Record<string, unknown>;
  created_at: string;
}

export interface AvailableSlot {
  slot_start: string;
  slot_end: string;
}

export const CALENDAR_PROVIDERS = [
  {
    id: "google" as const,
    name: "Google Calendar",
    icon: "📅",
    authType: "oauth" as const,
    description: "Sync with your Google Calendar",
  },
  {
    id: "microsoft" as const,
    name: "Microsoft Outlook",
    icon: "📧",
    authType: "oauth" as const,
    description: "Sync with Outlook/Office 365",
  },
  {
    id: "calendly" as const,
    name: "Calendly",
    icon: "🗓️",
    authType: "oauth" as const,
    description: "Sync with your Calendly schedule",
  },
  {
    id: "square" as const,
    name: "Square Appointments",
    icon: "⬜",
    authType: "oauth" as const,
    description: "Sync with Square Appointments",
  },
  {
    id: "ics" as const,
    name: "Calendar Link (ICS)",
    icon: "🔗",
    authType: "ics_url" as const,
    description: "Import from any ICS/iCal URL",
  },
  {
    id: "manual" as const,
    name: "Manual Only",
    icon: "✋",
    authType: "manual" as const,
    description: "Manage availability in-app only",
  },
];

export function useCalendarConnections() {
  const { tenant } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const connectionsQuery = useQuery({
    queryKey: ["calendar_connections", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return [];

      const { data, error } = await supabase
        .from("calendar_connections")
        .select("*")
        .eq("tenant_id", tenant.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as CalendarConnection[];
    },
    enabled: !!tenant?.id,
  });

  const createConnection = useMutation({
    mutationFn: async (connection: {
      provider: CalendarConnection["provider"];
      display_name?: string;
      auth_type: CalendarConnection["auth_type"];
      config_json?: Record<string, unknown>;
    }) => {
      if (!tenant?.id) throw new Error("No tenant");

      const { data, error } = await supabase
        .from("calendar_connections")
        .insert([{
          tenant_id: tenant.id,
          provider: connection.provider,
          display_name: connection.display_name || CALENDAR_PROVIDERS.find(p => p.id === connection.provider)?.name || connection.provider,
          auth_type: connection.auth_type,
          config_json: (connection.config_json || {}) as Record<string, never>,
          status: connection.auth_type === "manual" ? "connected" : "pending",
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar_connections", tenant?.id] });
      toast({ title: "Calendar connected", description: "Your schedule source has been added." });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateConnection = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<CalendarConnection> & { id: string }) => {
      const updateData: Record<string, unknown> = { ...updates };
      if (updates.config_json) {
        updateData.config_json = updates.config_json as Record<string, never>;
      }
      const { error } = await supabase
        .from("calendar_connections")
        .update(updateData)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar_connections", tenant?.id] });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteConnection = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("calendar_connections")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar_connections", tenant?.id] });
      toast({ title: "Connection removed" });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const hasConnectedCalendar = (connectionsQuery.data || []).some(
    (c) => c.status === "connected"
  );

  return {
    connections: connectionsQuery.data ?? [],
    isLoading: connectionsQuery.isLoading,
    error: connectionsQuery.error,
    hasConnectedCalendar,
    createConnection,
    updateConnection,
    deleteConnection,
    refetch: connectionsQuery.refetch,
  };
}

export function useBusyBlocks(dateRange?: { start: Date; end: Date }) {
  const { tenant } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const blocksQuery = useQuery({
    queryKey: ["busy_blocks", tenant?.id, dateRange?.start?.toISOString(), dateRange?.end?.toISOString()],
    queryFn: async () => {
      if (!tenant?.id) return [];

      let query = supabase
        .from("busy_blocks")
        .select("*")
        .eq("tenant_id", tenant.id)
        .eq("is_active", true)
        .order("start_at", { ascending: true });

      if (dateRange?.start) {
        query = query.gte("start_at", dateRange.start.toISOString());
      }
      if (dateRange?.end) {
        query = query.lte("end_at", dateRange.end.toISOString());
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as BusyBlock[];
    },
    enabled: !!tenant?.id,
  });

  const createBlock = useMutation({
    mutationFn: async (block: {
      start_at: string;
      end_at: string;
      block_type?: BusyBlock["block_type"];
      metadata_json?: Record<string, unknown>;
    }) => {
      if (!tenant?.id) throw new Error("No tenant");

      const { data, error } = await supabase
        .from("busy_blocks")
        .insert([{
          tenant_id: tenant.id,
          start_at: block.start_at,
          end_at: block.end_at,
          block_type: block.block_type || "manual_busy",
          is_active: true,
          metadata_json: (block.metadata_json || {}) as Record<string, never>,
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["busy_blocks", tenant?.id] });
      toast({ title: "Busy block added" });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteBlock = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("busy_blocks")
        .update({ is_active: false })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["busy_blocks", tenant?.id] });
      toast({ title: "Block removed" });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  return {
    blocks: blocksQuery.data ?? [],
    isLoading: blocksQuery.isLoading,
    error: blocksQuery.error,
    createBlock,
    deleteBlock,
    refetch: blocksQuery.refetch,
  };
}

export function useAvailableSlots(params: {
  startDate: Date;
  endDate: Date;
  durationMinutes?: number;
  bufferMinutes?: number;
  businessHours?: Record<string, { open: string; close: string; closed?: boolean }>;
}) {
  const { tenant } = useAuth();

  return useQuery({
    queryKey: [
      "available_slots",
      tenant?.id,
      params.startDate.toISOString(),
      params.endDate.toISOString(),
      params.durationMinutes,
      params.bufferMinutes,
    ],
    queryFn: async () => {
      if (!tenant?.id) return [];

      const { data, error } = await supabase.rpc("fn_compute_available_slots", {
        _tenant_id: tenant.id,
        _start_date: params.startDate.toISOString().split("T")[0],
        _end_date: params.endDate.toISOString().split("T")[0],
        _duration_minutes: params.durationMinutes || 60,
        _buffer_minutes: params.bufferMinutes || 0,
        _business_hours: params.businessHours || null,
      });

      if (error) throw error;
      return data as AvailableSlot[];
    },
    enabled: !!tenant?.id && !!params.businessHours,
  });
}

export function usePlaceHold() {
  const { tenant } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      start_at: string;
      end_at: string;
      hold_minutes?: number;
      session_id?: string;
    }) => {
      if (!tenant?.id) throw new Error("No tenant");

      const { data, error } = await supabase.rpc("fn_place_hold", {
        _tenant_id: tenant.id,
        _start_at: params.start_at,
        _end_at: params.end_at,
        _hold_minutes: params.hold_minutes || 5,
        _session_id: params.session_id || null,
      });

      if (error) throw error;
      return data as string; // Returns hold_id
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["busy_blocks", tenant?.id] });
      queryClient.invalidateQueries({ queryKey: ["available_slots", tenant?.id] });
    },
    onError: (error) => {
      toast({ title: "Slot unavailable", description: error.message, variant: "destructive" });
    },
  });
}

export function useConfirmBooking() {
  const { tenant } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      hold_id: string;
      lead_id?: string;
      service_id?: string;
      notes?: string;
    }) => {
      const { data, error } = await supabase.rpc("fn_confirm_booking", {
        _hold_id: params.hold_id,
        _lead_id: params.lead_id || null,
        _service_id: params.service_id || null,
        _notes: params.notes || null,
      });

      if (error) throw error;
      return data as string; // Returns booking_id
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["busy_blocks", tenant?.id] });
      queryClient.invalidateQueries({ queryKey: ["available_slots", tenant?.id] });
      queryClient.invalidateQueries({ queryKey: ["bookings", tenant?.id] });
      toast({ title: "Booking confirmed!" });
    },
    onError: (error) => {
      toast({ title: "Booking failed", description: error.message, variant: "destructive" });
    },
  });
}
