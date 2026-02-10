import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useNavigate, Link } from "react-router-dom";
import { hasVoiceFeature, hasSmsFeature } from "@/config/pricing";
import { useQuery } from "@tanstack/react-query";
import { useAIReadinessV2 } from "@/hooks/useAIReadinessV2";
import {
  Phone,
  Settings2,
  FlaskConical,
  Brain,
  Copy,
  Check,
  AlertCircle,
  Shield,
  Activity,
  Zap,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { AgentOffBehaviorModal } from "./AgentOffBehaviorModal";

/**
 * AgentControlPanel - Stripe-inspired hero card for AI agent status
 * The single most important element on the dashboard
 */
export function AgentControlPanel() {
  const { tenant, assistantSettings, refreshTenant, subscription, isSuperAdmin } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { score: readinessScore, canGoLive } = useAIReadinessV2();

  const planCode = subscription?.plan_code;
  const hasVoice = hasVoiceFeature(planCode);
  const hasSms = hasSmsFeature(planCode);

  // Fetch phone number
  const { data: phoneNumberData } = useQuery({
    queryKey: ["tenant-phone-number", tenant?.id, isSuperAdmin],
    queryFn: async () => {
      if (!tenant?.id) return null;
      const { data: tenantPhone } = await supabase
        .from("phone_numbers")
        .select("phone_e164")
        .eq("tenant_id", tenant.id)
        .limit(1)
        .maybeSingle();
      if (tenantPhone?.phone_e164) return tenantPhone.phone_e164;
      if (isSuperAdmin) {
        const { data: adminLine } = await supabase
          .from("phone_numbers")
          .select("phone_e164")
          .eq("is_admin_test_line", true)
          .limit(1)
          .maybeSingle();
        if (adminLine?.phone_e164) return adminLine.phone_e164;
      }
      return null;
    },
    enabled: !!tenant?.id,
  });

  const voiceEnabled = assistantSettings?.voice_ai_enabled && assistantSettings?.go_live_enabled;
  const smsEnabled = assistantSettings?.instant_text_enabled || false;
  const closeloopNumber =
    (assistantSettings as any)?.forwarding_phone_e164 ||
    assistantSettings?.closeloop_number ||
    phoneNumberData;
  const hasPhoneConnected = !!closeloopNumber;
  const isActive = (voiceEnabled || smsEnabled) && hasPhoneConnected;
  const canToggleOn = isSuperAdmin || canGoLive;
  const readinessPercent = readinessScore || 0;

  const [offBehaviorModalOpen, setOffBehaviorModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [toggling, setToggling] = useState(false);

  const handleToggle = async (enabled: boolean) => {
    if (!tenant) return;
    if (enabled && !isSuperAdmin && !canGoLive) {
      toast({
        variant: "destructive",
        title: "Cannot Go Live Yet",
        description: `AI Readiness must be at least 85%. Currently at ${readinessPercent}%.`,
      });
      return;
    }
    if (!enabled && hasVoice) {
      const offBehavior = assistantSettings?.off_behavior || "FORWARD_OWNER";
      const forwardNumber = assistantSettings?.owner_forward_number;
      if (offBehavior === "FORWARD_OWNER" && !forwardNumber) {
        setOffBehaviorModalOpen(true);
        return;
      }
    }
    setToggling(true);
    try {
      const updates: Record<string, any> = { updated_at: new Date().toISOString() };
      if (hasVoice) {
        updates.go_live_enabled = enabled;
        updates.voice_ai_enabled = enabled;
      }
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
        title: enabled ? "AI Agent is now live" : "AI Agent paused",
        description: enabled
          ? "Your AI is now handling incoming calls and messages."
          : "Your AI has stopped answering. Calls will follow your fallback rules.",
      });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Update Failed", description: error.message });
    } finally {
      setToggling(false);
    }
  };

  const copyPhoneNumber = () => {
    if (closeloopNumber) {
      navigator.clipboard.writeText(closeloopNumber);
      setCopied(true);
      toast({ title: "Copied!", description: "Phone number copied to clipboard" });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const businessName = tenant?.name || "Your Business";

  function getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  }

  // No subscription — prompt to start
  if (!planCode && !isSuperAdmin) {
    return (
      <Card className="overflow-hidden">
        <CardContent className="p-8">
          <div className="flex items-center gap-6">
            <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center shrink-0">
              <Phone className="h-7 w-7 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-xl font-semibold mb-1">Get your AI receptionist</h3>
              <p className="text-sm text-muted-foreground">
                Complete setup to start answering calls with AI.
              </p>
            </div>
            <Button asChild size="lg">
              <Link to="/app/go-live">Get Started</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className={cn(
        "overflow-hidden transition-all duration-300",
        isActive && "ring-1 ring-success/20"
      )}>
        <CardContent className="p-0">
          {/* Hero Section */}
          <div className={cn(
            "relative p-6 pb-5",
            isActive
              ? "bg-gradient-to-br from-success/8 via-success/4 to-transparent"
              : "bg-gradient-to-br from-muted/60 via-muted/30 to-transparent"
          )}>
            {/* Greeting + Status Row */}
            <div className="flex items-start justify-between gap-4 mb-5">
              <div className="min-w-0">
                <p className="text-sm text-muted-foreground mb-0.5">{getGreeting()}</p>
                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                  {businessName}
                </h1>
              </div>

              {/* Status Indicator */}
              <div className="flex items-center gap-3 shrink-0">
                {isSuperAdmin && (
                  <Badge variant="outline" className="gap-1 text-xs border-primary/30">
                    <Shield className="h-3 w-3" />
                    Admin
                  </Badge>
                )}
                <div className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors",
                  isActive
                    ? "bg-success/15 text-success"
                    : "bg-muted text-muted-foreground"
                )}>
                  <span className={cn(
                    "w-2 h-2 rounded-full shrink-0",
                    isActive ? "bg-success animate-pulse" : "bg-muted-foreground/40"
                  )} />
                  {isActive ? "Live" : "Paused"}
                </div>
              </div>
            </div>

            {/* Control Strip */}
            <div className="flex items-center gap-3 flex-wrap">
              {/* Power Toggle */}
              <button
                onClick={() => handleToggle(!isActive)}
                disabled={toggling || (!hasPhoneConnected && !isActive)}
                className={cn(
                  "relative shrink-0 h-8 w-14 rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  isActive ? "bg-success" : "bg-muted-foreground/25",
                  (toggling || (!hasPhoneConnected && !isActive)) && "opacity-40 cursor-not-allowed"
                )}
              >
                <span className={cn(
                  "absolute top-1 left-1 h-6 w-6 rounded-full bg-white shadow-sm transition-transform duration-200",
                  isActive && "translate-x-6"
                )} />
              </button>

              {/* Divider */}
              <div className="w-px h-6 bg-border/50" />

              {/* Phone Number */}
              {hasPhoneConnected ? (
                <button
                  onClick={copyPhoneNumber}
                  className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors group"
                >
                  <Phone className="h-3.5 w-3.5" />
                  <span className="font-mono text-[13px]">{formatPhone(closeloopNumber)}</span>
                  {copied ? (
                    <Check className="h-3 w-3 text-success" />
                  ) : (
                    <Copy className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  )}
                </button>
              ) : (
                <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" asChild>
                  <Link to="/app/go-live">
                    <Phone className="h-3.5 w-3.5" />
                    Connect Phone
                  </Link>
                </Button>
              )}

              {/* Divider */}
              <div className="w-px h-6 bg-border/50 hidden sm:block" />

              {/* Readiness */}
              <div className="hidden sm:flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <Activity className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Readiness</span>
                </div>
                <div className="relative w-20 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="absolute left-0 top-0 bottom-0 w-px bg-foreground/20 z-10"
                    style={{ left: '85%' }}
                  />
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-500",
                      readinessPercent >= 85 ? "bg-success" : "bg-warning"
                    )}
                    style={{ width: `${Math.min(readinessPercent, 100)}%` }}
                  />
                </div>
                <span className={cn(
                  "text-xs font-medium tabular-nums",
                  readinessPercent >= 85 ? "text-success" : "text-warning"
                )}>
                  {readinessPercent}%
                </span>
              </div>

              {/* Spacer */}
              <div className="flex-1" />

              {/* Quick Actions */}
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => navigate("/app/simulator")}
                >
                  <FlaskConical className="h-3.5 w-3.5" />
                  <span className="hidden md:inline">Test</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => navigate("/app/business-brain")}
                >
                  <Brain className="h-3.5 w-3.5" />
                  <span className="hidden md:inline">Knowledge</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => navigate("/app/settings")}
                >
                  <Settings2 className="h-3.5 w-3.5" />
                  <span className="hidden md:inline">Settings</span>
                </Button>
              </div>
            </div>
          </div>

          {/* Readiness Detail (when blocked) */}
          {!isActive && !canGoLive && (
            <div className="px-6 py-4 border-t border-border/50 bg-muted/20">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-4 w-4 text-warning shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">
                    AI Readiness at {readinessPercent}% — needs 85% to go live
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Complete your setup in Business Brain to unlock your AI agent.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0 h-8 text-xs"
                  onClick={() => navigate("/app/business-brain")}
                >
                  Fix Issues
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <AgentOffBehaviorModal
        open={offBehaviorModalOpen}
        onOpenChange={setOffBehaviorModalOpen}
        tenantId={tenant?.id || ""}
        currentBehavior={assistantSettings?.off_behavior}
        currentForwardNumber={assistantSettings?.owner_forward_number}
        onConfigured={async () => {
          await refreshTenant();
          handleToggle(false);
        }}
      />
    </>
  );
}

function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length === 11 && cleaned.startsWith("1")) {
    return `(${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
  }
  return phone;
}
