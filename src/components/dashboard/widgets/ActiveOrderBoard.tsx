import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UtensilsCrossed, Clock } from "lucide-react";
import { useFoodDashboard } from "@/hooks/useFoodDashboard";
import { Skeleton } from "@/components/ui/skeleton";
import { format, parseISO } from "date-fns";

function OrderColumn({ title, orders, color }: {
  title: string;
  orders: { id: string; customer_name: string | null; order_type: string | null; created_at: string }[];
  color: string;
}) {
  return (
    <div className="flex-1 min-w-[140px]">
      <div className="flex items-center gap-2 mb-2">
        <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{title}</h4>
        <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
          {orders.length}
        </Badge>
      </div>
      <div className={`space-y-1.5 rounded-lg border-2 border-dashed p-2 min-h-[80px] ${color}`}>
        {orders.length === 0 ? (
          <p className="text-[11px] text-muted-foreground text-center py-4">None</p>
        ) : (
          orders.slice(0, 5).map((o) => (
            <div key={o.id} className="bg-background rounded-md border p-2">
              <p className="text-xs font-medium truncate">{o.customer_name || "Guest"}</p>
              <div className="flex items-center gap-1 mt-0.5">
                <Clock className="h-2.5 w-2.5 text-muted-foreground" />
                <span className="text-[10px] text-muted-foreground">
                  {format(parseISO(o.created_at), "h:mm a")}
                </span>
                {o.order_type && (
                  <span className="text-[10px] text-muted-foreground ml-auto capitalize">{o.order_type}</span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export function ActiveOrderBoard() {
  const { data, isLoading } = useFoodDashboard();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-4 space-y-3">
          <Skeleton className="h-5 w-40" />
          <div className="flex gap-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 flex-1" />)}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <UtensilsCrossed className="h-4 w-4 text-primary" />
          <p className="text-sm font-medium">Today's Orders</p>
          <Badge variant="secondary" className="text-xs ml-auto">
            {data.totalTodayCount} total
          </Badge>
        </div>
        <div className="flex gap-3 overflow-x-auto">
          <OrderColumn title="Pending" orders={data.pendingOrders} color="border-amber-300/40" />
          <OrderColumn title="Preparing" orders={data.preparingOrders} color="border-blue-300/40" />
          <OrderColumn title="Ready" orders={data.readyOrders} color="border-emerald-300/40" />
        </div>
      </CardContent>
    </Card>
  );
}
