import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface AgencyApplication {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  company_name: string;
  company_website: string | null;
  expected_clients: number;
  current_client_count: number | null;
  services_offered: string[];
  referral_source: string | null;
  message: string | null;
  status: "new" | "reviewing" | "approved" | "rejected";
  admin_notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  approved_agency_id: string | null;
  created_at: string;
  updated_at: string;
}

export function useAgencyApplications() {
  return useQuery({
    queryKey: ["agency-applications"],
    queryFn: async () => {
      // Uses the authenticated user's session - admin only via RLS or service role
      const { data, error } = await supabase
        .from("agency_applications" as any)
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data ?? []) as unknown as AgencyApplication[];
    },
  });
}

export function useUpdateApplicationStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      status,
      admin_notes,
    }: {
      id: string;
      status: AgencyApplication["status"];
      admin_notes?: string;
    }) => {
      const updates: Record<string, unknown> = {
        status,
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      if (admin_notes !== undefined) updates.admin_notes = admin_notes;

      const { error } = await supabase
        .from("agency_applications" as any)
        .update(updates)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agency-applications"] });
      toast.success("Application updated");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to update application");
    },
  });
}
