import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { useTenantConfig } from "@/hooks/useTenantConfig";
import { useCapabilities } from "@/hooks/useCapabilities";
import { useIndustryContext } from "@/hooks/useIndustryContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  Phone, 
  Calendar, 
  DollarSign, 
  Bot,
  UtensilsCrossed,
  Truck,
  Users,
  Stethoscope,
  TrendingUp,
  HelpCircle,
} from "lucide-react";
import { startOfDay, startOfWeek, endOfDay } from "date-fns";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface MetricCard {
  label: string;
  value: number | string;
  icon: React.ElementType;
  href: string;
  color: string;
  bgColor: string;
  tooltip?: string;
}

export function TodaySnapshot() {
  const navigate = useNavigate();
  const { tenant } = useAuth();
  const { businessMode } = useTenantConfig();
  const caps = useCapabilities();
  const { terms } = useIndustryContext();

  const todayStart = startOfDay(new Date()).toISOString();
  const todayEnd = endOfDay(new Date()).toISOString();
  const weekStart = startOfWeek(new Date()).toISOString();

  // Fetch today's calls
  const { data: callsToday = 0 } = useQuery({
    queryKey: ["snapshot-calls", tenant?.id, todayStart],
    queryFn: async () => {
      if (!tenant?.id) return 0;
      const { count } = await supabase
        .from("ai_call_sessions")
        .select("*", { count: "exact", head: true })
        .eq("tenant_id", tenant.id)
        .gte("started_at", todayStart)
        .lte("started_at", todayEnd);
      return count || 0;
    },
    enabled: !!tenant?.id,
  });

  // Fetch bookings this week
  const { data: bookingsWeek = 0 } = useQuery({
    queryKey: ["snapshot-bookings", tenant?.id, weekStart],
    queryFn: async () => {
      if (!tenant?.id) return 0;
      const { count } = await supabase
        .from("bookings")
        .select("*", { count: "exact", head: true })
        .eq("tenant_id", tenant.id)
        .gte("created_at", weekStart);
      return count || 0;
    },
    enabled: !!tenant?.id,
  });

  // Fetch orders today (for food mode)
  const { data: ordersToday = 0 } = useQuery({
    queryKey: ["snapshot-orders", tenant?.id, todayStart],
    queryFn: async () => {
      if (!tenant?.id) return 0;
      const { count } = await supabase
        .from("food_orders")
        .select("*", { count: "exact", head: true })
        .eq("tenant_id", tenant.id)
        .gte("created_at", todayStart)
        .lte("created_at", todayEnd);
      return count || 0;
    },
    enabled: !!tenant?.id && caps.hasFoodOrders,
  });

  // Fetch pending orders (for food mode)
  const { data: pendingPrep = 0 } = useQuery({
    queryKey: ["snapshot-pending-orders", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return 0;
      const { count } = await supabase
        .from("food_orders")
        .select("*", { count: "exact", head: true })
        .eq("tenant_id", tenant.id)
        .in("status", ["pending", "confirmed", "preparing"]);
      return count || 0;
    },
    enabled: !!tenant?.id && caps.hasFoodOrders,
  });

  // Fetch dispatch jobs (for dispatch mode)
  const { data: jobsPending = 0 } = useQuery({
    queryKey: ["snapshot-dispatch-pending", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return 0;
      const { count } = await supabase
        .from("dispatch_jobs")
        .select("*", { count: "exact", head: true })
        .eq("tenant_id", tenant.id)
        .in("status", ["pending", "assigned"]);
      return count || 0;
    },
    enabled: !!tenant?.id && caps.hasDispatchQueue,
  });

  // Fetch intakes today (for medical mode)
  const { data: intakesToday = 0 } = useQuery({
    queryKey: ["snapshot-medical-intakes", tenant?.id, todayStart],
    queryFn: async () => {
      if (!tenant?.id) return 0;
      const { count } = await supabase
        .from("medical_intakes")
        .select("*", { count: "exact", head: true })
        .eq("tenant_id", tenant.id)
        .gte("created_at", todayStart)
        .lte("created_at", todayEnd);
      return count || 0;
    },
    enabled: !!tenant?.id && caps.hasMedicalIntake,
  });

  // Fetch AI readiness score
  const { data: aiScore = 0 } = useQuery({
    queryKey: ["snapshot-ai-score", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return 0;
      // Simple score based on knowledge count
      const { count: faqs } = await supabase
        .from("business_faqs")
        .select("*", { count: "exact", head: true })
        .eq("tenant_id", tenant.id);
      const { count: services } = await supabase
        .from("services")
        .select("*", { count: "exact", head: true })
        .eq("tenant_id", tenant.id);
      const { count: knowledge } = await supabase
        .from("ai_knowledge_base")
        .select("*", { count: "exact", head: true })
        .eq("tenant_id", tenant.id);
      
      const totalItems = (faqs || 0) + (services || 0) + (knowledge || 0);
      // Simple scoring: 10 items = 100%
      return Math.min(100, Math.round((totalItems / 10) * 100));
    },
    enabled: !!tenant?.id,
  });

  // Build metrics based on business mode
  const getMetrics = (): MetricCard[] => {
    switch (businessMode) {
      case "food":
        return [
          { label: "Orders Today", value: ordersToday, icon: UtensilsCrossed, href: "/app/orders", color: "text-orange-400", bgColor: "bg-orange-500/15" },
          { label: "Pending Prep", value: pendingPrep, icon: Truck, href: "/app/orders", color: "text-amber-400", bgColor: "bg-amber-500/15" },
          { label: "Calls Today", value: callsToday, icon: Phone, href: "/app/inbox?tab=calls", color: "text-emerald-400", bgColor: "bg-emerald-500/15" },
          { label: "Knowledge Score", value: `${aiScore}%`, icon: Bot, href: "/app/business-brain", color: "text-primary", bgColor: "bg-primary/15", tooltip: "How much your AI knows about your business. Add FAQs, services, and policies to improve." },
        ];
      case "dispatch":
        return [
          { label: "Jobs Pending", value: jobsPending, icon: Truck, href: "/app/dispatch", color: "text-sky-400", bgColor: "bg-sky-500/15" },
          { label: "Calls Today", value: callsToday, icon: Phone, href: "/app/inbox?tab=calls", color: "text-emerald-400", bgColor: "bg-emerald-500/15" },
          { label: "Leads", value: bookingsWeek, icon: Users, href: "/app/inbox?tab=leads", color: "text-purple-400", bgColor: "bg-purple-500/15" },
          { label: "Knowledge Score", value: `${aiScore}%`, icon: Bot, href: "/app/business-brain", color: "text-primary", bgColor: "bg-primary/15", tooltip: "How much your AI knows about your business. Add FAQs, services, and policies to improve." },
        ];
      case "medical":
        return [
          { label: "Intakes Today", value: intakesToday, icon: Stethoscope, href: "/app/medical-intake", color: "text-rose-400", bgColor: "bg-rose-500/15" },
          { label: terms.bookingsMetricLabel, value: bookingsWeek, icon: Calendar, href: "/app/bookings", color: "text-blue-400", bgColor: "bg-blue-500/15" },
          { label: "Calls Today", value: callsToday, icon: Phone, href: "/app/inbox?tab=calls", color: "text-emerald-400", bgColor: "bg-emerald-500/15" },
          { label: "Knowledge Score", value: `${aiScore}%`, icon: Bot, href: "/app/business-brain", color: "text-primary", bgColor: "bg-primary/15", tooltip: "How much your AI knows about your business. Add FAQs, services, and policies to improve." },
        ];
      case "service":
      case "general":
      default:
        return [
          { label: "Calls Today", value: callsToday, icon: Phone, href: "/app/inbox?tab=calls", color: "text-emerald-400", bgColor: "bg-emerald-500/15" },
          { label: terms.bookingsMetricLabel, value: bookingsWeek, icon: Calendar, href: "/app/bookings", color: "text-blue-400", bgColor: "bg-blue-500/15" },
          { label: "This Week", value: bookingsWeek > 0 ? `+${bookingsWeek}` : "0", icon: TrendingUp, href: "/app/inbox?tab=leads", color: "text-purple-400", bgColor: "bg-purple-500/15" },
          { label: "Knowledge Score", value: `${aiScore}%`, icon: Bot, href: "/app/business-brain", color: "text-primary", bgColor: "bg-primary/15", tooltip: "How much your AI knows about your business. Add FAQs, services, and policies to improve." },
        ];
    }
  };

  const metrics = getMetrics();

  return (
    <TooltipProvider>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        {metrics.map((metric, index) => {
          const Icon = metric.icon;
          const cardContent = (
            <Card 
              key={metric.label}
              variant="interactive"
              className={cn(
                "group animate-fade-in",
                `stagger-${index + 1}`
              )}
              onClick={() => navigate(metric.href)}
            >
              <CardContent className="py-4 px-4">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "h-10 w-10 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300",
                    metric.bgColor,
                    "group-hover:scale-110"
                  )}>
                    <Icon className={cn("h-5 w-5", metric.color)} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-2xl font-bold truncate tabular-nums">{metric.value}</p>
                    <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                      {metric.label}
                      {metric.tooltip && <HelpCircle className="h-3 w-3 opacity-40" />}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );

          if (metric.tooltip) {
            return (
              <Tooltip key={metric.label}>
                <TooltipTrigger asChild>
                  {cardContent}
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs">
                  <p className="text-xs">{metric.tooltip}</p>
                </TooltipContent>
              </Tooltip>
            );
          }

          return cardContent;
        })}
      </div>
    </TooltipProvider>
  );
}
