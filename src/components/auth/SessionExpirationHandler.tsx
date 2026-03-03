import { useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { RefreshCw, Clock, AlertTriangle } from "lucide-react";

/**
 * SessionExpirationHandler
 * 
 * Monitors the user's auth session and shows a beautiful toast
 * notification when the session expires, with a one-click refresh option.
 */
export function SessionExpirationHandler() {
  const hasShownExpiredToast = useRef(false);
  const toastId = useRef<string | number | null>(null);

  const handleRefreshSession = useCallback(async () => {
    // Dismiss the current toast
    if (toastId.current) {
      toast.dismiss(toastId.current);
    }

    // Show loading state
    const loadingToastId = toast.loading("Refreshing your session...", {
      description: "Please wait a moment",
    });

    try {
      const { data, error } = await supabase.auth.refreshSession();
      
      toast.dismiss(loadingToastId);

      if (error) {
        // If refresh fails, redirect to login
        toast.error("Session refresh failed", {
          description: "Please sign in again to continue.",
          duration: 5000,
        });
        
        // Give user time to see the message, then redirect
        setTimeout(() => {
          window.location.href = "/login";
        }, 2000);
        return;
      }

      if (data.session) {
        hasShownExpiredToast.current = false;
        toast.success("Session refreshed!", {
          description: "You can continue working without interruption.",
          duration: 3000,
        });
      }
    } catch (err) {
      toast.dismiss(loadingToastId);
      toast.error("Session couldn't be refreshed", {
        description: "Please try signing in again.",
        duration: 5000,
      });
    }
  }, []);

  const showExpirationToast = useCallback(() => {
    if (hasShownExpiredToast.current) return;
    hasShownExpiredToast.current = true;

    toastId.current = toast.custom(
      (t) => (
        <div className="w-full max-w-md rounded-xl border border-warning/30 bg-card/95 backdrop-blur-xl shadow-2xl shadow-warning/10 p-4 animate-in slide-in-from-top-2 fade-in duration-300">
          {/* Header */}
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-xl bg-warning/15 flex items-center justify-center shrink-0">
              <Clock className="h-5 w-5 text-warning" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                Session Expired
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-warning/10 text-warning text-[10px] font-medium uppercase tracking-wider">
                  <AlertTriangle className="h-3 w-3" />
                  Action Required
                </span>
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Your session has expired. Don't worry — your work is safe.
              </p>
            </div>
          </div>

          {/* Action */}
          <div className="mt-4 flex items-center gap-2">
            <Button
              onClick={handleRefreshSession}
              size="sm"
              className="flex-1 gap-2 bg-warning hover:bg-warning/90 text-warning-foreground font-medium shadow-lg shadow-warning/20"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh Session
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                toast.dismiss(t);
                window.location.href = "/login";
              }}
              className="text-muted-foreground hover:text-foreground"
            >
              Sign Out
            </Button>
          </div>

          {/* Subtle footer */}
          <p className="mt-3 text-[11px] text-muted-foreground/60 text-center">
            Sessions expire after inactivity for security purposes
          </p>
        </div>
      ),
      {
        duration: Infinity, // Don't auto-dismiss
        position: "top-center",
      }
    );
  }, [handleRefreshSession]);

  useEffect(() => {
    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        // TOKEN_REFRESHED means session was successfully refreshed
        if (event === "TOKEN_REFRESHED" && session) {
          hasShownExpiredToast.current = false;
          if (toastId.current) {
            toast.dismiss(toastId.current);
            toastId.current = null;
          }
        }

        // SIGNED_OUT could indicate session expiration
        if (event === "SIGNED_OUT") {
          // Only show toast if user was previously signed in and didn't manually sign out
          // We check this by seeing if the URL is not already on the auth page
          if (!window.location.pathname.includes("/login")) {
            showExpirationToast();
          }
        }
      }
    );

    // Also set up a periodic check for session validity
    const checkSessionValidity = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session && !window.location.pathname.includes("/login")) {
        showExpirationToast();
      }
    };

    // Check every 5 minutes
    const intervalId = setInterval(checkSessionValidity, 5 * 60 * 1000);

    return () => {
      subscription.unsubscribe();
      clearInterval(intervalId);
      if (toastId.current) {
        toast.dismiss(toastId.current);
      }
    };
  }, [showExpirationToast]);

  return null; // This component doesn't render anything
}
