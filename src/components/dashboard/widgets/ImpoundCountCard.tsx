import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Warehouse } from "lucide-react";

export function ImpoundCountCard() {
  const { tenant } = useAuth();

  const { data } = useQuery({
    queryKey: ["impound-count", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return { current: 0 };
      const { count } = await supabase
        .from("impound_vehicles")
        .select("*", { count: "exact", head: true })
        .eq("tenant_id", tenant.id)
        .eq("status", "stored");
      return { current: count || 0 };
    },
    enabled: !!tenant?.id,
  });

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Impound Lot</p>
            <p className="mt-2 text-3xl font-semibold tracking-tight tabular-nums">
              {data?.current ?? 0}
            </p>
            <p className="text-xs text-muted-foreground mt-1">vehicles stored</p>
          </div>
          <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
            <Warehouse className="h-5 w-5 text-muted-foreground" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
