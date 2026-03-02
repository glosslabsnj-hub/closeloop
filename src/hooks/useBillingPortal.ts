import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function useBillingPortal(tenantId: string | null) {
  const [loading, setLoading] = useState(false);

  const openPortal = async () => {
    if (!tenantId) {
      toast.error("No active tenant");
      return;
    }

    setLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      const { data, error } = await supabase.functions.invoke(
        "create-billing-portal-session",
        {
          body: { tenant_id: tenantId },
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        },
      );

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, "_blank");
      } else {
        toast.error("Could not generate billing portal link");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to open billing portal";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return { openPortal, loading };
}
