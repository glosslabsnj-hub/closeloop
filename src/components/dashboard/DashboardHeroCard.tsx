import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useBusinessContext, calculateReadinessFromContext } from "@/hooks/useBusinessContext";
import { hasVoiceFeature, hasSmsFeature } from "@/config/pricing";
import {
  Phone,
  MessageSquare,
  Zap,
  Copy,
  Play,
  Settings2,
  Calendar,
  TrendingUp,
  Brain,
  Gauge,
  HelpCircle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { startOfDay, endOfDay, startOfWeek, endOfWeek } from "date-fns";
import { useState, useEffect, useCallback, useRef } from "react";
import { AgentOffBehaviorModal } from "./AgentOffBehaviorModal";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function DashboardHeroCard() {
  const { tenant, assistantSettings, refreshTenant, subscription } = useAuth();
  const { context } = useBusinessContext(tenant?.id || null);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Use centralized helpers for feature detection
  const planCode = subscription?.plan_code;
  const hasVoice = hasVoiceFeature(planCode);
  const hasSms = hasSmsFeature(planCode);

  const voiceEnabled = assistantSettings?.voice_ai_enabled && assistantSettings?.go_live_enabled;
  const smsEnabled = assistantSettings?.instant_text_enabled || false;
  const isAnyActive = voiceEnabled || smsEnabled;
  const closeloopNumber = assistantSettings?.closeloop_number;

  // Busyness level state
  const [busynessLevel, setBusynessLevel] = useState(30);
  const [busynessSaving, setBusynessSaving] = useState(false);

  // OFF behavior modal state
  const [offBehaviorModalOpen, setOffBehaviorModalOpen] = useState(false);

  // Load busyness level from tenant on mount
  useEffect(() => {
    const tenantAny = tenant as any;
    if (tenantAny?.busyness_rules_jsonb) {
      const rules = tenantAny.busyness_rules_jsonb as any;
      setBusynessLevel(rules.manual_busyness_pct || 30);
    }
  }, [tenant]);

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

    // If turning OFF, check if off_behavior is configured
    if (!enabled && hasVoice) {
      const offBehavior = (assistantSettings as any)?.off_behavior || "FORWARD_OWNER";
      const forwardNumber = (assistantSettings as any)?.owner_forward_number;

      // If FORWARD_OWNER but no number configured, show modal
      if (offBehavior === "FORWARD_OWNER" && !forwardNumber) {
        setOffBehaviorModalOpen(true);
        return;
      }
    }

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

      // Get configured off behavior for better messaging
      const offBehavior = (assistantSettings as any)?.off_behavior || "FORWARD_OWNER";
      const offBehaviorLabel = getOffBehaviorLabel(offBehavior);

      toast({
        title: enabled ? "AI Agent Activated ✅" : "AI Agent Paused",
        description: enabled
          ? "Now handling calls & messages 24/7"
          : `Paused - ${offBehaviorLabel}`,
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: error.message,
      });
    }
  };

  const getOffBehaviorLabel = (behavior: string): string => {
    switch (behavior) {
      case "FORWARD_OWNER":
        return "calls will forward to you";
      case "VOICEMAIL":
        return "calls go to voicemail";
      case "CALLBACK_ONLY":
        return "capturing callback requests";
      default:
        return "won't handle calls";
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

  // Debounced save for busyness level
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const saveBusynessLevel = useCallback(
    async (level: number) => {
      if (!tenant?.id) return;
      setBusynessSaving(true);

      try {
        const tenantAny = tenant as any;
        const currentRules = tenantAny.busyness_rules_jsonb || {};
        const updatedRules = {
          ...currentRules,
          manual_busyness_pct: level,
        };

        const { error } = await supabase
          .from("tenants")
          .update({ busyness_rules_jsonb: updatedRules } as any)
          .eq("id", tenant.id);

        if (error) throw error;

        await refreshTenant();
        toast({
          title: "Saved",
          description: `Busyness level set to ${level}%`,
        });
      } catch (error: any) {
        toast({
          variant: "destructive",
          title: "Save Failed",
          description: error.message,
        });
      } finally {
        setBusynessSaving(false);
      }
    },
    [tenant?.id, refreshTenant, toast]
  );

  const handleBusynessChange = (values: number[]) => {
    const level = values[0];
    setBusynessLevel(level);

    // Debounce the save
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      saveBusynessLevel(level);
    }, 500);
  };

  const getBusynessHelperText = (level: number): string => {
    if (level <= 25) return "Relaxed: answer fast, be flexible";
    if (level <= 70) return "Normal: balanced";
    return "Packed: stricter, prioritize callback";
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
    <Card className={cn(
      "overflow-hidden transition-all duration-300 animate-fade-in",
      isAnyActive 
        ? "border-primary/30 bg-gradient-to-br from-primary/[0.04] via-transparent to-primary/[0.06]" 
        : "border-border/60"
    )}>
      <CardContent className="p-0">
        {/* Top Section: Agent Status */}
        <div className="p-4 md:p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className={cn(
                "relative flex items-center justify-center h-12 w-12 rounded-xl transition-all duration-300",
                isAnyActive 
                  ? "bg-primary text-primary-foreground shadow-glow" 
                  : "bg-muted text-muted-foreground"
              )}>
                {hasVoice ? <Phone className="h-5 w-5" /> : <MessageSquare className="h-5 w-5" />}
                {isAnyActive && (
                  <span className="absolute -top-1 -right-1 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-success border-2 border-card"></span>
                  </span>
                )}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="font-semibold text-base">AI Agent</h2>
                  <Badge 
                    variant={isAnyActive ? "success" : "muted"} 
                    size="sm"
                    className={cn(isAnyActive && "status-dot-live")}
                  >
                    {isAnyActive ? "Live" : "Paused"}
                  </Badge>
                  {hasVoice && hasSms && (
                    <Badge variant="outline" size="sm" className="hidden sm:inline-flex">Voice + SMS</Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-[240px]">
                  {isAnyActive 
                    ? hasVoice && hasSms
                      ? `Handling calls & texts for ${tenant?.name || "your business"}`
                      : hasVoice
                        ? `Answering calls for ${tenant?.name || "your business"}`
                        : `Text-backs for ${tenant?.name || "your business"}`
                    : hasVoice 
                      ? "Toggle to start answering calls"
                      : "Enable instant text responses"
                  }
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {closeloopNumber && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  onClick={copyPhoneNumber}
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              )}
              <Switch
                checked={isAnyActive}
                onCheckedChange={handleToggle}
              />
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap gap-2 mt-4">
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-xs"
              onClick={() => navigate("/app/simulator")}
            >
              <Play className="h-3.5 w-3.5" />
              Test
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-xs"
              onClick={() => navigate("/app/business-brain")}
            >
              <Brain className="h-3.5 w-3.5" />
              Knowledge
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-xs"
              onClick={() => navigate("/app/inbox?tab=calls")}
            >
              <Phone className="h-3.5 w-3.5" />
              Calls
            </Button>
          </div>
        </div>

        {/* Middle Section: Busyness Slider */}
        <TooltipProvider>
          <div className="border-t border-border/40 bg-muted/15 px-4 md:px-5 py-3">
            <div className="flex items-center gap-2 mb-2">
              <Gauge className="h-3.5 w-3.5 text-muted-foreground/70" />
              <Label className="text-xs font-medium flex items-center gap-1">
                Busyness
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-3 w-3 text-muted-foreground/50 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs text-xs">
                    <p>Higher values make AI prioritize urgent requests and offer callbacks.</p>
                  </TooltipContent>
                </Tooltip>
              </Label>
              <span className="text-xs font-semibold tabular-nums ml-auto text-muted-foreground">
                {busynessLevel}%
              </span>
              {busynessSaving && (
                <Badge variant="muted" size="sm">Saving...</Badge>
              )}
            </div>
            <Slider
              value={[busynessLevel]}
              onValueChange={handleBusynessChange}
              min={0}
              max={100}
              step={5}
              className="w-full"
              disabled={busynessSaving}
            />
            <p className="text-[11px] text-muted-foreground/60 mt-1.5">
              {getBusynessHelperText(busynessLevel)}
            </p>
          </div>
        </TooltipProvider>

        {/* Bottom Section: Metrics Strip */}
        <div className="border-t border-border/40 bg-muted/25 px-4 md:px-5 py-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            {metrics.map((metric) => (
              <div key={metric.label} className="flex items-center gap-2.5 group">
                <div className={cn(
                  "flex items-center justify-center h-8 w-8 rounded-lg transition-transform duration-200 group-hover:scale-105",
                  metric.iconBg
                )}>
                  <metric.icon className={cn("h-4 w-4", metric.iconColor)} />
                </div>
                <div className="min-w-0">
                  <p className="text-base font-bold leading-none tabular-nums">{metric.value}</p>
                  <p className="text-[10px] text-muted-foreground/70 mt-0.5 truncate">{metric.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>

      {/* OFF Behavior Configuration Modal */}
      <AgentOffBehaviorModal
        open={offBehaviorModalOpen}
        onOpenChange={setOffBehaviorModalOpen}
        tenantId={tenant?.id || ""}
        currentBehavior={(assistantSettings as any)?.off_behavior}
        currentForwardNumber={(assistantSettings as any)?.owner_forward_number}
        onConfigured={async () => {
          await refreshTenant();
          // After configuration, proceed with toggle OFF
          handleToggle(false);
        }}
      />
    </Card>
  );
}
