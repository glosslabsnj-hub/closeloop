import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface SetupRequest {
  id: string;
  tenant_id: string;
  status: "new" | "in_progress" | "completed" | "cancelled";
  target_system: string;
  target_system_other: string | null;
  sync_type: string[];
  contact_email: string | null;
  contact_phone: string | null;
  notes: string | null;
  credentials_provided: boolean;
  credentials_notes: string | null;
  assigned_to: string | null;
  admin_notes: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

// Popular systems by business mode
export const TARGET_SYSTEMS = {
  service: [
    { value: "google_calendar", label: "Google Calendar" },
    { value: "servicetitan", label: "ServiceTitan" },
    { value: "housecall_pro", label: "Housecall Pro" },
    { value: "jobber", label: "Jobber" },
    { value: "fieldedge", label: "FieldEdge" },
    { value: "acuity", label: "Acuity Scheduling" },
    { value: "square", label: "Square Appointments" },
    { value: "other", label: "Other (specify)" },
  ],
  dispatch: [
    { value: "towbook", label: "Towbook" },
    { value: "onfleet", label: "Onfleet" },
    { value: "samsara", label: "Samsara" },
    { value: "google_sheets", label: "Google Sheets" },
    { value: "other", label: "Other (specify)" },
  ],
  food: [
    { value: "square_pos", label: "Square POS" },
    { value: "toast", label: "Toast" },
    { value: "clover", label: "Clover" },
    { value: "lightspeed", label: "Lightspeed" },
    { value: "printnode", label: "PrintNode (Receipt Printing)" },
    { value: "other", label: "Other (specify)" },
  ],
  medical: [
    { value: "google_calendar", label: "Google Calendar" },
    { value: "athenahealth", label: "AthenaHealth" },
    { value: "epic", label: "Epic" },
    { value: "other", label: "Other (specify)" },
  ],
  general: [
    { value: "google_calendar", label: "Google Calendar" },
    { value: "google_sheets", label: "Google Sheets" },
    { value: "hubspot", label: "HubSpot" },
    { value: "gohighlevel", label: "GoHighLevel" },
    { value: "other", label: "Other (specify)" },
  ],
};

export const SYNC_TYPES = [
  { value: "booking_sync", label: "Sync bookings/appointments" },
  { value: "order_sync", label: "Sync orders" },
  { value: "dispatch_sync", label: "Sync dispatch jobs" },
  { value: "lead_sync", label: "Sync leads/contacts" },
  { value: "calendar_sync", label: "Two-way calendar sync" },
  { value: "printing", label: "Automatic receipt printing" },
];

export function useSetupRequests() {
  const { tenant } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const requestsQuery = useQuery({
    queryKey: ["setup_requests", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return [];

      const { data, error } = await supabase
        .from("setup_requests")
        .select("*")
        .eq("tenant_id", tenant.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as SetupRequest[];
    },
    enabled: !!tenant?.id,
  });

  const createRequest = useMutation({
    mutationFn: async (request: {
      target_system: string;
      target_system_other?: string;
      sync_type: string[];
      contact_email?: string;
      contact_phone?: string;
      notes?: string;
      credentials_notes?: string;
    }) => {
      if (!tenant?.id) throw new Error("No tenant");

      const { data, error } = await supabase
        .from("setup_requests")
        .insert({
          tenant_id: tenant.id,
          ...request,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["setup_requests", tenant?.id] });
      toast({
        title: "Request submitted!",
        description: "Our team will reach out within 24 hours to complete your setup.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    requests: requestsQuery.data ?? [],
    isLoading: requestsQuery.isLoading,
    error: requestsQuery.error,
    createRequest,
    refetch: requestsQuery.refetch,
  };
}

// Admin hook for managing all setup requests
export function useAdminSetupRequests() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const requestsQuery = useQuery({
    queryKey: ["admin_setup_requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("setup_requests")
        .select(`
          *,
          tenant:tenants(id, name, business_mode)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as unknown as (SetupRequest & { tenant: { id: string; name: string; business_mode: string } | null })[];
    },
  });

  const updateRequest = useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<SetupRequest>;
    }) => {
      const { error } = await supabase
        .from("setup_requests")
        .update(updates)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_setup_requests"] });
      toast({ title: "Request updated" });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    requests: requestsQuery.data ?? [],
    isLoading: requestsQuery.isLoading,
    error: requestsQuery.error,
    updateRequest,
    refetch: requestsQuery.refetch,
  };
}
