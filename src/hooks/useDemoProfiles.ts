import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface DemoProfile {
  id: string;
  owner_id: string;
  owner_type: string;
  agency_id: string | null;
  business_name: string;
  industry: string;
  business_mode: string;
  website_url: string;
  address: string | null;
  phone_extracted: string | null;
  hours_json: Record<string, unknown>;
  services_json: unknown[];
  faqs_json: unknown[];
  description: string;
  is_active: boolean;
  created_at: string;
}

export interface DemoPhoneNumber {
  id: string;
  owner_id: string;
  owner_type: string;
  phone_e164: string;
  twilio_sid: string;
  active_demo_profile_id: string | null;
  created_at: string;
}

export function useDemoProfiles() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const profilesQuery = useQuery({
    queryKey: ["demo-profiles", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("demo_profiles")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as DemoProfile[];
    },
    enabled: !!user,
  });

  const phoneQuery = useQuery({
    queryKey: ["demo-phone-number", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("demo_phone_numbers")
        .select("*")
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as DemoPhoneNumber | null;
    },
    enabled: !!user,
  });

  const createProfile = useMutation({
    mutationFn: async (params: {
      business_name: string;
      industry: string;
      business_mode: string;
      website_url: string;
      address?: string | null;
      phone_extracted?: string | null;
      hours_json?: Record<string, unknown>;
      services_json?: unknown[];
      faqs_json?: unknown[];
      description?: string;
      owner_type?: string;
      agency_id?: string | null;
    }) => {
      const { data, error } = await supabase.functions.invoke("create-demo-profile", {
        body: params,
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Failed to create demo profile");
      return data.profile as DemoProfile;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["demo-profiles"] });
      queryClient.invalidateQueries({ queryKey: ["demo-phone-number"] });
      toast.success("Demo profile created and activated");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const activateProfile = useMutation({
    mutationFn: async (profileId: string) => {
      const { data, error } = await supabase.functions.invoke("activate-demo-profile", {
        body: { profile_id: profileId },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Failed to activate");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["demo-profiles"] });
      queryClient.invalidateQueries({ queryKey: ["demo-phone-number"] });
      toast.success("Demo profile activated");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteProfile = useMutation({
    mutationFn: async (profileId: string) => {
      const { data, error } = await supabase.functions.invoke("delete-demo-profile", {
        body: { profile_id: profileId },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Failed to delete");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["demo-profiles"] });
      queryClient.invalidateQueries({ queryKey: ["demo-phone-number"] });
      toast.success("Demo profile deleted");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return {
    profiles: profilesQuery.data ?? [],
    demoPhone: phoneQuery.data ?? null,
    loading: profilesQuery.isLoading,
    createProfile,
    activateProfile,
    deleteProfile,
  };
}
