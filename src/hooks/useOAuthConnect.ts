/**
 * useOAuthConnect — reusable hook for initiating OAuth popup flows.
 *
 * Works with both:
 * - The existing calendar-oauth-start/callback (for Google/Microsoft calendars)
 * - The new universal integration-oauth-start/callback (for all providers)
 *
 * Usage:
 *   const { connect, isConnecting } = useOAuthConnect({ onSuccess, onError });
 *   connect("hubspot");
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

interface UseOAuthConnectOptions {
  onSuccess?: (provider: string) => void;
  onError?: (provider: string, error: string) => void;
}

export function useOAuthConnect(options: UseOAuthConnectOptions = {}) {
  const { tenant } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectingProvider, setConnectingProvider] = useState<string | null>(null);
  const popupRef = useRef<Window | null>(null);

  // Listen for postMessage from popup
  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      const { type, provider, error, calendars } = event.data || {};

      // Handle universal integration OAuth
      if (type === "integration-oauth-success") {
        setIsConnecting(false);
        setConnectingProvider(null);
        popupRef.current = null;

        // Invalidate relevant queries
        queryClient.invalidateQueries({ queryKey: ["integrations", tenant?.id] });
        queryClient.invalidateQueries({ queryKey: ["calendar_connections", tenant?.id] });

        toast({ title: `${provider || "Integration"} connected` });
        options.onSuccess?.(provider);
      }

      if (type === "integration-oauth-error") {
        setIsConnecting(false);
        setConnectingProvider(null);
        popupRef.current = null;

        toast({
          title: "Connection failed",
          description: error || "Something went wrong",
          variant: "destructive",
        });
        options.onError?.(connectingProvider || "", error);
      }

      // Handle legacy calendar OAuth (backward compat)
      if (type === "calendar-oauth-success") {
        setIsConnecting(false);
        setConnectingProvider(null);
        popupRef.current = null;

        queryClient.invalidateQueries({ queryKey: ["calendar_connections", tenant?.id] });

        toast({ title: "Calendar connected" });
        options.onSuccess?.(connectingProvider || "calendar");
      }

      if (type === "calendar-oauth-error") {
        setIsConnecting(false);
        setConnectingProvider(null);
        popupRef.current = null;

        toast({
          title: "Calendar connection failed",
          description: error || "Something went wrong",
          variant: "destructive",
        });
        options.onError?.(connectingProvider || "", error);
      }
    }

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [tenant?.id, connectingProvider, queryClient, toast, options]);

  const connect = useCallback(
    async (providerId: string) => {
      if (!tenant?.id) {
        toast({
          title: "No active business",
          description: "Please select a business first.",
          variant: "destructive",
        });
        return;
      }

      setIsConnecting(true);
      setConnectingProvider(providerId);

      try {
        // Call universal OAuth start
        const { data, error } = await supabase.functions.invoke(
          "integration-oauth-start",
          {
            body: { provider: providerId, tenant_id: tenant.id },
          },
        );

        if (error) throw new Error(error.message);
        if (!data?.auth_url) throw new Error("No auth URL returned");

        // Open popup
        const width = 600;
        const height = 700;
        const left = window.screenX + (window.outerWidth - width) / 2;
        const top = window.screenY + (window.outerHeight - height) / 2;

        const popup = window.open(
          data.auth_url,
          `oauth-${providerId}`,
          `width=${width},height=${height},left=${left},top=${top},scrollbars=yes`,
        );

        if (!popup) {
          throw new Error("Popup blocked — please allow popups for this site.");
        }

        popupRef.current = popup;

        // Poll for popup close (in case user closes without completing)
        const pollTimer = setInterval(() => {
          if (popup.closed) {
            clearInterval(pollTimer);
            // Give a moment for postMessage to arrive before declaring failure
            setTimeout(() => {
              if (isConnecting) {
                setIsConnecting(false);
                setConnectingProvider(null);
              }
            }, 1000);
          }
        }, 500);
      } catch (err) {
        setIsConnecting(false);
        setConnectingProvider(null);

        const message = err instanceof Error ? err.message : "Failed to start OAuth";
        toast({
          title: "Connection failed",
          description: message,
          variant: "destructive",
        });
        options.onError?.(providerId, message);
      }
    },
    [tenant?.id, toast, options, isConnecting],
  );

  const disconnect = useCallback(
    async (providerId: string) => {
      if (!tenant?.id) return;

      try {
        // Remove from integrations table
        await supabase
          .from("integrations")
          .delete()
          .eq("tenant_id", tenant.id)
          .eq("provider", providerId);

        // Remove OAuth tokens
        await supabase
          .from("integration_oauth_tokens")
          .delete()
          .eq("tenant_id", tenant.id)
          .eq("provider", providerId);

        queryClient.invalidateQueries({ queryKey: ["integrations", tenant.id] });
        toast({ title: "Integration disconnected" });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to disconnect";
        toast({ title: "Error", description: message, variant: "destructive" });
      }
    },
    [tenant?.id, queryClient, toast],
  );

  return {
    connect,
    disconnect,
    isConnecting,
    connectingProvider,
  };
}
