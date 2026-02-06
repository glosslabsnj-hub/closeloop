/**
 * DispatchJobListener - Global realtime listener for new dispatch jobs
 * 
 * This component subscribes to dispatch_jobs INSERT events and shows
 * toast notifications regardless of which page the user is viewing.
 * Should be mounted in AppLayout for dispatch-enabled tenants.
 */

import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTenantConfig } from "@/hooks/useTenantConfig";
import { supabase } from "@/integrations/supabase/client";
import { toast as sonnerToast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

interface DispatchJobPayload {
  id: string;
  job_number?: string;
  customer_name: string | null;
  pickup_address: string | null;
  priority: string;
  status: string;
}

export function DispatchJobListener() {
  const { tenant } = useAuth();
  const { enabledModules } = useTenantConfig();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const isDispatchEnabled = enabledModules.includes("dispatch_queue");

  useEffect(() => {
    // Only subscribe if dispatch module is enabled
    if (!tenant?.id || !isDispatchEnabled) return;

    const channel = supabase
      .channel("global-dispatch-alerts")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "dispatch_jobs",
          filter: `tenant_id=eq.${tenant.id}`,
        },
        (payload) => {
          const newJob = payload.new as DispatchJobPayload;
          
          // Play notification sound
          try {
            const audio = new Audio("/notification.mp3");
            audio.volume = 0.5;
            audio.play().catch(() => {});
          } catch {}

          // Show global toast with View action
          sonnerToast.info("🚨 New Dispatch Job!", {
            description: `${newJob.customer_name || "Customer"} - ${newJob.pickup_address?.slice(0, 50) || "Unknown location"}`,
            duration: 15000,
            action: {
              label: "View",
              onClick: () => {
                navigate(`/app/dispatch?highlight=${newJob.id}`);
              },
            },
          });

          // Invalidate dispatch queries so the list updates when they navigate
          queryClient.invalidateQueries({ queryKey: ["dispatch-jobs"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenant?.id, isDispatchEnabled, navigate, queryClient]);

  // This component doesn't render anything - it's just a listener
  return null;
}
