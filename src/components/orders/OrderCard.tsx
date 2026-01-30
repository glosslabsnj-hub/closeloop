import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Phone, 
  Printer, 
  Clock, 
  MapPin, 
  ChevronRight,
  Truck,
  ShoppingBag,
  AlertTriangle,
} from "lucide-react";
import { format } from "date-fns";

interface OrderItem {
  name: string;
  qty: number;
  modifiers?: string[];
}

interface OrderCardProps {
  order: {
    id: string;
    order_number: string;
    order_type: string;
    status: string;
    customer_name: string | null;
    customer_phone: string | null;
    delivery_address: string | null;
    items_json: unknown;
    special_instructions: string | null;
    total_cents: number | null;
    created_at: string;
    requested_time: string | null;
  };
  onView: () => void;
  onPrint: () => void;
  onStatusChange: (status: string) => void;
  isUpdating?: boolean;
}

const statusConfig: Record<string, { label: string; color: string; nextStatus?: string; nextLabel?: string }> = {
  pending: { 
    label: "Pending", 
    color: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
    nextStatus: "confirmed",
    nextLabel: "Confirm"
  },
  confirmed: { 
    label: "Confirmed", 
    color: "bg-blue-500/15 text-blue-400 border-blue-500/30",
    nextStatus: "preparing",
    nextLabel: "Start Prep"
  },
  preparing: { 
    label: "Preparing", 
    color: "bg-orange-500/15 text-orange-400 border-orange-500/30",
    nextStatus: "ready",
    nextLabel: "Mark Ready"
  },
  ready: { 
    label: "Ready", 
    color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    nextStatus: "completed",
    nextLabel: "Complete"
  },
  out_for_delivery: { 
    label: "Out for Delivery", 
    color: "bg-purple-500/15 text-purple-400 border-purple-500/30",
    nextStatus: "completed",
    nextLabel: "Complete"
  },
  completed: { 
    label: "Completed", 
    color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
  },
  cancelled: { 
    label: "Cancelled", 
    color: "bg-destructive/15 text-destructive border-destructive/30"
  },
  needs_followup: { 
    label: "Needs Follow-up", 
    color: "bg-amber-500/15 text-amber-400 border-amber-500/30"
  },
};

export function OrderCard({ order, onView, onPrint, onStatusChange, isUpdating }: OrderCardProps) {
  const items = Array.isArray(order.items_json) ? (order.items_json as OrderItem[]) : [];
  const config = statusConfig[order.status] || statusConfig.pending;
  const isDelivery = order.order_type === "delivery";
  const isUrgent = order.status === "pending" || order.status === "confirmed";
  
  const formatOrderType = (type: string) => {
    if (type === "pickup") return "Pickup";
    if (type === "delivery") return "Delivery";
    if (type === "dine_in") return "Dine-in";
    return type.charAt(0).toUpperCase() + type.slice(1);
  };

  const getItemsSummary = () => {
    if (items.length === 0) return "No items";
    if (items.length <= 2) {
      return items.map(i => `${i.qty}x ${i.name}`).join(", ");
    }
    const first = items.slice(0, 2).map(i => `${i.qty}x ${i.name}`).join(", ");
    return `${first} +${items.length - 2} more`;
  };

  return (
    <Card 
      className={`group cursor-pointer transition-all hover:shadow-md hover:border-primary/30 ${
        isUrgent ? "border-l-4 border-l-amber-500" : ""
      }`}
      onClick={onView}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          {/* Left: Order Info */}
          <div className="flex-1 min-w-0 space-y-2">
            {/* Header Row */}
            <div className="flex items-center gap-3 flex-wrap">
              <span className="font-mono font-bold text-lg">{order.order_number}</span>
              <Badge variant="outline" className={config.color}>
                {config.label}
              </Badge>
              <Badge variant="outline" className="gap-1">
                {isDelivery ? <Truck className="h-3 w-3" /> : <ShoppingBag className="h-3 w-3" />}
                {formatOrderType(order.order_type)}
              </Badge>
            </div>

            {/* Customer */}
            <div className="flex items-center gap-4 text-sm">
              <span className="font-medium">{order.customer_name || "Unknown Customer"}</span>
              {order.customer_phone && (
                <span className="text-muted-foreground flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  {order.customer_phone}
                </span>
              )}
            </div>

            {/* Items Summary */}
            <p className="text-sm text-muted-foreground truncate">
              {getItemsSummary()}
            </p>

            {/* Special Instructions Warning */}
            {order.special_instructions && (
              <div className="flex items-center gap-1.5 text-amber-400 text-sm">
                <AlertTriangle className="h-3.5 w-3.5" />
                <span className="font-medium">Special instructions</span>
              </div>
            )}

            {/* Footer: Time & Delivery Address */}
            <div className="flex items-center gap-4 text-xs text-muted-foreground pt-1">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {order.requested_time 
                  ? format(new Date(order.requested_time), "h:mm a")
                  : "ASAP"
                }
              </span>
              {isDelivery && order.delivery_address && (
                <span className="flex items-center gap-1 truncate">
                  <MapPin className="h-3 w-3" />
                  {order.delivery_address}
                </span>
              )}
              <span className="ml-auto">
                {format(new Date(order.created_at), "h:mm a")}
              </span>
            </div>
          </div>

          {/* Right: Price & Actions */}
          <div className="flex flex-col items-end gap-2 shrink-0">
            <span className="text-lg font-bold">
              ${((order.total_cents || 0) / 100).toFixed(2)}
            </span>
            
            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
              <Button 
                variant="ghost" 
                size="icon"
                className="h-8 w-8"
                onClick={(e) => {
                  e.stopPropagation();
                  onPrint();
                }}
                title="Print ticket"
              >
                <Printer className="h-4 w-4" />
              </Button>
              
              {config.nextStatus && (
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={isUpdating}
                  onClick={(e) => {
                    e.stopPropagation();
                    onStatusChange(config.nextStatus!);
                  }}
                >
                  {config.nextLabel}
                </Button>
              )}
            </div>
            
            <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
