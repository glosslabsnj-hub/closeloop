import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTenantConfig } from "@/hooks/useTenantConfig";
import { useCapabilities } from "@/hooks/useCapabilities";

export interface ReadinessItem {
  id: string;
  label: string;
  description: string;
  weight: number;
  complete: boolean;
  href: string;
  category: 'knowledge' | 'connection' | 'verification';
  /** Priority level for display grouping */
  priority: 'required' | 'recommended';
  /** User-friendly explanation of why this matters */
  impact: string;
}

export interface AIReadinessScore {
  score: number;
  items: ReadinessItem[];
  isReady: boolean;
  loading: boolean;
  refetch: () => void;
}

/**
 * Comprehensive AI Readiness Score with weighted checklist
 *
 * Weights (total 100):
 * - Hours set: 10
 * - Services/menu with prices: 20
 * - Policies set: 10
 * - Intake fields set: 10
 * - Post-call webhook connected + verified: 15
 * - Phone connected + test call success: 10
 * - Calendar connected OR booking_mode='pending_approval': 15
 * - At least 5 FAQs: 10
 */
export function useAIReadiness(): AIReadinessScore {
  const { tenant, assistantSettings } = useAuth();
  const { businessMode } = useTenantConfig();
  const caps = useCapabilities();

  const query = useQuery({
    queryKey: ["ai-readiness-score", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return null;

      const [
        { count: servicesCount },
        { count: menuItemsCount },
        { count: faqsCount },
        { count: policiesCount },
        { data: availabilitySlots },
        { data: calendarConnections },
        { data: bookingSettings },
      ] = await Promise.all([
        supabase.from("services").select("*", { count: "exact", head: true }).eq("tenant_id", tenant.id),
        supabase.from("menu_items").select("*", { count: "exact", head: true }).eq("tenant_id", tenant.id),
        supabase.from("business_faqs").select("*", { count: "exact", head: true }).eq("tenant_id", tenant.id),
        supabase.from("ai_knowledge_base").select("*", { count: "exact", head: true }).eq("tenant_id", tenant.id).eq("type", "policy"),
        supabase.from("availability_slots").select("id").eq("tenant_id", tenant.id).limit(1),
        supabase.from("calendar_connections").select("id, status").eq("tenant_id", tenant.id),
        supabase.from("booking_delivery_settings").select("*").eq("tenant_id", tenant.id).maybeSingle(),
      ]);

      // Check intake fields from tenant (raw query to avoid type issues)
      const intakeFields = tenant?.context_fields_json as unknown[] || [];

      return {
        servicesCount: servicesCount || 0,
        menuItemsCount: menuItemsCount || 0,
        faqsCount: faqsCount || 0,
        policiesCount: policiesCount || 0,
        hasHours: (availabilitySlots?.length || 0) > 0,
        calendarConnected: calendarConnections?.some(c => c.status === 'active') || false,
        hasWebhook: !!(bookingSettings?.webhook_url),
        intakeFields: intakeFields as unknown[],
      };
    },
    enabled: !!tenant?.id,
    staleTime: 30_000,
  });

  const items = useMemo<ReadinessItem[]>(() => {
    const data = query.data;
    const settings = assistantSettings;

    // Hours set (10 points)
    const hoursComplete = data?.hasHours || false;

    // Services/menu with prices (20 points)
    const isFood = caps.isFoodBusiness;
    const itemCount = isFood ? (data?.menuItemsCount || 0) : (data?.servicesCount || 0);
    const itemsComplete = isFood ? itemCount >= 5 : itemCount >= 3;

    // Policies set (10 points)
    const policiesComplete = (data?.policiesCount || 0) >= 1;

    // Intake fields set (10 points)
    const intakeComplete = Array.isArray(data?.intakeFields) && data.intakeFields.length >= 2;

    // Webhook connected (15 points)
    const webhookComplete = data?.hasWebhook || false;

    // Phone connected + test (10 points)
    const phoneComplete = settings?.phone_connected && settings?.setup_step_tested;

    // Calendar OR pending_approval (15 points)
    const calendarOrApprovalComplete =
      data?.calendarConnected ||
      settings?.ai_booking_mode === 'pending_approval';

    // FAQs (10 points)
    const faqsComplete = (data?.faqsCount || 0) >= 5;

    return [
      // Required items first (higher weight)
      {
        id: 'services',
        label: isFood ? 'Menu Items' : 'Services & Pricing',
        description: isFood ? 'Add at least 5 menu items with prices' : 'Add at least 3 services with pricing',
        weight: 20,
        complete: itemsComplete,
        href: '/app/business-brain?section=services',
        category: 'knowledge',
        priority: 'required',
        impact: isFood ? 'Without menu items, your AI cannot take orders' : 'Without services, your AI cannot book appointments',
      },
      {
        id: 'calendar',
        label: 'Calendar or Approval Mode',
        description: 'Connect calendar or use pending approval',
        weight: 15,
        complete: calendarOrApprovalComplete,
        href: '/app/integrations/schedule',
        category: 'connection',
        priority: 'required',
        impact: 'Without this, bookings cannot be confirmed or scheduled',
      },
      {
        id: 'webhook',
        label: 'Delivery Webhook',
        description: 'Configure booking delivery webhook',
        weight: 15,
        complete: webhookComplete,
        href: '/app/business-brain?section=policies',
        category: 'connection',
        priority: 'required',
        impact: 'Without this, you won\'t receive booking notifications',
      },
      // Recommended items (lower weight)
      {
        id: 'hours',
        label: 'Business Hours',
        description: 'Set when you are open',
        weight: 10,
        complete: hoursComplete,
        href: '/app/business-brain?section=hours',
        category: 'knowledge',
        priority: 'recommended',
        impact: 'Helps your AI tell callers when you\'re available',
      },
      {
        id: 'policies',
        label: 'Business Policies',
        description: 'Set cancellation, deposit, or payment policies',
        weight: 10,
        complete: policiesComplete,
        href: '/app/business-brain?section=policies',
        category: 'knowledge',
        priority: 'recommended',
        impact: 'Enables your AI to answer policy questions accurately',
      },
      {
        id: 'intake',
        label: 'Intake Questions',
        description: 'Define what info to collect from callers',
        weight: 10,
        complete: intakeComplete,
        href: '/app/business-brain?section=policies',
        category: 'knowledge',
        priority: 'recommended',
        impact: 'Ensures your AI collects the right information',
      },
      {
        id: 'faqs',
        label: 'FAQs (5+)',
        description: 'Add frequently asked questions',
        weight: 10,
        complete: faqsComplete,
        href: '/app/business-brain?section=knowledge',
        category: 'knowledge',
        priority: 'recommended',
        impact: 'Helps your AI handle common questions smoothly',
      },
      {
        id: 'phone',
        label: 'Phone Connected & Tested',
        description: 'Connect phone and complete test call',
        weight: 10,
        complete: phoneComplete,
        href: '/app/integrations',
        category: 'connection',
        priority: 'recommended',
        impact: 'Verifies your AI is working correctly before going live',
      },
    ];
  }, [query.data, assistantSettings, caps]);

  const score = useMemo(() => {
    return items.reduce((acc, item) => {
      return acc + (item.complete ? item.weight : 0);
    }, 0);
  }, [items]);

  return {
    score,
    items,
    isReady: score >= 85,
    loading: query.isLoading,
    refetch: query.refetch,
  };
}
