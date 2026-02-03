import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useTenantConfig } from "@/hooks/useTenantConfig";
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
    enabled: !!tenant?.id && businessMode === "food",
  });

  // Fetch pending bookings (pending_deposit status)
  const { data: pendingBookings = 0 } = useQuery({
    queryKey: ["attention-pending-bookings", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return 0;
      const { count } = await supabase
        .from("bookings")
        .select("*", { count: "exact", head: true })
        .eq("tenant_id", tenant.id)
        .eq("status", "pending_deposit");
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
      label: pendingBookings === 1 ? "pending booking" : "pending bookings",
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
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-xl bg-warning/10 border border-warning/30 animate-fade-in">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="h-10 w-10 rounded-xl bg-warning/20 flex items-center justify-center shrink-0">
          <AlertCircle className="h-5 w-5 text-warning" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-warning">Needs Attention</p>
          <p className="text-xs text-warning/70 mb-1">
            These items need your attention to keep your business running smoothly
          </p>
          <p className="text-sm text-warning/80 truncate">
            {items.map((item, i) => (
              <span key={item.href}>
                {item.count} {item.label}
                {i < items.length - 1 && " • "}
              </span>
            ))}
          </p>
        </div>
      </div>
      <Button 
        size="sm"
        className="bg-warning hover:bg-warning/90 text-warning-foreground shrink-0"
        onClick={() => navigate(primaryItem.href)}
      >
        View {primaryItem.label.split(" ").pop()}
        <ArrowRight className="h-4 w-4 ml-1" />
      </Button>
    </div>
  );
}
