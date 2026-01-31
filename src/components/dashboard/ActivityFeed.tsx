import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useKnowledgeSuggestions } from "@/hooks/useKnowledgeSuggestions";
import { formatDistanceToNow } from "date-fns";
import {
  Phone,
  Calendar,
  UtensilsCrossed,
  Truck,
  AlertCircle,
  CheckCircle2,
  MessageSquare,
  ArrowRight,
  Sparkles,
} from "lucide-react";

interface ActivityItem {
  id: string;
  type: "call" | "booking" | "order" | "dispatch" | "knowledge_gap" | "sms";
  title: string;
  subtitle: string;
  time: string;
  timestamp: Date;
  status?: "success" | "warning" | "info";
  actionLabel?: string;
  actionHref?: string;
}

export function ActivityFeed() {
  const navigate = useNavigate();
  const { tenant } = useAuth();
  const { pendingCount: knowledgeGapCount } = useKnowledgeSuggestions();

  const { data: activities, isLoading } = useQuery({
    queryKey: ["activity-feed", tenant?.id],
    queryFn: async (): Promise<ActivityItem[]> => {
      if (!tenant?.id) return [];

      const results: ActivityItem[] = [];

      // Fetch recent calls
      const { data: calls } = await supabase
        .from("ai_call_sessions")
        .select("id, caller_phone, outcome, started_at, summary")
        .eq("tenant_id", tenant.id)
        .order("started_at", { ascending: false })
        .limit(5);

      calls?.forEach((call) => {
        const phone = call.caller_phone || "Unknown";
        const displayPhone = phone.length > 8 
          ? `${phone.slice(0, 3)}...${phone.slice(-4)}` 
          : phone;
        
        results.push({
          id: `call-${call.id}`,
          type: "call",
          title: `Call ${call.outcome === 'booked' ? 'converted to booking' : 'answered'}`,
          subtitle: call.summary?.slice(0, 60) || `Caller: ${displayPhone}`,
          time: formatDistanceToNow(new Date(call.started_at), { addSuffix: true }),
          timestamp: new Date(call.started_at),
          status: call.outcome === 'booked' ? 'success' : 'info',
        });
      });

      // Fetch recent bookings
      const { data: bookings } = await supabase
        .from("bookings")
        .select("id, status, created_at, start_at, leads(full_name), services(name)")
        .eq("tenant_id", tenant.id)
        .order("created_at", { ascending: false })
        .limit(4);

      bookings?.forEach((booking) => {
        const leadName = (booking.leads as any)?.full_name || "Customer";
        const serviceName = (booking.services as any)?.name;
        
        results.push({
          id: `booking-${booking.id}`,
          type: "booking",
          title: `Booking ${booking.status === 'confirmed' ? 'confirmed' : 'created'}`,
          subtitle: `${leadName}${serviceName ? ` • ${serviceName}` : ''}`,
          time: formatDistanceToNow(new Date(booking.created_at), { addSuffix: true }),
          timestamp: new Date(booking.created_at),
          status: booking.status === 'confirmed' ? 'success' : 'info',
        });
      });

      // Fetch dispatch jobs (if applicable)
      const { data: jobs } = await supabase
        .from("dispatch_jobs")
        .select("id, status, customer_name, job_type, created_at")
        .eq("tenant_id", tenant.id)
        .order("created_at", { ascending: false })
        .limit(3);

      jobs?.forEach((job) => {
        results.push({
          id: `dispatch-${job.id}`,
          type: "dispatch",
          title: `${job.job_type || 'Job'} ${job.status}`,
          subtitle: job.customer_name || "Customer",
          time: formatDistanceToNow(new Date(job.created_at), { addSuffix: true }),
          timestamp: new Date(job.created_at),
          status: job.status === 'completed' ? 'success' : 'info',
        });
      });

      // Sort by timestamp
      return results
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, 6);
    },
    enabled: !!tenant?.id,
    refetchInterval: 30000,
  });

  // Memoize all items including knowledge gaps
  const allItems: ActivityItem[] = useMemo(() => {
    const items: ActivityItem[] = [];
    
    if (knowledgeGapCount > 0) {
      items.push({
        id: 'knowledge-gap',
        type: 'knowledge_gap',
        title: `${knowledgeGapCount} knowledge gap${knowledgeGapCount > 1 ? 's' : ''} detected`,
        subtitle: 'Questions AI couldn\'t answer confidently',
        time: 'Review needed',
        timestamp: new Date(),
        status: 'warning',
        actionLabel: 'Answer',
        actionHref: '/app/business-brain',
      });
    }

    if (activities) {
      items.push(...activities);
    }

    return items;
  }, [activities, knowledgeGapCount]);

  const getIcon = (type: string) => {
    const iconClass = "h-4 w-4";
    switch (type) {
      case "call":
        return <Phone className={iconClass} />;
      case "booking":
        return <Calendar className={iconClass} />;
      case "order":
        return <UtensilsCrossed className={iconClass} />;
      case "dispatch":
        return <Truck className={iconClass} />;
      case "knowledge_gap":
        return <AlertCircle className={iconClass} />;
      case "sms":
        return <MessageSquare className={iconClass} />;
      default:
        return <CheckCircle2 className={iconClass} />;
    }
  };

  const getIconStyles = (type: string) => {
    switch (type) {
      case "call": return { bg: "bg-emerald-500/15", color: "text-emerald-400" };
      case "booking": return { bg: "bg-blue-500/15", color: "text-blue-400" };
      case "order": return { bg: "bg-orange-500/15", color: "text-orange-400" };
      case "dispatch": return { bg: "bg-sky-500/15", color: "text-sky-400" };
      case "knowledge_gap": return { bg: "bg-amber-500/15", color: "text-amber-400" };
      case "sms": return { bg: "bg-purple-500/15", color: "text-purple-400" };
      default: return { bg: "bg-muted", color: "text-muted-foreground" };
    }
  };

  const hasActivity = activities && activities.length > 0;

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 py-2">
                <Skeleton className="h-9 w-9 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-32 mb-1" />
                  <Skeleton className="h-3 w-48" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2 flex-row items-center justify-between">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          Activity
        </CardTitle>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1 text-xs h-8"
          onClick={() => navigate("/app/inbox")}
        >
          View All
          <ArrowRight className="h-3 w-3" />
        </Button>
      </CardHeader>
      <CardContent>
        {hasActivity || knowledgeGapCount > 0 ? (
          <div className="space-y-1">
            {allItems.slice(0, 6).map((item) => {
              const iconStyles = getIconStyles(item.type);
              return (
                <div
                  key={item.id}
                  className={`flex items-center justify-between py-2.5 px-2 -mx-2 rounded-lg transition-colors ${
                    item.type === 'knowledge_gap'
                      ? 'bg-amber-500/5 border border-amber-500/20'
                      : 'hover:bg-muted/50 cursor-pointer'
                  }`}
                  onClick={() => {
                    if (item.actionHref) {
                      navigate(item.actionHref);
                    } else if (item.type === 'call') {
                      navigate('/app/calls');
                    } else if (item.type === 'booking') {
                      navigate('/app/bookings');
                    } else if (item.type === 'dispatch') {
                      navigate('/app/dispatch');
                    }
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div className={`flex h-9 w-9 items-center justify-center rounded-full ${iconStyles.bg} ${iconStyles.color}`}>
                      {getIcon(item.type)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{item.title}</p>
                      <p className="text-xs text-muted-foreground truncate max-w-[200px]">{item.subtitle}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-2">
                    {item.actionLabel ? (
                      <Button variant="ghost" size="sm" className="h-6 text-xs">
                        {item.actionLabel}
                      </Button>
                    ) : (
                      <p className="text-xs text-muted-foreground">{item.time}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-6 text-muted-foreground">
            <Phone className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No recent activity</p>
            <p className="text-xs">Calls, bookings, and orders will appear here</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
