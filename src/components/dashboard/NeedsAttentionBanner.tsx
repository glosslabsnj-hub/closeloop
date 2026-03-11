import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useCapabilities } from "@/hooks/useCapabilities";
import { useIndustryContext } from "@/hooks/useIndustryContext";
import { useKnowledgeSuggestions } from "@/hooks/useKnowledgeSuggestions";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertCircle,
  ChefHat,
  Brain,
  Calendar,
  ArrowRight,
  DollarSign,
  PhoneIncoming,
} from "lucide-react";

interface AttentionItem {
  count: number;
  label: string;
  icon: React.ElementType;
  href: string;
  priority: number;
}

export function NeedsAttentionBanner() {
  const navigate = useNavigate();
  const { tenant } = useAuth();
  const caps = useCapabilities();
  const { terms } = useIndustryContext();
  const { pendingCount: knowledgeGaps } = useKnowledgeSuggestions();

  // Fetch pending orders (food mode)
  const { data: pendingOrders = 0 } = useQuery({
    queryKey: ["attention-pending-orders", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return 0;
      const { count } = await supabase
        .from("food_orders")
        .select("*", { count: "exact", head: true })
        .eq("tenant_id", tenant.id)
        .eq("status", "pending");
      return count || 0;
    },
    enabled: !!tenant?.id && caps.hasFoodOrders,
  });

  // Fetch unpaid invoices (service + dispatch modes)
  const { data: unpaidInvoices = 0 } = useQuery({
    queryKey: ["attention-unpaid-invoices", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return 0;
      const { count } = await supabase
        .from("invoices")
        .select("*", { count: "exact", head: true })
        .eq("tenant_id", tenant.id)
        .in("status", ["pending", "sent", "overdue"])
        .gt("balance_due_cents", 0);
      return count || 0;
    },
    enabled: !!tenant?.id && (caps.hasBooking || caps.hasDispatchQueue),
  });

  // Fetch pending bookings (pending or pending_deposit status)
  const { data: pendingBookings = 0 } = useQuery({
    queryKey: ["attention-pending-bookings", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return 0;
      const { count } = await supabase
        .from("bookings")
        .select("*", { count: "exact", head: true })
        .eq("tenant_id", tenant.id)
        .in("status", ["pending", "pending_deposit"]);
      return count || 0;
    },
    enabled: !!tenant?.id,
  });

  // Fetch pending callbacks (urgent first)
  const { data: callbackCounts } = useQuery({
    queryKey: ["attention-pending-callbacks", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return { total: 0, urgent: 0 };
      const { count: total } = await supabase
        .from("callback_requests")
        .select("*", { count: "exact", head: true })
        .eq("tenant_id", tenant.id)
        .eq("status", "pending");
      const { count: urgent } = await supabase
        .from("callback_requests")
        .select("*", { count: "exact", head: true })
        .eq("tenant_id", tenant.id)
        .eq("status", "pending")
        .in("urgency", ["urgent", "high"]);
      return { total: total || 0, urgent: urgent || 0 };
    },
    enabled: !!tenant?.id,
    refetchInterval: 30_000, // Refresh every 30s for real-time feel
  });

  // Build attention items
  const items: AttentionItem[] = [];

  if ((callbackCounts?.total || 0) > 0) {
    const urgentLabel = callbackCounts!.urgent > 0 ? ` (${callbackCounts!.urgent} urgent)` : "";
    items.push({
      count: callbackCounts!.total,
      label: callbackCounts!.total === 1 ? `callback waiting${urgentLabel}` : `callbacks waiting${urgentLabel}`,
      icon: PhoneIncoming,
      href: "/app/calls",
      priority: callbackCounts!.urgent > 0 ? 0 : 2, // Urgent callbacks = highest priority
    });
  }

  if (unpaidInvoices > 0) {
    items.push({
      count: unpaidInvoices,
      label: unpaidInvoices === 1 ? "unpaid invoice" : "unpaid invoices",
      icon: DollarSign,
      href: "/app/bookings",
      priority: 1,
    });
  }

  if (pendingOrders > 0) {
    items.push({
      count: pendingOrders,
      label: pendingOrders === 1 ? "new order" : "new orders",
      icon: ChefHat,
      href: "/app/orders",
      priority: 2,
    });
  }

  if (pendingBookings > 0) {
    items.push({
      count: pendingBookings,
      label: pendingBookings === 1 ? terms.pendingBooking : terms.pendingBookings,
      icon: Calendar,
      href: "/app/bookings",
      priority: 3,
    });
  }

  if (knowledgeGaps > 0) {
    items.push({
      count: knowledgeGaps,
      label: knowledgeGaps === 1 ? "knowledge gap" : "knowledge gaps",
      icon: Brain,
      href: "/app/business-brain",
      priority: 3,
    });
  }

  // Sort by priority
  items.sort((a, b) => a.priority - b.priority);

  // Nothing needs attention
  if (items.length === 0) return null;

  // Get highest priority item for main action
  const primaryItem = items[0];
  const hasUrgent = (callbackCounts?.urgent || 0) > 0;

  return (
    <div className={`flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-xl backdrop-blur-sm animate-fade-in card-interactive ${
      hasUrgent
        ? "bg-destructive/[0.08] border border-destructive/25"
        : "bg-warning/[0.06] border border-warning/20"
    }`}>
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${
          hasUrgent
            ? "bg-destructive/15 border border-destructive/25 shadow-[0_0_16px_-4px_hsl(0_90%_50%/0.3)]"
            : "bg-warning/15 border border-warning/20 shadow-[0_0_16px_-4px_hsl(38_90%_50%/0.25)]"
        }`}>
          <AlertCircle className={`h-4 w-4 ${hasUrgent ? "text-destructive" : "text-warning"}`} />
        </div>
        <div className="min-w-0">
          <p className={`text-sm font-semibold tracking-tight truncate ${hasUrgent ? "text-destructive" : "text-warning"}`}>
            {hasUrgent ? "Urgent - Action Required" : "Needs Your Attention"}
          </p>
          <p className={`text-xs truncate ${hasUrgent ? "text-destructive/70" : "text-warning/70"}`}>
            {items.map((item, i) => (
              <span key={item.href}>
                {item.count} {item.label}
                {i < items.length - 1 && " · "}
              </span>
            ))}
          </p>
        </div>
      </div>
      <Button
        size="sm"
        className={`shrink-0 h-9 text-xs font-semibold shadow-sm ${
          hasUrgent
            ? "bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            : "bg-warning hover:bg-warning/90 text-warning-foreground"
        }`}
        onClick={() => navigate(primaryItem.href)}
      >
        Review
        <ArrowRight className="h-3 w-3 ml-1" />
      </Button>
    </div>
  );
}
