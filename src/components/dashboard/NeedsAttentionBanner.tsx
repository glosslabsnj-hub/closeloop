import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useTenantConfig } from "@/hooks/useTenantConfig";
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
  const { businessMode } = useTenantConfig();
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

  // Build attention items
  const items: AttentionItem[] = [];

  if (pendingOrders > 0) {
    items.push({
      count: pendingOrders,
      label: pendingOrders === 1 ? "new order" : "new orders",
      icon: ChefHat,
      href: "/app/orders",
      priority: 1,
    });
  }

  if (pendingBookings > 0) {
    items.push({
      count: pendingBookings,
      label: pendingBookings === 1 ? terms.pendingBooking : terms.pendingBookings,
      icon: Calendar,
      href: "/app/bookings",
      priority: 2,
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

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-xl bg-warning/[0.06] backdrop-blur-sm border border-warning/20 animate-fade-in card-interactive">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="h-10 w-10 rounded-xl bg-warning/15 border border-warning/20 flex items-center justify-center shrink-0 shadow-[0_0_16px_-4px_hsl(38_90%_50%/0.25)]">
          <AlertCircle className="h-4 w-4 text-warning" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold tracking-tight text-warning">Needs Your Attention</p>
          <p className="text-xs text-warning/70 truncate">
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
        className="bg-warning hover:bg-warning/90 text-warning-foreground shrink-0 h-9 text-xs font-semibold shadow-sm"
        onClick={() => navigate(primaryItem.href)}
      >
        Review
        <ArrowRight className="h-3 w-3 ml-1" />
      </Button>
    </div>
  );
}
