import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Truck } from "lucide-react";

export function FleetStatusCard() {
  const { tenant } = useAuth();

  const { data } = useQuery({
    queryKey: ["fleet-status", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return { active: 0, total: 0 };
      const [activeResult, totalResult] = await Promise.all([
        supabase
          .from("fleet_vehicles")
          .select("*", { count: "exact", head: true })
          .eq("tenant_id", tenant.id)
          .eq("status", "active"),
        supabase
          .from("fleet_vehicles")
          .select("*", { count: "exact", head: true })
          .eq("tenant_id", tenant.id),
      ]);
      return {
        active: activeResult.count || 0,
        total: totalResult.count || 0,
      };
    },
    enabled: !!tenant?.id,
  });

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Fleet</p>
            <p className="mt-2 text-3xl font-semibold tracking-tight tabular-nums">
              {data?.active ?? 0}
              <span className="text-lg text-muted-foreground font-normal">/{data?.total ?? 0}</span>
            </p>
            <p className="text-xs text-muted-foreground mt-1">active vehicles</p>
          </div>
          <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
            <Truck className="h-5 w-5 text-muted-foreground" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
