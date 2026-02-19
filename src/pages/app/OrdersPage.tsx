 import { useState, useMemo } from "react";
 import { useAuth } from "@/contexts/AuthContext";
 import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
 import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
 import { useModuleRequired } from "@/hooks/useModuleRequired";
 import { Card, CardContent } from "@/components/ui/card";
 import { Button } from "@/components/ui/button";
 import { Badge } from "@/components/ui/badge";
 import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
 import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
 import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
 import { Input } from "@/components/ui/input";
 import { Label } from "@/components/ui/label";
 import { Textarea } from "@/components/ui/textarea";
 import { PageContainer } from "@/components/layout/PageContainer";
 import { PageHeader } from "@/components/layout/PageHeader";
 import {
   UtensilsCrossed,
   Plus,
   Loader2,
   ChevronLeft,
   ChevronRight,
   AlertTriangle,
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
   const [newOrderOpen, setNewOrderOpen] = useState(false);
   const [newOrder, setNewOrder] = useState({ customer_name: "", order_type: "pickup", items: "", special_instructions: "" });
   const [isCreating, setIsCreating] = useState(false);
  const [page, setPage] = useState(0);
  const pageSize = 24;
 
   const { data: orders, isLoading, error: ordersError } = useQuery({
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
         .update({ status: status as Database["public"]["Enums"]["order_status"] })
         .eq("id", orderId);
       if (error) throw error;
     },
     onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ["food-orders", tenant?.id] });
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

   const handleCreateOrder = async () => {
     if (!tenant?.id || !newOrder.customer_name.trim()) return;
     setIsCreating(true);
     try {
       const itemsList = newOrder.items.split("\n").filter(Boolean).map((name, i) => ({
         id: `item-${i}`,
         name: name.trim(),
         quantity: 1,
       }));
       const orderNum = `ORD-${Date.now().toString(36).toUpperCase()}`;
       const { error } = await (supabase as any).from("food_orders").insert({
         tenant_id: tenant.id,
         order_number: orderNum,
         order_type: newOrder.order_type as any,
         status: "pending" as any,
         customer_name: newOrder.customer_name,
         items_json: itemsList as any,
         special_instructions: newOrder.special_instructions || null,
       });
       if (error) throw error;
       queryClient.invalidateQueries({ queryKey: ["food-orders", tenant.id] });
       toast({ title: "Order created" });
       setNewOrderOpen(false);
       setNewOrder({ customer_name: "", order_type: "pickup", items: "", special_instructions: "" });
     } catch (err: any) {
       toast({ variant: "destructive", title: "Error", description: err.message });
     } finally {
       setIsCreating(false);
     }
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

  // Reset page when filters change
  const handleStatusFilter = (v: string) => {
    setStatusFilter(v as StatusFilter);
    setPage(0);
  };
  const handleTypeFilter = (v: string) => {
    setOrderTypeFilter(v);
    setPage(0);
  };

  // Pagination
  const totalPages = Math.ceil(filteredOrders.length / pageSize);
  const paginatedOrders = filteredOrders.slice(page * pageSize, (page + 1) * pageSize);

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

   if (ordersError) {
     return (
       <div className="container max-w-6xl py-8 px-4 sm:px-6">
         <div className="mx-auto max-w-lg py-16">
           <Card>
             <CardContent className="pt-8 pb-8 text-center space-y-4">
               <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
                 <AlertTriangle className="h-7 w-7 text-destructive" />
               </div>
               <h2 className="text-xl font-semibold">Something went wrong</h2>
               <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                 We couldn't load your orders. Please refresh the page or try again later.
               </p>
               <Button variant="outline" onClick={() => window.location.reload()}>
                 Refresh Page
               </Button>
             </CardContent>
           </Card>
         </div>
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
             <Button onClick={() => setNewOrderOpen(true)}>
               <Plus className="h-4 w-4 mr-2" />
               New Order
             </Button>
           }
         />
 
         {/* Filters */}
         <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
           <Tabs value={statusFilter} onValueChange={handleStatusFilter}>
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
 
           <Select value={orderTypeFilter} onValueChange={handleTypeFilter}>
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
                 ? { label: "Create Order", onClick: () => setNewOrderOpen(true) }
                 : undefined
             }
           />
         ) : (
           <>
             <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
               {paginatedOrders.map((order) => (
                 <OrderCard
                   key={order.id}
                   order={order}
                   onView={() => handleViewOrder(order)}
                   onStatusChange={(status) => updateStatusMutation.mutate({ orderId: order.id, status })}
                   isUpdating={updateStatusMutation.isPending}
                 />
               ))}
             </div>
             {totalPages > 1 && (
               <div className="flex items-center justify-between pt-4">
                 <p className="text-sm text-muted-foreground">
                   Showing {page * pageSize + 1}–{Math.min((page + 1) * pageSize, filteredOrders.length)} of {filteredOrders.length}
                 </p>
                 <div className="flex items-center gap-2">
                   <Button variant="outline" size="sm" onClick={() => setPage(p => p - 1)} disabled={page === 0}>
                     <ChevronLeft className="h-4 w-4" />
                   </Button>
                   <span className="text-sm text-muted-foreground">
                     {page + 1} / {totalPages}
                   </span>
                   <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page >= totalPages - 1}>
                     <ChevronRight className="h-4 w-4" />
                   </Button>
                 </div>
               </div>
             )}
           </>
         )}
       </div>
 
       {/* Order Details Drawer */}
       <OrderDetailsDrawer
         order={selectedOrder}
         open={drawerOpen}
         onOpenChange={setDrawerOpen}
       />

       {/* New Order Dialog */}
       <Dialog open={newOrderOpen} onOpenChange={setNewOrderOpen}>
         <DialogContent>
           <DialogHeader>
             <DialogTitle>Create New Order</DialogTitle>
           </DialogHeader>
           <div className="space-y-4 py-2">
             <div className="space-y-2">
               <Label htmlFor="order-customer">Customer Name</Label>
               <Input
                 id="order-customer"
                 placeholder="Customer name"
                 value={newOrder.customer_name}
                 onChange={(e) => setNewOrder(prev => ({ ...prev, customer_name: e.target.value }))}
               />
             </div>
             <div className="space-y-2">
               <Label htmlFor="order-type">Order Type</Label>
               <Select value={newOrder.order_type} onValueChange={(v) => setNewOrder(prev => ({ ...prev, order_type: v }))}>
                 <SelectTrigger id="order-type">
                   <SelectValue />
                 </SelectTrigger>
                 <SelectContent>
                   <SelectItem value="pickup">Pickup</SelectItem>
                   <SelectItem value="delivery">Delivery</SelectItem>
                   <SelectItem value="dine_in">Dine In</SelectItem>
                 </SelectContent>
               </Select>
             </div>
             <div className="space-y-2">
               <Label htmlFor="order-items">Items (one per line)</Label>
               <Textarea
                 id="order-items"
                 placeholder={"Cheeseburger\nFrench Fries\nChocolate Shake"}
                 rows={4}
                 value={newOrder.items}
                 onChange={(e) => setNewOrder(prev => ({ ...prev, items: e.target.value }))}
               />
             </div>
             <div className="space-y-2">
               <Label htmlFor="order-instructions">Special Instructions</Label>
               <Textarea
                 id="order-instructions"
                 placeholder="Any special requests..."
                 rows={2}
                 value={newOrder.special_instructions}
                 onChange={(e) => setNewOrder(prev => ({ ...prev, special_instructions: e.target.value }))}
               />
             </div>
           </div>
           <DialogFooter>
             <Button variant="outline" onClick={() => setNewOrderOpen(false)}>Cancel</Button>
             <Button onClick={handleCreateOrder} disabled={isCreating || !newOrder.customer_name.trim()}>
               {isCreating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
               Create Order
             </Button>
           </DialogFooter>
         </DialogContent>
       </Dialog>
     </PageContainer>
   );
 }