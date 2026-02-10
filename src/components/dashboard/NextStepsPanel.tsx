import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CheckCircle2,
  Calendar,
  ShoppingBag,
  Truck,
  UserPlus,
  ArrowRight,
  Link2,
  Sparkles,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCapabilities } from "@/hooks/useCapabilities";
import { formatDistanceToNow } from "date-fns";

interface RecentOutcome {
  id: string;
  type: "booking" | "order" | "dispatch" | "lead";
  title: string;
  subtitle: string;
  time: string;
  synced: boolean;
}

export function NextStepsPanel() {
  const navigate = useNavigate();
  const { tenant } = useAuth();
  const caps = useCapabilities();
  const businessMode = tenant?.business_mode || "service";

  const { data: recentOutcomes, isLoading } = useQuery({
    queryKey: ["recent-outcomes", tenant?.id],
    queryFn: async (): Promise<RecentOutcome[]> => {
      if (!tenant?.id) return [];

      const outcomes: RecentOutcome[] = [];

      // Fetch recent bookings
      if (caps.hasBooking) {
        const { data: bookings } = await supabase
          .from("bookings")
          .select("id, status, start_at, created_at, leads(full_name)")
          .eq("tenant_id", tenant.id)
          .order("created_at", { ascending: false })
          .limit(3);

        bookings?.forEach((b) => {
          outcomes.push({
            id: b.id,
            type: "booking",
            title: (b.leads as any)?.full_name || "New Booking",
            subtitle: `Scheduled for ${new Date(b.start_at).toLocaleDateString()}`,
            time: formatDistanceToNow(new Date(b.created_at), { addSuffix: true }),
            synced: false, // Would check routing_rules status
          });
        });
      }

      // Fetch recent orders (food mode)
      if (caps.hasFoodOrders) {
        // Orders table may not exist in all schemas, wrap in try-catch
        try {
          const { data: orders } = await supabase
            .from("dispatch_jobs")
            .select("id, status, customer_name, price_cents, created_at")
            .eq("tenant_id", tenant.id)
            .order("created_at", { ascending: false })
            .limit(3);

          orders?.forEach((o: any) => {
            outcomes.push({
              id: o.id,
              type: "order",
              title: o.customer_name || "New Order",
              subtitle: `$${((o.price_cents || 0) / 100).toFixed(2)} - ${o.status}`,
              time: formatDistanceToNow(new Date(o.created_at), { addSuffix: true }),
              synced: false,
            });
          });
        } catch {
          // Orders table doesn't exist yet
        }
      }

      // Fetch recent dispatch jobs
      if (caps.hasDispatchQueue) {
        const { data: jobs } = await supabase
          .from("dispatch_jobs")
          .select("id, status, customer_name, job_type, created_at")
          .eq("tenant_id", tenant.id)
          .order("created_at", { ascending: false })
          .limit(3);

        jobs?.forEach((j) => {
          outcomes.push({
            id: j.id,
            type: "dispatch",
            title: j.customer_name || "New Job",
            subtitle: j.job_type || j.status,
            time: formatDistanceToNow(new Date(j.created_at), { addSuffix: true }),
            synced: false,
          });
        });
      }

      // Sort by most recent
      return outcomes.slice(0, 4);
    },
    enabled: !!tenant?.id,
    refetchInterval: 30000,
  });

  const { data: hasIntegrations } = useQuery({
    queryKey: ["has-integrations", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return false;
      const { count } = await supabase
        .from("integrations")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenant.id)
        .eq("status", "connected");
      return (count || 0) > 0;
    },
    enabled: !!tenant?.id,
  });

  const getIcon = (type: string) => {
    switch (type) {
      case "booking":
        return <Calendar className="h-4 w-4 text-blue-500" />;
      case "order":
        return <ShoppingBag className="h-4 w-4 text-orange-500" />;
      case "dispatch":
        return <Truck className="h-4 w-4 text-emerald-500" />;
      case "lead":
        return <UserPlus className="h-4 w-4 text-purple-500" />;
      default:
        return <CheckCircle2 className="h-4 w-4 text-muted-foreground" />;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">What's Happening</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const hasOutcomes = recentOutcomes && recentOutcomes.length > 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          What's Happening
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {hasOutcomes ? (
          <>
            <div className="space-y-2">
              {recentOutcomes.map((outcome) => (
                <div
                  key={outcome.id}
                  className="flex items-center justify-between py-2 px-2 -mx-2 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-1.5 rounded-lg bg-muted">
                      {getIcon(outcome.type)}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{outcome.title}</p>
                      <p className="text-xs text-muted-foreground">{outcome.subtitle}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">{outcome.time}</p>
                    {outcome.synced && (
                      <Badge variant="secondary" className="text-xs">
                        <CheckCircle2 className="h-2.5 w-2.5 mr-1" />
                        Synced
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Integration prompt - only if no integrations connected */}
            {!hasIntegrations && (
              <div className="pt-2 border-t">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-between text-muted-foreground hover:text-foreground"
                  onClick={() => navigate("/app/integrations")}
                >
                  <span className="flex items-center gap-2">
                    <Link2 className="h-4 w-4" />
                    Sync to Google Calendar, Sheets & more
                  </span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground mb-3">
              No recent activity yet. When AI handles calls, outcomes will appear here.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/app/simulator")}
            >
              Test your AI
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
