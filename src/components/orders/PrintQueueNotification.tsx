import { useState } from "react";
import { Printer, X, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { usePrintQueue } from "@/hooks/usePrintQueue";
import { useNavigate } from "react-router-dom";

export function PrintQueueNotification() {
  const navigate = useNavigate();
  const { pendingPrints, hasPendingPrints, dismissPrint } = usePrintQueue();
  const [minimized, setMinimized] = useState(false);

  if (!hasPendingPrints) return null;

  if (minimized) {
    return (
      <Button
        onClick={() => setMinimized(false)}
        className="fixed bottom-4 right-4 z-50 h-14 w-14 rounded-full shadow-lg animate-pulse"
        size="icon"
      >
        <Printer className="h-6 w-6" />
        <Badge 
          className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
          variant="destructive"
        >
          {pendingPrints.length}
        </Badge>
      </Button>
    );
  }

  return (
    <Card className="fixed bottom-4 right-4 z-50 w-80 shadow-2xl border-2 border-primary/20 animate-in slide-in-from-bottom-5">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Printer className="h-5 w-5 text-primary" />
            <span className="font-semibold">Print Queue</span>
            <Badge variant="secondary">{pendingPrints.length}</Badge>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-6 w-6"
            onClick={() => setMinimized(true)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-2 max-h-48 overflow-y-auto">
          {pendingPrints.slice(0, 5).map((order) => (
            <div 
              key={order.id} 
              className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
            >
              <div className="flex-1 min-w-0">
                <p className="font-mono text-sm font-medium truncate">
                  #{order.order_number}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {order.customer_name || "Unknown"} • {order.order_type}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="default"
                  className="h-7 px-2"
                  onClick={() => navigate(`/app/orders/${order.id}/ticket?auto=true`)}
                >
                  <Printer className="h-3 w-3 mr-1" />
                  Print
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0"
                  onClick={() => dismissPrint.mutate(order.id)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        {pendingPrints.length > 5 && (
          <p className="text-xs text-muted-foreground text-center">
            +{pendingPrints.length - 5} more orders
          </p>
        )}

        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1"
            onClick={() => navigate("/app/orders")}
          >
            <ExternalLink className="h-3 w-3 mr-1" />
            View All
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
