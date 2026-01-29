import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Bot, Phone, Calendar, TrendingUp } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { startOfDay, endOfDay, startOfWeek, endOfWeek } from "date-fns";

export function QuickStatsCard() {
  const { tenant } = useAuth();

  const { data: stats, isLoading } = useQuery({
    queryKey: ["quick-stats", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return { callsAnswered: 0, bookingsThisWeek: 0, revenueRecovered: 0 };

      const today = new Date();
      const weekStart = startOfWeek(today, { weekStartsOn: 1 }).toISOString();
      const weekEnd = endOfWeek(today, { weekStartsOn: 1 }).toISOString();

      const [callsResult, bookingsResult] = await Promise.all([
        supabase
          .from("ai_call_sessions")
          .select("*", { count: "exact", head: true })
          .eq("tenant_id", tenant.id)
          .gte("started_at", weekStart)
          .lte("started_at", weekEnd),
        supabase
          .from("bookings")
          .select("deposit_paid, service_id, services(price_cents)")
          .eq("tenant_id", tenant.id)
          .gte("created_at", weekStart)
          .lte("created_at", weekEnd),
      ]);

      const bookings = bookingsResult.data || [];
      const bookingsThisWeek = bookings.length;

      // Calculate revenue from confirmed bookings with deposits
      const revenueRecovered = bookings
        .filter((b) => b.deposit_paid)
        .reduce((sum, b) => {
          const price = (b.services as any)?.price_cents || 0;
          return sum + price / 100;
        }, 0);

      return {
        callsAnswered: callsResult.count || 0,
        bookingsThisWeek,
        revenueRecovered: Math.round(revenueRecovered),
      };
    },
    enabled: !!tenant?.id,
    refetchInterval: 30000,
  });

  const statItems = [
    {
      label: "Calls Answered",
      value: stats?.callsAnswered ?? 0,
      icon: Phone,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      label: "Bookings",
      value: stats?.bookingsThisWeek ?? 0,
      icon: Calendar,
      color: "text-success",
      bgColor: "bg-success/10",
    },
    {
      label: "Revenue",
      value: `$${(stats?.revenueRecovered ?? 0).toLocaleString()}`,
      icon: TrendingUp,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
  ];

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Bot className="h-4 w-4 text-muted-foreground" />
            This Week
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="text-center">
                <Skeleton className="h-10 w-10 rounded-xl mx-auto mb-2" />
                <Skeleton className="h-6 w-12 mx-auto mb-1" />
                <Skeleton className="h-3 w-16 mx-auto" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <Bot className="h-4 w-4 text-muted-foreground" />
          This Week
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4">
          {statItems.map((stat) => (
            <div key={stat.label} className="text-center">
              <div className={`inline-flex items-center justify-center h-10 w-10 rounded-xl ${stat.bgColor} mb-2`}>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </div>
              <p className="text-xl font-bold">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}