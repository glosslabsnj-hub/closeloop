import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ClientReadiness {
  has_brain_content: boolean;
  subscription_status: string | null;
  has_stripe_customer: boolean;
  onboarding_step: "provisioned" | "brain_setup" | "ai_ready" | "plan_selected" | "live";
}

export function useAgencyClientReadiness(tenantIds: string[]) {
  return useQuery({
    queryKey: ["agency-client-readiness", tenantIds],
    queryFn: async () => {
      if (tenantIds.length === 0) return {} as Record<string, ClientReadiness>;

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      const { data, error } = await supabase.functions.invoke("get-agency-readiness-batch", {
        body: { tenant_ids: tenantIds },
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });

      if (error) throw new Error(error.message || "Failed to fetch readiness");
      return (data?.readiness || {}) as Record<string, ClientReadiness>;
    },
    enabled: tenantIds.length > 0,
    refetchInterval: 60 * 1000, // Refresh every minute
  });
}
