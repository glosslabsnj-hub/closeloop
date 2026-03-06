/**
 * Hook to fetch summary previews for all Business Brain sections
 * Used by CollapsibleBrainSection to show 1-line previews
 * 
 * Updated to use the new dynamic completion system from useBrainCompletion
 */

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useBrainCompletion, type CompletionStats } from "./useBrainCompletion";
import { useTenantConfig } from "./useTenantConfig";

interface BrainSummaries {
  isLoading: boolean;
  // Profile
  businessInfo: string;
  templates: string;
  
  // Hours
  hours: string;
  
  // Services
  pricingReadiness: string;
  pricingRules: string;
  catalog: string;
  
  // Service Area
  coverage: string;
  travelTimes: string;
  workload: string;
  
  // Availability
  calendar: string;
  
  // Policies
  policies: string;
  guardrails: string;
  requiredQuestions: string;
  bookingDelivery: string;
  foodSettings: string;
  dispatchSettings: string;
  hipaa: string;
  
  // AI Behavior
  scripts: string;
  guidelines: string;
  intelligence: string;
  
  // Knowledge
  review: string;
  faqs: string;
  objections: string;
  custom: string;
  documents: string;

  // NEW: Dynamic completion tracking (from useBrainCompletion)
  completionStats: {
    completed: number;
    total: number;
    percentage: number;
    incompleteItems: { section: string; label: string }[];
  };
  
  // Extended completion info
  fullCompletionStats: CompletionStats;
}

export function useBrainSummaries(): BrainSummaries {
  const { tenant } = useAuth();
  const { businessMode } = useTenantConfig();
  const fullCompletionStats = useBrainCompletion();

  // Fetch tenant data for multiple sections
  const { data: tenantData, isLoading: tenantLoading } = useQuery({
    queryKey: ["brain-summaries-tenant", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return null;
      const { data } = await supabase
        .from("tenants")
        .select("business_mode, cancellation_policy, deposit_policy, refund_policy, ai_never_promise, ai_policies_json")
        .eq("id", tenant.id)
        .single();
      return data;
    },
    enabled: !!tenant?.id,
    staleTime: 30000,
  });

  // Fetch AI assistant for greeting script
  const { data: assistantData } = useQuery({
    queryKey: ["brain-summaries-assistant", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return null;
      const { data } = await supabase
        .from("ai_assistants")
        .select("greeting_script")
        .eq("tenant_id", tenant.id)
        .single();
      return data;
    },
    enabled: !!tenant?.id,
    staleTime: 30000,
  });

  // Fetch counts for various entities
  const { data: counts, isLoading: countsLoading } = useQuery({
    queryKey: ["brain-summaries-counts", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return null;
      
      const [services, faqs, objections, knowledge, slots] = await Promise.all([
        supabase.from("services").select("id", { count: "exact", head: true }).eq("tenant_id", tenant.id).eq("is_active", true),
        supabase.from("business_faqs").select("id", { count: "exact", head: true }).eq("tenant_id", tenant.id),
        supabase.from("objection_responses").select("id", { count: "exact", head: true }).eq("tenant_id", tenant.id),
        supabase.from("ai_knowledge_base").select("id", { count: "exact", head: true }).eq("tenant_id", tenant.id),
        supabase.from("availability_slots").select("id", { count: "exact", head: true }).eq("tenant_id", tenant.id).eq("is_available", true),
      ]);

      return {
        services: services.count || 0,
        faqs: faqs.count || 0,
        objections: objections.count || 0,
        knowledge: knowledge.count || 0,
        slots: slots.count || 0,
      };
    },
    enabled: !!tenant?.id,
    staleTime: 30000,
  });

  // Fetch required questions
  const { data: intentRules } = useQuery({
    queryKey: ["brain-summaries-intent-rules", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return [];
      const { data } = await supabase
        .from("business_intent_rules")
        .select("action_json")
        .eq("tenant_id", tenant.id)
        .eq("rule_type", "required_inputs" as any);
      return data || [];
    },
    enabled: !!tenant?.id,
    staleTime: 30000,
  });

  // Fetch delivery settings (only for modes that use bookings)
  const hasBookingMode = businessMode === "service" || businessMode === "medical" || businessMode === "sales";
  const { data: bookingDelivery } = useQuery({
    queryKey: ["brain-summaries-booking-delivery", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return null;
      const { data } = await supabase
        .from("booking_delivery_settings")
        .select("enabled, notify_email, webhook_url")
        .eq("tenant_id", tenant.id)
        .maybeSingle();
      return data;
    },
    enabled: !!tenant?.id && hasBookingMode,
    staleTime: 30000,
  });

  const { data: dispatchDelivery } = useQuery({
    queryKey: ["brain-summaries-dispatch-delivery", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return null;
      const { data } = await supabase
        .from("dispatch_delivery_settings")
        .select("enabled, notify_email, urgent_sms_phone")
        .eq("tenant_id", tenant.id)
        .single();
      return data;
    },
    enabled: !!tenant?.id && businessMode === "dispatch",
    staleTime: 30000,
  });

  // Fetch calendar connections
  const { data: calendarConnections } = useQuery({
    queryKey: ["brain-summaries-calendar", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return [];
      const { data } = await supabase
        .from("calendar_connections")
        .select("provider, status")
        .eq("tenant_id", tenant.id);
      return data || [];
    },
    enabled: !!tenant?.id,
    staleTime: 30000,
  });

  // Build preview strings
  // Check if hours are configured (has at least one non-closed day with windows)
  const hasHoursConfigured = (() => {
    const hoursJson = tenant?.hours_json as unknown as Record<string, { closed?: boolean; windows?: { open: string; close: string }[]; open?: string; close?: string }> | null;
    if (!hoursJson || typeof hoursJson !== "object") return false;
    
    // Check for at least one open day with valid hours
    return Object.values(hoursJson).some(day => {
      if (!day || day.closed) return false;
      // New format: has windows array
      if (Array.isArray(day.windows) && day.windows.length > 0) return true;
      // Legacy format: has open/close times
      if (day.open && day.close) return true;
      return false;
    });
  })();

  return {
    isLoading: (tenantLoading && !tenantData) || (countsLoading && !counts),

    // Profile
    businessInfo: tenant?.name ? `${tenant.name} — Your business identity` : "Not set up yet",
    templates: "Pre-built setups for common business types",

    // Hours - check hours_json instead of availability_slots
    hours: hasHoursConfigured 
      ? "Operating hours configured" 
      : "No hours set yet",

    // Services
    pricingReadiness: "Check if your AI can quote prices",
    pricingRules: "Configure how prices are calculated",
    catalog: counts?.services
      ? `${counts.services} item${counts.services === 1 ? "" : "s"} in catalog`
      : "No services added yet",

    // Service Area
    coverage: "Define where you can serve customers",
    travelTimes: "Set arrival time estimates",
    workload: "Set how busy you are to adjust wait times",

    // Availability
    calendar: (() => {
      if (!calendarConnections || calendarConnections.length === 0) return "Connect your calendar for real-time availability";
      const connected = calendarConnections.filter(c => c.status === "connected");
      if (connected.length === 0) return "Calendar needs reconnection";
      return `${connected.length} calendar${connected.length === 1 ? "" : "s"} connected`;
    })(),

    // Policies
    policies: (() => {
      const parts: string[] = [];
      if (tenantData?.cancellation_policy) parts.push("Cancellation");
      if (tenantData?.deposit_policy) parts.push("Deposit");
      if (tenantData?.refund_policy) parts.push("Refund");
      return parts.length > 0 ? `${parts.join(", ")} policies set` : "No policies set yet";
    })(),
    guardrails: (() => {
      const neverPromise = tenantData?.ai_never_promise;
      if (Array.isArray(neverPromise) && neverPromise.length > 0) {
        return `${neverPromise.length} guardrail${neverPromise.length === 1 ? "" : "s"} set`;
      }
      return "No limits set yet";
    })(),
    requiredQuestions: (() => {
      if (!intentRules || intentRules.length === 0) return "Not set up yet";
      let totalRequired = 0;
      for (const rule of intentRules) {
        const action = rule.action_json as { required_inputs?: string[] } | null;
        if (action?.required_inputs) {
          totalRequired += action.required_inputs.length;
        }
      }
      return totalRequired > 0 
        ? `${totalRequired} required field${totalRequired === 1 ? "" : "s"}` 
        : "No required fields set";
    })(),
    bookingDelivery: (() => {
      if (!bookingDelivery) return "Not set up yet";
      const methods: string[] = [];
      if (bookingDelivery.notify_email) methods.push("Email");
      if (bookingDelivery.webhook_url) methods.push("Webhook");
      if (methods.length === 0) return "No delivery method set";
      return `Sending to ${methods.join(" & ")}`;
    })(),
    foodSettings: "Order pickup and delivery settings",
    dispatchSettings: (() => {
      if (!dispatchDelivery) return "Not set up yet";
      const methods: string[] = [];
      if (dispatchDelivery.notify_email) methods.push("Email");
      if (dispatchDelivery.urgent_sms_phone) methods.push("SMS");
      if (methods.length === 0) return "No notifications set";
      return `Notifying via ${methods.join(" & ")}`;
    })(),
    hipaa: "HIPAA compliance and data retention",

    // AI Behavior
    scripts: assistantData?.greeting_script ? "Custom greeting configured" : "Using the default — customize to match your style",
    guidelines: (() => {
      const policies = tenantData?.ai_policies_json;
      if (Array.isArray(policies) && policies.length > 0) {
        return `${policies.length} guideline${policies.length === 1 ? "" : "s"} set`;
      }
      return "No special instructions yet";
    })(),
    intelligence: "How your AI remembers and improves",

    // Knowledge
    review: "Items needing your approval",
    faqs: counts?.faqs
      ? `${counts.faqs} question${counts.faqs === 1 ? "" : "s"} added`
      : "No questions added yet — your AI says 'I'm not sure' to unknowns",
    objections: counts?.objections
      ? `${counts.objections} response${counts.objections === 1 ? "" : "s"} configured`
      : "No responses set — your AI uses generic replies to pushback",
    custom: counts?.knowledge
      ? `${counts.knowledge} custom fact${counts.knowledge === 1 ? "" : "s"}`
      : "Nothing extra added yet",
    documents: "Uploaded files and references",

    // Completion stats - now using the dynamic completion system
    // Keep legacy format for backward compatibility
    completionStats: (() => {
      const incompleteItems = [
        ...fullCompletionStats.incompleteRequired.map(s => ({
          section: s.field.section,
          label: s.field.label,
        })),
      ];
      
      return {
        completed: fullCompletionStats.completedRequired,
        total: fullCompletionStats.totalRequired,
        percentage: fullCompletionStats.requiredPercentage,
        incompleteItems,
      };
    })(),
    
    // Extended completion info from the new dynamic system
    fullCompletionStats,
  };
}
