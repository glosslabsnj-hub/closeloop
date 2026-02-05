 import { useState, useMemo } from "react";
 import { useAuth } from "@/contexts/AuthContext";
 import { supabase } from "@/integrations/supabase/client";
 import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
 import { useModuleRequired } from "@/hooks/useModuleRequired";
 import { Card, CardContent } from "@/components/ui/card";
 import { Button } from "@/components/ui/button";
 import { Badge } from "@/components/ui/badge";
 import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
 import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
 import { PageContainer } from "@/components/layout/PageContainer";
 import { PageHeader } from "@/components/layout/PageHeader";
 import {
   UtensilsCrossed,
   Plus,
   Loader2,
 } from "lucide-react";
 import { useToast } from "@/hooks/use-toast";
 import { OrderDetailsDrawer } from "@/components/orders/OrderDetailsDrawer";
 import { OrderCard } from "@/components/orders/OrderCard";
 import { EmptyState } from "@/components/ui/empty-state";
 import { useNavigate } from "react-router-dom";
 
 interface FoodOrder {
   id: string;
   tenant_id: string;
   order_number: string;
   order_type: string;
   status: string;
   customer_id: string | null;
   customer_name: string | null;
   customer_phone: string | null;
   delivery_address: string | null;
   address_json: unknown;
   items_json: unknown;
   special_instructions: string | null;
   requested_time: string | null;
   totals_estimate: unknown;
   handoff_state: unknown;
   subtotal_cents: number | null;
   tax_cents: number | null;
   total_cents: number | null;
   created_at: string;
 }
 
 type StatusFilter = "all" | "pending" | "preparing" | "ready" | "completed";
 
 export default function OrdersPage() {
   const { isAllowed, isLoading: moduleLoading } = useModuleRequired(["food_orders"]);
   
   const { tenant } = useAuth();
   const { toast } = useToast();
   const queryClient = useQueryClient();
   const navigate = useNavigate();
   const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
   const [orderTypeFilter, setOrderTypeFilter] = useState<string>("all");
   const [selectedOrder, setSelectedOrder] = useState<FoodOrder | null>(null);
   const [drawerOpen, setDrawerOpen] = useState(false);
 
   const { data: orders, isLoading } = useQuery({
     queryKey: ["food-orders", tenant?.id],
     queryFn: async () => {
       if (!tenant?.id) return [];
       const { data, error } = await supabase
         .from("food_orders")
         .select("*")
         .eq("tenant_id", tenant.id)
         .order("created_at", { ascending: false });
 
       if (error) throw error;
       return (data || []) as FoodOrder[];
     },
     enabled: !!tenant?.id,
     refetchInterval: 10000,
   });
 
   const updateStatusMutation = useMutation({
     mutationFn: async ({ orderId, status }: { orderId: string; status: string }) => {
       const { error } = await supabase
         .from("food_orders")
         .update({ status: status as any })
         .eq("id", orderId);
       if (error) throw error;
     },
     onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ["food-orders"] });
       toast({ title: "Order status updated" });
     },
     onError: (error: Error) => {
       toast({ variant: "destructive", title: "Error", description: error.message });
     },
   });
 
   const handleViewOrder = (order: FoodOrder) => {
     setSelectedOrder(order);
     setDrawerOpen(true);
   };
 
   // Filter orders
   const filteredOrders = useMemo(() => {
     if (!orders) return [];
     
     return orders.filter((order) => {
       // Status filter
       if (statusFilter === "pending" && !["pending", "confirmed"].includes(order.status)) return false;
       if (statusFilter === "preparing" && order.status !== "preparing") return false;
       if (statusFilter === "ready" && !["ready", "out_for_delivery"].includes(order.status)) return false;
       if (statusFilter === "completed" && !["completed", "cancelled"].includes(order.status)) return false;
       
       // Order type filter
       if (orderTypeFilter !== "all" && order.order_type !== orderTypeFilter) return false;
       
       return true;
     });
   }, [orders, statusFilter, orderTypeFilter]);
 
   // Stats
   const pendingCount = orders?.filter(o => ["pending", "confirmed"].includes(o.status)).length || 0;
   const preparingCount = orders?.filter(o => o.status === "preparing").length || 0;
   const readyCount = orders?.filter(o => ["ready", "out_for_delivery"].includes(o.status)).length || 0;
 
   if (moduleLoading || !isAllowed) {
     return (
       <div className="p-6 flex items-center justify-center">
         <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
       </div>
     );
   }
 
   if (isLoading) {
     return (
       <div className="p-6 flex items-center justify-center">
         <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
       </div>
     );
   }
 
   return (
     <PageContainer maxWidth="xl">
       <div className="space-y-6">
         <PageHeader
           icon={<UtensilsCrossed className="h-5 w-5" />}
           title="Orders"
           description="Manage incoming food orders"
           action={
             <Button>
               <Plus className="h-4 w-4 mr-2" />
               New Order
             </Button>
           }
         />
 
         {/* Filters */}
         <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
           <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
             <TabsList>
               <TabsTrigger value="all">All</TabsTrigger>
               <TabsTrigger value="pending" className="gap-1.5">
                 Pending
                 {pendingCount > 0 && (
                   <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                     {pendingCount}
                   </Badge>
                 )}
               </TabsTrigger>
               <TabsTrigger value="preparing" className="gap-1.5">
                 Preparing
                 {preparingCount > 0 && (
                   <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                     {preparingCount}
                   </Badge>
                 )}
               </TabsTrigger>
               <TabsTrigger value="ready" className="gap-1.5">
                 Ready
                 {readyCount > 0 && (
                   <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                     {readyCount}
                   </Badge>
                 )}
               </TabsTrigger>
               <TabsTrigger value="completed">Completed</TabsTrigger>
             </TabsList>
           </Tabs>
 
           <Select value={orderTypeFilter} onValueChange={setOrderTypeFilter}>
             <SelectTrigger className="w-32">
               <SelectValue placeholder="Type" />
             </SelectTrigger>
             <SelectContent>
               <SelectItem value="all">All Types</SelectItem>
               <SelectItem value="pickup">Pickup</SelectItem>
               <SelectItem value="delivery">Delivery</SelectItem>
               <SelectItem value="dine_in">Dine In</SelectItem>
             </SelectContent>
           </Select>
         </div>
 
         {/* Orders grid */}
         {filteredOrders.length === 0 ? (
           <EmptyState
             icon={UtensilsCrossed}
             title="No orders yet"
             description={
               statusFilter !== "all" || orderTypeFilter !== "all"
                 ? "Try adjusting your filters to see more results."
                 : "When customers place orders through your AI, they'll appear here."
             }
             action={
               statusFilter === "all" && orderTypeFilter === "all"
                 ? { label: "Create Order", onClick: () => console.log("Create order") }
                 : undefined
             }
           />
         ) : (
           <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
             {filteredOrders.map((order) => (
               <OrderCard
                 key={order.id}
                 order={order}
                 onView={() => handleViewOrder(order)}
                 onStatusChange={(status) => updateStatusMutation.mutate({ orderId: order.id, status })}
                 isUpdating={updateStatusMutation.isPending}
               />
             ))}
           </div>
         )}
       </div>
 
       {/* Order Details Drawer */}
       <OrderDetailsDrawer
         order={selectedOrder}
         open={drawerOpen}
         onOpenChange={setDrawerOpen}
       />
     </PageContainer>
   );
 }