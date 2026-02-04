/**
 * Hook to fetch summary previews for Policies tab sections
 * Used by the collapsed accordion view to show 1-line previews
 */

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface PoliciesSummaries {
  policies: string;
  guardrails: string;
  requiredQuestions: string;
  bookingDelivery: string;
  foodSettings: string;
  dispatchSettings: string;
  hipaa: string;
}

export function usePoliciesSummaries(): PoliciesSummaries {
  const { tenant } = useAuth();

  const { data: tenantData } = useQuery({
    queryKey: ["policies-summary", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return null;
      const { data } = await supabase
        .from("tenants")
        .select("cancellation_policy, deposit_policy, refund_policy, ai_never_promise")
        .eq("id", tenant.id)
        .single();
      return data;
    },
    enabled: !!tenant?.id,
  });

  const { data: intentRules } = useQuery({
    queryKey: ["required-questions-count", tenant?.id],
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
  });

  const { data: bookingDelivery } = useQuery({
    queryKey: ["booking-delivery-summary", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return null;
      const { data } = await supabase
        .from("booking_delivery_settings")
        .select("enabled, notify_email, webhook_url")
        .eq("tenant_id", tenant.id)
        .single();
      return data;
    },
    enabled: !!tenant?.id,
  });

  const { data: dispatchDelivery } = useQuery({
    queryKey: ["dispatch-delivery-summary", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return null;
      const { data } = await supabase
        .from("dispatch_delivery_settings")
        .select("enabled, notify_email, urgent_sms_phone")
        .eq("tenant_id", tenant.id)
        .single();
      return data;
    },
    enabled: !!tenant?.id,
  });

  // Build preview strings
  const policiesPreview = (() => {
    const parts: string[] = [];
    if (tenantData?.cancellation_policy) parts.push("Cancellation");
    if (tenantData?.deposit_policy) parts.push("Deposit");
    if (tenantData?.refund_policy) parts.push("Refund");
    return parts.length > 0 ? `${parts.join(", ")} policies set` : "No policies configured yet";
  })();

  const guardrailsPreview = (() => {
    const neverPromise = tenantData?.ai_never_promise;
    if (Array.isArray(neverPromise) && neverPromise.length > 0) {
      return `${neverPromise.length} guardrail${neverPromise.length === 1 ? "" : "s"} set`;
    }
    return "No guardrails configured yet";
  })();

  const requiredQuestionsPreview = (() => {
    if (!intentRules || intentRules.length === 0) return "Not configured yet";
    let totalRequired = 0;
    for (const rule of intentRules) {
      const action = rule.action_json as any;
      if (action?.required_inputs) {
        totalRequired += action.required_inputs.length;
      }
    }
    return totalRequired > 0 
      ? `${totalRequired} required field${totalRequired === 1 ? "" : "s"} across ${intentRules.length} intent${intentRules.length === 1 ? "" : "s"}`
      : "No required fields set";
  })();

  const bookingDeliveryPreview = (() => {
    if (!bookingDelivery) return "Not configured yet";
    const methods: string[] = [];
    if (bookingDelivery.notify_email) methods.push("Email");
    if (bookingDelivery.webhook_url) methods.push("Webhook");
    if (methods.length === 0) return "No delivery method set";
    return `Sending to ${methods.join(" & ")}`;
  })();

  const dispatchSettingsPreview = (() => {
    if (!dispatchDelivery) return "Not configured yet";
    const methods: string[] = [];
    if (dispatchDelivery.notify_email) methods.push("Email");
    if (dispatchDelivery.urgent_sms_phone) methods.push("SMS");
    if (methods.length === 0) return "No notifications set";
    return `Notifying via ${methods.join(" & ")}`;
  })();

  return {
    policies: policiesPreview,
    guardrails: guardrailsPreview,
    requiredQuestions: requiredQuestionsPreview,
    bookingDelivery: bookingDeliveryPreview,
    foodSettings: "Order pickup and delivery settings",
    dispatchSettings: dispatchSettingsPreview,
    hipaa: "HIPAA compliance and data retention",
  };
}
