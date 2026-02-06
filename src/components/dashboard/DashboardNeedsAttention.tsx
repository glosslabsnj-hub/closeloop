import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { useTenantConfig } from "@/hooks/useTenantConfig";
import { useTerminology } from "@/hooks/useTerminology";
import { useKnowledgeSuggestions } from "@/hooks/useKnowledgeSuggestions";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { 
  AlertTriangle, 
  Calendar,
  Brain, 
  PhoneMissed,
  ChefHat,
  Truck,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";

interface AttentionItem {
  id: string;
  count: number;
  label: string;
  icon: React.ElementType;
  href: string;
  priority: "high" | "medium" | "low";
}

export function DashboardNeedsAttention() {
  const navigate = useNavigate();
  const { tenant } = useAuth();
  const { businessMode } = useTenantConfig();
  const terms = useTerminology();
  const { pendingCount: knowledgeGaps } = useKnowledgeSuggestions();

  // Fetch pending orders (food mode)
  const { data: pendingOrders = 0, isLoading: ordersLoading } = useQuery({
    queryKey: ["attention-orders", tenant?.id],
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

  // Fetch pending jobs (dispatch mode)
  const { data: pendingJobs = 0, isLoading: jobsLoading } = useQuery({
    queryKey: ["attention-jobs", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return 0;
      const { count } = await supabase
        .from("dispatch_jobs")
        .select("*", { count: "exact", head: true })
        .eq("tenant_id", tenant.id)
        .eq("status", "pending");
      return count || 0;
    },
    enabled: !!tenant?.id && businessMode === "dispatch",
  });

  // Fetch unconfirmed bookings
  const { data: unconfirmedBookings = 0, isLoading: bookingsLoading } = useQuery({
    queryKey: ["attention-bookings", tenant?.id],
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

  // Fetch calls that might need follow-up (lost outcome in last 24h)
  const { data: lostCalls = 0, isLoading: callsLoading } = useQuery({
    queryKey: ["attention-lost-calls", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return 0;
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { count } = await supabase
        .from("ai_call_sessions")
        .select("*", { count: "exact", head: true })
        .eq("tenant_id", tenant.id)
        .eq("outcome", "lost")
        .gte("started_at", yesterday);
      return count || 0;
    },
    enabled: !!tenant?.id,
  });

  const isLoading = ordersLoading || jobsLoading || bookingsLoading || callsLoading;

  // Build attention items
  const items: AttentionItem[] = [];

  if (businessMode === "food" && pendingOrders > 0) {
    items.push({
      id: "orders",
      count: pendingOrders,
      label: pendingOrders === 1 ? "new order waiting" : "new orders waiting",
      icon: ChefHat,
      href: "/app/orders?status=pending",
      priority: "high",
    });
  }

  if (businessMode === "dispatch" && pendingJobs > 0) {
    items.push({
      id: "jobs",
      count: pendingJobs,
      label: pendingJobs === 1 ? "job needs assignment" : "jobs need assignment",
      icon: Truck,
      href: "/app/dispatch?status=pending",
      priority: "high",
    });
  }

  if (unconfirmedBookings > 0) {
    items.push({
      id: "bookings",
      count: unconfirmedBookings,
      label: unconfirmedBookings === 1 ? terms.pendingBooking : terms.pendingBookings,
      icon: Calendar,
      href: "/app/bookings?status=pending",
      priority: "medium",
    });
  }

  if (lostCalls > 0) {
    items.push({
      id: "lost",
      count: lostCalls,
      label: lostCalls === 1 ? "lead to recover" : "leads to recover",
      icon: PhoneMissed,
      href: "/app/inbox?filter=lost",
      priority: "medium",
    });
  }

  if (knowledgeGaps > 0) {
    items.push({
      id: "knowledge",
      count: knowledgeGaps,
      label: knowledgeGaps === 1 ? "knowledge gap to address" : "knowledge gaps to address",
      icon: Brain,
      href: "/app/business-brain",
      priority: "low",
    });
  }

  // Sort by priority
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  items.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-medium">Needs Attention</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-medium">Needs Attention</CardTitle>
          {items.length > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-warning/10 px-1.5 text-xs font-semibold text-warning">
              {items.reduce((sum, item) => sum + item.count, 0)}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {items.length > 0 ? (
          <div className="space-y-2">
            {items.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => navigate(item.href)}
                  className={cn(
                    "w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors",
                    "hover:bg-muted/50",
                    item.priority === "high" && "bg-warning/5 border border-warning/20"
                  )}
                >
                  <div className={cn(
                    "h-9 w-9 rounded-lg flex items-center justify-center shrink-0",
                    item.priority === "high" 
                      ? "bg-warning/10 text-warning" 
                      : "bg-muted text-muted-foreground"
                  )}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">
                      <span className="text-foreground">{item.count}</span>{" "}
                      <span className="text-muted-foreground">{item.label}</span>
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </button>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="h-12 w-12 rounded-full bg-success/10 flex items-center justify-center mb-3">
              <CheckCircle2 className="h-6 w-6 text-success" />
            </div>
            <p className="text-sm font-medium text-foreground">All caught up!</p>
            <p className="text-xs text-muted-foreground mt-1">
              No items need your attention right now.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
