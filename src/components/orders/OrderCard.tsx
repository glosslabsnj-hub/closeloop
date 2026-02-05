 import { Badge } from "@/components/ui/badge";
 import { Button } from "@/components/ui/button";
 import { Card, CardContent } from "@/components/ui/card";
 import { cn } from "@/lib/utils";
 import { 
   Truck,
   ShoppingBag,
   UtensilsCrossed,
   Eye,
 } from "lucide-react";
 import { formatDistanceToNow } from "date-fns";
 
 interface OrderItem {
   name: string;
   qty: number;
   price_cents?: number | null;
   matched?: boolean;
   modifiers?: string[];
 }
 
 export const orderStatusColors: Record<string, string> = {
   pending: "bg-warning/10 text-warning border-warning/30",
   confirmed: "bg-info/10 text-info border-info/30",
   preparing: "bg-primary/10 text-primary border-primary/30",
   ready: "bg-success/10 text-success border-success/30",
   out_for_delivery: "bg-info/10 text-info border-info/30",
   completed: "bg-muted text-muted-foreground border-border",
   cancelled: "bg-destructive/10 text-destructive border-destructive/30",
   needs_followup: "bg-warning/10 text-warning border-warning/30",
 };
 
 export const orderStatusLabels: Record<string, string> = {
   pending: "Pending",
   confirmed: "Confirmed",
   preparing: "Preparing",
   ready: "Ready",
   out_for_delivery: "Out for Delivery",
   completed: "Completed",
   cancelled: "Cancelled",
   needs_followup: "Needs Follow-up",
 };
 
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
   onView?: () => void;
   onStatusChange?: (status: string) => void;
   isUpdating?: boolean;
 }
 
 const getNextStatus = (status: string): { next: string; label: string } | null => {
   switch (status) {
     case "pending": return { next: "confirmed", label: "Confirm" };
     case "confirmed": return { next: "preparing", label: "Start Preparing" };
     case "preparing": return { next: "ready", label: "Mark Ready" };
     case "ready": return { next: "completed", label: "Complete" };
     default: return null;
   }
 };
 
 export function OrderCard({ order, onView, onStatusChange, isUpdating }: OrderCardProps) {
   const items = Array.isArray(order.items_json) ? (order.items_json as OrderItem[]) : [];
   const nextAction = getNextStatus(order.status);
   
   const getOrderTypeIcon = () => {
     switch (order.order_type) {
       case "delivery": return <Truck className="w-3 h-3 mr-1" />;
       case "dine_in": return <UtensilsCrossed className="w-3 h-3 mr-1" />;
       default: return <ShoppingBag className="w-3 h-3 mr-1" />;
     }
   };
 
   const formatOrderType = (type: string) => {
     if (type === "pickup") return "Pickup";
     if (type === "delivery") return "Delivery";
     if (type === "dine_in") return "Dine In";
     return type.replace("_", " ");
   };
 
   const getItemsPreview = () => {
     if (items.length === 0) return "No items";
     return items.map(i => i.name).join(", ");
   };
 
   const formatRelativeTime = (date: string) => {
     return formatDistanceToNow(new Date(date), { addSuffix: true });
   };
 
   return (
     <Card className="hover:border-primary/50 transition-colors">
       <CardContent className="p-4">
         {/* Header */}
         <div className="flex items-center justify-between mb-3">
           <div className="flex items-center gap-2">
             <span className="font-mono text-lg font-bold">#{order.order_number}</span>
             <Badge variant="outline" className="gap-0.5">
               {getOrderTypeIcon()}
               {formatOrderType(order.order_type)}
             </Badge>
           </div>
           <Badge className={cn("border", orderStatusColors[order.status])}>
             {orderStatusLabels[order.status] || order.status}
           </Badge>
         </div>
 
         {/* Customer */}
         <div className="mb-3">
           <p className="font-medium">{order.customer_name || "Unknown Customer"}</p>
           <p className="text-sm text-muted-foreground">{order.customer_phone || "No phone"}</p>
         </div>
 
         {/* Items preview */}
         <div className="mb-3 p-3 bg-muted/50 rounded-lg">
           <p className="text-sm font-medium mb-1">
             {items.length} item{items.length !== 1 ? "s" : ""}
           </p>
           <p className="text-sm text-muted-foreground line-clamp-2">
             {getItemsPreview()}
           </p>
         </div>
 
         {/* Total & time */}
         <div className="flex items-center justify-between mb-3">
           <p className="text-lg font-semibold">
             ${((order.total_cents || 0) / 100).toFixed(2)}
           </p>
           <p className="text-sm text-muted-foreground">
             {formatRelativeTime(order.created_at)}
           </p>
         </div>
 
         {/* Status actions */}
         <div className="flex gap-2 pt-3 border-t">
           {nextAction && onStatusChange && (
             <Button
               size="sm"
               className="flex-1"
               disabled={isUpdating}
               onClick={() => onStatusChange(nextAction.next)}
             >
               {nextAction.label}
             </Button>
           )}
           {!nextAction && (
             <Button size="sm" variant="outline" className="flex-1" disabled>
               {order.status === "completed" ? "Done" : order.status === "cancelled" ? "Cancelled" : "No Action"}
             </Button>
           )}
           <Button size="sm" variant="outline" onClick={onView}>
             <Eye className="w-4 h-4" />
           </Button>
         </div>
       </CardContent>
     </Card>
   );
 }
