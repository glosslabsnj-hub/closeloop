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
  user_id: string | null;
  created_at: string;
  updated_at: string;
}

export function useAgencyApplications() {
  return useQuery({
    queryKey: ["agency-applications"],
    queryFn: async () => {
      // Uses the authenticated user's session - admin only via RLS
      const { data, error } = await supabase
        .from("agency_applications" as any)
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data ?? []) as unknown as AgencyApplication[];
    },
  });
}

export function useApproveApplication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      application_id,
      admin_notes,
    }: {
      application_id: string;
      admin_notes?: string;
    }) => {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      const { data, error } = await supabase.functions.invoke(
        "approve-agency-application",
        {
          body: { application_id, admin_notes },
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        }
      );

      if (error) throw error;
      return data as { success: boolean; agency_id: string };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agency-applications"] });
      toast.success("Application approved! Agency account created.");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to approve application");
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

/** Hook for agency applicants to check their own application status */
export function useMyAgencyApplication() {
  return useQuery({
    queryKey: ["my-agency-application"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agency_applications" as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1);

      if (error) throw error;
      const apps = (data ?? []) as unknown as AgencyApplication[];
      return apps[0] ?? null;
    },
  });
}
