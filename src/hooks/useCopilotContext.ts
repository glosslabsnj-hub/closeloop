import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface NavigationItem {
  path: string;
  label: string;
  enabled: boolean;
}

interface HandoffStatus {
  enabled: boolean;
  methods: string[];
  has_email: boolean;
  has_sms: boolean;
  has_webhook: boolean;
}

interface OrderHandoffStatus extends HandoffStatus {
  auto_print: boolean;
}

interface DispatchHandoffStatus extends HandoffStatus {
  has_urgent_sms: boolean;
}

export interface CopilotContext {
  tenant: {
    id: string;
    business_name: string;
    industry: string;
    business_mode: string;
    timezone: string;
  };
  enabled_modules: string[];
  setup: {
    readiness_score: number;
    missing_critical_fields: string[];
  };
  phone: {
    assigned_number: string;
    connect_status: string;
    forwarding_phone: string;
    last_test_call_at: string;
    is_connected: boolean;
  };
  handoff: {
    booking: HandoffStatus;
    orders: OrderHandoffStatus;
    dispatch: DispatchHandoffStatus;
  };
  navigation_map: NavigationItem[];
  recent_activity: {
    calls: Array<{ id: string; started_at: string; outcome: string; summary: string }>;
    bookings: Array<{ id: string; start_at: string; status: string; service_name: string }>;
    orders: Array<{ id: string; created_at: string; status: string; order_number: string }>;
    dispatch_jobs: Array<{ id: string; created_at: string; status: string; job_number: string; priority: string }>;
  };
  hipaa_mode: boolean;
}

const DEFAULT_CONTEXT: CopilotContext = {
  tenant: {
    id: "",
    business_name: "",
    industry: "",
    business_mode: "service",
    timezone: "America/New_York",
  },
  enabled_modules: [],
  setup: {
    readiness_score: 0,
    missing_critical_fields: [],
  },
  phone: {
    assigned_number: "",
    connect_status: "not_connected",
    forwarding_phone: "",
    last_test_call_at: "",
    is_connected: false,
  },
  handoff: {
    booking: { enabled: false, methods: [], has_email: false, has_sms: false, has_webhook: false },
    orders: { enabled: false, methods: [], has_email: false, has_sms: false, has_webhook: false, auto_print: false },
    dispatch: { enabled: false, methods: [], has_email: false, has_sms: false, has_webhook: false, has_urgent_sms: false },
  },
  navigation_map: [],
  recent_activity: {
    calls: [],
    bookings: [],
    orders: [],
    dispatch_jobs: [],
  },
  hipaa_mode: false,
};

export function useCopilotContext() {
  const [context, setContext] = useState<CopilotContext>(DEFAULT_CONTEXT);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFetchedAt, setLastFetchedAt] = useState<number>(0);

  const fetchContext = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        setError("Not authenticated");
        setLoading(false);
        return;
      }

      const response = await supabase.functions.invoke("copilot-context", {
        headers: {
          Authorization: `Bearer ${sessionData.session.access_token}`,
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      if (response.data?.copilot_context) {
        setContext(response.data.copilot_context);
        setLastFetchedAt(Date.now());
      }
    } catch (err: any) {
      console.error("Failed to fetch copilot context:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch on mount
  useEffect(() => {
    fetchContext();
  }, [fetchContext]);

  // Refresh periodically (every 5 minutes) or when refetch is called
  const refetch = useCallback(() => {
    fetchContext();
  }, [fetchContext]);

  return { context, loading, error, refetch, lastFetchedAt };
}

// Helper functions to interpret context
export function getPhoneStatusMessage(ctx: CopilotContext): string {
  if (!ctx.phone.assigned_number) {
    return "You don't have a phone number assigned yet.";
  }
  if (!ctx.phone.is_connected) {
    return `Your number (${ctx.phone.assigned_number}) is not connected. Go to Settings → Phone to complete setup.`;
  }
  if (ctx.phone.connect_status === "forwarding_pending") {
    return `Your number (${ctx.phone.assigned_number}) is assigned, but forwarding isn't verified yet.`;
  }
  return `Your phone (${ctx.phone.assigned_number}) is connected and ready.`;
}

export function getReadinessMessage(ctx: CopilotContext): string {
  const score = ctx.setup.readiness_score;
  if (score >= 80) {
    return `Your AI readiness score is ${score}/100 — you're well prepared!`;
  }
  if (score >= 50) {
    return `Your AI readiness score is ${score}/100. Some things are missing: ${ctx.setup.missing_critical_fields.slice(0, 3).join(", ")}.`;
  }
  return `Your AI readiness score is ${score}/100. Key items missing: ${ctx.setup.missing_critical_fields.slice(0, 3).join(", ")}.`;
}

export function getHandoffStatusMessage(ctx: CopilotContext, type: "booking" | "orders" | "dispatch"): string {
  const handoff = ctx.handoff[type];
  if (!handoff.enabled) {
    return `${type.charAt(0).toUpperCase() + type.slice(1)} delivery is not enabled. Go to Settings to configure.`;
  }
  const methods: string[] = [];
  if (handoff.has_email) methods.push("email");
  if (handoff.has_sms) methods.push("SMS");
  if (handoff.has_webhook) methods.push("webhook");
  if (type === "orders" && (handoff as OrderHandoffStatus).auto_print) methods.push("auto-print");
  if (methods.length === 0) {
    return `${type.charAt(0).toUpperCase() + type.slice(1)} delivery is enabled but no methods are configured.`;
  }
  return `${type.charAt(0).toUpperCase() + type.slice(1)} delivery is set up via: ${methods.join(", ")}.`;
}

export function isFeatureEnabled(ctx: CopilotContext, feature: string): boolean {
  const mode = ctx.tenant.business_mode;
  const modules = ctx.enabled_modules;
  
  switch (feature) {
    case "bookings":
      return modules.includes("booking") || mode === "service" || mode === "medical";
    case "orders":
      return modules.includes("food_orders") || mode === "food";
    case "dispatch":
      return modules.includes("dispatch_queue") || mode === "dispatch";
    case "reservations":
      return modules.includes("reservations") || mode === "food";
    case "catering":
      return modules.includes("catering") || mode === "food";
    case "menu":
      return modules.includes("menu_knowledge") || mode === "food";
    case "medical":
      return modules.includes("medical_intake") || mode === "medical";
    default:
      return true;
  }
}

export function getNavPath(ctx: CopilotContext, feature: string): string | null {
  const navItem = ctx.navigation_map.find(
    n => n.label.toLowerCase().includes(feature.toLowerCase()) && n.enabled
  );
  return navItem?.path || null;
}
