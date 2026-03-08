import { useEffect, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useIndustryContext } from "@/hooks/useIndustryContext";
import { useCapabilities } from "@/hooks/useCapabilities";
import { formatDistanceToNow } from "date-fns";
import {
  Phone,
  Calendar,
  UtensilsCrossed,
  Truck,
  MessageSquare,
  ArrowRight,
  FlaskConical,
  Inbox,
  Clock,
} from "lucide-react";

interface ActivityItem {
  id: string;
  type: "call" | "booking" | "order" | "dispatch" | "sms";
  title: string;
  subtitle: string;
  detail?: string;
  duration?: string;
  time: string;
  timestamp: Date;
  status?: "success" | "warning" | "info";
}

/** Extract the single most useful detail from a call's extracted_payload */
function extractKeyDetail(payload: Record<string, unknown> | null | undefined): string | null {
  if (!payload || typeof payload !== "object") return null;
  const parts: string[] = [];
  const name = payload.customer_name ?? payload.name ?? payload.caller_name;
  if (typeof name === "string" && name.trim()) parts.push(name.trim());
  const service = payload.service ?? payload.service_type ?? payload.service_name;
  if (typeof service === "string" && service.trim()) parts.push(service.trim());
  const time = payload.booking_time ?? payload.appointment_time ?? payload.preferred_time;
  if (typeof time === "string" && time.trim()) parts.push(time.trim());
  return parts.length > 0 ? parts.join(" · ") : null;
}

/** Format call duration from start/end timestamps */
function formatCallDuration(startedAt: string, endedAt: string | null): string | undefined {
  if (!endedAt) return undefined;
  const seconds = Math.floor((new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 1000);
  if (seconds < 0) return undefined;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return mins === 0 ? `${secs}s` : `${mins}m ${secs}s`;
}

export function LiveActivityFeed() {
  const navigate = useNavigate();
  const { tenant } = useAuth();
  const queryClient = useQueryClient();
  const { terms } = useIndustryContext();
  const caps = useCapabilities();

  // Realtime subscription — only subscribe to tables relevant to this tenant's mode
  useEffect(() => {
    if (!tenant?.id) return;
    const invalidate = () => queryClient.invalidateQueries({ queryKey: ["live-activity-feed", tenant.id] });
    let channel = supabase
      .channel('activity-feed-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'ai_call_sessions', filter: `tenant_id=eq.${tenant.id}` }, invalidate)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'bookings', filter: `tenant_id=eq.${tenant.id}` }, invalidate);
    if (caps.hasFoodOrders) {
      channel = channel.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'food_orders', filter: `tenant_id=eq.${tenant.id}` }, invalidate);
    }
    if (caps.hasDispatchQueue) {
      channel = channel.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'dispatch_jobs', filter: `tenant_id=eq.${tenant.id}` }, invalidate);
    }
    channel.subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [tenant?.id, queryClient, caps.hasFoodOrders, caps.hasDispatchQueue]);

  const { data: activities, isLoading } = useQuery({
    queryKey: ["live-activity-feed", tenant?.id],
    queryFn: async (): Promise<ActivityItem[]> => {
      if (!tenant?.id) return [];
      const results: ActivityItem[] = [];

      const { data: calls } = await supabase
        .from("ai_call_sessions")
        .select("id, caller_phone, outcome, started_at, ended_at, summary, extracted_payload")
        .eq("tenant_id", tenant.id)
        .order("started_at", { ascending: false })
        .limit(5);

      calls?.forEach((call) => {
        const phone = call.caller_phone || "Unknown";
        const displayPhone = phone.length > 8 ? `${phone.slice(0, 3)}...${phone.slice(-4)}` : phone;
        // Outcome values match the ai_call_outcome DB enum:
        // booked, followup, lost, escalated, order, dispatch, message, lead_captured, referral_transfer
        // Uses mode-aware terms so plumber sees "Booking created" not "Appointment Booked"
        const outcomeLabel = call.outcome === 'booked' ? terms.bookingCreated
          : call.outcome === 'dispatch' ? terms.bookingCreated
          : call.outcome === 'order' ? terms.bookingCreated
          : call.outcome === 'lead_captured' ? 'Lead Captured'
          : call.outcome === 'followup' ? 'Follow-up Needed'
          : call.outcome === 'escalated' ? 'Escalated'
          : call.outcome === 'lost' ? 'Missed'
          : call.outcome === 'message' ? 'Message Left'
          : call.outcome === 'referral_transfer' ? 'Transferred'
          : 'Call Handled';
        const keyDetail = extractKeyDetail(call.extracted_payload as Record<string, unknown> | null);
        const dur = formatCallDuration(call.started_at, call.ended_at);
        results.push({
          id: `call-${call.id}`,
          type: "call",
          title: outcomeLabel,
          subtitle: keyDetail || call.summary?.slice(0, 80) || `From: ${displayPhone}`,
          detail: keyDetail ? (call.summary?.slice(0, 60) || undefined) : undefined,
          duration: dur,
          time: formatDistanceToNow(new Date(call.started_at), { addSuffix: true }),
          timestamp: new Date(call.started_at),
          status: call.outcome === 'booked' || call.outcome === 'dispatch' || call.outcome === 'order' ? 'success'
            : call.outcome === 'followup' || call.outcome === 'lead_captured' || call.outcome === 'message' ? 'warning'
            : call.outcome === 'lost' ? 'warning'
            : 'info',
        });
      });

      const { data: bookings } = await supabase
        .from("bookings")
        .select("id, status, created_at, leads(full_name)")
        .eq("tenant_id", tenant.id)
        .order("created_at", { ascending: false })
        .limit(4);

      bookings?.forEach((booking) => {
        const leadName = (booking.leads as any)?.full_name || terms.customer;
        const statusLabel = booking.status === 'confirmed' ? terms.bookingConfirmed : terms.bookingCreated;
        results.push({
          id: `booking-${booking.id}`,
          type: "booking",
          title: statusLabel,
          subtitle: leadName,
          time: formatDistanceToNow(new Date(booking.created_at), { addSuffix: true }),
          timestamp: new Date(booking.created_at),
          status: booking.status === 'confirmed' ? 'success' : 'info',
        });
      });

      // Only query food_orders for food-mode tenants (avoids RLS 403 errors)
      if (caps.hasFoodOrders) {
        const { data: orders } = await supabase
          .from("food_orders")
          .select("id, order_number, status, order_type, customer_name, created_at")
          .eq("tenant_id", tenant.id)
          .order("created_at", { ascending: false })
          .limit(4);

        orders?.forEach((order) => {
          results.push({
            id: `order-${order.id}`,
            type: "order",
            title: `Order #${order.order_number}`,
            subtitle: `${order.customer_name || terms.customer} · ${order.order_type?.replace("_", " ")}`,
            time: formatDistanceToNow(new Date(order.created_at), { addSuffix: true }),
            timestamp: new Date(order.created_at),
            status: order.status === 'completed' ? 'success' : 'info',
          });
        });
      }

      // Only query dispatch_jobs for dispatch-mode tenants (avoids RLS 403 errors)
      if (caps.hasDispatchQueue) {
        const { data: jobs } = await supabase
          .from("dispatch_jobs")
          .select("id, status, customer_name, job_type, created_at")
          .eq("tenant_id", tenant.id)
          .order("created_at", { ascending: false })
          .limit(3);

        const dispatchStatusLabel: Record<string, string> = {
          pending: "Pending",
          assigned: "Assigned",
          en_route: "En Route",
          on_site: "On Site",
          completed: "Completed",
          cancelled: "Cancelled",
        };
        jobs?.forEach((job) => {
          const jobTypeLabel = job.job_type
            ? job.job_type.replace(/\b\w/g, (c: string) => c.toUpperCase())
            : 'Job';
          const statusLabel = dispatchStatusLabel[job.status] || job.status.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
          results.push({
            id: `dispatch-${job.id}`,
            type: "dispatch",
            title: `${jobTypeLabel} — ${statusLabel}`,
            subtitle: job.customer_name || terms.customer,
            time: formatDistanceToNow(new Date(job.created_at), { addSuffix: true }),
            timestamp: new Date(job.created_at),
            status: job.status === 'completed' ? 'success' : 'info',
          });
        });
      }

      return results.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, 10);
    },
    enabled: !!tenant?.id,
    refetchInterval: 30000,
  });

  const iconMap: Record<string, React.ElementType> = useMemo(() => ({
    call: Phone,
    booking: Calendar,
    order: UtensilsCrossed,
    dispatch: Truck,
    sms: MessageSquare,
  }), []);

  const colorMap: Record<string, string> = useMemo(() => ({
    call: "bg-success/10 text-success",
    booking: "bg-info/10 text-info",
    order: "bg-warning/10 text-warning",
    dispatch: "bg-primary/10 text-primary",
    sms: "bg-accent/10 text-accent-foreground",
  }), []);

  const getNavPath = (type: string) => {
    switch (type) {
      case "call": return "/app/inbox?tab=calls";
      case "booking": return "/app/bookings";
      case "order": return "/app/orders";
      case "dispatch": return "/app/dispatch";
      default: return "/app/inbox";
    }
  };

  const hasActivity = activities && activities.length > 0;

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-4 w-32" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-8 w-8 rounded-lg" />
              <div className="flex-1">
                <Skeleton className="h-4 w-32 mb-1.5" />
                <Skeleton className="h-3 w-48" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/30 bg-card/60 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">Recent Activity</h3>
          <Button
            variant="ghost"
            size="sm"
            className="gap-1 text-xs h-7 text-muted-foreground hover:text-foreground"
            onClick={() => navigate("/app/inbox")}
          >
            View All
            <ArrowRight className="h-3 w-3" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {hasActivity ? (
          <div className="space-y-1">
            {activities.slice(0, 8).map((item) => {
              const Icon = iconMap[item.type] || Phone;
              const colorClass = colorMap[item.type] || "bg-muted text-muted-foreground";
              return (
                <div
                  key={item.id}
                  className={cn(
                    "flex items-start gap-3 p-2.5 -mx-2.5 rounded-lg cursor-pointer hover:bg-card/90 hover:shadow-sm transition-all",
                    item.type === "call" && "border-l-2 border-success",
                    item.type === "booking" && "border-l-2 border-primary",
                    item.type === "order" && "border-l-2 border-warning",
                    item.type === "dispatch" && "border-l-2 border-primary",
                    item.type === "sms" && "border-l-2 border-muted-foreground/30",
                  )}
                  onClick={() => navigate(getNavPath(item.type))}
                >
                  <div className={cn(
                    "h-8 w-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5",
                    colorClass
                  )}>
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-medium leading-tight truncate">{item.title}</p>
                      {item.status === "success" && (
                        <span className="w-1.5 h-1.5 rounded-full bg-success shrink-0" />
                      )}
                      {item.status === "warning" && (
                        <span className="w-1.5 h-1.5 rounded-full bg-warning shrink-0" />
                      )}
                    </div>
                    <p className="text-[13px] text-muted-foreground truncate">{item.subtitle}</p>
                    {item.detail && (
                      <p className="text-[11px] text-muted-foreground/50 truncate">{item.detail}</p>
                    )}
                  </div>
                  <div className="flex flex-col items-end shrink-0 mt-0.5 gap-0.5">
                    <p className="text-[11px] text-muted-foreground/60">{item.time}</p>
                    {item.duration && (
                      <span className="text-[10px] text-muted-foreground/40 flex items-center gap-0.5">
                        <Clock className="h-2.5 w-2.5" />
                        {item.duration}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="rounded-2xl bg-muted/60 p-4 mb-4 glow-primary-subtle">
              <Inbox className="w-7 h-7 text-muted-foreground/60" />
            </div>
            <p className="text-sm font-medium mb-1">No activity yet</p>
            <p className="text-xs text-muted-foreground max-w-[220px] mb-4">
              When your AI handles calls, activity will appear here.
            </p>
            <Button size="sm" variant="outline" asChild>
              <Link to="/app/simulator" className="gap-1.5">
                <FlaskConical className="h-3.5 w-3.5" />
                Test Your AI
              </Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
