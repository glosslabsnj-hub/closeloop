import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTenantConfig } from "@/hooks/useTenantConfig";
import { useCapabilities } from "@/hooks/useCapabilities";
import { useTerminology } from "@/hooks/useTerminology";
import { useKnowledgeSuggestions } from "@/hooks/useKnowledgeSuggestions";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  CheckCircle2,
  UtensilsCrossed,
  Calendar,
  Truck,
  Brain,
  ArrowRight,
} from "lucide-react";

interface BriefingItem {
  id: string;
  count: number;
  label: string;
  icon: React.ElementType;
  href: string;
  priority: number;
  color: string;
}

/**
 * TodayBriefing — "What needs my attention right now?"
 * Shows up to 5 clickable action items sorted by urgency.
 * Mode-aware: service shows pending bookings, dispatch shows unassigned jobs,
 * food shows pending orders. Calm "All clear" state when nothing needs attention.
 */
export function TodayBriefing() {
  const navigate = useNavigate();
  const { tenant } = useAuth();
  const caps = useCapabilities();
  const terms = useTerminology();
  const { pendingCount: knowledgeGaps } = useKnowledgeSuggestions();

  // Pending food orders
  const { data: pendingOrders = 0 } = useQuery({
    queryKey: ["briefing-pending-orders", tenant?.id],
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

  // Pending bookings (awaiting deposit or confirmation)
  const { data: pendingBookings = 0 } = useQuery({
    queryKey: ["briefing-pending-bookings", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return 0;
      const { count } = await supabase
        .from("bookings")
        .select("*", { count: "exact", head: true })
        .eq("tenant_id", tenant.id)
        .in("status", ["pending", "pending_deposit"]);
      return count || 0;
    },
    enabled: !!tenant?.id && caps.hasBooking,
  });

  // Unassigned dispatch jobs
  const { data: unassignedJobs = 0 } = useQuery({
    queryKey: ["briefing-unassigned-jobs", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return 0;
      const { count } = await supabase
        .from("dispatch_jobs")
        .select("*", { count: "exact", head: true })
        .eq("tenant_id", tenant.id)
        .eq("status", "pending");
      return count || 0;
    },
    enabled: !!tenant?.id && caps.hasDispatchQueue,
  });

  // Build briefing items sorted by priority
  const items: BriefingItem[] = [];

  if (pendingOrders > 0) {
    items.push({
      id: "orders",
      count: pendingOrders,
      label: pendingOrders === 1 ? "new order" : "new orders",
      icon: UtensilsCrossed,
      href: "/app/orders",
      priority: 1,
      color: "text-warning bg-warning/10",
    });
  }

  if (unassignedJobs > 0) {
    items.push({
      id: "jobs",
      count: unassignedJobs,
      label: unassignedJobs === 1 ? "unassigned job" : "unassigned jobs",
      icon: Truck,
      href: "/app/dispatch",
      priority: 2,
      color: "text-info bg-info/10",
    });
  }

  if (pendingBookings > 0) {
    items.push({
      id: "bookings",
      count: pendingBookings,
      label:
        pendingBookings === 1
          ? terms.pendingBooking
          : terms.pendingBookings,
      icon: Calendar,
      href: "/app/bookings",
      priority: 3,
      color: "text-primary bg-primary/10",
    });
  }

  if (knowledgeGaps > 0) {
    items.push({
      id: "knowledge",
      count: knowledgeGaps,
      label: knowledgeGaps === 1 ? "knowledge gap" : "knowledge gaps",
      icon: Brain,
      href: "/app/business-brain",
      priority: 5,
      color: "text-muted-foreground bg-muted",
    });
  }

  items.sort((a, b) => a.priority - b.priority);
  const displayItems = items.slice(0, 5);

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-medium">
          Today's Briefing
        </CardTitle>
      </CardHeader>
      <CardContent>
        {displayItems.length > 0 ? (
          <div className="space-y-1">
            {displayItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => navigate(item.href)}
                  className="flex items-center gap-3 w-full rounded-lg px-3 py-2.5 text-left hover:bg-muted/50 transition-colors group"
                >
                  <div
                    className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-lg shrink-0",
                      item.color
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">
                      {item.count} {item.label}
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                </button>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="h-12 w-12 rounded-full bg-success/10 flex items-center justify-center mb-3">
              <CheckCircle2 className="h-6 w-6 text-success" />
            </div>
            <p className="text-sm font-medium">All clear</p>
            <p className="text-xs text-muted-foreground mt-1">
              Nothing needs your attention right now.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
