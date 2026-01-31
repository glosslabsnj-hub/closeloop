import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useTriggerDelivery, type EntityType } from "@/hooks/useUniversalDelivery";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Check, X, RefreshCw, Clock, ChevronDown, ChevronUp } from "lucide-react";
import { format } from "date-fns";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface ReviewQueueProps {
  entityType: EntityType;
  title: string;
  description?: string;
}

interface QueueItem {
  id: string;
  created_at: string;
  status: string;
  summary: string;
  customer_name?: string | null;
  customer_phone?: string | null;
  details: Record<string, unknown>;
}

export function ReviewQueue({ entityType, title, description }: ReviewQueueProps) {
  const { tenant } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const triggerDelivery = useTriggerDelivery();
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const transformToQueueItem = (item: Record<string, unknown>, type: EntityType): QueueItem => {
    const baseItem = {
      id: item.id as string,
      created_at: item.created_at as string,
      status: item.status as string,
      details: item,
    };

    switch (type) {
      case "booking":
        return { ...baseItem, summary: `Appointment on ${item.start_at ? format(new Date(item.start_at as string), "MMM d 'at' h:mm a") : "TBD"}` };
      case "dispatch":
        return { ...baseItem, summary: `${item.job_type || "Job"} - ${item.priority} priority`, customer_name: item.customer_name as string | null, customer_phone: item.customer_phone as string | null };
      case "order":
        return { ...baseItem, summary: `Order #${item.order_number} - ${item.order_type}`, customer_name: item.customer_name as string | null, customer_phone: item.customer_phone as string | null };
      case "reservation":
        return { ...baseItem, summary: `Table for ${item.party_size}`, customer_name: item.customer_name as string | null, customer_phone: item.customer_phone as string | null };
      case "catering":
        return { ...baseItem, summary: `Catering for ${item.guest_count || "?"} guests`, customer_name: item.customer_name as string | null, customer_phone: item.customer_phone as string | null };
      case "intake":
        return { ...baseItem, summary: `${item.intake_type || "Medical"} intake - ${item.urgency_level || "routine"}` };
      default:
        return { ...baseItem, summary: "Unknown item" };
    }
  };

  // Fetch pending items - use RPC or raw query to avoid type issues
  const pendingQuery = useQuery({
    queryKey: ["review_queue", entityType, tenant?.id],
    queryFn: async (): Promise<QueueItem[]> => {
      if (!tenant?.id) return [];
      
      // Use a simpler approach with explicit type casting
      const tableMap: Record<EntityType, string> = {
        booking: "bookings",
        dispatch: "dispatch_jobs",
        order: "food_orders",
        reservation: "reservations",
        catering: "catering_requests",
        intake: "medical_intakes",
      };
      
      const pendingStatusMap: Record<EntityType, string> = {
        booking: "pending_deposit",
        dispatch: "pending",
        order: "pending",
        reservation: "pending",
        catering: "pending",
        intake: "pending",
      };

      const tableName = tableMap[entityType];
      const pendingStatus = pendingStatusMap[entityType];
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.from(tableName as any) as any)
        .select("*")
        .eq("tenant_id", tenant.id)
        .eq("status", pendingStatus)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return (data || []).map((item: Record<string, unknown>) => transformToQueueItem(item, entityType));
    },
    enabled: !!tenant?.id,
  });

  const approveMutation = useMutation({
    mutationFn: async (itemId: string) => {
      if (!tenant?.id) throw new Error("No tenant");
      
      const tableMap: Record<EntityType, string> = {
        booking: "bookings", dispatch: "dispatch_jobs", order: "food_orders",
        reservation: "reservations", catering: "catering_requests", intake: "medical_intakes",
      };
      const confirmedMap: Record<EntityType, string> = {
        booking: "confirmed", dispatch: "assigned", order: "confirmed",
        reservation: "confirmed", catering: "quoted", intake: "scheduled",
      };
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from(tableMap[entityType] as any) as any)
        .update({ status: confirmedMap[entityType] })
        .eq("id", itemId)
        .eq("tenant_id", tenant.id);

      if (error) throw error;
      await triggerDelivery.mutateAsync({ entityType, entityId: itemId });
      return itemId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["review_queue", entityType, tenant?.id] });
      toast({ title: "Approved", description: "Item confirmed and sent." });
    },
    onError: (error) => toast({ title: "Error", description: error.message, variant: "destructive" }),
  });

  const rejectMutation = useMutation({
    mutationFn: async (itemId: string) => {
      if (!tenant?.id) throw new Error("No tenant");
      
      const tableMap: Record<EntityType, string> = {
        booking: "bookings", dispatch: "dispatch_jobs", order: "food_orders",
        reservation: "reservations", catering: "catering_requests", intake: "medical_intakes",
      };
      const cancelledMap: Record<EntityType, string> = {
        booking: "canceled", dispatch: "cancelled", order: "cancelled",
        reservation: "cancelled", catering: "cancelled", intake: "cancelled",
      };
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from(tableMap[entityType] as any) as any)
        .update({ status: cancelledMap[entityType] })
        .eq("id", itemId)
        .eq("tenant_id", tenant.id);

      if (error) throw error;
      return itemId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["review_queue", entityType, tenant?.id] });
      toast({ title: "Rejected", description: "Item cancelled." });
    },
    onError: (error) => toast({ title: "Error", description: error.message, variant: "destructive" }),
  });

  const toggleExpanded = (itemId: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(itemId)) newExpanded.delete(itemId);
    else newExpanded.add(itemId);
    setExpandedItems(newExpanded);
  };

  if (pendingQuery.isLoading) {
    return <Card><CardContent className="flex items-center justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></CardContent></Card>;
  }

  const items = pendingQuery.data || [];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-amber-500" />
              {title}
              {items.length > 0 && <Badge variant="secondary" className="ml-2">{items.length} pending</Badge>}
            </CardTitle>
            {description && <CardDescription>{description}</CardDescription>}
          </div>
          <Button variant="outline" size="sm" onClick={() => pendingQuery.refetch()} disabled={pendingQuery.isFetching}>
            {pendingQuery.isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Check className="h-12 w-12 mx-auto mb-2 text-green-500" />
            <p>All caught up! No items awaiting review.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <Collapsible key={item.id} open={expandedItems.has(item.id)} onOpenChange={() => toggleExpanded(item.id)}>
                <div className="border rounded-lg p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                            {expandedItems.has(item.id) ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </Button>
                        </CollapsibleTrigger>
                        <span className="font-medium truncate">{item.summary}</span>
                      </div>
                      <div className="text-sm text-muted-foreground pl-8">
                        {item.customer_name || item.customer_phone ? (
                          <>{item.customer_name}{item.customer_name && item.customer_phone && " • "}{item.customer_phone}</>
                        ) : (
                          <span>Created {format(new Date(item.created_at), "MMM d 'at' h:mm a")}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Button size="sm" variant="outline" onClick={() => rejectMutation.mutate(item.id)} disabled={rejectMutation.isPending || approveMutation.isPending}>
                        {rejectMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
                        <span className="sr-only md:not-sr-only md:ml-1">Reject</span>
                      </Button>
                      <Button size="sm" onClick={() => approveMutation.mutate(item.id)} disabled={approveMutation.isPending || rejectMutation.isPending}>
                        {approveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                        <span className="sr-only md:not-sr-only md:ml-1">Approve</span>
                      </Button>
                    </div>
                  </div>
                  <CollapsibleContent>
                    <div className="mt-3 pt-3 border-t pl-8">
                      <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">{JSON.stringify(item.details, null, 2)}</pre>
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}