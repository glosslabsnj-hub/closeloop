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
  Copy,
  Check,
  AlertCircle,
  Shield,
  Activity,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { AgentOffBehaviorModal } from "./AgentOffBehaviorModal";

export function AgentControlPanel() {
  const { tenant, assistantSettings, refreshTenant, subscription, isSuperAdmin } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { score: readinessScore, canGoLive } = useAIReadinessV2();

  const planCode = subscription?.plan_code;
  const hasVoice = hasVoiceFeature(planCode);
  const hasSms = hasSmsFeature(planCode);

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

  // No subscription
  if (!planCode && !isSuperAdmin) {
    return (
      <div className="rounded-xl bg-card/60 backdrop-blur-sm border border-border/30 p-6">
        <div className="flex items-center gap-4">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold mb-1">Get your AI receptionist</h3>
            <p className="text-sm text-muted-foreground">
              Complete setup to start answering calls with AI.
            </p>
          </div>
          <Button asChild className="shadow-[0_0_20px_-6px_hsl(230_70%_62%/0.3)]">
            <Link to="/app/go-live">Get Started</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className={cn(
        "rounded-xl border bg-card/60 backdrop-blur-sm shadow-sm w-fit",
        isActive ? "border-success/20 shimmer-active" : "border-border/30"
      )}>
        <div className="px-5 py-4">
          {/* Status Row */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 min-w-0">
              {/* Power Toggle */}
              <button
                onClick={() => handleToggle(!isActive)}
                disabled={toggling || (!hasPhoneConnected && !isActive)}
                className={cn(
                  "relative shrink-0 h-6 w-11 rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  isActive ? "bg-success" : "bg-muted-foreground/20",
                  (toggling || (!hasPhoneConnected && !isActive)) && "opacity-40 cursor-not-allowed"
                )}
              >
                <span className={cn(
                  "absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200",
                  isActive && "translate-x-5"
                )} />
              </button>

              <h2 className="text-sm font-semibold truncate text-foreground">{businessName}</h2>

              <div className={cn(
                "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium shrink-0",
                isActive
                  ? "bg-success/10 text-success shadow-[0_0_12px_-2px_hsl(152_60%_44%/0.4)]"
                  : "bg-muted text-muted-foreground"
              )}>
                <span className={cn(
                  "w-1.5 h-1.5 rounded-full",
                  isActive ? "bg-success animate-pulse" : "bg-muted-foreground/40"
                )} />
                {isActive ? "Live" : "Paused"}
              </div>

              {isSuperAdmin && (
                <Badge variant="outline" className="gap-1 text-[10px] border-primary/20 shrink-0">
                  <Shield className="h-3 w-3" />
                  Admin
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-3 shrink-0">
              {/* Phone Number */}
              {hasPhoneConnected ? (
                <button
                  onClick={copyPhoneNumber}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors group"
                >
                  <Phone className="h-3.5 w-3.5" />
                  <span className="font-mono text-[11px]">{formatPhone(closeloopNumber)}</span>
                  {copied ? (
                    <Check className="h-3 w-3 text-success" />
                  ) : (
                    <Copy className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  )}
                </button>
              ) : (
                <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs" asChild>
                  <Link to="/app/go-live">
                    <Phone className="h-3.5 w-3.5" />
                    Connect Phone
                  </Link>
                </Button>
              )}

              {/* Readiness */}
              <div className="hidden sm:flex items-center gap-2">
                <div className="w-px h-4 bg-border/40" />
                <Activity className="h-3.5 w-3.5 text-muted-foreground" />
                <div className={cn(
                  "relative w-14 h-1 bg-muted rounded-full overflow-hidden",
                  readinessPercent >= 85 && "glow-primary-sm"
                )}>
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-500",
                      readinessPercent >= 85 ? "bg-success" : "bg-warning"
                    )}
                    style={{ width: `${Math.min(readinessPercent, 100)}%` }}
                  />
                </div>
                <span className={cn(
                  "text-[11px] font-medium tabular-nums",
                  readinessPercent >= 85 ? "text-success" : "text-warning"
                )}>
                  {readinessPercent}%
                </span>
                {!canGoLive && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-[11px] text-warning hover:text-warning gap-1"
                    onClick={() => navigate("/app/business-brain")}
                  >
                    <AlertCircle className="h-3 w-3" />
                    Complete Setup
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

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
