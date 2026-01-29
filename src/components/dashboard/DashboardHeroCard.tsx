import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { useSubscription } from "@/hooks/useSubscription";
import { useQuery } from "@tanstack/react-query";
import { useBusinessContext, calculateReadinessFromContext } from "@/hooks/useBusinessContext";
import { 
  Phone, 
  MessageSquare,
  Zap,
  Copy,
  Play,
  Settings2,
  Calendar,
  TrendingUp,
  Brain
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { startOfDay, endOfDay, startOfWeek, endOfWeek } from "date-fns";

export function DashboardHeroCard() {
  const { tenant, assistantSettings, refreshTenant } = useAuth();
  const { subscription } = useSubscription(tenant?.id || null);
  const { context } = useBusinessContext(tenant?.id || null);
  const { toast } = useToast();
  const navigate = useNavigate();

  const planCode = subscription?.plan_code;
  const hasVoice = planCode === "voice" || planCode === "both";
  const hasSms = planCode === "text" || planCode === "both";

  const voiceEnabled = assistantSettings?.voice_ai_enabled && assistantSettings?.go_live_enabled;
  const smsEnabled = assistantSettings?.instant_text_enabled || false;
  const isAnyActive = voiceEnabled || smsEnabled;
  const closeloopNumber = assistantSettings?.closeloop_number;

  // Fetch real stats
  const { data: stats } = useQuery({
    queryKey: ["dashboard-hero-stats", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return { callsToday: 0, bookingsThisWeek: 0, revenueRecovered: 0 };

      const today = new Date();
      const todayStart = startOfDay(today).toISOString();
      const todayEnd = endOfDay(today).toISOString();
      const weekStart = startOfWeek(today, { weekStartsOn: 1 }).toISOString();
      const weekEnd = endOfWeek(today, { weekStartsOn: 1 }).toISOString();

      const [callsResult, bookingsResult] = await Promise.all([
        supabase
          .from("ai_call_sessions")
          .select("*", { count: "exact", head: true })
          .eq("tenant_id", tenant.id)
          .gte("started_at", todayStart)
          .lte("started_at", todayEnd),
        supabase
          .from("bookings")
          .select("deposit_paid, service_id, services(price_cents)")
          .eq("tenant_id", tenant.id)
          .gte("created_at", weekStart)
          .lte("created_at", weekEnd)
      ]);

      const bookings = bookingsResult.data || [];
      const bookingsThisWeek = bookings.length;
      
      // Calculate revenue from confirmed bookings with deposits
      const revenueRecovered = bookings
        .filter(b => b.deposit_paid)
        .reduce((sum, b) => {
          const price = (b.services as any)?.price_cents || 0;
          return sum + (price / 100);
        }, 0);

      return {
        callsToday: callsResult.count || 0,
        bookingsThisWeek,
        revenueRecovered: Math.round(revenueRecovered)
      };
    },
    enabled: !!tenant?.id,
    refetchInterval: 30000,
  });

  const readinessScore = calculateReadinessFromContext(context);

  const handleToggle = async (enabled: boolean) => {
    if (!tenant) return;

    try {
      const updates: Record<string, any> = {
        updated_at: new Date().toISOString(),
      };

      // Update voice settings if user has voice capability
      if (hasVoice) {
        updates.go_live_enabled = enabled;
        updates.voice_ai_enabled = enabled;
      }
      
      // Update SMS settings if user has SMS capability
      if (hasSms) {
        updates.instant_text_enabled = enabled;
      }

      const { error } = await supabase
        .from("assistant_settings")
        .update(updates)
        .eq("tenant_id", tenant.id);

      if (error) throw error;

      await refreshTenant();
      toast({
        title: enabled ? "AI Agent Activated ✅" : "AI Agent Paused",
        description: enabled 
          ? "Now handling calls & messages 24/7" 
          : "Paused - won't handle calls",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: error.message,
      });
    }
  };

  const copyPhoneNumber = () => {
    if (closeloopNumber) {
      navigator.clipboard.writeText(closeloopNumber);
      toast({
        title: "Copied!",
        description: "Phone number copied to clipboard",
      });
    }
  };

  if (!planCode) {
    return (
      <Card className="border-border">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center h-14 w-14 rounded-2xl bg-muted text-muted-foreground">
              <Zap className="h-7 w-7" />
            </div>
            <div>
              <h2 className="font-semibold text-lg">AI Agent</h2>
              <p className="text-sm text-muted-foreground">
                Complete setup to activate your AI agent
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const metrics = [
    {
      label: "Calls Today",
      value: stats?.callsToday || 0,
      icon: Phone,
      iconBg: "bg-emerald-500/15",
      iconColor: "text-emerald-400",
    },
    {
      label: "Bookings",
      value: stats?.bookingsThisWeek || 0,
      icon: Calendar,
      sublabel: "this week",
      iconBg: "bg-blue-500/15",
      iconColor: "text-blue-400",
    },
    {
      label: "Revenue",
      value: `$${(stats?.revenueRecovered || 0).toLocaleString()}`,
      icon: TrendingUp,
      sublabel: "recovered",
      iconBg: "bg-amber-500/15",
      iconColor: "text-amber-400",
    },
    {
      label: "AI Ready",
      value: `${readinessScore}%`,
      icon: Brain,
      iconBg: "bg-purple-500/15",
      iconColor: "text-purple-400",
    },
  ];

  return (
    <Card className={`overflow-hidden transition-all ${
      isAnyActive 
        ? "border-primary/40 bg-gradient-to-br from-primary/5 via-transparent to-primary/10 shadow-lg shadow-primary/5" 
        : "border-border"
    }`}>
      <CardContent className="p-0">
        {/* Top Section: Agent Status */}
        <div className="p-6 pb-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className={`relative flex items-center justify-center h-14 w-14 rounded-2xl transition-colors ${
                isAnyActive 
                  ? "bg-primary text-primary-foreground" 
                  : "bg-muted text-muted-foreground"
              }`}>
                {hasVoice ? <Phone className="h-7 w-7" /> : <MessageSquare className="h-7 w-7" />}
                {isAnyActive && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-4 w-4 bg-primary border-2 border-background"></span>
                  </span>
                )}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="font-semibold text-lg">AI Agent</h2>
                  <Badge variant={isAnyActive ? "default" : "secondary"} className="text-xs">
                    {isAnyActive ? "Live" : "Paused"}
                  </Badge>
                  {hasVoice && hasSms && (
                    <Badge variant="outline" className="text-xs">Voice + SMS</Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <p className="text-sm text-muted-foreground">
                    {isAnyActive 
                      ? `Answering calls for ${tenant?.name || "your business"}` 
                      : "Toggle to start answering calls"
                    }
                  </p>
                  {closeloopNumber && (
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-6 w-6 shrink-0"
                      onClick={copyPhoneNumber}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
            <Switch
              checked={isAnyActive}
              onCheckedChange={handleToggle}
              className="mt-1"
            />
          </div>

          {/* Quick Actions */}
          <div className="flex gap-3 mt-4">
            <Button 
              variant="outline" 
              size="sm"
              className="gap-2"
              onClick={() => navigate("/app/simulator")}
            >
              <Play className="h-4 w-4" />
              Test AI
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              className="gap-2"
              onClick={() => navigate("/app/ai-assistant")}
            >
              <Settings2 className="h-4 w-4" />
              Configure
            </Button>
          </div>
        </div>

        {/* Bottom Section: Metrics Strip */}
        <div className="border-t border-border/50 bg-muted/30 px-6 py-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {metrics.map((metric) => (
              <div key={metric.label} className="flex items-center gap-3">
                <div className={`flex items-center justify-center h-9 w-9 rounded-lg ${metric.iconBg}`}>
                  <metric.icon className={`h-4 w-4 ${metric.iconColor}`} />
                </div>
                <div>
                  <p className="text-lg font-bold leading-none">{metric.value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{metric.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
